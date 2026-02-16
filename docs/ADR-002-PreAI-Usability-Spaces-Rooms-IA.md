# ADR-002: Pre-AI Usability Contract for Spaces, Rooms, and Dashboard IA

- **Status:** Accepted
- **Date:** 2026-02-16
- **Task ID:** T-008.7-ADR
- **Deciders:** Architecture Agent, UX/Product Research Agent, Product Owner
- **Consulted:** `docs/MvpAppSpec.md`, `docs/TaskBacklog.md`, `docs/AgentRunbooks.md`

## Context

OpenInventory is in a pre-AI usability priority window. Owner direction is to make the app clearly usable without AI before any `T-009-*` work starts. Current UX and model are still largely household-first with top-level controls that do not fully match the room-centric contracts now documented in `MvpAppSpec.md`.

This ADR locks the implementation contract for multi-space navigation, room organization, item placement, move flows, and dashboard information architecture changes so API/UI work can proceed without contract drift.

## Decision

We adopt a room-centric dashboard contract with conditional multi-space navigation and per-space management controls.

### Contract 1: Dashboard Space Tabs (Conditional)

- Dashboard shows Inventory Space tabs only when user has more than one space.
- If user has exactly one space, tabs are hidden and that space is the active context.

### Contract 2: Enforced Limits

- Maximum 5 spaces per user.
- Maximum 10 rooms per space.
- Limits are enforced server-side as source of truth; UI mirrors limits for guidance.

### Contract 3: Room-Required Item Placement

- Every item must belong to exactly one room at creation time and throughout lifecycle.
- Item creation entry points are room-scoped only.
- No global "roomless" item creation path is allowed.

### Contract 4: Move Operations (Single and Bulk)

- Single-item move supports:
  - room-to-room within same space
  - room-to-room across spaces
- Bulk move supports:
  - multi-select items moved in one action to one destination room
  - destination room is required and implicitly determines destination space
- Move results must be deterministic:
  - all selected items moved successfully, or
  - operation returns explicit per-item failures and no silent partial behavior

### Contract 5: Per-Space Edit Mode

- Remove top-level Inventory Space control from app-level navigation.
- Space rename/delete and room management actions are entered via per-space edit mode inside selected space context.

### Contract 6: Add/Search/Sort Placement

- Remove top-level Add Item action.
- Add item, search, and sort controls live inside room surfaces.
- Room-level controls are the primary inventory management entry points.

### Contract 7: Deletion Warning Policy

- Deleting non-empty containers requires warning confirmation:
  - space with rooms -> warning confirmation
  - room with items -> warning confirmation
- Deleting empty space or empty room proceeds without confirmation.

## In Scope

- UX and data contract for:
  - conditional space tabs
  - room-centric add/search/sort placement
  - per-space edit mode
  - move operations (single and bulk) across rooms/spaces
  - deletion warning behavior
  - explicit max limits and room-required placement
- Transition contract from current household-first dashboard behavior.

## Out of Scope

- Feature implementation (API, schema migration execution, UI build).
- Collaboration/invite/member-role expansion beyond current MVP owner path.
- AI flows, prompts, or AI UI (`T-009-*` remains blocked by pre-AI gate).
- Advanced move history, undo stack, or activity feed.
- Changes to core auth/session state contract.

## Migration Strategy (Current Model -> Contracted Model)

Migration proceeds in phased, low-risk steps and keeps internal `household` naming for MVP compatibility.

1. **Contract-first freeze**
   - Use this ADR as the only decision source for `T-008.8-API` and `T-008.9-UI`.
2. **Data safety prep**
   - Identify any existing items without a `room_id`.
   - Backfill/mapping strategy must assign each legacy item to a valid room before room-required enforcement becomes strict.
3. **Server enforcement first**
   - Apply hard checks for max limits and room-required placement in backend paths before broad UI rollout.
4. **UI transition**
   - Introduce per-space edit mode and room-scoped controls.
   - Remove top-level Inventory Space and Add Item controls once replacement paths are available.
5. **Policy hardening + QA gate**
   - Validate deletion warnings and move outcomes in `T-008.10-QA` prior to AI phase unlock.

## Risks and Mitigations

1. **Legacy data mismatch risk**
   - Risk: existing items may not meet room-required contract.
   - Mitigation: pre-enforcement audit and deterministic backfill prior to strict validation.
2. **Interaction complexity risk (bulk move)**
   - Risk: ambiguous outcomes if mixed-validity selections are moved.
   - Mitigation: deterministic response contract with explicit failure reporting and no silent partial success.
3. **Discoverability risk after removing top-level controls**
   - Risk: users may not immediately find add/edit actions.
   - Mitigation: clear per-room action placement, empty-state guidance, and QA usability validation.
4. **Scope creep risk**
   - Risk: adding collaborative or advanced management features during this phase.
   - Mitigation: enforce out-of-scope list and route all expansions through backlog change control.
5. **Cross-space data isolation risk**
   - Risk: move operations could bypass household ownership checks.
   - Mitigation: server-side ownership checks on source items and destination room in every move path.

## Acceptance Criteria for This ADR

This ADR is complete when all conditions are true:

- Contracts for tabs, limits, room-required placement, move operations, per-space edit mode, control placement, and deletion warnings are explicit and unambiguous.
- In-scope and out-of-scope are documented.
- Migration strategy from current model is documented in phased form.
- Risk list and mitigations are documented.
- `docs/TaskBacklog.md` reflects `T-008.7-ADR` as done.

## Consequences / Next Handoff

- `T-008.8-API` must implement backend/schema/security behavior exactly to this contract.
- `T-008.9-UI` must implement room-centric dashboard IA and remove deprecated top-level controls.
- `T-008.10-QA` validates this contract as gate for AI phase readiness.
