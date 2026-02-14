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

- [x] Create/confirm dedicated **dev** Supabase project.
  - Verified target: `https://vsjihxrquvhajeljhuzh.supabase.co` (project ref `vsjihxrquvhajeljhuzh`).
  - Environment mapping: **Dev = inventory project**.
- [x] Create/confirm **staging** Supabase project.
  - Verified target: `https://lsqeeunbupisvkqpzypi.supabase.co` (project ref `lsqeeunbupisvkqpzypi`).
  - Environment mapping: **Staging = dedicated OpenInventory staging project**.
- [x] Verify MCP/tooling can target both projects explicitly.
  - Verified with separate project-scoped tool targets:
    - `user-supabase-inventory-dev-*` -> dev (`vsjihxr...`)
    - `user-supabase-inventory-staging-*` -> staging (`lsqeeu...`)
- [x] Record project refs and URLs in internal runbook notes.
  - Recorded in this checklist for gate traceability (2026-02-14).

### 2) Auth Settings

- [x] Dev: email confirmation OFF.
  - Owner confirmation recorded in setup sequence.
- [x] Staging: email confirmation ON.
  - Owner confirmation recorded in setup sequence.
- [x] Signup rate limits documented for both environments.
  - Dev configured for deterministic QA reruns.
  - Staging kept production-like and currently constrains signup email throughput.
- [x] Temporary QA window process documented (if rate-limit adjustments are needed).
  - For staging ON-path signup checks, run a controlled QA window or custom SMTP ramp plan when needed.

### 3) Database and Security Parity

- [x] Apply latest schema migrations to dev.
  - Migration records present:
    - `20260214082339_fix_first_household_onboarding_rls`
    - `20260214082507_restrict_onboarding_rpc_execute_grants`
- [x] Apply latest schema migrations to staging.
  - Applied:
    - `schema_mvp_v1`
    - `security_rls_v1`
- [x] Apply latest RLS/security migrations to dev.
  - OpenInventory tables present in `public`, with RLS enabled and policy surface present on all core tables (`profiles`, `households`, `household_members`, `categories`, `locations`, `inventory_items`, `item_documents`, `item_reminders`).
- [x] Apply latest RLS/security migrations to staging.
  - Core table policy surface parity confirmed against dev.
- [ ] Generate and verify TS types against active target env.
  - Optional follow-up; gate-critical auth env split criteria are otherwise complete.

Readiness notes (schema + RLS parity check, 2026-02-14):

- **Dev (`vsjihxr...`)**: structurally ready for OpenInventory auth gate reruns (core schema + RLS policy surface exists).
- **Staging (`lsqeeu...`)**: schema + RLS parity established; seeded confirmed user present.

### 4) QA Credentials and Data

- [x] Seed at least one reusable QA account in dev.
  - Dev signup-based deterministic flow executed successfully in current rerun evidence.
- [x] Seed at least one reusable QA account in staging (or controlled confirmation flow account).
  - `nbranch1311@gmail.com` seeded and confirmed.
- [x] Ensure seeded accounts can reach onboarding if no household exists.
  - Staging account is seeded for ON-policy verification.
- [ ] Ensure household cleanup/reset procedure exists for repeated deterministic runs.
  - Follow-up documentation still recommended.

Required per-env credential inputs to record in secure runbook (no repo commits):
- Dev (`confirmation OFF` target): `QA_DEV_EMAIL`, `QA_DEV_PASSWORD`, confirmed-state flag, household-state flag.
- Staging (`confirmation ON` target): `QA_STAGING_EMAIL`, `QA_STAGING_PASSWORD`, confirmed-state flag, household-state flag.

Strategy confirmation:
- QA account strategy is documented and usable for deterministic seeded-login/session checks in current evidence (`docs/AuthQA-Execution-001.md`).
- Strategy is not yet sufficient for deterministic full-chain signup->onboarding success coverage across split environments.

### 5) QA Gate Readiness Mapping

- [x] Map `docs/AuthQA-Matrix001.md` rows to **dev** vs **staging** execution targets.
  - Matrix explicitly separates `Email confirmation OFF (dev)` and `Email confirmation ON (staging/prod)` P0 paths.
- [x] Mark which scenarios are expected in each env:
  - Dev: confirmation OFF path
  - Staging: confirmation ON path
- [x] Update `docs/AuthQA-Execution-001.md` with environment labels on evidence.
  - Added explicit project refs/URLs and run classification notes (2026-02-14).

## Exit Criteria

This checklist is complete only when:

1. Both environments are configured and reachable.
2. Auth mode behavior is deterministic by environment.
3. P0 scenarios have an executable environment plan without `not_run` due to setup gaps.
4. Project Reviewer confirms gate can be re-run without environment ambiguity.

## Owner Sign-off

- Product Owner: Pending
- DevOps/Infra Agent: Signed Off for `T-004.9-EnvSplit` (2026-02-14)
  - Remaining risk is now staging signup throughput/rate-limit behavior, tracked under `T-004.8-API` gate rerun.
- QA Agent: Signed Off for environment split readiness; awaiting final `T-004.8` GO/NO-GO rerun after staging ON signup window.
