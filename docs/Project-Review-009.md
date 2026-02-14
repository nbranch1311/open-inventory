# Project Review 009: Env Split Completion + Gate Update

**Document:** `Project-Review-009`  
**Reviewer:** Project Reviewer Agent  
**Date:** 2026-02-14  
**Scope:** Post-setup review after dedicated staging provisioning, schema/RLS parity application, and fresh env-labeled auth reruns.

---

## Verdict

**Partial GO**

- `T-004.9-EnvSplit`: **GO** (complete)
- `T-004.8-API`: **NO-GO** (still blocked for final closure)

---

## Findings

1. **Environment split is now complete and deterministic**
   - Dev target: `vsjihxrquvhajeljhuzh`
   - Staging target: `lsqeeunbupisvkqpzypi`
   - Separate MCP targets are configured and validated.

2. **Staging parity is established**
   - Schema applied in staging (`schema_mvp_v1`)
   - Security/RLS applied in staging (`security_rls_v1`)
   - Core table and policy surface matches dev for MVP auth scope.

3. **Staging seeded user exists and is confirmed**
   - `nbranch1311@gmail.com` present in `auth.users`
   - `email_confirmed = true`

4. **Fresh auth rerun status**
   - Dev auth P0 (`qa-auth-p0.spec.ts`): **4/4 passed**
   - Staging auth P0 (`qa-auth-p0.spec.ts`): **3 passed, 1 skipped**
   - Staging signup-dependent scenarios are skipped due auth email rate-limit constraints.

---

## Blocking Item (For `T-004.8-API` Only)

- Staging confirmation-ON signup path was not executed to completion in the latest rerun because the run hit:
  - `signup blocked by Supabase rate limit`
  - `full flow blocked by Supabase signup rate limit`

This is an environment throughput constraint, not a newly observed code regression.

---

## Recommendation

1. Mark `T-004.9-EnvSplit` as `done`.
2. Keep `T-004.8-API` as `blocked`.
3. Schedule one controlled staging QA window for signup ON-path rerun (or introduce custom SMTP and rate-limit posture), then rerun `qa-auth-p0.spec.ts` on staging and close `T-004.8-API` if green.
