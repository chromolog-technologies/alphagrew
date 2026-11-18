<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Changing the sign-in email or the password needs the current password, so a session
     * left open on a shared computer (or a stolen token) cannot take over the account.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->user()->id)],
            'title' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string', Password::min(8)],
            'currentPassword' => [
                Rule::requiredIf(fn (): bool => $this->changesCredentials()),
                'nullable',
                'string',
                'current_password:sanctum',
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'currentPassword.required' => 'Enter your current password to change your email or password.',
            'currentPassword.current_password' => 'Your current password is not correct.',
        ];
    }

    public function changesCredentials(): bool
    {
        return $this->filled('password')
            || strcasecmp((string) $this->input('email'), (string) $this->user()->email) !== 0;
    }
}
