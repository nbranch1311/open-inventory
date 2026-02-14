# Project Review 011: T-005 Readiness Gate Definition

**Document:** `Project-Review-011`  
**Reviewer:** QA Agent  
**Date:** 2026-02-14  
**Scope:** Formalize T-005 readiness to require both auth and inventory CRUD gates.

---

## Decision

**T-005 readiness** (`T-005-API` + `T-005-UI`) requires **BOTH** gates green:

| Gate | Spec | Status |
| --- | --- | --- |
| Auth gate | `qa-auth-p0.spec.ts` | Green (per AuthQA-Execution-001) |
| Inventory CRUD gate | `qa-inventory-crud.spec.ts` | Green (per dual-gate run evidence) |

---

## Rationale

- Auth gate alone does not validate inventory UX; CRUD gate alone does not validate auth/session/route-guard.
- Dual gate ensures end-to-end readiness for T-005 scope before downstream tasks (T-006, T-007, etc.).

---

## Verification Command

```bash
pnpm --filter @open-inventory/web exec playwright test qa-auth-p0.spec.ts qa-inventory-crud.spec.ts --config playwright.config.ts
```

Latest evidence:
- `/tmp/t005-dual-gate-dev.json` -> `expected: 6`, `skipped: 0`, `unexpected: 0`

Staging policy for T-005 readiness:
- Required for readiness now: **dev dual-gate green**.
- Staging dual-gate: recommended periodic hardening follow-up, not a blocking gate for current T-005 progression.

---

## UI/UX E2E Coverage Assessment (2026-02-14)

**Web:** Auth gate (`qa-auth-p0.spec.ts`) and CRUD gate (`qa-inventory-crud.spec.ts`) assert meaningful user-visible outcomes (redirects, error text, empty states, add/edit/delete visibility). Smoke spec (`qa-browser-pass.spec.ts`) covers layout, theme toggle, overflow.

**Mobile:** Responsive web only (no native app). CRUD gate includes mobile viewport (390×844) test; browser-pass covers 375×667 and 320px for auth surfaces.

**Verdict:** Sufficient for current T-005 phase. No additional tests required.

---

## References

- `docs/TaskBacklog.md` — T-005 Readiness Gates section
- `docs/AuthQA-Matrix001.md` — T-005 Gate Composition
- `docs/AuthQA-Execution-001.md` — Auth gate evidence
