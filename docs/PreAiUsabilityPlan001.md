# Pre-AI Usability Plan 001

**Date:** 2026-02-16  
**Coordinator:** OpenInventory Product Manager Orchestrator Agent  
**Purpose:** Deliver owner-prioritized UI/UX improvements so the app is fully usable without AI before `T-009-AI`.

---

## 1) Scope Lock (Owner-Approved)

In scope:
- Dashboard Inventory Space tabs (render only if user has more than one space).
- Max limits: 5 Inventory Spaces per user, 10 rooms per space.
- Room model: user-defined room names within each space.
- Room-required item placement for create/update flows.
- Item movement across rooms/spaces, including bulk move UX.
- Remove top-level Inventory Space button; replace with per-space edit mode.
- Remove top-level Add Item button; add-item entry lives in room surfaces.
- Search and sort controls are room-scoped.
- Delete warning policy:
  - space with rooms -> warning confirmation,
  - room with items -> warning confirmation,
  - empty space/room -> no confirmation required.

Out of scope:
- AI feature implementation.
- Multi-user collaboration.
- Net-new automation or autonomous actions.

---

## 2) Execution Sequence (Blocking Order)

1. `T-008.7-ADR` - contract lock
2. `T-008.8-API` - backend/data/security implementation
3. `T-008.9-UI` - dashboard and room-centric UX implementation
4. `T-008.10-QA` - QA + reviewer gate
5. Re-evaluate `T-009-AI` start

No downstream task starts before predecessor acceptance criteria are met.

---

## 3) Agent Dispatch Packets

### A) Architecture Agent + UX/Product Research Agent

Task ID: `T-008.7-ADR`  
Objective: Lock interaction and system contracts for spaces/rooms/move/bulk-move/dashboard IA.  
Required artifacts:
- ADR with migration/compatibility strategy.
- UX contract for tabs, room-level controls, per-space edit mode, and warnings.
- Explicit bulk-move interaction recommendation.
Acceptance:
- Product owner approves UI contract and non-AI usability goals.
- Backend and UI implementation can proceed without ambiguity.
Handoff: Backend + Data Modeling + Security agents.

### B) Backend Agent + Data Modeling Agent + Security/Privacy Agent

Task ID: `T-008.8-API`  
Objective: Implement model and APIs for spaces/rooms limits, room-required item placement, and move operations.  
Required artifacts:
- Server-side limit enforcement (5 spaces/user, 10 rooms/space).
- Room CRUD and item move/bulk-move operations.
- Delete policy enforcement aligned to UX warning contract.
- Security sign-off for access and destructive/move paths.
Acceptance:
- Household ownership/data isolation preserved.
- Deterministic validation/error contracts for limits/moves/deletes.
Handoff: UI Frontend Engineer Agent.

### C) UI Frontend Engineer Agent + UX/Product Research Agent

Task ID: `T-008.9-UI`  
Objective: Deliver room-centric dashboard IA and remove top-level controls.  
Required artifacts:
- Conditional tabs per space count.
- Room surfaces with add/search/sort controls.
- Per-space edit mode for space/room management actions.
- Bulk-select move UX (cross-room/cross-space).
- shadcn-first component use; owner-visible exception list if deviations exist.
Acceptance:
- Core inventory workflows are usable without AI.
- Mobile + light/dark behavior is verified.
Handoff: Testing/QA Agent.

### D) Testing/QA Agent + Project Reviewer Agent

Task ID: `T-008.10-QA`  
Objective: Validate non-AI usability baseline and issue GO/NO-GO for AI start eligibility.  
Required artifacts:
- QA matrix for tabs, limits, room-required item flows, move/bulk-move, and delete warning policy.
- Dedicated E2E coverage for dashboard room-centric flows.
- Reviewer report with explicit GO/NO-GO and blockers.
Acceptance:
- Deterministic pass on required flows in desktop/mobile.
- No unresolved blocker in reviewer report.
Handoff: Product owner AI start decision.

---

## 4) Risks and Controls

- Scope creep risk (high): keep only owner-requested IA changes; no adjacent redesign.
- Data integrity risk (high): room-required migration and cross-space moves must be transaction-safe.
- UX complexity risk (medium): bulk move can confuse users without clear selection states and confirmations.
- Security risk (medium): move/delete paths require strict ownership checks.
- Component consistency risk (medium): enforce shadcn defaults and document any exceptions.

---

## 5) AI Gate Policy During This Plan

`T-009-AI` and `T-009-UI` remain blocked until:
1. `T-008.10-QA` is done,
2. Project Reviewer issues GO for this pre-AI usability scope,
3. Product owner confirms AI reprioritization.
