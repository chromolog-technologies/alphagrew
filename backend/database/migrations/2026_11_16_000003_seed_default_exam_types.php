<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Exam types are shared by every institution, and only the demo seeder created any, so a real
 * install could not schedule an exam. Adds the standard types that are missing; existing rows
 * (and their ids, which exams refer to) are left alone. Codes match AcademicDemoSeeder.
 */
return new class extends Migration
{
    private const TYPES = [
        // code, name, max marks, passing marks, weightage
        ['ESE', 'End Semester', 100, 40, 60],
        ['MID', 'Mid Term', 100, 40, 40],
        ['IA', 'Internal Assessment', 50, 20, 20],
        ['PRAC', 'Practical', 100, 40, 30],
        ['ASGN', 'Assignment', 25, 10, 10],
    ];

    public function up(): void
    {
        foreach (self::TYPES as [$code, $name, $max, $pass, $weight]) {
            if (DB::table('exam_types')->where('code', $code)->exists()) {
                continue;
            }

            DB::table('exam_types')->insert([
                'code' => $code, 'name' => $name, 'max_marks' => $max, 'passing_marks' => $pass,
                'weightage' => $weight, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Kept: exams may already refer to these types.
    }
};
