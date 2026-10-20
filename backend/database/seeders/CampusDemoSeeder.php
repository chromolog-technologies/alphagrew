<?php

namespace Database\Seeders;

use App\Actions\Students\SyncStudentSkillNamesAction;
use App\Models\Institution;
use App\Models\Student;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Services\Campus\CampusDataService;
use App\Enums\UserRole;
use App\Support\Placement\LegacyCompanyImporter;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class CampusDemoSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
            // All demo data is handled by this seeder using Spatie permissions system

            $defaultDesignationId = null; // For staff users if needed

            DB::table('role_has_permissions')->delete();
            DB::table('model_has_roles')->delete();
            DB::table('model_has_permissions')->delete();
            DB::table('roles')->delete();
            DB::table('permissions')->delete();
            DB::table('job_application_events')->delete();
            DB::table('job_applications')->delete();
            DB::table('eligibility_rules')->delete();
            DB::table('job_postings')->delete();
            DB::table('placement_drives')->delete();
            DB::table('company_applications')->delete();
            DB::table('announcements')->delete();
            DB::table('students')->delete();
            DB::table('companies')->delete();
            DB::table('departments')->delete();
            DB::table('users')->delete();
            DB::table('designations')->delete();

            $institutionId = Institution::query()->firstOrCreate(
                ['code' => Institution::DEFAULT_CODE],
                ['name' => 'Default Institution', 'slug' => 'default', 'status' => 'active'],
            )->id;

            DB::table('users')->insert([
                [
                    'id' => 1,
                    'name' => 'Dr. Nandita Roy',
                    'email' => 'admin@demo.com',
                    'password' => Hash::make('demo123'),
                    'role' => UserRole::InstitutionAdmin->value,
                    'institution_id' => $institutionId,
                    'title' => 'Campus Administrator',
                    'department_code' => null,
                    'designation_id' => null,
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => 2,
                    'name' => 'Meera Nair',
                    'email' => 'staff@demo.com',
                    'password' => Hash::make('demo123'),
                    'role' => UserRole::Staff->value,
                    'institution_id' => $institutionId,
                    'title' => 'Department Coordinator',
                    'department_code' => 'CSE',
                    'designation_id' => $defaultDesignationId,
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => 3,
                    'name' => 'Rahul Sharma',
                    'email' => 'student@demo.com',
                    'password' => Hash::make('demo123'),
                    'role' => UserRole::Student->value,
                    'institution_id' => $institutionId,
                    'title' => 'Final Year Student',
                    'department_code' => 'CSE',
                    'designation_id' => null,
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => 4,
                    'name' => 'Arvind Menon',
                    'email' => 'placement@demo.com',
                    'password' => Hash::make('demo123'),
                    'role' => UserRole::PlacementOfficer->value,
                    'institution_id' => $institutionId,
                    'title' => 'Training & Placement Officer',
                    'department_code' => null,
                    'designation_id' => null,
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);

            app(CampusDataService::class)->sync([
                'users' => [
                    [
                        'id' => 1,
                        'name' => 'Dr. Nandita Roy',
                        'email' => 'admin@demo.com',
                        'role' => UserRole::InstitutionAdmin->value,
                        'title' => 'Campus Administrator',
                    ],
                    [
                        'id' => 2,
                        'name' => 'Meera Nair',
                        'email' => 'staff@demo.com',
                        'role' => 'staff',
                        'title' => 'Department Coordinator',
                        'designationId' => $defaultDesignationId,
                        'departmentCode' => 'CSE',
                    ],
                    [
                        'id' => 3,
                        'name' => 'Rahul Sharma',
                        'email' => 'student@demo.com',
                        'role' => 'student',
                        'title' => 'Final Year Student',
                        'departmentCode' => 'CSE',
                    ],
                ],
                'designations' => [],  // Handled via DesignationObserver when users are synced
                'masters' => [],  // Keep for backward compatibility
                'departments' => [],  // Can be added here if needed
                'students' => [
                    ['id' => 1, 'name' => 'Rahul Sharma', 'email' => 'student@demo.com', 'registrationNumber' => 'BIT23CSE001', 'departmentCode' => 'CSE', 'year' => '4th Year', 'status' => 'Placement Ready', 'cgpa' => 8.7, 'attendance' => 92, 'phone' => '+1 555-0101', 'mentor' => 'Dr. Meera Thomas', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [2], 'skills' => ['React', 'Node.js', 'SQL']],
                    ['id' => 2, 'name' => 'Anjali Iyer', 'email' => 'anjali.iyer@brightnode.edu', 'registrationNumber' => 'BIT24CSE014', 'departmentCode' => 'CSE', 'year' => '3rd Year', 'status' => 'Active', 'cgpa' => 8.4, 'attendance' => 95, 'phone' => '+1 555-0102', 'mentor' => 'Dr. Meera Thomas', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [], 'skills' => ['Python', 'UI Design', 'Figma']],
                    ['id' => 3, 'name' => 'Vikram Patel', 'email' => 'vikram.patel@brightnode.edu', 'registrationNumber' => 'BIT23ECE003', 'departmentCode' => 'ECE', 'year' => '4th Year', 'status' => 'Placed', 'cgpa' => 8.1, 'attendance' => 88, 'phone' => '+1 555-0103', 'mentor' => 'Prof. Arjun Nair', 'feeStatus' => 'Paid', 'placedCompany' => 'Infosys', 'appliedCompanyIds' => [2, 5], 'skills' => ['Embedded C', 'VLSI', 'MATLAB']],
                    ['id' => 4, 'name' => 'Sneha Kapoor', 'email' => 'sneha.kapoor@brightnode.edu', 'registrationNumber' => 'BIT25MBA004', 'departmentCode' => 'MBA', 'year' => '2nd Year', 'status' => 'Active', 'cgpa' => 8.9, 'attendance' => 93, 'phone' => '+1 555-0104', 'mentor' => 'Prof. Sandeep Iyer', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [4], 'skills' => ['Business Analytics', 'Excel', 'Presentation']],
                    ['id' => 5, 'name' => 'Arun Kumar', 'email' => 'arun.kumar@brightnode.edu', 'registrationNumber' => 'BIT23ME005', 'departmentCode' => 'ME', 'year' => '4th Year', 'status' => 'Placed', 'cgpa' => 7.6, 'attendance' => 86, 'phone' => '+1 555-0105', 'mentor' => 'Dr. Kavitha Rao', 'feeStatus' => 'Pending', 'placedCompany' => 'TCS', 'appliedCompanyIds' => [1, 5], 'skills' => ['AutoCAD', 'Manufacturing', 'Quality Control']],
                    ['id' => 6, 'name' => 'Pooja Nair', 'email' => 'pooja.nair@brightnode.edu', 'registrationNumber' => 'BIT23CSE006', 'departmentCode' => 'CSE', 'year' => '4th Year', 'status' => 'Placed', 'cgpa' => 9.1, 'attendance' => 96, 'phone' => '+1 555-0106', 'mentor' => 'Dr. Meera Thomas', 'feeStatus' => 'Paid', 'placedCompany' => 'Zoho', 'appliedCompanyIds' => [3], 'skills' => ['Java', 'Spring Boot', 'DSA']],
                    ['id' => 7, 'name' => 'Naveen Reddy', 'email' => 'naveen.reddy@brightnode.edu', 'registrationNumber' => 'BIT24ECE007', 'departmentCode' => 'ECE', 'year' => '3rd Year', 'status' => 'Active', 'cgpa' => 7.9, 'attendance' => 84, 'phone' => '+1 555-0107', 'mentor' => 'Prof. Arjun Nair', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [], 'skills' => ['Signal Processing', 'PCB Design']],
                    ['id' => 8, 'name' => 'Ishita Bose', 'email' => 'ishita.bose@brightnode.edu', 'registrationNumber' => 'BIT26MBA008', 'departmentCode' => 'MBA', 'year' => '1st Year', 'status' => 'Active', 'cgpa' => 8.3, 'attendance' => 91, 'phone' => '+1 555-0108', 'mentor' => 'Prof. Sandeep Iyer', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [], 'skills' => ['Market Research', 'Canva', 'Sales Ops']],
                    ['id' => 9, 'name' => 'Karthik Raj', 'email' => 'karthik.raj@brightnode.edu', 'registrationNumber' => 'BIT24ME009', 'departmentCode' => 'ME', 'year' => '3rd Year', 'status' => 'Placement Ready', 'cgpa' => 7.8, 'attendance' => 89, 'phone' => '+1 555-0109', 'mentor' => 'Dr. Kavitha Rao', 'feeStatus' => 'Pending', 'appliedCompanyIds' => [5], 'skills' => ['SolidWorks', 'Operations', 'Lean Systems']],
                    ['id' => 10, 'name' => 'Meghana Das', 'email' => 'meghana.das@brightnode.edu', 'registrationNumber' => 'BIT25CSE010', 'departmentCode' => 'CSE', 'year' => '2nd Year', 'status' => 'Active', 'cgpa' => 8.8, 'attendance' => 94, 'phone' => '+1 555-0110', 'mentor' => 'Dr. Meera Thomas', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [], 'skills' => ['TypeScript', 'Next.js', 'Public Speaking']],
                    ['id' => 11, 'name' => 'Rohit Jain', 'email' => 'rohit.jain@brightnode.edu', 'registrationNumber' => 'BIT23CSE011', 'departmentCode' => 'CSE', 'year' => '4th Year', 'status' => 'Placement Ready', 'cgpa' => 7.7, 'attendance' => 90, 'phone' => '+1 555-0111', 'mentor' => 'Dr. Meera Thomas', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [1], 'skills' => ['Testing', 'JavaScript', 'Git']],
                    ['id' => 12, 'name' => 'Lavanya Sen', 'email' => 'lavanya.sen@brightnode.edu', 'registrationNumber' => 'BIT25MBA012', 'departmentCode' => 'MBA', 'year' => '2nd Year', 'status' => 'Active', 'cgpa' => 8.5, 'attendance' => 88, 'phone' => '+1 555-0112', 'mentor' => 'Prof. Sandeep Iyer', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [4], 'skills' => ['CRM', 'Negotiation', 'Strategy']],
                    ['id' => 13, 'name' => 'Harish V', 'email' => 'harish.v@brightnode.edu', 'registrationNumber' => 'BIT23ECE013', 'departmentCode' => 'ECE', 'year' => '4th Year', 'status' => 'Placed', 'cgpa' => 8.0, 'attendance' => 87, 'phone' => '+1 555-0113', 'mentor' => 'Prof. Arjun Nair', 'feeStatus' => 'Paid', 'placedCompany' => 'Wipro', 'appliedCompanyIds' => [5], 'skills' => ['Digital Electronics', 'Networking']],
                    ['id' => 14, 'name' => 'Divya Menon', 'email' => 'divya.menon@brightnode.edu', 'registrationNumber' => 'BIT24CSE024', 'departmentCode' => 'CSE', 'year' => '3rd Year', 'status' => 'Active', 'cgpa' => 8.6, 'attendance' => 93, 'phone' => '+1 555-0114', 'mentor' => 'Dr. Meera Thomas', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [], 'skills' => ['Cloud Basics', 'HTML', 'CSS']],
                    ['id' => 15, 'name' => 'Pranav Kulkarni', 'email' => 'pranav.kulkarni@brightnode.edu', 'registrationNumber' => 'BIT23ME015', 'departmentCode' => 'ME', 'year' => '4th Year', 'status' => 'Active', 'cgpa' => 7.4, 'attendance' => 82, 'phone' => '+1 555-0115', 'mentor' => 'Dr. Kavitha Rao', 'feeStatus' => 'Pending', 'appliedCompanyIds' => [], 'skills' => ['Operations', 'Workshop Practice', 'Excel']],
                    ['id' => 16, 'name' => 'Sanjana Rao', 'email' => 'sanjana.rao@brightnode.edu', 'registrationNumber' => 'BIT26MBA016', 'departmentCode' => 'MBA', 'year' => '1st Year', 'status' => 'Active', 'cgpa' => 8.1, 'attendance' => 90, 'phone' => '+1 555-0116', 'mentor' => 'Prof. Sandeep Iyer', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [], 'skills' => ['Branding', 'Social Media', 'Planning']],
                    ['id' => 17, 'name' => 'Aditya Verma', 'email' => 'aditya.verma@brightnode.edu', 'registrationNumber' => 'BIT23CSE017', 'departmentCode' => 'CSE', 'year' => '4th Year', 'status' => 'Placed', 'cgpa' => 8.9, 'attendance' => 94, 'phone' => '+1 555-0117', 'mentor' => 'Dr. Meera Thomas', 'feeStatus' => 'Paid', 'placedCompany' => 'Freshworks', 'appliedCompanyIds' => [4], 'skills' => ['Data Structures', 'System Design', 'Leadership']],
                    ['id' => 18, 'name' => 'Nithya S', 'email' => 'nithya.s@brightnode.edu', 'registrationNumber' => 'BIT25ECE018', 'departmentCode' => 'ECE', 'year' => '2nd Year', 'status' => 'Active', 'cgpa' => 8.2, 'attendance' => 89, 'phone' => '+1 555-0118', 'mentor' => 'Prof. Arjun Nair', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [], 'skills' => ['Sensors', 'Circuit Design', 'Documentation']],
                    ['id' => 19, 'name' => 'Yash Malhotra', 'email' => 'yash.malhotra@brightnode.edu', 'registrationNumber' => 'BIT24ME019', 'departmentCode' => 'ME', 'year' => '3rd Year', 'status' => 'Active', 'cgpa' => 7.3, 'attendance' => 85, 'phone' => '+1 555-0119', 'mentor' => 'Dr. Kavitha Rao', 'feeStatus' => 'Pending', 'appliedCompanyIds' => [], 'skills' => ['Thermal Systems', 'Maintenance', 'Teamwork']],
                    ['id' => 20, 'name' => 'Farah Khan', 'email' => 'farah.khan@brightnode.edu', 'registrationNumber' => 'BIT25MBA020', 'departmentCode' => 'MBA', 'year' => '2nd Year', 'status' => 'Placement Ready', 'cgpa' => 8.7, 'attendance' => 92, 'phone' => '+1 555-0120', 'mentor' => 'Prof. Sandeep Iyer', 'feeStatus' => 'Paid', 'appliedCompanyIds' => [4], 'skills' => ['Operations', 'Consulting', 'Analytics']],
                ],
                'companies' => [
                    ['id' => 1, 'name' => 'TCS', 'role' => 'Graduate Engineer Trainee', 'packageOffered' => '4.2 LPA', 'driveDate' => '2026-04-20', 'status' => 'Open', 'location' => 'Hyderabad', 'type' => 'Placement', 'applicants' => 42, 'shortlisted' => 16, 'eligibleDepartments' => ['CSE', 'ECE', 'ME']],
                    ['id' => 2, 'name' => 'Infosys', 'role' => 'Systems Engineer', 'packageOffered' => '5.0 LPA', 'driveDate' => '2026-04-25', 'status' => 'Open', 'location' => 'Bengaluru', 'type' => 'Placement', 'applicants' => 38, 'shortlisted' => 11, 'eligibleDepartments' => ['CSE', 'ECE']],
                    ['id' => 3, 'name' => 'Zoho', 'role' => 'Product Support Engineer', 'packageOffered' => '6.5 LPA', 'driveDate' => '2026-04-28', 'status' => 'Closing Soon', 'location' => 'Chennai', 'type' => 'Placement', 'applicants' => 24, 'shortlisted' => 8, 'eligibleDepartments' => ['CSE']],
                    ['id' => 4, 'name' => 'Freshworks', 'role' => 'Business Operations Associate', 'packageOffered' => '5.8 LPA', 'driveDate' => '2026-05-02', 'status' => 'Upcoming', 'location' => 'Remote', 'type' => 'Placement', 'applicants' => 19, 'shortlisted' => 0, 'eligibleDepartments' => ['CSE', 'MBA']],
                    ['id' => 5, 'name' => 'Wipro', 'role' => 'Associate Analyst Intern', 'packageOffered' => '25k/month', 'driveDate' => '2026-05-05', 'status' => 'Open', 'location' => 'Coimbatore', 'type' => 'Internship', 'applicants' => 31, 'shortlisted' => 9, 'eligibleDepartments' => ['CSE', 'ECE', 'ME', 'MBA']],
                ],
                'announcements' => [
                    ['id' => 1, 'title' => 'Placement drive registration closes tomorrow', 'summary' => 'Students from CSE, ECE, and Mechanical must complete profile verification before 5 PM.', 'audience' => 'Students', 'priority' => 'High', 'postedBy' => 'Placement Cell', 'date' => '2026-04-04', 'category' => 'Placement'],
                    ['id' => 2, 'title' => 'Mid-semester exam schedule published', 'summary' => 'Department coordinators can now share room allotments and invigilator assignments.', 'audience' => 'All', 'priority' => 'Medium', 'postedBy' => 'Academic Office', 'date' => '2026-04-03', 'category' => 'Academic'],
                    ['id' => 3, 'title' => 'Faculty mentors meeting at 3:30 PM', 'summary' => 'Staff members must review attendance risk cases and submit intervention notes.', 'audience' => 'Staff', 'priority' => 'Medium', 'postedBy' => 'Dean Student Affairs', 'date' => '2026-04-02', 'category' => 'Operations'],
                    ['id' => 4, 'title' => 'Quarterly management review ready', 'summary' => 'Admin can download the placement dashboard summary and fee recovery report from Reports.', 'audience' => 'Admin', 'priority' => 'Low', 'postedBy' => 'Operations Desk', 'date' => '2026-04-01', 'category' => 'Governance'],
                    ['id' => 5, 'title' => 'Alumni mentoring week starts Monday', 'summary' => 'Students can book 1:1 mentoring slots for resume reviews, mock interviews, and career guidance.', 'audience' => 'Students', 'priority' => 'High', 'postedBy' => 'Career Services', 'date' => '2026-03-31', 'category' => 'Student Success'],
                ],
            ], $institutionId);

            // Each demo company becomes a placement drive with one job posting.
            (new LegacyCompanyImporter())->import();

            // Demo skills are free text; map them onto the skills catalogue (student_skills).
            $syncSkills = app(SyncStudentSkillNamesAction::class);
            Student::query()->get()->each(fn (Student $student) => $syncSkills->execute($student, $student->skills ?? []));

            // Departments the demo students belong to. Inserted here rather than through sync(),
            // whose department columns (hod, staff_count, intake, accent) predate the current schema.
            DB::table('departments')->insert(collect([
                'CSE' => 'Computer Science and Engineering',
                'ECE' => 'Electronics and Communication Engineering',
                'ME' => 'Mechanical Engineering',
                'MBA' => 'Business Administration',
            ])->map(fn (string $name, string $code) => [
                'institution_id' => $institutionId,
                'name' => $name,
                'code' => $code,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ])->values()->all());

            foreach (CampusPermission::all() as $permission) {
                Permission::findOrCreate($permission, 'sanctum');
            }

            foreach (CampusPermission::byRole() as $role => $permissions) {
                $roleModel = Role::findOrCreate($role, 'sanctum');
                $roleModel->syncPermissions($permissions);
            }

            // Sync user permissions based on role and designation
            // This will be automatically handled by UserObserver on user updates going forward
            User::query()->with('designation')->orderBy('id')->get()->each(function (User $user): void {
                $user->syncRoles([$user->role]);
                
                $permissions = CampusPermission::forRole($user->role, $user->designation?->permissions ?? []);

                if (!empty($permissions)) {
                    $user->syncPermissions($permissions);
                }
            });

            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });
    }
}
