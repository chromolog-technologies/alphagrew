# Auth and account

Paths are relative to `/api/v1`. All requests send `Accept: application/json`. Shared shapes such as `SessionUser` and `CampusDataset` are defined in [README.md](README.md#shared-shapes).

| Endpoint | Auth | Who |
|---|---|---|
| `POST /auth/login` | Public | Everyone except recruiters |
| `POST /auth/register` | Public | Students (self-registration) |
| `GET /auth/me` | Bearer | All signed-in users |
| `PUT /auth/profile` | Bearer | All signed-in users |
| `POST /auth/logout` | Bearer | All signed-in users |
| `GET /auth/sessions` | Bearer | All signed-in users |
| `DELETE /auth/sessions` | Bearer | All signed-in users |
| `DELETE /auth/sessions/{session}` | Bearer | All signed-in users |
| `POST /auth/forgot-password` | Public | Everyone |
| `POST /auth/reset-password` | Public | Everyone |
| `POST /auth/email/verification-notification` | Bearer | All signed-in users |
| `GET /auth/email/verify/{id}/{hash}` | Signed URL | Link from the verification email |
| `GET /invitations/accept/{token}` | Public | Invitees |
| `POST /invitations/accept/{token}` | Public | Invitees |

---

## POST /auth/login

Signs a user in and returns a bearer token plus the caller's campus dataset.

**Rate limit:** `login` (5 per minute per email and IP, 120 per minute per IP).

**Headers**

```http
Accept: application/json
Content-Type: application/json
```

**Body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | required, email |
| `password` | string | required |

```json
{ "email": "admin@college.edu", "password": "secret123" }
```

**200 OK**

```json
{
  "token": "12|kQ9pX...Fz",
  "user": SessionUser,
  "data": CampusDataset
}
```

**Errors**

| Status | Message |
|---|---|
| 422 | `Invalid credentials.` (unknown email or wrong password) |
| 423 | `Too many failed sign-in attempts. Try again in N minutes or reset your password.` (10 wrong passwords lock the account for 15 minutes) |
| 403 | `The recruiter portal is not available yet. Contact the placement office of the institution that invited you.` |
| 403 | `Your registration is waiting for approval by your institution.` (status `pending_approval`) |
| 403 | `Your registration was not approved. Contact your institution.` plus the rejection reason (status `rejected`) |
| 403 | `Your account is suspended. Contact your institution administrator.` (status `suspended`) |
| 403 | `Your institution account is inactive. Contact your institution administrator.` |
| 422 | Validation errors on `email` or `password` |
| 429 | Rate limit |

A successful login resets the failed-attempt counter and re-syncs the user's Spatie permissions from role and designation.

---

## POST /auth/register

Student self-registration. The account is created with status `pending_approval` and a verification email is sent. **No token is issued.** The student can sign in once an admin approves the registration (see `POST /registrations/{registration}/approve` in [03-people.md](03-people.md)).

**Rate limit:** `register` (30 per minute per IP).

**Body**

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `email` | string | required, email, max 255, unique across users and students |
| `password` | string | required, min 8 |
| `institutionCode` | string | required, max 50. Must match an **active** institution's code (case-insensitive). |
| `departmentCode` | string | required, max 20. Must exist in that institution. |

```json
{
  "name": "Rahul Menon",
  "email": "rahul@college.edu",
  "password": "Str0ngPass!",
  "institutionCode": "ABC-ENGG",
  "departmentCode": "CSE"
}
```

**201 Created**

```json
{
  "message": "Registration received. Verify your email address; you can sign in once your institution approves your registration.",
  "user": SessionUser
}
```

**Errors:** 422 with `errors.institutionCode` = `No active institution uses this code. Check the code your institution gave you.` or `errors.departmentCode` = `This department does not exist at your institution.`

---

## GET /auth/me

Returns the signed-in user.

**200 OK**

```json
{ "user": SessionUser }
```

---

## PUT /auth/profile

Updates the signed-in user's own account. Works for every role.

**Body**

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `email` | string | required, email, max 255, unique among users except yourself |
| `title` | string | required, max 255 |
| `password` | string or null | optional, min 8. Leave out or send `null` to keep the current password. |

```json
{ "name": "Asha Raman", "email": "asha@college.edu", "title": "Assistant Professor", "password": null }
```

**Side effects**

- Changing `email` clears `emailVerified` and sends a new verification email.
- Changing `password` signs out every other device. The current token stays valid.
- For a student, `name` and `email` are copied to the student record.

**200 OK**

```json
{ "user": SessionUser, "data": CampusDataset }
```

---

## POST /auth/logout

Revokes the token used for this request.

**200 OK**

```json
{ "message": "Logged out successfully." }
```

---

## GET /auth/sessions

Lists the user's active tokens (one per sign-in), most recently used first.

**200 OK**

```json
{
  "data": [
    {
      "id": 12,
      "device": "Mozilla/5.0 (Windows NT 10.0; Win64; x64",
      "createdAt": "2026-10-28T08:00:00+00:00",
      "lastUsedAt": "2026-10-28T09:12:44+00:00",
      "expiresAt": "2026-10-28T20:00:00+00:00",
      "current": true
    }
  ]
}
```

`expiresAt` is `null` when `SANCTUM_EXPIRATION` is unset.

## DELETE /auth/sessions/{session}

Signs out one device. `{session}` is an `id` from the list above.

**200 OK:** `{ "message": "Signed out of that device." }`

**404** when the id is not one of your tokens.

## DELETE /auth/sessions

Signs out every device except the one making the request.

**200 OK**

```json
{ "message": "Signed out of 3 other device(s).", "revoked": 3 }
```

---

## POST /auth/forgot-password

Emails a password reset link. The response is the same whether or not the address has an account.

**Rate limit:** `password-reset` (3 per minute per email and IP).

**Body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | required, email, max 255 |

**200 OK**

```json
{ "message": "If an account exists for this email, we have sent a link to reset the password." }
```

The emailed link opens the front end at `${FRONTEND_URL}/reset-password?token=...&email=...`. The front end then calls the endpoint below.

## POST /auth/reset-password

**Body**

| Field | Type | Rules |
|---|---|---|
| `token` | string | required, from the link |
| `email` | string | required, email |
| `password` | string | required, min 8, confirmed |
| `password_confirmation` | string | required, must match `password` |

```json
{ "token": "4f1c...", "email": "rahul@college.edu", "password": "N3wPass!!", "password_confirmation": "N3wPass!!" }
```

**200 OK**

```json
{ "message": "Your password has been reset. Sign in with your new password." }
```

The reset also clears any account lock and **signs out every device**.

**422** with `errors.email` such as `This password reset token is invalid.` when the token is wrong or expired.

---

## POST /auth/email/verification-notification

Resends the verification email to the signed-in user.

**Rate limit:** `verification` (3 per minute per user).

**200 OK**

```json
{ "message": "We have sent a new verification link to rahul@college.edu." }
```

When already verified: `{ "message": "Your email address is already verified." }`

## GET /auth/email/verify/{id}/{hash}

The link inside the verification email. It is a signed URL and needs no token, because self-registered students cannot sign in until approved.

**Response:** HTTP 302 redirect to the front end.

| Outcome | Redirects to |
|---|---|
| Verified now, or already verified | `${FRONTEND_URL}/?verified=1` |
| Unknown user or wrong hash | `${FRONTEND_URL}/?verified=invalid` |
| Bad or expired signature | HTTP 403 `Invalid signature.` (no redirect) |

---

## GET /invitations/accept/{token}

Public preview of an invitation, for the accept page. `{token}` is the 48-character token from the invitation email.

**Rate limit:** `invitation` (30 per minute per IP).

**200 OK**

```json
{
  "data": {
    "email": "new.staff@college.edu",
    "role": "staff",
    "departmentCode": "CSE",
    "institutionName": "ABC College of Engineering",
    "status": "pending",
    "expiresAt": "2026-11-04T09:00:00+00:00"
  }
}
```

`status` is one of `pending`, `accepted`, `revoked`, `expired`. **404** for an unknown token.

## POST /invitations/accept/{token}

Creates the invited account, marks the email as verified, and signs the new user in.

**Body**

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `password` | string | required, min 8, confirmed |
| `password_confirmation` | string | required |

```json
{ "name": "Kiran Das", "password": "Welc0me!!", "password_confirmation": "Welc0me!!" }
```

**201 Created:** same body as login.

```json
{ "token": "15|...", "user": SessionUser, "data": CampusDataset }
```

**Errors**

| Status | Message |
|---|---|
| 404 | Unknown token |
| 409 | `This invitation is accepted. Ask your institution for a new one.` (also `revoked` or `expired`) |
| 409 | `An account with this email already exists. Sign in instead.` |
| 409 | `The department on this invitation no longer exists. Ask your institution for a new invitation.` |
| 409 | `The designation on this invitation no longer exists. Ask your institution for a new invitation.` |
| 403 | `This institution is not accepting new accounts. Contact your institution.` |
