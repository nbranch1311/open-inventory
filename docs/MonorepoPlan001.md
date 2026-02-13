# Monorepo Plan 001: Frontend + Backend + Python

**Document:** MonorepoPlan001  
**Owner:** DevOps/Infra Agent  
**Status:** Draft for Project Review  
**Last Updated:** 2026-02-13  
**Related Docs:** `docs/ADR-001-MVP-Architecture.md`, `docs/TaskBacklog.md`, `docs/Project-Review-001.md`

---

## 1) Objective

Define a low-risk migration from the current single Next.js app structure to a true monorepo that can host:

- Frontend app (Next.js)
- Backend app/services (if needed beyond Supabase + Next server actions)
- Python workers or scripts for AI/data workflows

The plan must not block current MVP feature delivery (`T-004` onward).

---

## 2) Current State (Baseline)

- Repository already uses `pnpm` and has `pnpm-workspace.yaml`.
- Current implementation is a single Next.js app at repository root (`src/app`).
- Supabase project/config is present at `supabase/`.
- Architecture direction remains Next.js + Supabase for MVP (no forced split required yet).

---

## 3) Scope and Non-Goals

### In Scope

- Introduce workspace package boundaries for multi-app development.
- Keep current web app behavior unchanged during migration.
- Add Python workspace area and execution standards.
- Define CI/CD and release strategy for multi-package changes.

### Out of Scope (for this plan phase)

- Rewriting auth/data flows away from Supabase.
- Forcing a separate backend service before it is needed.
- Migrating to microservices.

---

## 4) Target Repository Shape

```text
open-inventory/
  apps/
    web/                 # Next.js frontend (current app moved here)
    api/                 # optional Node backend (create only when needed)
    python-worker/       # Python jobs/agents
  packages/
    shared-types/        # TS shared contracts
    shared-config/       # eslint/tsconfig/prettier (optional)
  supabase/              # existing infra and DB config
  docs/
  pnpm-workspace.yaml
```

Design principle: create `apps/api` only when a real backend boundary appears. Until then, keep backend logic in `apps/web` server actions/routes + Supabase.

---

## 5) Execution Plan (Phased)

## Phase 0: Review and Approval Gate

### Actions

1. Review this document with Project Reviewer Agent.
2. Confirm that monorepo setup will not interrupt `T-004-API`.
3. Approve sequencing (perform monorepo bootstrap before or immediately after `T-004-API` starts).

### Exit Criteria

- Explicit Go/No-Go decision recorded.
- Owner confirms timing.

### Restore Checkpoint

- `checkpoint-0`: current main branch before monorepo changes.

---

## Phase 1: Workspace Bootstrap (No Behavior Changes)

### Actions

1. Create `apps/`, `packages/` folders.
2. Update `pnpm-workspace.yaml` to include `packages: ['apps/*', 'packages/*']`.
3. Move current Next.js app into `apps/web`.
4. Update root scripts to call workspace-scoped commands (e.g. `pnpm --filter web dev`).
5. Keep Supabase folder at repo root.
6. Validate local run path (`pnpm --filter web dev` or equivalent alias).

### Exit Criteria

- App runs with same behavior as pre-move.
- Build and lint pass at workspace scope.
- No production config regressions.

### Restore Checkpoint

- `checkpoint-1`: immediately after app move succeeds.

---

## Phase 2: Shared Contracts and Config

### Actions

1. Extract shared types used across apps into `packages/shared-types`.
2. Add reusable lint/tsconfig presets in `packages/shared-config` (optional).
3. Wire TypeScript path references and workspace dependencies.

### Exit Criteria

- Web app imports shared types from package path.
- No duplicate contract definitions in app folders.

### Restore Checkpoint

- `checkpoint-2`: after shared package adoption.

---

## Phase 3: Python Workspace Introduction

### Actions

1. Create `apps/python-worker` with:
   - environment management file(s)
   - task runner script(s)
   - minimal health-check command
2. Add root scripts for common Python workflows (lint/test/run).
3. Define handoff contract between web/supabase and python jobs (input/output schema).

