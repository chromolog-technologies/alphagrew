<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\BuildsMarksFixtures;
use Tests\TestCase;

/**
 * Student documents: upload, review, signed download, and who may do what.
 */
class StudentDocumentTest extends TestCase
{
    use BuildsMarksFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->buildMarksFixtures();
        Storage::fake('local');
    }

    public function test_students_upload_and_staff_verify(): void
    {
        $id = $this->asUser('student@demo.com')
            ->post('/api/v1/students/me/documents', ['type' => 'mark_sheet', 'title' => 'Class 12 mark sheet', 'file' => UploadedFile::fake()->create('marks.pdf', 200, 'application/pdf')])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->json('data.id');

        $this->asUser('student@demo.com')->withHeader('Accept', 'application/json')
            ->post('/api/v1/students/me/documents', ['type' => 'other', 'title' => 'x', 'file' => UploadedFile::fake()->create('virus.exe', 10)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
        $this->asUser('student@demo.com')->getJson('/api/v1/students/me/documents')->assertJsonCount(1, 'data');

        // Review: rejection needs a reason; verification is for students.edit (admins).
        $this->asUser('faculty@dsc.test')->postJson("/api/v1/student-documents/{$id}/review", ['status' => 'verified'])->assertForbidden();
        $this->asUser('admin@demo.com')->postJson("/api/v1/student-documents/{$id}/review", ['status' => 'rejected'])->assertJsonValidationErrors('remarks');
        $this->asUser('admin@demo.com')->getJson('/api/v1/student-documents/pending')->assertJsonCount(1, 'data');
        $this->asUser('admin@demo.com')->postJson("/api/v1/student-documents/{$id}/review", ['status' => 'verified'])->assertOk()->assertJsonPath('data.status', 'verified');

        // A verified document stays.
        $this->asUser('student@demo.com')->deleteJson("/api/v1/students/me/documents/{$id}")->assertStatus(422);

        // Staff who can see the student list the documents.
        $student = DB::table('students')->where('email', 'student@demo.com')->value('id');
        $this->asUser('admin@demo.com')->getJson("/api/v1/students/{$student}/documents")->assertJsonPath('data.0.title', 'Class 12 mark sheet');
    }

    public function test_files_are_served_through_short_lived_signed_links_only(): void
    {
        $id = $this->asUser('student@demo.com')
            ->post('/api/v1/students/me/documents', ['type' => 'id_proof', 'title' => 'Aadhaar', 'file' => UploadedFile::fake()->create('id.png', 50, 'image/png')])
            ->json('data.id');

        $this->get("/api/v1/files/student-documents/{$id}")->assertForbidden();

        $url = $this->asUser('student@demo.com')->getJson("/api/v1/student-documents/{$id}/link")->assertOk()->json('data.url');
        $this->app['auth']->forgetGuards();
        $this->withoutToken()->get($url)->assertOk();

        // Staff of another department cannot see this (CSE) student, so get no link.
        $this->asUser('faculty@dsc.test')->getJson("/api/v1/student-documents/{$id}/link")->assertForbidden();
    }
}
