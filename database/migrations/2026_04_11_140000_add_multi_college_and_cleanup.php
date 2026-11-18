<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Fix data types for better precision
        Schema::table('students', function (Blueprint $table) {
            // Change year to integer (1-4)
            // DB::statement("ALTER TABLE students MODIFY year TINYINT UNSIGNED");
            
            // Fix CGPA precision
            // DB::statement("ALTER TABLE students MODIFY cgpa DECIMAL(4,2)");
            
            // Fix attendance as percentage (0-100)
            // DB::statement("ALTER TABLE students MODIFY attendance DECIMAL(5,2)");
        });

        // 2. Add Multi-College Support (Foundation)
        if (!Schema::hasTable('colleges')) {
            Schema::create('colleges', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code')->unique();
                $table->string('location')->nullable();
                $table->string('principal_name')->nullable();
                $table->string('principal_email')->nullable();
                $table->string('phone')->nullable();
                $table->text('description')->nullable();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamps();
                $table->softDeletes();

                // Fulltext indexes are only supported on MySQL/MariaDB/PostgreSQL.
                if (DB::getDriverName() !== 'sqlite') {
                    $table->fullText('name');
                }
            });
        }

        // Add college_id to all relevant tables (will be backfilled)
        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'college_id')) {
                $table->foreignId('college_id')
                    ->nullable()
                    ->constrained('colleges')
                    ->onDelete('restrict');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'college_id')) {
                $table->foreignId('college_id')
                    ->nullable()
                    ->constrained('colleges')
                    ->onDelete('restrict');
            }
        });

        Schema::table('departments', function (Blueprint $table) {
            if (!Schema::hasColumn('departments', 'college_id')) {
                $table->foreignId('college_id')
                    ->nullable()
                    ->constrained('colleges')
                    ->onDelete('cascade');
            }
            $table->index('college_id');
        });

        Schema::table('announcements', function (Blueprint $table) {
            if (!Schema::hasColumn('announcements', 'college_id')) {
                $table->foreignId('college_id')
                    ->nullable()
                    ->constrained('colleges')
                    ->onDelete('cascade');
            }
            $table->index('college_id');
        });

        Schema::table('companies', function (Blueprint $table) {
            if (!Schema::hasColumn('companies', 'college_id')) {
                $table->foreignId('college_id')
                    ->nullable()
                    ->constrained('colleges')
                    ->onDelete('cascade');
            }
            $table->index('college_id');
        });

        // 3. Add Demo Reset Tracking
        if (!Schema::hasTable('demo_reset_logs')) {
            Schema::create('demo_reset_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')
                    ->nullable()
                    ->constrained('users')
                    ->onDelete('set null');
                $table->dateTime('reset_at');
                $table->text('reason')->nullable();
                $table->json('deleted_records')->nullable();
                $table->timestamps();
                
                $table->index('reset_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (Schema::hasColumn('students', 'college_id')) {
                $table->dropForeignKey(['college_id']);
                $table->dropColumn('college_id');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'college_id')) {
                $table->dropForeignKey(['college_id']);
                $table->dropColumn('college_id');
            }
        });

        Schema::table('departments', function (Blueprint $table) {
            if (Schema::hasColumn('departments', 'college_id')) {
                $table->dropIndex(['college_id']);
                $table->dropForeignKey(['college_id']);
                $table->dropColumn('college_id');
            }
        });

        Schema::table('announcements', function (Blueprint $table) {
            if (Schema::hasColumn('announcements', 'college_id')) {
                $table->dropIndex(['college_id']);
                $table->dropForeignKey(['college_id']);
                $table->dropColumn('college_id');
            }
        });

        Schema::table('companies', function (Blueprint $table) {
            if (Schema::hasColumn('companies', 'college_id')) {
                $table->dropIndex(['college_id']);
                $table->dropForeignKey(['college_id']);
                $table->dropColumn('college_id');
            }
        });

        Schema::dropIfExists('colleges');
        Schema::dropIfExists('demo_reset_logs');
    }
};
