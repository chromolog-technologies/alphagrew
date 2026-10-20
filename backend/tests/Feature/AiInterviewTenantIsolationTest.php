<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\InteractsWithInterviews;
use Tests\TestCase;

/**
 * AI Interview Journey §7.4: a student can never reach another institution's (or another
 * student's) interviews and resumes — 404, as if they did not exist.
 */
class AiInterviewTenantIsolationTest extends TestCase
{
    use InteractsWithInterviews;
    use RefreshDatabase;

    /** @var array<string, int> */
    private array $ids = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->createForeignInterviews();
    }

    public function test_other_institutions_and_other_students_interviews_return_404(): void
    {
        foreach (['otherInstitution', 'sameInstitution'] as $owner) {
            $interview = $this->ids["{$owner}Interview"];
            $turn = $this->ids["{$owner}Turn"];

            foreach ([
                ['get', "/api/v1/interviews/{$interview}", []],
                ['post', "/api/v1/interviews/{$interview}/start", ['consentAccepted' => true]],
                ['post', "/api/v1/interviews/{$interview}/turns/{$turn}/answer", ['answerText' => 'Injected answer']],
                ['post', "/api/v1/interviews/{$interview}/finish", []],
                ['get', "/api/v1/interviews/{$interview}/evaluation", []],
                ['get', "/api/v1/interviews/{$interview}/skill-gap", []],
            ] as [$method, $uri, $data]) {
                $this->asUser()->json($method, $uri, $data)->assertNotFound();
            }
        }

        $this->asUser()->getJson("/api/v1/students/me/resumes/{$this->ids['otherInstitutionResume']}")->assertNotFound();
        $this->asUser()->deleteJson("/api/v1/students/me/resumes/{$this->ids['otherInstitutionResume']}")->assertNotFound();

        $this->assertDatabaseHas('ai_interview_turns', ['id' => $this->ids['otherInstitutionTurn'], 'answer_text' => null]);
        $this->assertDatabaseHas('ai_interviews', ['id' => $this->ids['otherInstitutionInterview'], 'status' => 'in_progress']);
        $this->assertDatabaseHas('resumes', ['id' => $this->ids['otherInstitutionResume']]);
    }

    public function test_a_turn_of_another_interview_cannot_be_answered_through_your_own(): void
    {
        [$own] = $this->startInterview();

        $this->answer($own, $this->ids['sameInstitutionTurn'], 'Wrong turn')->assertNotFound();
    }

    public function test_lists_only_show_your_own_records(): void
    {
        [$own] = $this->startInterview();

        $this->asUser()->getJson('/api/v1/students/me/interviews')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $own);
        $this->asUser()->getJson('/api/v1/students/me/resumes')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_staff_cannot_use_the_student_endpoints(): void
    {
        $this->asUser('admin@demo.com')->getJson("/api/v1/interviews/{$this->ids['sameInstitutionInterview']}")->assertForbidden();
    }

    private function createForeignInterviews(): void
    {
        $now = now();
        $b = Institution::query()->create(['name' => 'Second College', 'code' => 'SECOND', 'slug' => 'second', 'status' => 'active'])->id;
        $bStudent = DB::table('students')->insertGetId([
            'institution_id' => $b, 'name' => 'B Student', 'email' => 'b.student@second.edu', 'registration_number' => 'BIT26CSE100',
            'department_code' => 'CSE', 'year' => 'year_1', 'gender' => 'prefer_not_to_say', 'status' => 'active', 'cgpa' => 8,
            'attendance' => 90, 'fee_status' => 'paid', 'skills' => '[]', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $classmate = Student::query()->where('email', 'anjali.iyer@brightnode.edu')->firstOrFail();

        $this->ids['otherInstitutionResume'] = DB::table('resumes')->insertGetId([
            'institution_id' => $b, 'student_id' => $bStudent, 'title' => 'B resume', 'file_path' => 'x.pdf', 'file_name' => 'x.pdf',
            'file_size_bytes' => 10, 'file_hash' => str_repeat('a', 64), 'mime_type' => 'application/pdf', 'status' => 'parsed',
            'is_default' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);

        foreach (['otherInstitution' => [$b, $bStudent], 'sameInstitution' => [$classmate->institution_id, $classmate->id]] as $owner => [$institution, $student]) {
            $this->ids["{$owner}Interview"] = DB::table('ai_interviews')->insertGetId([
                'institution_id' => $institution, 'student_id' => $student, 'mode' => 'technical', 'target_role' => 'Backend Engineer',
                'status' => 'in_progress', 'plan' => json_encode(['totalTargetTurns' => 4, 'competencies' => [['name' => 'REST API Design', 'category' => 'api', 'weight' => 100, 'plannedTurns' => 4]]]),
                'started_at' => $now, 'created_at' => $now, 'updated_at' => $now,
            ]);
            $this->ids["{$owner}Turn"] = DB::table('ai_interview_turns')->insertGetId([
                'institution_id' => $institution, 'interview_id' => $this->ids["{$owner}Interview"], 'sequence' => 1, 'kind' => 'question',
                'competency' => 'REST API Design', 'difficulty' => 2, 'question_text' => 'What is REST?', 'asked_at' => $now,
            ]);
        }
    }
}
