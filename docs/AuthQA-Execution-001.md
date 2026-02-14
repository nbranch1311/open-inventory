# Auth QA Execution 001 (`T-004.8-API` Final Gate Re-Run)

Date: 2026-02-14  
Owner: QA Agent  
Scope: Deterministic seeded-account verification for auth/session P0 lines + controlled signup probe.

## Environment + Seeded Account Inputs (Gate Prerequisite)

Evidence source: `docs/EnvSplitChecklist001.md` requires seeded QA accounts in both dev and staging and explicit env split (dev confirmation OFF, staging confirmation ON).

### Confirmed from evidence

- Active rerun environment behaved as confirmation ON (`signupProbe.requiresEmailConfirmation: true`).
- A seeded account email was exercised successfully in that environment: `nbranch1311@gmail.com`.

### Required per-environment seeded account inputs (must be present before next gate rerun)

| Env | Required Inputs | Evidence Status |
| --- | --- | --- |
| dev (confirmation OFF target) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `QA_DEV_EMAIL`, `QA_DEV_PASSWORD`, `QA_DEV_ACCOUNT_CONFIRMED` (expected `true` for reusable seeded login), `QA_DEV_ACCOUNT_HAS_HOUSEHOLD` (expected `false` for onboarding-success path start) | Not fully documented in current evidence set; must be explicitly recorded before rerun. |
| staging (confirmation ON target) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `QA_STAGING_EMAIL`, `QA_STAGING_PASSWORD`, `QA_STAGING_ACCOUNT_CONFIRMED` (expected `true` for seeded-login checks), `QA_STAGING_ACCOUNT_HAS_HOUSEHOLD` (declare expected state for each test leg) | Partially documented: seeded email evidence exists (`nbranch1311@gmail.com`), but password + account-state inputs are not recorded in this doc set. |

Note: Credentials must remain in secure secret storage and must not be committed.

## Final P0 Status Matrix

| P0 Scenario | Status | Evidence |
| --- | --- | --- |
| Signup confirmation OFF (dev) | not_run | Controlled probe produced confirmation-required behavior (no immediate session), so OFF branch was not active in this environment during this run. |
| Signup confirmation ON (staging/prod) | passed | Controlled signup probe stayed on `/signup` with alert `Confirm your email, then sign in to continue.` |
| Login success | passed | Seeded account (`nbranch1311@gmail.com`) signed in successfully and redirected to `/dashboard`. |
| Login invalid credentials | passed | Prior P0 evidence remains valid from deterministic Playwright run: invalid credentials stayed on `/login` with safe error. |
| Protected route unauth (`/dashboard`, `/onboarding`) | passed | Prior strict unauth route assertion evidence remains valid: both routes redirect to `/login` when unauthenticated. |
| Session sign out (menu/action) | passed | Seeded session sign-out via account menu redirected to `/login`. |
| Back button after sign out | passed | After sign-out and redirect, browser back stayed on `/login`; authenticated routes were not restored. |
| Session expiry behavior | passed | Cookie-clear simulation while signed in redirected protected route request (`/dashboard`) to `/login`. |
| Onboarding success (first household) | not_run | Full deterministic signup->onboarding chain not reachable in this environment because signup required email confirmation. |
| Onboarding policy failure (`42501`) | passed | Prior regression evidence remains valid from unit coverage (`household.test.ts` `42501` mapping checks). |

## Deterministic Evidence (Commands + Key Output)

1) Seeded account + controlled signup probe  
Command:

`pnpm exec node <<'EOF' ... EOF`

Key output:
- `seeded.loginSuccess: true`
- `seeded.postLoginUrl: http://localhost:3000/dashboard`
- `seeded.sessionExpiryRedirectedToLogin: true`
- `seeded.signOutRedirectedToLogin: true`
- `seeded.postLogoutProtected.dashboard: http://localhost:3000/login`
- `seeded.postLogoutProtected.onboarding: http://localhost:3000/login`
- `seeded.backButtonBlocked: true`
- `signupProbe.postSignupUrl: http://localhost:3000/signup`
- `signupProbe.alertText: confirm your email, then sign in to continue.`
- `signupProbe.blockedByRateLimit: false`
- `signupProbe.requiresEmailConfirmation: true`
- `signupProbe.fullChainReachedDashboard: false`

