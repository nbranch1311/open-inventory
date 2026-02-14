# Theme Baseline 001

## Purpose

Capture baseline validation for `T-005.8-UI` light/dark theme behavior.

## Implementation Coverage

- App-wide `next-themes` provider with class-based theme strategy.
- Persistent user theme preference via `next-themes` storage behavior.
- Global user-accessible theme toggle in a mobile-visible fixed position.
- Theme-compatible tokens for background, foreground, card, border, input, and action colors.

## Core Screen Verification

| Screen | Light | Dark | Notes |
| --- | --- | --- | --- |
| Login | Pass | Pass | Card/input/button/alert states remain readable |
| Signup | Pass | Pass | Same baseline as login |
| Onboarding | Pass | Pass | Card layout and form controls themed |
| Dashboard list/empty state | Pass | Pass | Cards, links, and action button themed |
| Add item form | Pass | Pass | Labels, fields, and error states themed |
| Edit item form | Pass | Pass | Labels, fields, save/delete/error states themed |

## Interaction Validation

- Theme toggle changes mode between light and dark.
- Theme toggle label updates for accessibility (`Switch to dark mode` / `Switch to light mode`).
- Theme choice persists across sessions through theme provider storage.
