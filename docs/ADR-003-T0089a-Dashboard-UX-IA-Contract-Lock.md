# ADR-003: T-008.9a Dashboard UX/IA Contract Lock (Polish Subphase)

- **Status:** Accepted
- **Date:** 2026-02-16
- **Task ID:** T-008.9a-UI (contract subphase)
- **Deciders:** Architecture Agent, UX/Product Research Agent, Product Owner direction
- **Consulted:** `docs/TaskBacklog.md`, `docs/MvpAppSpec.md`, `docs/PreAiUsabilityPlan002.md`, `docs/ADR-002-PreAI-Usability-Spaces-Rooms-IA.md`

## Context

Owner review after the pre-AI gate reopen identified P0 dashboard usability gaps:
- no clear in-dashboard entry for creating additional Inventory Spaces,
- space and room controls not coordinated on one line,
- action affordances and room/item row behavior not clear enough for fast use.

This ADR locks only the UI interaction contract needed for `T-008.9a-UI` implementation. It does not expand MVP scope.

## Decision

### 1) Same-Line Space + Room Navigation Pattern

Chosen pattern: **shadcn-first coordinated control row using two `Select` controls + right-aligned actions**.

- Left: Inventory Space selector (`Select`).
- Middle: Room selector scoped to selected space (`Select`).
- Right: action cluster (`New Space`, `Add Room`, `Space Edit` icon).

`NavigationMenu` is **not selected** for this use case.

Rationale:
- `NavigationMenu` is optimized for site-level navigation and disclosure menus, not stateful selector controls.
- Paired `Select` controls provide clearer form semantics, keyboard behavior, and mobile fallback for bounded option sets.
- This keeps implementation aligned to existing project primitives and avoids introducing a second navigation paradigm.

## 2) Icon Buttons + Tooltip Accessibility Contract

Tooltip and icon rules are mandatory for all icon-first controls in this polish scope.

- Every icon-only button must have a programmatic name via `aria-label`.
- Tooltip text must match button intent and be supplementary; tooltip is not the only accessible label.
- Tooltips must appear on hover and keyboard focus.
- `Esc` dismisses tooltip/popover layers when open.
- Icon buttons must remain reachable in tab order and activate via Enter/Space through native button behavior.
- Destructive controls (trash) use destructive styling and explicit tooltip copy (`Delete room`, `Delete space`).

Controls covered:
- Space edit icon button with tooltip.
- Room delete trash icon button with tooltip.
- Plus-icon labeled affordances: `New Space`, `Add Room`, `Add Item`.

## 3) Dashboard Create-Space Entry Contract

Placement:
- `New Space` appears in the dashboard same-line control row (right action cluster), not hidden behind onboarding/settings-only flow.

Behavior:
- Available from authenticated dashboard context whenever user can view spaces.
- On success, newly created space becomes active selection.
- On reaching max 5 spaces, control is disabled and user receives immediate deterministic guidance.

Limit/error contract:
- Limit reached -> show clear message: `You can have up to 5 Inventory Spaces.`
- Backend deterministic errors (e.g. limit/ownership/unknown) map to concise user-safe feedback.
- Failures do not clear current selection; UI remains in previous stable state.

## 4) Room and Item Row Interaction Contract

### Room row

- Room identity is the primary selectable target (name area selects room).
- Room actions stay visually adjacent on the same row, right aligned.
- Remove separate/ambiguous room-selection button patterns.
- `Add Item` belongs to active room context and remains explicitly labeled with plus icon.
- `Delete room` stays icon-first with tooltip and destructive affordance.

### Item row

- Primary line shows item name and amount inline.
- Secondary line shows expiration metadata only when present.
- Row click opens item detail; embedded controls (checkbox, menu buttons, links) do not trigger row navigation.
- Visual hierarchy favors quick scan of name + amount first, then secondary metadata.

## Scope Guardrails

In scope:
- Contract lock for component pattern, accessibility behavior, create-space placement, and room/item interaction.

Out of scope:
- Broad new dashboard feature expansion.
- AI work.
- Collaboration/member role changes.
- Additional IA changes beyond owner-requested polish targets.

## Consequences / Handoff

- `T-008.9a-UI` implementation subphase must follow this contract exactly.
- `T-008.10-QA` re-gate should validate:
  - same-line control row behavior,
  - create-space recoverability post-onboarding,
  - icon+tooltip keyboard accessibility,
  - room/item row interaction clarity.
