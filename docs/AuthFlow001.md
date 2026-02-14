# Auth Flow 001

## Purpose

Define the auth/session state machine and redirect contract for MVP.

## Auth Mode Policy (By Environment)

- Development: Email confirmation can be OFF for fast local iteration.
- Staging: Email confirmation ON.
- Production: Email confirmation ON.

Any exception requires product owner approval and a dated note in this doc.

Environment provisioning and readiness checklist is tracked in `docs/EnvSplitChecklist001.md`.

### Policy Validation Status (2026-02-14)

- Dev target project ref: `vsjihxrquvhajeljhuzh` (`inventory`).
- Staging target project ref: `lsqeeunbupisvkqpzypi` (`inventory-staging`).
- Current validation state:
  - Dev `confirmation OFF`: **manual dashboard verification required**.
  - Staging `confirmation ON`: behavioral evidence exists in `docs/AuthQA-Execution-001.md`, but dashboard setting still requires manual confirmation evidence for deterministic gate closure.
- Manual verification instruction (both environments):
  1. Open Supabase dashboard for the environment project.
  2. Navigate to `Authentication -> Providers -> Email`.
  3. Verify `Confirm email` toggle matches policy (dev OFF, staging ON).
  4. Add timestamped screenshot evidence to `docs/AuthQA-Execution-001.md`.

## Redirect Contract by State

### 1) `unauthenticated`

- Allowed: `/`, `/login`, `/signup`.
- Blocked/protected: `/dashboard`, `/onboarding`, and authenticated app routes.
- Redirect rule: protected routes -> `/login`.

### 2) `authenticated_no_household`

- Allowed: `/onboarding`, account-related routes.
- Redirect rule:
  - from `/login` or `/signup` -> `/onboarding`
  - from protected inventory routes -> `/onboarding`

### 3) `authenticated_with_household`

- Redirect rule:
  - from `/login` or `/signup` -> `/dashboard`
  - default app entry -> `/dashboard`

### 4) `expired_session`

- Behavior: treat as unauthenticated after middleware/session refresh.
- Redirect rule: protected routes -> `/login`.
- UX note: show concise "Session expired, please sign in again."

### 5) `unconfirmed_email`

- Behavior: block authenticated app routes until confirmation (staging/prod).
- Redirect rule: to `/login` with user-facing guidance.
- UX note: show "Check your email to confirm your account."

## State Machine (MVP)

1. Visitor -> signup/login.
2. Auth success -> check household membership.
3. No household -> onboarding.
4. Household created + owner membership created -> dashboard.
5. Sign out/expiry -> unauthenticated state.

## Ownership and Change Control

- Owner: Product + Backend + Security.
- Any redirect contract change must update:
  - `docs/TaskBacklog.md`
  - this document
  - related QA matrix scenarios.
