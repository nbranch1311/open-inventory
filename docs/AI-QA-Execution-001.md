# AI QA Execution 001: T-009-AI Architecture Gate Check

**Date:** 2026-02-16  
**Scope:** T-009 architecture migration to hybrid AI boundary (Edge gateway + live-session broker foundations).

---

## 1) Validation Matrix

| Area | Coverage | Status |
|------|----------|--------|
| Contracts and error mapping | Typed DTOs + HTTP status mapping in `apps/web/src/lib/ai/contracts.ts` | PASS |
| Budget policy behavior | Unit tests in `apps/web/src/lib/ai/cost-policy.test.ts` | PASS |
| Grounded assistant behavior | Unit tests in `apps/web/src/actions/ai.test.ts` | PASS |
| Business ledger assistant behavior | Unit test covers SKU/product stock-on-hand grounding via `products` + `stock_on_hand` | PASS |
| API request validation and auth mapping | Unit tests in `apps/web/src/app/api/ai/ask/route.test.ts` | PASS |
| Gateway proxy path | Route uses `askInventoryAssistantViaGateway` with fallback + logging | PASS |
| Edge AI guardrails | `supabase/functions/ai_assistant/index.ts` | PASS |
| Live session policy checks | `supabase/functions/ai_live_session/index.ts` | PASS |
| Security review follow-up | Critical/high findings remediated and re-reviewed | PASS |

---

## 2) Commands and Results

1. `pnpm --filter @open-inventory/web test "src/lib/ai/cost-policy.test.ts" "src/actions/ai.test.ts" "src/app/api/ai/ask/route.test.ts"`
   - Result: `Test Files 3 passed (3)`, `Tests 18 passed (18)`.
2. Security + QA reviewer pass (code review pod)
   - Initial verdict: NO-GO (critical/high findings).
   - Post-remediation verdict: GO for progression.

---

## 3) Security Controls Verified

- API keys are consumed from env and sent via provider headers only (not URL query params).
- Household scoping enforced in Edge functions using Supabase auth + membership check.
- Guardrails reject destructive/purchasing and cross-household intent.
- AI and live-session kill switches are present:
  - `AI_ENABLED`
  - `AI_LIVE_ENABLED`
- Budget throttling is enforced in web and edge paths using environment policy variables.
- Structured audit logging exists for assistant and live-session decision paths.

---

## 4) Residual Risks (Non-Blocking)

- Ensure `AI_ENVIRONMENT` is explicitly set in deployed environments to avoid policy ambiguity.
- Route currently enforces auth but not household UUID format; validation can be hardened later.
- Live broker secret rotation policy must be operationalized (`AI_LIVE_BROKER_SECRET`).

---

## 5) Gate Recommendation

**GO** for continued `T-009-AI` implementation (provider integration + cross-client architecture track).  
`T-009-AI` remains `in_progress` pending full feature acceptance criteria and final Project Reviewer closure.
