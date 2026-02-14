# UI Baseline Auth 001

## Purpose

Define the explicit owner-review baseline for auth UI alignment before `T-005.6-UI` implementation proceeds.

## Chosen shadcn Auth Template Direction

- Direction: use the `shadcn/ui` auth-page pattern with a centered card layout, single-column form controls, clear primary action, and secondary route link (`login` <-> `signup`).
- Scope intent: presentation and interaction baseline only; no auth feature expansion.

## Required Components

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Input` with labels for email/password fields
- `Button` for primary submit and secondary navigation actions
- `Label` for accessible form field naming
- `Alert` (destructive variant) for server/client error states
- Optional loading icon pattern (`Loader2`) aligned with existing behavior

## Interaction States

- Idle/default state for both login and signup forms.
- Loading/pending submit state:
  - Submit button disabled.
  - Visible loading indicator in button.
- Validation error state:
  - Inline, human-readable error message in alert region.
  - Focus remains in form for correction.
- Success state:
  - Existing route transitions are preserved (`login -> /dashboard`, `signup -> /onboarding`).

## Responsive and Mobile Expectations

- Baseline supports 320px+ viewport widths without horizontal scroll.
- Form controls remain full-width in card on mobile breakpoints.
- Touch targets remain comfortably tappable (minimum 44px height intent).
- Spacing and typography remain readable on small devices while preserving desktop centered layout.

## Owner Sign-off: Approved

- Status: Approved
- Approved by: Product Owner
- Approval date: 2026-02-14
- Blocking impact: Removed. `T-005.6-UI` may proceed.

## Implementation Notes for T-005.6-UI

- Used locally implemented shadcn-style primitives (`Card`, `Input`, `Button`, `Label`, `Alert`) to align with the approved baseline while preserving current project styling tokens.
- Login and signup route behavior remains unchanged:
  - `login -> /dashboard`
  - `signup -> /onboarding`
- Error handling is now consistently rendered in an inline destructive alert region on both pages.
