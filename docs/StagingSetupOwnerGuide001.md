# Staging Setup Owner Guide 001 (Option B: New Dedicated Project)

## Purpose

Provide a step-by-step owner runbook to manage staging validation without losing the intent of strict rate limits (abuse/cost control), and then hand off to agents for gate work.

## Current Status (2026-02-14)

- `T-004.9-EnvSplit`: completed.
- Current gate blocker is staging signup ON-path validation under strict limits.
- This is an environment throughput issue, not a known app-code regression.

### Owner Progress Snapshot (This Session)

- Step 1: confirmed complete.
- Step 2: confirmed complete.
- Step 3: confirmed from screenshots:
  - `Rate limit for sending emails`: `2 emails/h` in dev and staging.
  - `Rate limit for sign-ups and sign-ins`:
    - dev: `60 requests/5 min`
    - staging: `30 requests/5 min`
- Staging auth mode has been temporarily changed to confirmation OFF for execution.
- Remaining owner work: **Step 4 (define QA window)** and **Step 4.5 (confirm QA credentials)**.

## Decision Path (Choose One)

### Path A (Recommended for gate closure now)

- Keep staging as production-like.
- Open a short controlled QA window with temporary signup/email throughput increase.
- Run staging auth P0 and close `T-004.8-API` if evidence is clean.

### Path B (Accept risk and move forward now)

- Keep staging limits unchanged.
- Mark staging signup ON-path as deferred release-hardening work.
- Move forward using dev as feature-correctness gate.
- Require staging throughput validation before beta/public signup.

## Path A Detailed Runbook (Owner + Agent)

Use this section when the goal is: **resolve the highest remaining risk now** and close the gate with production-like evidence.

### Phase A1 - Owner Prep (No Agent Yet)

1. Confirm project targets:
   - Dev: `vsjihxrquvhajeljhuzh`
   - Staging: `lsqeeunbupisvkqpzypi`
2. In Supabase dashboard, verify auth mode:
   - Dev `Confirm email = OFF`
   - Staging `Confirm email = ON`
3. Record current staging auth rate-limit values in a note:
   - Signup-related limits
   - Email sending-related limits
4. Define a 30-60 minute QA window.
5. During the window only, increase staging signup/email throughput enough for one deterministic rerun.

Owner output to agent (copy/paste):

- `path_selected=A`
- `staging_qa_window=open`
- `staging_limits_before_recorded=yes`
- `staging_temp_override_applied=yes`
- `dev_confirm_email=off`
- `staging_confirm_email=off`

### Phase A2 - Agent Execution (QA + Reviewer)

Agent responsibilities:

1. Run deterministic auth P0 against dev and staging with environment-labeled evidence.
2. Confirm staging run includes the full release-critical chain:
   - `signup -> login -> onboarding -> household creation -> dashboard`
3. Capture run artifacts and summarize:
   - pass/fail/skipped counts
   - any test names skipped/failed
   - root cause if non-green
4. Update docs:
   - `docs/AuthQA-Execution-001.md`
   - `docs/AuthQA-Matrix001.md`
   - latest `docs/Project-Review-00x.md`
   - `docs/TaskBacklog.md` (`T-004.8-API` status + blocker note)
5. Re-issue gate verdict:
   - `GO` only when staging has no gate-blocking skips/fails for required scenarios.

Agent output back to owner must include:

- `gate_decision=GO/NO-GO`
- `staging_stats=passed:X failed:Y skipped:Z`
- `blockers=...`
- `docs_updated=yes/no`
- `next_action=...`

### Phase A3 - Owner Rollback (After Agent Run)

Regardless of GO/NO-GO:

1. Restore staging auth rate-limit values to baseline.
2. Confirm baseline restored in Supabase dashboard.
3. Add a short dated note in `docs/AuthQA-Execution-001.md` (or ask agent to add it):
   - "Temporary staging rate-limit override was applied for QA window and reverted."

Owner completion signal to agent:

- `staging_temp_override_reverted=yes`
- `staging_limits_after_recorded=yes`

### Path A Completion Definition

Path A is complete only if all are true:

- QA evidence exists for dev + staging reruns.
- Staging release-critical chain is validated without unresolved gate blockers.
- Reviewer issues `GO` for `T-004.8-API`.
- `docs/TaskBacklog.md` reflects final status.
- Temporary staging override is reverted and documented.

## Important Context

