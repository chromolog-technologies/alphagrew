<?php

namespace Tests\Feature;

use App\Models\AiResumeAnalysis;
use App\Models\Resume;
use App\Models\StudentSkill;
use App\Services\Resumes\ResumeParser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\InteractsWithInterviews;
use Tests\Support\ResumeFixtures;
use Tests\TestCase;

/**
 * AI Interview Journey §3 phase A and §7.1: upload → parse → analyse, for PDF and DOCX resumes,
 * with the deterministic parser (AI off) and with an LLM response.
 */
class ResumeParserTest extends TestCase
{
    use InteractsWithInterviews;
    use RefreshDatabase;

    private const RESUME = [
        'Rahul Sharma',
        'rahul@example.com | +91 98765 43210 | github.com/rahul',
        'Education',
        'B.Tech in Computer Science, Brightnode Institute of Technology, 2027, CGPA 8.7/10',
        'Class XII, Kendriya Vidyalaya School, 2023, 91.4%',
        'Technical Skills',
        'Languages: Java, Python, SQL',
        'Frameworks: Spring Boot, React',
        'Projects',
        'FastQueue (Go, Raft)',
        '- Built a distributed queue handling 10k req/s with Raft consensus',
        'Experience',
        'Backend Intern at Acme Corp, Jun 2025',
        '- Reduced API latency by 40% using Redis caching',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Storage::fake('local');
    }

    public function test_pdf_and_docx_resumes_parse_into_the_same_structure(): void
    {
        $parser = app(ResumeParser::class);

        foreach ([['application/pdf', ResumeFixtures::pdf(self::RESUME)], [ResumeParser::DOCX, ResumeFixtures::docx(self::RESUME)]] as [$mime, $file]) {
            $data = $parser->heuristic($parser->extractText($file, $mime));

            $this->assertSame('B.Tech', $data['education'][0]['degree'], $mime);
            $this->assertSame('Brightnode Institute of Technology', $data['education'][0]['institution']);
            $this->assertSame(2027, $data['education'][0]['graduationYear']);
            $this->assertSame('CGPA 8.7', $data['education'][0]['score']);
            $this->assertSame('Class XII', $data['education'][1]['degree']);

            $this->assertSame(['Java', 'Python', 'SQL', 'Spring Boot', 'React'], array_column($data['skills'], 'name'));
            $this->assertSame('Languages', $data['skills'][0]['category']);

            $this->assertSame('FastQueue', $data['projects'][0]['title']);
            $this->assertSame(['Go', 'Raft'], $data['projects'][0]['techStack']);
            $this->assertSame('10k req/s', $data['projects'][0]['metrics']);

            $this->assertSame('Backend Intern', $data['experience'][0]['role']);
            $this->assertSame('Acme Corp', $data['experience'][0]['organisation']);
            $this->assertSame('Jun 2025', $data['experience'][0]['startDate']);
        }
    }