2) Prior deterministic P0 supporting evidence (still applicable)  
Commands:

- `CI= pnpm exec playwright test qa-auth-p0.spec.ts qa-browser-pass.spec.ts --project=chromium --config=playwright.config.ts --workers=1`
- `pnpm test -- src/actions/household.test.ts src/actions/auth.test.ts src/utils/supabase/middleware.test.ts`

Key output:
- Playwright prior run: `14 passed, 2 skipped` (skips were signup-dependent lines)
- Unit prior run: `Test Files 3 passed (3)`, `Tests 9 passed (9)`

## Blockers

1) **Environment behavior mismatch vs release-critical chain requirement**
- Signup in this environment currently behaves as confirmation-required (`ON`), so the immediate deterministic chain
  `signup -> login -> onboarding -> household creation -> dashboard`
  cannot be completed from a single automated signup attempt.

2) **Remaining P0 lines not_run**
- `Signup confirmation OFF (dev)`
- `Onboarding success (first household)` via fresh deterministic signup path

## Gate Decision

`T-004.8-API` remains **blocked / not gate-ready** in this rerun.  
Do not mark backlog done: most blocked auth/session P0 lines moved to `passed` via seeded-account evidence, but release-critical onboarding-success chain remains `not_run` in the active confirmation-required environment.

## Deterministic Run Plan For Next Gate Pass (`T-004.9-EnvSplit` -> `T-004.8`)

This run plan is evidence-constrained and only uses currently documented env split requirements plus existing command evidence.

### 0) Preflight inputs (must be populated)

- Dev OFF credentials: `QA_DEV_EMAIL`, `QA_DEV_PASSWORD`.
- Staging ON credentials: `QA_STAGING_EMAIL`, `QA_STAGING_PASSWORD` (if reusing `nbranch1311@gmail.com`, keep password in secret store only).
- Env endpoints for each run leg: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 1) OFF checks (dev target environment)

Use dev project values (confirmation OFF target) and run:

1. `CI= pnpm exec playwright test qa-auth-p0.spec.ts qa-browser-pass.spec.ts --project=chromium --config=playwright.config.ts --workers=1`
2. `pnpm test -- src/actions/household.test.ts src/actions/auth.test.ts src/utils/supabase/middleware.test.ts`
3. `pnpm exec node <<'EOF' ... EOF` seeded + controlled signup probe (same harness family as current evidence)

Expected gate-relevant outcomes:
- Signup OFF path passes (no confirmation-required block).
- Fresh signup chain reaches onboarding and first household creation success.
- Existing login/session/route-guard lines remain passing.

### 2) ON checks (staging target environment)

Use staging project values (confirmation ON target) and run:

1. `CI= pnpm exec playwright test qa-auth-p0.spec.ts qa-browser-pass.spec.ts --project=chromium --config=playwright.config.ts --workers=1`
2. `pnpm test -- src/actions/household.test.ts src/actions/auth.test.ts src/utils/supabase/middleware.test.ts`
3. `pnpm exec node <<'EOF' ... EOF` controlled signup probe + seeded login/session checks

Expected gate-relevant outcomes:
- Signup ON path shows confirmation guidance and no false session.
- Seeded confirmed account still passes login/session/route-guard checks.
- No regressions in `42501` safe-error mapping coverage.

### 3) Evidence recording requirements

- Record env label (`dev` or `staging`) alongside each command result.
- Record the exact seeded email used for each env run leg.
- Keep passwords redacted; record only whether credential pair was valid.
- Do not mark a scenario as passed without matching command output evidence.