- Dev project: `vsjihxrquvhajeljhuzh` (keep as dev).
- Staging project: **new dedicated OpenInventory project** (to be created now).
- Do **not** use `nsymhodgcyjhltpwdghp` for OpenInventory.

---

## Step 0 - What You Need Before Starting

- Access to Supabase dashboard (project creation + auth settings + SQL editor).
- Ability to share staging project ref + URL + publishable key in chat.
- A temporary QA window where signup limits can be relaxed if needed.

If any of the above is missing, stop and resolve before Step 1.

---

## Step 0.5 - Move Existing Dev Project to New Org (Owner, Optional but Recommended)

Use this step if your OpenInventory dev project currently lives under the old org (`n1311-supa`) and you want it under the new org (`open-inv`).

### Preferred path: Supabase Project Transfer (no DB migration)

Supabase supports direct project transfer between organizations.

1. Open the dev project (`vsjihxrquvhajeljhuzh`) in Supabase dashboard.
2. Go to **Project Settings -> General**.
3. Find **Project Transfer**.
4. Select target org: `open-inv`.
5. Confirm transfer.

### Transfer prerequisites checklist

- [ ] You are **Owner** of source org (`n1311-supa`).
- [ ] You are at least **Member** in target org (`open-inv`).
- [ ] Target org is not Vercel Marketplace-managed.
- [ ] No active log drains on the project.
- [ ] No active project-scoped role bindings that block transfer.
- [ ] No active GitHub integration connection that blocks transfer.
- [ ] Target org free-tier project count allows this transfer (or upgrade plan first).

### Owner checkpoint

- [ ] Dev project now appears under `open-inv` org.
- [ ] Project ref is unchanged (`vsjihxrquvhajeljhuzh`).
- [ ] Project URL is unchanged.
- [ ] App can still connect (basic login/dashboard smoke check).

### If transfer is blocked

Use migration instead:

1. Create a new dev project in `open-inv`.
2. Migrate DB schema/data via Supabase CLI dump/restore.
3. Reconfigure auth settings, API keys, and JWT settings as needed.
4. Recreate Edge Functions.
5. Recreate storage buckets and migrate storage objects (if any).
6. Re-run app smoke checks.

Do not delete the old project until parity is confirmed.

### Then tell the agent

Send:

- `dev_project_transfer=completed` or `dev_project_transfer=blocked`
- `dev_project_ref=...`
- `dev_project_url=...`
- `transfer_notes=...`

---

## Step 1 - Create the New Staging Project (Owner)

1. In Supabase dashboard, create a new project for OpenInventory staging.
2. Recommended name: `open-inventory-staging`.
3. When created, capture:
   - `STAGING_PROJECT_REF`
   - `STAGING_PROJECT_URL`
   - `STAGING_PUBLISHABLE_KEY`

### Owner checkpoint

- [ ] New staging project exists and is accessible.
- [ ] Project ref + URL + key are captured.

### Then tell the agent

Send:

- `STAGING_PROJECT_REF=...`
- `STAGING_PROJECT_URL=...`
- `STAGING_PUBLISHABLE_KEY=...`

---

## Step 2 - Set Auth Mode Per Environment (Owner)

### Dev (`vsjihxr...`)

- Authentication -> Providers -> Email
- Set **Confirm email = OFF**

### Staging (new project)

- Authentication -> Providers -> Email
- Set **Confirm email = ON**

### Owner checkpoint

- [ ] Dev confirmation OFF verified in dashboard.
- [ ] Staging confirmation ON verified in dashboard.
- [ ] Screenshots captured (optional but recommended for audit trail).

### Then tell the agent

Send:

- `dev_confirm_email=off`
- `staging_confirm_email=on`

---

## Step 3 - Configure Rate-Limit Policy for QA (Owner)

### Dev

- Set signup/auth limits to allow deterministic QA reruns.
- Keep this temporary if desired.

### Staging

- Keep production-like defaults as baseline.
- If using Path A, define a controlled QA window:
  1. Capture baseline values (before).
  2. Temporarily raise only signup/email-related limits needed for one rerun.
  3. Run rerun immediately.
  4. Restore baseline values (after).

### Owner checkpoint

- [ ] Dev signup rate-limit allows QA runs without immediate block.
- [ ] Staging rate-limit policy recorded.
- [ ] If Path A: temporary override window + rollback plan noted.
- [ ] If Path B: deferred-risk note recorded in `docs/TaskBacklog.md`.

### Then tell the agent

Send:

- `dev_rate_limit_ready=yes/no`
- `staging_rate_policy_ready=yes/no`
- `staging_qa_window=scheduled/not_scheduled`
- `staging_risk_deferred=yes/no`

