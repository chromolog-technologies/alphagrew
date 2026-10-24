<?php

namespace App\Http\Requests\Students\Me;

class SaveStudentCertificationRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'issuer' => ['required', 'string', 'max:255'],
            'issuedOn' => ['nullable', 'date', 'before_or_equal:today'],
            'expiresOn' => ['nullable', 'date', 'after_or_equal:issuedOn'],
            'credentialUrl' => ['nullable', 'url', 'max:255'],
            'sortOrder' => ['nullable', 'integer', 'min:0', 'max:999'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function attributesForModel(): array
    {
        $v = $this->validated();

        return [
            'name' => $v['name'],
            'issuer' => $v['issuer'],
            'issued_on' => $v['issuedOn'] ?? null,
            'expires_on' => $v['expiresOn'] ?? null,
            'credential_url' => $v['credentialUrl'] ?? null,
            // Keep the current position on update unless a new one is sent.
            ...(isset($v['sortOrder']) ? ['sort_order' => $v['sortOrder']] : []),
        ];
    }
}
