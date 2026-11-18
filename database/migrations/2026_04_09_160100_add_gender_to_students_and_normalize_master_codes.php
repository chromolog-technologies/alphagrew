<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('gender')->default('prefer_not_to_say')->after('year');
        });

        DB::table('students')->update(['gender' => 'prefer_not_to_say']);

        foreach ([
            'students' => [
                'year' => ['1st Year' => 'year_1', '2nd Year' => 'year_2', '3rd Year' => 'year_3', '4th Year' => 'year_4'],
                'status' => ['Active' => 'active', 'Placement Ready' => 'placement_ready', 'Placed' => 'placed'],
                'fee_status' => ['Paid' => 'paid', 'Pending' => 'pending'],
            ],
            'companies' => [
                'status' => ['Upcoming' => 'upcoming', 'Open' => 'open', 'Closing Soon' => 'closing_soon', 'Closed' => 'closed'],
                'type' => ['Placement' => 'placement', 'Internship' => 'internship'],
            ],
            'announcements' => [
                'audience' => ['All' => 'all', 'Students' => 'students', 'Staff' => 'staff', 'Admin' => 'admin'],
                'priority' => ['High' => 'high', 'Medium' => 'medium', 'Low' => 'low'],
            ],
        ] as $table => $columns) {
            foreach ($columns as $column => $mapping) {
                foreach ($mapping as $legacy => $normalized) {
                    DB::table($table)->where($column, $legacy)->update([$column => $normalized]);
                }
            }
        }
    }

    public function down(): void
    {
        foreach ([
            'students' => [
                'year' => ['year_1' => '1st Year', 'year_2' => '2nd Year', 'year_3' => '3rd Year', 'year_4' => '4th Year'],
                'status' => ['active' => 'Active', 'placement_ready' => 'Placement Ready', 'placed' => 'Placed'],
                'fee_status' => ['paid' => 'Paid', 'pending' => 'Pending'],
            ],
            'companies' => [
                'status' => ['upcoming' => 'Upcoming', 'open' => 'Open', 'closing_soon' => 'Closing Soon', 'closed' => 'Closed'],
                'type' => ['placement' => 'Placement', 'internship' => 'Internship'],
            ],
            'announcements' => [
                'audience' => ['all' => 'All', 'students' => 'Students', 'staff' => 'Staff', 'admin' => 'Admin'],
                'priority' => ['high' => 'High', 'medium' => 'Medium', 'low' => 'Low'],
            ],
        ] as $table => $columns) {
            foreach ($columns as $column => $mapping) {
                foreach ($mapping as $normalized => $legacy) {
                    DB::table($table)->where($column, $normalized)->update([$column => $legacy]);
                }
            }
        }

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
    }
};