---

## Step 4 - Define 30-60 Minute QA Window (Owner)

Goal: create a clean timebox where we run the rerun once, collect evidence, and immediately restore any temporary staging settings.

### What to define

1. Start time (with timezone).
2. Window duration (30-60 minutes).
3. Who is executing:
   - Owner performs temporary setting changes.
   - Agent runs QA + reviewer pass.
4. Rollback point:
   - At window end (or right after run), restore staging to baseline policy.

### Owner checkpoint

- [ ] QA window start/end time is set.
- [ ] Temporary staging policy rollback time is set.
- [ ] You are available during this window for quick confirmation.

### Then tell the agent

Send:

- `staging_qa_window=open`
- `qa_window_start=<timestamp_with_timezone>`
- `qa_window_duration_minutes=<30_to_60>`
- `rollback_time=<timestamp_with_timezone>`

---

## Step 4.5 - Confirm QA Credentials (Owner)

For `apps/web/qa-auth-p0.spec.ts`, this step is optional because the test creates unique throwaway users during signup.

Only provide credentials if we run additional non-signup scenarios that require pre-seeded accounts.

If needed, provide one working account per environment:

- Dev account (works against dev target)
- Staging account (works against staging target)

Do not commit credentials to repo.

### Owner checkpoint

- [ ] Optional: Dev credentials verified.
- [ ] Optional: Staging credentials verified.
- [ ] Optional: Credentials shared in chat temporarily only.

### Then tell the agent

If credentials are needed, provide in chat (temporary):

- `QA_DEV_EMAIL`, `QA_DEV_PASSWORD`
- `QA_STAGING_EMAIL`, `QA_STAGING_PASSWORD`
- `qa_credentials_ready=yes/no`

---

## Step 5 - Agent Handoff: Parity + Validation (Agent does this)

After Step 1-4 are complete, ask the agent to:

1. Add staging MCP target for the new project.
2. Apply schema + RLS migrations to staging.
3. Verify parity (tables, RPC, policies) between dev and staging.
4. Update:
   - `docs/EnvSplitChecklist001.md`
   - `docs/AuthQA-Matrix001.md`
   - `docs/AuthQA-Execution-001.md`
   - `docs/TaskBacklog.md` (`T-004.9-EnvSplit` status)

### Expected output from agent

- Parity report (pass/fail + gaps).
- Updated checklist with checked items.
- `T-004.9-EnvSplit` moved to `done` only if all acceptance criteria are met.

---

## Step 6 - Agent Handoff: Re-run `T-004.8` Gate (Agent does this)

Ask the agent to run QA + Reviewer gate rerun:

1. Execute deterministic P0 in dev and staging with environment-labeled evidence.
2. Re-run release-critical chain:
   - `signup -> login -> onboarding -> household creation -> dashboard`
3. Update:
   - `docs/AuthQA-Execution-001.md`
   - `docs/Project-Review-00x.md`
   - `docs/TaskBacklog.md` (`T-004.8-API` status)

### Expected output from agent

- GO/NO-GO with exact blocker list.
- `T-004.8-API` set to `done` only when all gate criteria are satisfied.

### If you chose Path B (defer staging gate now)

Ask the agent to:

1. Update `docs/TaskBacklog.md` to mark staging signup ON-path as deferred risk with explicit trigger:
   - "Must complete before beta/public self-serve signup."
2. Update latest review doc with "risk accepted by owner" note and rationale.
3. Keep `T-004.8-API` closure criteria explicitly split:
   - Dev correctness gate (now)
   - Staging throughput realism gate (deferred hardening)

---

## Owner Quick Command (copy/paste to kick off agent after setup)

\"I completed Steps 4 and 4.5 in `StagingSetupOwnerGuide001.md` and Path A is active. Step 1-3 are already confirmed. Here are QA window details and credentials. Run the T-004.8 QA + reviewer rerun now, then update `AuthQA-Execution-001.md`, `AuthQA-Matrix001.md`, latest `Project-Review-00x.md`, and `TaskBacklog.md`.\"

---

## Completion Criteria for This Guide

This guide is complete when:

- `T-004.9-EnvSplit` is `done`.
- And one of the following is true:
  - Path A: `T-004.8-API` gate has fresh staging QA+review evidence and reviewer GO.
  - Path B: owner risk-acceptance deferment is documented with explicit re-gate trigger and reviewer acknowledgement.
