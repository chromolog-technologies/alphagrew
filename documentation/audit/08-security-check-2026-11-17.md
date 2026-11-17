# First security check, 17 November 2026

A first pass, not a full audit. Covered: secrets in code and git history, data readable without signing in, one user reaching another's data by changing an ID, user input reaching the database or the page, and rate limits.

## Findings and fixes

| # | Severity | Problem | Fix | Test |
|---|---|---|---|---|
| 1 | High | `PUT /auth/profile` changed the email and password without the current password, so a held session could take over the account. | `currentPassword` is required when the email or password changes (`UpdateProfileRequest`); the old address is emailed after an email change (`EmailAddressChanged`); the route is limited to 5 a minute (`throttle:account`). The Edit profile form asks for the current password and hides the new one. | `AuthOnboardingTest` |
| 2 | Medium | CSV exports let names typed by users run as spreadsheet formulas (Owner Console institution export, placement student CSV). | Shared guards `App\Support\Csv` and `frontend/src/lib/csv.ts` prefix `= + - @`, tab and carriage return with an apostrophe; used by every export. | `CsvTest`, `OwnerOperationsTest`, `csv.test.ts` |
| 3 | Medium | The production Apache config allowed directory listings (`/storage/staff-images/`). | `Options -Indexes +FollowSymLinks` in `backend/docker/apache.conf`; CI checks it. Also: the entrypoint now runs `storage:link`, and `storage/app` is a volume (mount persistent storage there). | CI `backend-image` job |
| 4 | Low | The two signed file links had no rate limit. | `throttle:files`, 60 a minute per address. | `RateLimitTest` |
| 5 | Low | Visitor text in the demo-request email could add clickable links (Markdown). | `App\Support\MailText::escape` on every visitor value, and on the user's name in `EmailAddressChanged`. | `DemoRequestTest` |
| 6 | Low | Student registration had no daily cap. | 50 a day per address, as well as 30 a minute. | `RateLimitTest` |
| 7 | Low | An early prototype `database.sqlite` with fake users and plaintext demo passwords is in git history (`159134d`, removed in `d32005d`). | No rewrite needed: the credentials are not used by any code, seeder or account. Do not reuse them anywhere. | n/a |

## Checked and found sound

- No API keys, tokens, private keys or app keys in the code or the full git history; no `.env` was ever committed.
- Public routes are the intended ones (sign-in, MFA, password reset, registration, invitations, demo requests, `/up`, signed file links that expire in 10 minutes). Uploaded files have random names.
- All 55 ID routes a student can reach check ownership (`StudentSelfRequest::ownRecord`, `OwnInterviewRequest`, `OfferActions::respond`, `visibleTo` filters, `scopeBindings`). Institutions are separated by a global scope; staff see only their department's students; recruiters see none.
- Raw SQL holds fixed text only; sort columns are allow-listed; the dashboard builder uses allow-listed columns and operators with bound or float-cast values. No model is open to mass assignment.
- No raw HTML in React, no unescaped Blade output, and URL fields reject `javascript:` and `data:` links.
