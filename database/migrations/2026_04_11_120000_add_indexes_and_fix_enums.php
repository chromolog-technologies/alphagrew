<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add critical indexes using raw SQL with IF NOT EXISTS for safety
        $connection = Schema::getConnection();
        
        try {
            // students table indexes
            if (Schema::hasColumn('students', 'department_code')) {
                $connection->statement('ALTER TABLE students ADD INDEX IF NOT EXISTS students_department_code_index (department_code)');
            }
            if (Schema::hasColumn('students', 'status')) {
                $connection->statement('ALTER TABLE students ADD INDEX IF NOT EXISTS students_status_index (status)');
            }
            if (Schema::hasColumn('students', 'year')) {
                $connection->statement('ALTER TABLE students ADD INDEX IF NOT EXISTS students_year_index (year)');
            }
            if (Schema::hasColumn('students', 'email')) {
                $connection->statement('ALTER TABLE students ADD INDEX IF NOT EXISTS students_email_index (email)');
            }
        } catch (\Exception $e) {
            // silently ignore
        }

        try {
            // users table indexes
            if (Schema::hasColumn('users', 'department_code')) {
                $connection->statement('ALTER TABLE users ADD INDEX IF NOT EXISTS users_department_code_index (department_code)');
            }
            if (Schema::hasColumn('users', 'email')) {
                $connection->statement('ALTER TABLE users ADD INDEX IF NOT EXISTS users_email_index (email)');
            }
        } catch (\Exception $e) {
            // silently ignore
        }

        try {
            // company_applications table indexes
            if (Schema::hasColumn('company_applications', 'student_id')) {
                $connection->statement('ALTER TABLE company_applications ADD INDEX IF NOT EXISTS company_applications_student_id_index (student_id)');
            }
            if (Schema::hasColumn('company_applications', 'company_id')) {
                $connection->statement('ALTER TABLE company_applications ADD INDEX IF NOT EXISTS company_applications_company_id_index (company_id)');
            }
            if (Schema::hasColumn('company_applications', 'created_at')) {
                $connection->statement('ALTER TABLE company_applications ADD INDEX IF NOT EXISTS company_applications_created_at_index (created_at)');
            }
        } catch (\Exception $e) {
            // silently ignore
        }

        try {
            // announcements table indexes
            if (Schema::hasColumn('announcements', 'audience')) {
                $connection->statement('ALTER TABLE announcements ADD INDEX IF NOT EXISTS announcements_audience_index (audience)');
            }
            if (Schema::hasColumn('announcements', 'priority')) {
                $connection->statement('ALTER TABLE announcements ADD INDEX IF NOT EXISTS announcements_priority_index (priority)');
            }
            if (Schema::hasColumn('announcements', 'created_at')) {
                $connection->statement('ALTER TABLE announcements ADD INDEX IF NOT EXISTS announcements_created_at_index (created_at)');
            }
        } catch (\Exception $e) {
            // silently ignore
        }

        try {
            // companies table indexes
            if (Schema::hasColumn('companies', 'status')) {
                $connection->statement('ALTER TABLE companies ADD INDEX IF NOT EXISTS companies_status_index (status)');
            }
        } catch (\Exception $e) {
            // silently ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop indexes
    }
};