### Exit Criteria

- Python worker can run independently in local dev.
- Integration contract documented and versioned.

### Restore Checkpoint

- `checkpoint-3`: after first Python worker command passes.

---

## Phase 4: CI/CD and Deployment Hardening

### Actions

1. Implement change-scoped CI (only affected apps/packages build/test).
2. Add per-app deployment rules and environment variable scoping.
3. Add observability checks for auth, API errors, upload failures, and worker failures.
4. Validate rollback paths per deployable component.

### Exit Criteria

- CI matrix passes for web + shared packages.
- Python workflow checks pass.
- Rollback runbook validated.

### Restore Checkpoint

- `checkpoint-4`: first full monorepo CI green run.

---

## 6) Risk Register and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| :--- | :---: | :---: | :--- |
| App move causes path/import breakage | M | H | Perform Phase 1 without logic changes; enforce smoke checks before merge |
| CI complexity increases too early | M | M | Start with simple workspace scripts, then add selective CI in Phase 4 |
| Premature backend split | M | M | Keep `apps/api` optional until clear boundary emerges |
| Python dependency drift | M | M | Pin python tooling and define single worker bootstrap script |
| Environment variable leakage across apps | L | H | Enforce env file scoping per app and secret validation in CI |

---

## 7) Reviewer Checklist (Project Review Agent)

Project Reviewer Agent should return a Go/No-Go result using this checklist:

1. Does the plan preserve MVP scope and avoid microservice creep?
2. Does Phase 1 explicitly avoid behavior changes?
3. Are restore checkpoints present for rollback confidence?
4. Are CI/CD and secret-scope controls defined before multi-app release?
5. Is Python introduction isolated and contract-driven?
6. Are backlog dependencies and sequencing with `T-004` clear?

Decision template:

- **Decision:** GO / NO-GO
- **Blocking Gaps:** list required fixes
- **Approved Next Step:** exact phase to execute next

---

## 8) Recommendation

Proceed with **Phase 0 review immediately**, then execute **Phase 1 only** as the initial monorepo increment. Defer deeper package extraction and Python integration until `T-004-API` is active and stable.

---

## 9) Project Reviewer Agent — Review Outcome

**Review Date:** 2026-02-13

### Checklist (Section 7)

| # | Criterion | Result |
| :--- | :--- | :---: |
| 1 | Plan preserves MVP scope and avoids microservice creep | ✅ Yes. `apps/api` created only when needed; Supabase + Next.js remain primary. |
| 2 | Phase 1 explicitly avoids behavior changes | ✅ Yes. "No Behavior Changes" and smoke checks before merge. |
| 3 | Restore checkpoints present for rollback | ✅ Yes. checkpoint-0 through checkpoint-4 defined. |
| 4 | CI/CD and secret-scope controls before multi-app release | ✅ Yes. Phase 4 defines them; env leakage in risk register. Phase 1 is single-app move only. |
| 5 | Python introduction isolated and contract-driven | ✅ Yes. Phase 3 defines handoff contract and versioned schema. |
| 6 | Backlog dependencies and sequencing with T-004 clear | ✅ Yes. Plan states no block on T-004; Phase 0 confirms timing (before or immediately after T-004 start). |

### Decision

**Decision:** GO

**Blocking Gaps:** None.

**Non-blocking notes:**

- **pnpm-workspace.yaml:** Repo has the file but it does not yet define a `packages` array. Phase 1 must add `packages: ['apps/*', 'packages/*']` (or equivalent) when creating `apps/` and moving the app, so `pnpm --filter web dev` and root scripts work.
- **Phase 1 scope:** Explicitly add "Update `pnpm-workspace.yaml` to include `apps/*` (and `packages/*` if created)" so the bootstrap is unambiguous.

**Approved Next Step:** Execute **Phase 0** (confirm timing with product owner), then **Phase 1: Workspace Bootstrap**. Do not start Phase 2 or 3 until Phase 1 is verified and T-004-API is underway or stable per plan recommendation.
