<?php

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('alphagrew:super-admin {email} {name} {--password=}', function (string $email, string $name) {
    $password = $this->option('password') ?: $this->secret('Password (min 8 characters)');

    $validator = Validator::make(
        ['email' => $email, 'name' => $name, 'password' => $password],
        [
            'email' => ['required', 'email', 'unique:users,email'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ],
    );

    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $message) {
            $this->error($message);
        }

        return 1;
    }

    $user = User::query()->create([
        'name' => $name,
        'email' => $email,
        'password' => $password,
        'role' => UserRole::SuperAdmin->value,
        'institution_id' => null,
        'title' => 'Super Admin',
        'email_verified_at' => now(),
    ]);
    $user->syncRoles([Role::findOrCreate(UserRole::SuperAdmin->value, 'sanctum')]);

    $this->info("Super Admin {$email} created.");

    return 0;
})->purpose('Create a platform Super Admin account (not available through the API)');