    public function test_upload_parses_analyses_and_adds_resume_skills(): void
    {
        $id = $this->asUser()->post('/api/v1/students/me/resumes', [
            'title' => 'Backend – Oct 2026',
            'file' => self::upload('rahul.pdf', ResumeFixtures::pdf(self::RESUME)),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'parsing')
            ->assertJsonPath('data.isDefault', true)
            ->json('data.id');

        $resume = Resume::query()->findOrFail($id);
        Storage::disk('local')->assertExists($resume->file_path);
        $this->assertStringStartsWith("institutions/{$resume->institution_id}/students/{$resume->student_id}/resumes/", $resume->file_path);

        // Queued jobs ran synchronously: parsed, then analysed.
        $this->asUser()->getJson("/api/v1/students/me/resumes/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'parsed')
            ->assertJsonPath('data.parsedData.projects.0.title', 'FastQueue');

        $this->asUser()->getJson("/api/v1/students/me/resumes/{$id}/analysis")
            ->assertOk()
            ->assertJsonPath('data.modelVersion', 'rules-1.0')
            ->assertJsonStructure(['data' => ['overallScore', 'atsCompatibilityScore', 'sectionScores' => ['education', 'skills', 'experience', 'formatting'], 'strengths', 'improvements']]);

        $python = StudentSkill::query()->where('student_id', $resume->student_id)->whereHas('skill', fn ($q) => $q->where('name', 'Python'))->firstOrFail();
        $this->assertSame([StudentSkill::SOURCE_RESUME, null], [$python->source, $python->verified_level]);

        $this->asUser()->getJson('/api/v1/students/me/readiness-score')
            ->assertOk()
            ->assertJsonPath('data.components.resume.score', AiResumeAnalysis::query()->value('overall_score'))
            ->assertJsonPath('data.components.assessments.score', null);
    }

    public function test_llm_extraction_is_used_when_ai_is_on(): void
    {
        $this->scriptAi(['resume_parse' => [
            'education' => [['institution' => 'IIT Madras', 'degree' => 'B.Tech', 'graduationYear' => 2027, 'score' => '9.1 CGPA']],
            'skills' => [['name' => 'Rust', 'category' => 'Languages', 'proficiencyHint' => 'advanced'], ['name' => '', 'category' => null, 'proficiencyHint' => null]],
            'experience' => [],
            'projects' => [['title' => 'Kernel', 'techStack' => ['Rust'], 'description' => null, 'metrics' => null, 'unexpected' => 'dropped']],
        ]]);

        $data = app(ResumeParser::class)->structure('any text');

        $this->assertSame('IIT Madras', $data['education'][0]['institution']);
        $this->assertSame(['Rust'], array_column($data['skills'], 'name')); // blank names dropped
        $this->assertArrayNotHasKey('unexpected', $data['projects'][0]);
    }

    public function test_uploads_are_validated_by_content_and_deduplicated(): void
    {
        $this->asUser()->post('/api/v1/students/me/resumes', [
            'title' => 'Not a resume',
            'file' => self::upload('resume.pdf', "MZ\x90\x00 this is an executable"),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $docx = ResumeFixtures::docx(self::RESUME);
        $upload = fn () => $this->asUser()->post('/api/v1/students/me/resumes', [
            'title' => 'Word version',
            'file' => self::upload('rahul.docx', $docx),
        ], ['Accept' => 'application/json']);

        $upload()->assertCreated();
        $upload()->assertUnprocessable()->assertJsonPath('message', 'You have already uploaded this file.');
    }

    public function test_a_scanned_pdf_fails_with_an_actionable_reason(): void
    {
        $id = $this->asUser()->post('/api/v1/students/me/resumes', [
            'title' => 'Scan',
            'file' => self::upload('scan.pdf', ResumeFixtures::pdf([])),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        $this->asUser()->getJson("/api/v1/students/me/resumes/{$id}")
            ->assertJsonPath('data.status', 'failed')
            ->assertJsonPath('data.parseError', 'No readable text found. Scanned (image-only) PDFs are not supported yet; upload a text-based PDF or a DOCX.');
        $this->asUser()->getJson("/api/v1/students/me/resumes/{$id}/analysis")->assertNotFound();
    }

    /**
     * A real uploaded file whose MIME type is sniffed from its bytes, as in production.
     * (UploadedFile::fake() reports a type from the file name, which would hide content checks.)
     */
    private static function upload(string $name, string $content): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'upl');
        file_put_contents($path, $content);

        return new UploadedFile($path, $name, null, null, true);
    }

    public function test_deleting_the_default_promotes_the_next_resume(): void
    {
        $upload = fn (string $name, array $lines) => $this->asUser()->post('/api/v1/students/me/resumes', [
            'title' => $name,
            'file' => self::upload("{$name}.pdf", ResumeFixtures::pdf($lines)),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        $first = $upload('first', self::RESUME);
        $second = $upload('second', [...self::RESUME, 'Certifications', 'AWS Cloud Practitioner']);

        $this->asUser()->deleteJson("/api/v1/students/me/resumes/{$first}")->assertOk()->assertJsonPath('message', 'Resume deleted');

        $this->asUser()->getJson('/api/v1/students/me/resumes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $second)
            ->assertJsonPath('data.0.isDefault', true);
    }
}
