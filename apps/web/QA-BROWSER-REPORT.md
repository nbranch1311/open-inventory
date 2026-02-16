# QA Browser Report - T-008.10-QA Pre-AI Usability Gate

Date: 2026-02-16
Pod: Testing/QA + Project Reviewer execution pod

## Scope

- Tabs render only when >1 space
- Room management behavior (create/rename/delete with non-empty warning)
- Space edit mode (rename/delete with non-empty warning)
- Room-required add-item behavior
- In-room search/sort and add-item entry placement
- Bulk move flow with deterministic failure messaging
- Space/room limits behavior
- Desktop + mobile checks

## Dedicated E2E Coverage Added

- `apps/web/qa-inventory-space-management.spec.ts`
  - New `T-008.10 pre-AI usability QA gate` suite:
    - Desktop gate scenario covering tabs, room flows, space edit mode, room-required add path, in-room search/sort, stale-item deterministic bulk-move failure, and limit checks.
    - Mobile gate scenario covering room-surface controls and in-room add-item placement.

## Commands Run and Exact Results

1) E2E gate run:

`env -u CI pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts --config playwright.config.ts`

Result:
- `2 failed`
- Failures:
  - desktop gate test failed while creating first room
  - mobile gate test failed while creating first room
- Observed UI state in both failures:
  - room create form submitted
  - alert rendered: `Failed to create room`
  - no room created

2) Supporting deterministic contract/unit coverage:

`pnpm --filter @open-inventory/web test src/components/inventory/RoomDashboardSurface.test.tsx src/app/dashboard/page.test.tsx src/actions/rooms.test.ts src/actions/household.test.ts src/actions/inventory.test.ts`

Result:
- `5 passed (5)`
- `55 passed (55)`

## Evidence Summary

- E2E gate could not progress beyond room creation for a newly created owner space.
- Because room creation is a prerequisite for room-centric flows, the following scope items could not be deterministically validated end-to-end in runtime:
  - room rename/delete warning flow,
  - in-room add/search/sort placement behavior,
  - stale-item bulk move failure flow.
- Contract-level tests still pass for warnings, limits, and deterministic messaging paths, but runtime E2E behavior is currently blocked by room creation failure.

## QA Verdict

- Gate verdict for `T-008.10-QA`: **NO-GO**
- Reason: runtime blocker in core room creation path (`Failed to create room`) on both desktop and mobile flows.
