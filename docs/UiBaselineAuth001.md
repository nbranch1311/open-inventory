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

## Owner Sign-off: Pending

- Status: Pending
- Blocking impact: `T-005.6-UI` remains blocked until owner approves this baseline document.
