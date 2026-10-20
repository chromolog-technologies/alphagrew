<?php

namespace App\Services\Ai;

use App\Models\Resume;
use App\Models\Student;
use App\Models\StudentProject;
use App\Models\StudentSkill;

/**
 * Stage 3 — the candidate context the interview is built on: the parsed resume merged with
 * what the institution knows (derived CGPA and backlogs, verified education, profile projects,
 * skills with their source). Verified facts are marked so prompts can tell them from claims.
 */
class CandidateProfileBuilder
{
    /**
     * @return array{name: string, department: string, year: string, cgpa: float|null, activeBacklogs: int, cgpaVerified: bool,
     *               education: list<array>, skills: list<array>, projects: list<array>, experience: list<array>}
     */
    public function build(Student $student, ?Resume $resume): array
    {
        $student->loadMissing(['academicSummary', 'education', 'projects', 'studentSkills.skill']);
        $parsed = $resume?->parsed_data ?? [];
        $summary = $student->academicSummary;

        $projects = collect($parsed['projects'] ?? [])
            ->map(fn (array $p) => [...$p, 'source' => 'resume'])
            ->concat($student->projects->map(fn (StudentProject $p) => [
                'title' => $p->title, 'techStack' => $p->tech_stack ?? [], 'description' => $p->description, 'metrics' => null, 'source' => 'profile',
            ]))
            ->unique(fn (array $p) => strtolower(trim((string) $p['title'])))
            ->values();

        return [
            'name' => $student->name,
            'department' => $student->department_code,
            'year' => (string) $student->year,
            'cgpa' => $summary?->cgpa ?? $student->cgpa,
            'cgpaVerified' => (bool) $summary?->isDerived(),
            'activeBacklogs' => (int) ($summary?->active_backlogs ?? 0),
            'education' => $student->education->map(fn ($e) => [
                'level' => $e->level, 'institution' => $e->institution_name, 'score' => "{$e->score} {$e->score_type}",
                'verified' => $e->verified_at !== null,
            ])->all() ?: ($parsed['education'] ?? []),
            'skills' => $student->studentSkills->map(fn (StudentSkill $s) => [
                'name' => $s->skill?->name, 'level' => $s->trustedLevel(), 'source' => $s->source, 'verified' => $s->verified_level !== null,
            ])->filter(fn (array $s) => $s['name'])->values()->all(),
            'projects' => $projects->take(6)->all(),
            'experience' => array_slice($parsed['experience'] ?? [], 0, 4),
        ];
    }

    /** Compact text block for prompts (spec §4.2 "Candidate Context"). */
    public function forPrompt(array $profile): string
    {
        $skills = collect($profile['skills'])->map(fn ($s) => $s['name'].($s['verified'] ? ' (verified)' : ''))->implode(', ');
        $projects = collect($profile['projects'])->map(fn ($p) => '- '.$p['title']
            .($p['techStack'] ? ' ['.implode(', ', $p['techStack']).']' : '')
            .($p['metrics'] ? ' — claims: '.$p['metrics'] : ''))->implode("\n");
        $degree = collect($profile['education'])->map(fn ($e) => $e['degree'] ?? $e['level'] ?? null)->filter()->first() ?? 'not stated';
        $cgpa = $profile['cgpa'] !== null ? $profile['cgpa'].($profile['cgpaVerified'] ? ' (institution-verified)' : ' (self-reported)') : 'not available';

        return "- Academic background: {$degree}, {$profile['department']}, {$profile['year']}, CGPA: {$cgpa}\n"
            ."- Key Projects:\n".($projects ?: '- none listed')."\n"
            .'- Stated Skills: '.($skills ?: 'none listed');
    }
}
