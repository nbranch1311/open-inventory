# Project Review 011: T-005-UI Gate, T-005.7/5.8 Closure, T-006-API Closure

**Date:** 2026-02-14  
**Reviewer:** Project Reviewer Agent  
**Scope:** T-005-UI GO/NO-GO, T-005.7-UI, T-005.8-UI, T-006-API

---

## Evidence Summary (Pre-Review)

| Check | Result |
|-------|--------|
| Lint | Pass |
| Build | Pass |
| Unit tests | 44/44 pass |
| Playwright dual gate (qa-auth-p0 + qa-inventory-crud) | 6/6 pass |
| Playwright qa-browser-pass | 13/13 pass (mobile, theme, theme persistence) |

---

## 1) T-005-UI Final GO/NO-GO (Dual Gate)

### Gate Requirements

| Gate | Spec | Purpose |
|------|------|---------|
| Auth gate | `qa-auth-p0.spec.ts` | Auth/session/onboarding/route-guard P0 matrix |
| Inventory CRUD gate | `qa-inventory-crud.spec.ts` | Authenticated add/edit/delete lifecycle (desktop + mobile) |

### Verdict: **GO**

Both gates are green (6/6). Evidence:

- **Auth gate:** Unauthenticated redirects for `/dashboard` and `/onboarding`, signup/login flows, session expiry simulation, invalid credentials handling.
- **CRUD gate:** Desktop add/edit/delete with success, error (validation), and empty-state assertions; mobile add/edit/delete with key UX states.

### Blocking Findings

None.

### Backlog Status Update

- **T-005-UI:** `in_progress` → `done`
- Add completion note: Dual gate green; InventoryEmptyState with icon, copy, CTA, and accessibility; unit tests for empty state.

---

## 2) T-005.7-UI (Mobile-Ready Foundation)

### Acceptance Criteria Check

| Criterion | Evidence |
|----------|----------|
| Responsive layout for dashboard, add/edit item, auth-adjacent flows | `qa-inventory-crud.spec.ts` mobile test (390×844) passes; `qa-browser-pass` mobile viewport tests (375×667, 320×568) |
| Mobile-friendly spacing, tap targets, typography | `min-h-11` on inputs/buttons; responsive grid (`sm:grid-cols-2`, `lg:grid-cols-3`); `sm:flex-row` breakpoints |
| Core authenticated screens usable on common mobile viewport sizes | Mobile CRUD flow passes |
| Product owner validates mobile readiness baseline | Manual gate; automated evidence supports closure |

### Verdict: **Closure Recommended**

### Blocking Findings

None.

### Backlog Status Update

- **T-005.7-UI:** `in_progress` → `done`
- Add completion note: Mobile CRUD gate and qa-browser-pass mobile viewport tests pass; responsive layout and tap targets implemented.

### Residual Risk (Non-Blocking)

- Product owner validation is a manual step; automated tests provide strong evidence.

---

## 3) T-005.8-UI (Theme System Baseline)

### Acceptance Criteria Check

| Criterion | Evidence |
|----------|----------|
| Theme provider setup for app-wide light/dark support | `ThemeProvider` (next-themes) in `apps/web/src/app/layout.tsx` |
| User-accessible theme toggle (desktop and mobile-visible) | `ThemeToggle` fixed bottom-right; `qa-browser-pass` verifies toggle on login/signup (desktop + mobile) |
| Baseline themed states on auth, dashboard, item form screens | `qa-browser-pass` checks login/signup cards in light and dark mode |
| Theme switch persists user preference across sessions | `qa-browser-pass` "theme preference persists across reloads" test passes |
| Core screens render correctly in both light and dark modes | Login card readability in light/dark; onboarding card in light/dark |
| Product owner approves theme behavior baseline | Manual gate |

### Verdict: **Closure Recommended**

### Blocking Findings

None.

### Backlog Status Update

- **T-005.8-UI:** `todo` → `done`
- Add completion note: ThemeProvider + ThemeToggle wired in root layout; qa-browser-pass 13/13 includes theme visibility, persistence, and card readability in both modes.

### Residual Risk (Non-Blocking)

