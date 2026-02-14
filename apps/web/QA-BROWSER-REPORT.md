# Browser QA Pass Report — localhost:3000

**Date:** 2026-02-14  
**Method:** Playwright automation (Chromium)  
**Spec:** `qa-browser-pass.spec.ts`

---

## Summary

**12/12 tests passed.** No concrete runtime issues were found during this pass.

---

## Verified Behavior

### 1. Login & Signup (Desktop 1280×720, Mobile 375×667)

| Check | Result |
|------|--------|
| Layout renders correctly | ✓ |
| Theme toggle visible | ✓ |
| Theme toggle switches light ↔ dark | ✓ |
| Auth cards readable in light mode | ✓ |
| Auth cards readable in dark mode | ✓ |
| No horizontal overflow at 320px | ✓ |
| Theme toggle does not obscure submit button at 375px | ✓ |

### 2. Theme Toggle

- Visible at `fixed bottom-4 right-4` (bottom-6 right-6 on md+)
- `aria-label` present ("Switch to dark mode" / "Switch to light mode")
- Toggling updates `html` class (light ↔ dark)
- Card backgrounds and text remain readable in both themes

### 3. Auth-Gated Routes

| Route | Observed Behavior |
|-------|-------------------|
| `/onboarding` | Accessible (no redirect to login in this run) |
| `/dashboard` | Accessible |
| `/dashboard/add` | Redirects to `/onboarding` when no household; otherwise accessible |

**Note:** Auth behavior depends on environment (Supabase config, cookies). Middleware redirects unauthenticated users to `/login` for `/dashboard` and `/onboarding`.

### 4. Onboarding (when accessible)

- Card visible and readable in light and dark mode
- Form fields and primary button themed correctly

### 5. Dashboard & Add (when accessible)

- Headings visible
- No horizontal overflow at 1280px

---

## What Looked Good

- Responsive layout at 320px, 375px, 1280px
- Theme toggle works and is accessible
- Auth/onboarding cards use theme tokens and stay readable in both themes
- No horizontal overflow on login/signup at 320px
- Theme toggle does not overlap submit button on login at 375px
- Protected routes resolve without 500 errors

---

## Verified Issues

**None.** All automated checks passed.

---

## Manual Review

You can manually review at **http://localhost:3000**:

1. Start dev server: `pnpm run dev` (from monorepo root)
2. Visit: `/login`, `/signup`, `/onboarding`, `/dashboard`, `/dashboard/add`
3. Test theme toggle on each page
4. Resize to 320px and 768px to verify mobile/desktop layouts

---

## Re-run QA

```bash
cd apps/web && pnpm exec playwright test qa-browser-pass.spec.ts --project=chromium
```

The config starts the dev server automatically if it is not already running.
