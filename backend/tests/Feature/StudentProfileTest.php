<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Skill;
use App\Models\Student;
use App\Models\StudentProject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Student Journey spec steps 2 (profile) and 6 (skills).
 */
class StudentProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_demo_skills_are_mapped_onto_the_catalogue(): void
    {
        $response = $this->withToken($this->tokenFor('student@demo.com'))
            ->getJson('/api/v1/students/me/skills')
            ->assertOk();

        $this->assertSame(['Node.js', 'React', 'SQL'], array_column($response->json('data'), 'name'));
        $this->assertSame(['self', 'self', 'self'], array_column($response->json('data'), 'source'));
        $this->assertFalse(Skill::query()->whereIn('name', ['Node.js', 'React', 'SQL'])->where('needs_review', true)->exists());
    }

    public function test_student_reads_and_updates_their_profile(): void
    {
        $token = $this->tokenFor('student@demo.com');

        $this->withToken($token)->getJson('/api/v1/students/me/profile')
            ->assertOk()
            ->assertJsonPath('data.headline', null)
            ->assertJsonPath('data.visibility.contact', false)
            ->assertJsonPath('data.completeness.percent', 20); // 3 demo skills

        $this->withToken($token)->putJson('/api/v1/students/me/profile', [
            'headline' => 'Final-year CSE, backend focus',
            'about' => 'I build APIs.',
            'githubUrl' => 'https://github.com/rahul',
            'preferredRoles' => ['Backend Developer'],
            'visibility' => ['contact' => true, 'unknownSection' => true],
        ])
            ->assertOk()
            ->assertJsonPath('data.headline', 'Final-year CSE, backend focus')
            ->assertJsonPath('data.visibility.contact', true)
            ->assertJsonMissingPath('data.visibility.unknownSection')
            ->assertJsonPath('data.completeness.percent', 55); // skills 20 + basics 15 + links 10 + preferences 10

        // Fields not sent are left unchanged.
        $this->withToken($token)->putJson('/api/v1/students/me/profile', ['city' => 'Kochi'])
            ->assertOk()
            ->assertJsonPath('data.headline', 'Final-year CSE, backend focus')
            ->assertJsonPath('data.city', 'Kochi');

        $this->withToken($token)->putJson('/api/v1/students/me/profile', ['githubUrl' => 'not a url'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('githubUrl');
    }

    public function test_only_students_use_the_me_endpoints(): void
    {
        $this->withToken($this->tokenFor('admin@demo.com'))
            ->getJson('/api/v1/students/me/profile')
            ->assertForbidden();
    }

    public function test_projects_crud_and_ownership(): void
    {
        $token = $this->tokenFor('student@demo.com');
        $payload = ['title' => 'Campus API', 'techStack' => ['Laravel', 'MySQL'], 'startDate' => '2026-01-10'];

        $first = $this->withToken($token)->postJson('/api/v1/students/me/projects', $payload)
            ->assertCreated()
            ->assertJsonPath('data.sortOrder', 1)
            ->json('data.id');
        $this->withToken($token)->postJson('/api/v1/students/me/projects', [...$payload, 'title' => 'Second'])
            ->assertCreated()
            ->assertJsonPath('data.sortOrder', 2);

        $this->withToken($token)->putJson("/api/v1/students/me/projects/{$first}", [...$payload, 'title' => 'Campus API v2'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Campus API v2')
            ->assertJsonPath('data.sortOrder', 1);

        $this->withToken($token)->postJson('/api/v1/students/me/projects', [...$payload, 'endDate' => '2025-01-01'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('endDate');

        // Another student's project in the same institution is not reachable.
        $other = StudentProject::query()->create([
            'institution_id' => Institution::defaultId(),
            'student_id' => Student::query()->where('email', 'anjali.iyer@brightnode.edu')->value('id'),
            'title' => 'Not yours',
        ]);
        $this->withToken($token)->putJson("/api/v1/students/me/projects/{$other->id}", $payload)->assertNotFound();
        $this->withToken($token)->deleteJson("/api/v1/students/me/projects/{$other->id}")->assertNotFound();

        $this->withToken($token)->deleteJson("/api/v1/students/me/projects/{$first}")->assertNoContent();
        $this->withToken($token)->getJson('/api/v1/students/me/projects')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Second');
    }

    public function test_certifications_and_experience(): void
    {
        $token = $this->tokenFor('student@demo.com');

        $this->withToken($token)->postJson('/api/v1/students/me/certifications', [
            'name' => 'AWS Cloud Practitioner',
            'issuer' => 'Amazon',
            'issuedOn' => '2026-03-01',
        ])->assertCreated()->assertJsonPath('data.issuer', 'Amazon');

        $this->withToken($token)->postJson('/api/v1/students/me/experience', [
            'type' => 'internship',
            'organisation' => 'Zoho',
            'role' => 'Backend Intern',
            'startDate' => '2026-05-01',
            'endDate' => '2026-07-31',
        ])->assertCreated()->assertJsonPath('data.type', 'internship');

        $this->withToken($token)->postJson('/api/v1/students/me/experience', [
            'type' => 'volunteering',
            'organisation' => 'X',
            'role' => 'Y',
            'startDate' => '2026-05-01',
        ])->assertUnprocessable()->assertJsonValidationErrors('type');
    }

    public function test_skill_search_and_student_skill_update(): void
    {
        $token = $this->tokenFor('student@demo.com');

        $this->withToken($token)->getJson('/api/v1/skills?search=reactjs')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'React');

        $react = Skill::query()->where('name', 'React')->value('id');
        $python = Skill::query()->where('name', 'Python')->value('id');

        $this->withToken($token)->putJson('/api/v1/students/me/skills', [
            'skills' => [
                ['skillId' => $react, 'level' => 4],
                ['skillId' => $python, 'level' => 2],
            ],
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Python')
            ->assertJsonPath('data.1.name', 'React')
            ->assertJsonPath('data.1.level', 4);

        // A skill that belongs to another institution can't be used.
        $otherInstitution = Institution::query()->create(['name' => 'Other', 'code' => 'OTHER', 'slug' => 'other', 'status' => 'active']);
        $foreign = DB::table('skills')->insertGetId([
            'institution_id' => $otherInstitution->id, 'name' => 'Secret Skill', 'slug' => 'secret-skill',
            'lookup_key' => 'secretskill', 'category' => 'domain', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->withToken($token)->putJson('/api/v1/students/me/skills', ['skills' => [['skillId' => $foreign, 'level' => 3]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('skills.0.skillId');

        $this->withToken($token)->deleteJson("/api/v1/students/me/skills/{$python}")->assertNoContent();
        $this->withToken($token)->deleteJson("/api/v1/students/me/skills/{$python}")->assertNotFound();
    }

    public function test_admin_student_form_maps_free_text_skills(): void
    {
        $this->withToken($this->tokenFor('admin@demo.com'))
            ->postJson('/api/v1/students', [
                'name' => 'Skill Mapper',
                'email' => 'skills@example.com',
                'departmentCode' => 'CSE',
                'year' => 'year_1',
                'gender' => 'prefer_not_to_say',
                'cgpa' => 8,
                'attendance' => 90,
                'feeStatus' => 'pending',
                'password' => 'secret123',
                'skills' => ['ReactJS', 'Quantum Basket Weaving'],
            ])
            ->assertCreated()
            ->assertJsonPath('student.skills', ['Quantum Basket Weaving', 'React']);

        $custom = Skill::withoutGlobalScopes()->where('name', 'Quantum Basket Weaving')->firstOrFail();
        $this->assertTrue($custom->needs_review);
        $this->assertSame(Institution::defaultId(), $custom->institution_id);
    }

    public function test_photo_upload_is_served_only_through_a_signed_url(): void
    {
        Storage::fake('local');
        $token = $this->tokenFor('student@demo.com');

        $photoUrl = $this->withToken($token)
            ->post('/api/v1/students/me/profile/photo', ['photo' => $this->pngUpload()], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('data.photoUrl');

        $this->assertNotNull($photoUrl);
        $this->get($photoUrl)->assertOk();
        $this->get(strtok($photoUrl, '?'))->assertForbidden();

        $this->withToken($token)
            ->post('/api/v1/students/me/profile/photo', ['photo' => UploadedFile::fake()->create('me.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable();
    }

    public function test_completed_profile_records_completion_time(): void
    {
        Storage::fake('local');
        $token = $this->tokenFor('student@demo.com');

        $this->withToken($token)->putJson('/api/v1/students/me/profile', [
            'headline' => 'Backend developer',
            'about' => 'APIs and data.',
            'phone' => '+91 90000 00000',
            'city' => 'Kochi',
            'linkedinUrl' => 'https://linkedin.com/in/rahul',
            'preferredRoles' => ['Backend Developer'],
        ])->assertOk();
        $this->withToken($token)->post('/api/v1/students/me/profile/photo', ['photo' => $this->pngUpload()], ['Accept' => 'application/json']);
        $this->withToken($token)->postJson('/api/v1/students/me/projects', ['title' => 'Campus API']);
        $this->withToken($token)->postJson('/api/v1/students/me/certifications', ['name' => 'OCP', 'issuer' => 'Oracle']);

        $this->withToken($token)->getJson('/api/v1/students/me/profile')
            ->assertOk()
            ->assertJsonPath('data.completeness.percent', 100)
            ->assertJsonPath('data.completedAt', fn ($value) => $value !== null);
    }

    public function test_staff_view_of_a_profile_respects_department(): void
    {
        $eceStudent = Student::query()->where('department_code', 'ECE')->value('id');

        $this->withToken($this->tokenFor('admin@demo.com'))
            ->getJson("/api/v1/students/{$eceStudent}/profile")
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor('staff@demo.com'))
            ->getJson("/api/v1/students/{$eceStudent}/profile")
            ->assertForbidden();
    }

    /**
     * A real PNG built without GD (not installed on every dev machine).
     */
    private function pngUpload(int $width = 200, int $height = 200): UploadedFile
    {
        $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
        $rows = str_repeat("\0".str_repeat("\xff\x80\x00", $width), $height);

        $png = "\x89PNG\r\n\x1a\n"
            .$chunk('IHDR', pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0))
            .$chunk('IDAT', gzcompress($rows))
            .$chunk('IEND', '');

        return UploadedFile::fake()->createWithContent('me.png', $png);
    }

    private function tokenFor(string $email): string
    {
        return (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])
            ->assertOk()
            ->json('token');
    }
}
