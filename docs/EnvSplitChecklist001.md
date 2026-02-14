# Env Split Checklist 001 (Dev + Staging Auth Gate)

## Purpose

Create a deterministic environment strategy so auth/onboarding QA can complete without forcing GO.

## Target Environment Model

- **Dev Supabase project**
  - Goal: fast iteration and deterministic QA execution
  - Email confirmation: **OFF**
  - Signup rate limits: relaxed for controlled QA windows
  - Seeded QA accounts: required
- **Staging Supabase project**
  - Goal: production-like auth behavior verification
  - Email confirmation: **ON**
  - Signup rate limits: production-like
  - Confirmation-email path: required

## Required Variables and Config

For each environment, maintain separate values for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase project ref
- QA seeded user credentials (stored securely; never committed)

Recommended local env files:

- `.env.local` (active environment for local run)
- `.env.dev.example` and `.env.staging.example` templates

## Checklist (Must Complete Before Next Gate Run)

### 1) Provision and Link

- [ ] Create/confirm dedicated **dev** Supabase project.
- [ ] Create/confirm **staging** Supabase project.
- [ ] Verify MCP/tooling can target both projects explicitly.
- [ ] Record project refs and URLs in internal runbook notes.

### 2) Auth Settings

- [ ] Dev: email confirmation OFF.
- [ ] Staging: email confirmation ON.
- [ ] Signup rate limits documented for both environments.
- [ ] Temporary QA window process documented (if rate-limit adjustments are needed).

### 3) Database and Security Parity

- [ ] Apply latest schema migrations to dev.
- [ ] Apply latest schema migrations to staging.
- [ ] Apply latest RLS/security migrations to dev.
- [ ] Apply latest RLS/security migrations to staging.
- [ ] Generate and verify TS types against active target env.

### 4) QA Credentials and Data

- [ ] Seed at least one reusable QA account in dev.
- [ ] Seed at least one reusable QA account in staging (or controlled confirmation flow account).
- [ ] Ensure seeded accounts can reach onboarding if no household exists.
- [ ] Ensure household cleanup/reset procedure exists for repeated deterministic runs.

Required per-env credential inputs to record in secure runbook (no repo commits):
- Dev (`confirmation OFF` target): `QA_DEV_EMAIL`, `QA_DEV_PASSWORD`, confirmed-state flag, household-state flag.
- Staging (`confirmation ON` target): `QA_STAGING_EMAIL`, `QA_STAGING_PASSWORD`, confirmed-state flag, household-state flag.

### 5) QA Gate Readiness Mapping

- [ ] Map `docs/AuthQA-Matrix001.md` rows to **dev** vs **staging** execution targets.
- [ ] Mark which scenarios are expected in each env:
  - Dev: confirmation OFF path
  - Staging: confirmation ON path
- [ ] Update `docs/AuthQA-Execution-001.md` with environment labels on evidence.

## Exit Criteria

This checklist is complete only when:

1. Both environments are configured and reachable.
2. Auth mode behavior is deterministic by environment.
3. P0 scenarios have an executable environment plan without `not_run` due to setup gaps.
4. Project Reviewer confirms gate can be re-run without environment ambiguity.

## Owner Sign-off

- Product Owner: Pending
- DevOps/Infra Agent: Pending
- QA Agent: Pending