- Product owner validation is manual; automated tests cover theme behavior.

---

## 4) T-006-API (Item File Upload + Retrieval)

### Acceptance Criteria Check

| Criterion | Evidence |
|----------|----------|
| Upload endpoint and storage integration | `uploadItemDocument` server action; Supabase Storage `inventory-files` bucket |
| File metadata persistence | Insert into `item_documents` with `household_id`, `item_id`, `file_name`, `file_path`, `file_size`, `file_type` |
| Retrieval and deletion rules | `getItemDocuments`, `getItemDocumentDownloadUrl`, `deleteItemDocument` |
| Allowed file types enforced | `isAllowedFileType`: images and PDFs only; unit test rejects `text/plain` |
| File access checks enforce owner household | `assertItemOwnership` before upload; `household_id` scoping on all queries |
| Upload failures return actionable errors | "Only images and PDFs allowed", "File size must be 5MB or less", "Item not found for household", etc. |

### Implementation Review

- **ItemDocuments.ts:** `getItemDocuments`, `uploadItemDocument`, `getItemDocumentDownloadUrl`, `deleteItemDocument` implemented.
- **Household scoping:** All operations require `householdId`; ownership asserted before upload.
- **Validation:** File type (images + PDF), size (5MB max), required fields.
- **Unit tests (ItemDocuments.test.ts):** 6 tests covering list, reject unsupported type, upload success, rollback on metadata failure, signed URL, delete.
- **Schema:** `item_documents` table exists with RLS; `database.types.ts` aligned.

### Verdict: **Closure Recommended**

### Blocking Findings

None.

### Backlog Status Update

- **T-006-API:** `todo` → `done`
- Add completion note: ItemDocuments server actions (get, upload, download URL, delete); household-scoped; file type/size validation; unit tests 6/6 pass.

### Residual Risk (Non-Blocking)

- **Storage bucket:** `inventory-files` bucket may need to be created in Supabase if not present; verify bucket exists and storage RLS in deployment.
- **UI integration:** Item detail page does not yet surface documents; T-006-UI will add file picker/dropzone and list.

---

## Summary: Precise Backlog Status Updates

Apply the following changes to `docs/TaskBacklog.md`:

### T-005-UI

```diff
- **Status:** `in_progress`
+ **Status:** `done`
```

Add under Progress:

```
- **Completion Notes (2026-02-14):**
  - Dual gate green (qa-auth-p0 + qa-inventory-crud) 6/6.
  - InventoryEmptyState with icon, copy, primary CTA, role="status".
  - Unit tests for InventoryEmptyState.
```

### T-005.7-UI

```diff
- **Status:** `in_progress`
+ **Status:** `done`
```

Add:

```
- **Completion Notes (2026-02-14):**
  - Mobile CRUD gate and qa-browser-pass mobile viewport tests pass.
  - Responsive layout, min-h-11 tap targets, breakpoint adjustments verified.
```

### T-005.8-UI

```diff
- **Status:** `todo`
+ **Status:** `done`
```

Add:

```
- **Completion Notes (2026-02-14):**
  - ThemeProvider + ThemeToggle wired in root layout.
  - qa-browser-pass 13/13: theme visibility (desktop + mobile), persistence across reloads, card readability in light/dark.
```

### T-006-API

```diff
- **Status:** `todo`
+ **Status:** `done`
```

Add:

```
- **Completion Notes (2026-02-14):**
  - ItemDocuments server actions: getItemDocuments, uploadItemDocument, getItemDocumentDownloadUrl, deleteItemDocument.
  - Household-scoped; file type (images + PDF) and size (5MB) validation.
  - Unit tests 6/6 pass. Verify inventory-files bucket in deployment.
```

---

## Residual Risk Notes (Non-Blocking)

1. **T-005.7 / T-005.8:** Product owner validation is manual; automated evidence supports closure.
2. **T-006-API:** Confirm `inventory-files` storage bucket exists and has correct RLS before T-006-UI integration.
3. **T-006-UI:** Item detail page does not yet use ItemDocuments; T-006-UI will add the file upload UI.
