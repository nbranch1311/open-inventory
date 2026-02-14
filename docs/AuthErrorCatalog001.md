# Auth Error Catalog 001

## Purpose

Map auth/session/onboarding failures to user-safe messages and logging policy.

## Error Policy

- User-facing messages should be clear, short, and actionable.
- Internal error details (codes, stack traces, policy metadata) should be logged, not shown directly.
- Never expose secrets or raw policy SQL in user-visible copy.

## Catalog

| Error Code / Condition | Typical Source | User Message | Logging Level | Notes |
| --- | --- | --- | --- | --- |
| `invalid_credentials` | Login | "Email or password is incorrect." | `info` | Do not reveal which field failed. |
| `email_not_confirmed` | Login / session check | "Please confirm your email before signing in." | `info` | Only enforced where confirmation is ON. |
| `session_expired` | Middleware/session refresh | "Your session expired. Please sign in again." | `info` | Expected operational case. |
| `42501_rls_households` | Onboarding household create | "We couldn't create your household right now. Please try again." | `error` | Capture user ID, request ID, and RLS context internally. |
| `household_membership_missing` | Post-create membership step | "We couldn't finish account setup. Please retry." | `error` | Critical onboarding reliability issue. |
| `network_or_timeout` | Auth calls / server action | "Network issue. Please check your connection and try again." | `warn` | Add retry guidance. |
| `unknown_auth_error` | Any auth flow | "Something went wrong. Please try again." | `error` | Include correlation/request id in logs. |

## Logging Guidance

- `info`: expected user-correctable states.
- `warn`: transient or recoverable failures.
- `error`: policy failures, onboarding flow failures, persistent server-side issues.

## UX Rules

- No silent redirects on failed auth/onboarding mutation.
- Surface one clear error region per form.
- Keep copy consistent across desktop/mobile and light/dark modes.
