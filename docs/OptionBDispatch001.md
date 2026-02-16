# Option B Dispatch 001 - Inventory Space Management

**Date:** 2026-02-16  
**Coordinator:** OpenInventory Product Manager Orchestrator Agent  
**Purpose:** Launch Option B execution to unlock AI start gate (`T-009-AI`, `T-009-UI`) safely.

---

## Dispatch Sequence (Must Stay Ordered)

1. `T-008.5-API` (active)
2. `T-008.5-UI` (after API handoff)
3. `T-008.5-QA` (after API + UI complete)
4. Reviewer gate decision
5. AI phase eligibility decision (`T-009-AI`)

---

## Agent Task Request: Backend Agent

Task ID: `T-008.5-API`  
Agent: Backend Agent  
Objective: Implement Inventory Space management API contract for rename, settings read, and safe delete.  
Why now: Required predecessor for Option B UI and mandatory gate before AI work.  
In Scope:
- Rename current Inventory Space.
- Settings read payload (name, created date, member role for owner path).
- Delete endpoint/action with guardrails:
  - typed confirmation must match current Inventory Space name
  - deny deletion when items, documents, or reminders exist
  - deterministic, UX-safe blocked-delete error contract
- Preserve household-scoped auth and ownership checks.
Out of Scope:
- Schema rename/refactor from `household` to other model names.
- AI behavior or prompt work.
- Any broad account/settings expansion beyond Inventory Space scope.
Dependencies: `T-008-API`, `T-004.8-API`  
Constraints:
- Non-destructive defaults only.
- No partial deletes.
- Must preserve existing RLS and data isolation guarantees.
Success Criteria:
- Rename persists and is visible in app shell/dashboard.
- Blocked delete returns stable reason codes/messages.
- Unit/integration tests cover rename + delete guardrails.
Deadline/Priority: `P0`, immediate.

Next Handoff: Data Modeling Agent + Security/Privacy Agent (sign-off), then UI Frontend Engineer Agent.

---

## Agent Task Request: Data Modeling Agent

Task ID: `T-008.5-API`  
Agent: Data Modeling Agent  
Objective: Validate schema/query safety for rename/delete guardrail checks and confirm no risky schema churn.  
Why now: Delete safety depends on reliable existence checks and constraint clarity.  
In Scope:
- Review delete preconditions against current schema relations.
- Confirm query/index strategy for existence checks (items/documents/reminders).
- Provide migration/DDL guidance only if strictly required.
Out of Scope:
- Broad schema redesign.
- New speculative entities.
Dependencies: Backend API draft for `T-008.5-API`  
Constraints:
- Keep internal naming as `household`.
- Maintain compatibility with current RLS model.
Success Criteria:
- Written schema safety assessment.
- Explicit note on whether migration is required or not.
Deadline/Priority: `P0`, during API implementation.

Next Handoff: Backend Agent + Security/Privacy Agent.

---

## Agent Task Request: Security/Privacy Agent

Task ID: `T-008.5-API`  
Agent: Security/Privacy Agent  
Objective: Approve authz and destructive-action safeguards for Inventory Space management.  
Why now: Option B gate requires trust-preserving delete safety and strict ownership enforcement.  
In Scope:
- Verify household ownership enforcement on rename/settings/delete.
- Verify typed-confirmation pattern cannot be bypassed.
- Verify blocked-delete contract does not leak sensitive internals.
Out of Scope:
- UX copy redesign not tied to security clarity.
- AI scope changes.
Dependencies: Backend implementation + Data Modeling notes  
Constraints:
- No critical security exceptions.
- Document required remediations before pass.
Success Criteria:
- Pass/fail assessment with required remediations.
- Explicit approval for `T-008.5-API` completion.
Deadline/Priority: `P0`, before UI work starts.

Next Handoff: UI Frontend Engineer Agent + QA Agent.

---

## Agent Task Request: UI Frontend Engineer Agent

Task ID: `T-008.5-UI`  
Agent: UI Frontend Engineer Agent  
Objective: Implement Inventory Space settings route and rename/delete interactions using approved API contract.  
Why now: User-visible Option B behavior must be complete before QA and Reviewer gate.  
In Scope:
- Route/surface at `/settings/inventory-space` (unless owner changes).
- Rename form with loading/success/error states.
- Delete flow with typed confirmation and explicit consequences copy.
- Mobile-ready + light/dark parity.
- `shadcn/ui` first for controls/layout.
Out of Scope:
- Net-new settings sections unrelated to Inventory Space.
- AI UI work.
Dependencies: Completed `T-008.5-API` contract + Security pass  
Constraints:
- No one-click destructive delete path.
- Any non-shadcn component usage must be documented.
Success Criteria:
- Rename works end-to-end.
- Blocked delete reasons are clearly surfaced.
- UI tests cover high-risk interactions and error states.
Deadline/Priority: `P0`, immediately after API gate.

Next Handoff: UX/Product Research Agent + Testing/QA Agent.

---

## Agent Task Request: UX/Product Research Agent

Task ID: `T-008.5-UI`  
Agent: UX/Product Research Agent  
Objective: Validate clarity and trust of settings, rename, and delete flows without scope expansion.  
Why now: Delete safety depends on explicit, understandable UX.
In Scope:
- Review consequences copy and blocked-delete messages.
- Validate mobile usability and flow clarity.
- Flag ambiguity that could trigger accidental destructive intent.
Out of Scope:
- Visual redesign beyond Option B task.
- New settings architecture proposals.
Dependencies: UI implementation draft  
Constraints:
- Keep changes minimal and MVP-scoped.
Success Criteria:
- UX validation note with prioritized micro-adjustments (if any).
Deadline/Priority: `P0`, alongside UI implementation.

Next Handoff: Testing/QA Agent + Project Reviewer Agent.

---

## Agent Task Request: Testing/QA Agent

Task ID: `T-008.5-QA`  
Agent: Testing/QA Agent  
Objective: Validate deterministic Option B behavior and safety constraints before AI phase.  
Why now: Required quality gate for AI start policy.  
In Scope:
- Test matrix for rename success/error paths.
- Test matrix for delete safety constraints and typed-confirm behavior.
- Dedicated E2E spec (`qa-inventory-space-management.spec.ts` or equivalent).
- Desktop + mobile viewport coverage for management flow.
Out of Scope:
- AI feature QA.
- Broad non-Option-B regression expansion (except P0 protection checks).
Dependencies: `T-008.5-API`, `T-008.5-UI` complete  
Constraints:
- Evidence required for all behavior claims.
- No "assumed pass" outcomes.
Success Criteria:
- Deterministic green evidence for Option B acceptance criteria.
- Defects logged with severity and reproduction.
Deadline/Priority: `P0`, immediately after UI completion.

Next Handoff: Project Reviewer Agent.

---

## Agent Task Request: Project Reviewer Agent

Task ID: `T-008.5-QA`  
Agent: Project Reviewer Agent  
Objective: Issue formal GO/NO-GO for Option B completion and AI start eligibility.  
Why now: Mandatory phase-transition authority before `T-009-AI` can start.  
In Scope:
- Gap analysis against `docs/MvpAppSpec.md`, `docs/TaskBacklog.md`, and Option B acceptance criteria.
- Validation of QA evidence and unresolved defect severity.
- Explicit AI gate decision.
Out of Scope:
- Code implementation or direct fixes.
Dependencies: QA completion artifacts  
Constraints:
- Must block transition if any critical blockers remain.
Success Criteria:
- Written GO/NO-GO decision with blocking findings list.
- Explicit statement on `T-009-AI` readiness.
Deadline/Priority: `P0`, immediately after QA evidence package.

Next Handoff: Product Owner decision for AI phase start.

---

## Governance Rules For This Dispatch

- `T-009-AI` and `T-009-UI` remain blocked until:
  1. `T-008.5-QA` is done,
  2. Project Reviewer issues GO with no unresolved blockers,
  3. Product Owner accepts residual low-risk items (if any).
- No undocumented custom UI components where shadcn components are appropriate.
- Delete behavior must remain non-destructive by default with explicit blocked-delete reasons.
