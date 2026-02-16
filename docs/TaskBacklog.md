# OpenInventory MVP Task Backlog

This backlog translates `MvpAppSpec.md` and `AgentRunbooks.md` into execution-ready tasks.

Use this as the single queue for MVP delivery.

Terminology note: use **Inventory Space** in user-facing copy. Internal model/task names may still reference `household` until a dedicated schema refactor is explicitly approved.

---

## Backlog Conventions

### Status

- `todo`: not started
- `in_progress`: actively being worked
- `blocked`: waiting on dependency/decision
- `done`: acceptance criteria met

### Priority

- `P0`: must complete for MVP launch
- `P1`: high-value, immediately after P0
- `P2`: useful but deferrable

### Effort (relative)

- `S`: 0.5-1 day
- `M`: 1-3 days
- `L`: 3-5 days

---

## MVP Sprint 0-1 Backlog (First 10 Tasks)

## 1) Lock MVP Architecture Decision Record

- **Task ID:** `T-001`
- **Owner Agent:** Architecture Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** none
- **Objective:** finalize the MVP architecture shape and boundaries.
- **Deliverables:**
  - ADR covering backend shape, storage boundaries, AI integration boundary, and deployment model.
  - Option A/B/C tradeoff summary with final recommendation.
- **Acceptance Criteria:**
  - Explicit decision on monolith vs multi-service for MVP.
  - Explicit decision on managed services usage.
  - Approved by product owner.

---

## 2) Define MVP Schema v1

- **Task ID:** `T-002`
- **Owner Agent:** Data Modeling Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `L`
- **Dependencies:** `T-001`
- **Objective:** create stable schema for MVP entities and relationships.
- **Deliverables:**
  - Schema specification for `User`, `Household`, `HouseholdMember`, `InventoryItem`, `ItemDocument`, `ItemReminder`, `Category`, `Location`, `Tag`.
  - Index and constraint plan.
  - Migration strategy notes.
- **Acceptance Criteria:**
  - Household scoping enforced at data model level.
  - Required fields and nullability are fully specified.
  - Security and backend agents sign off.

---

## 3) Establish Security Baseline

- **Task ID:** `T-003`
- **Owner Agent:** Security/Privacy Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-001`, `T-002`
- **Objective:** define mandatory auth, access control, and data protection requirements for implementation.
- **Deliverables:**
  - Security baseline checklist.
  - Threat model (lightweight MVP version).
  - Required controls for API, storage, and logs.
- **Acceptance Criteria:**
  - Access control rules documented by endpoint/data path.
  - Critical risks identified with mitigations.
  - Approved exceptions list (if any).

---

## 3.5) Environment Setup & Initialization

- **Task ID:** `T-003.5-Setup`
- **Owner Agent:** DevOps/Infra Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `S`
- **Dependencies:** `T-001`, `T-002`, `T-003`
- **Objective:** initialize the actual code repository and database connection.
- **Deliverables:**
  - Initialized Next.js project (TypeScript, Tailwind, App Router).
  - Supabase project connected (env vars set).
  - Schema and RLS SQL scripts applied to the database.
  - Database types generated (`database.types.ts`).
- **Acceptance Criteria:**
  - `npm run dev` starts the local server.
  - Database connection verified.
  - Tables exist in the database.

---

## 4) Implement Auth + Session + Household Setup

- **Task ID:** `T-004-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `L`
- **Dependencies:** `T-002`, `T-003`
- **Objective:** deliver account signup/login and single-household setup flow.
- **Deliverables:**
  - Auth endpoints/services.
  - Household creation during onboarding.
  - Access checks for household ownership.
- **Acceptance Criteria:**
  - New user can sign up, log in, create household.
  - Unauthenticated access is rejected correctly.
  - QA verifies setup flow end-to-end.
- **Completion Notes (2026-02-14):**
  - Regression-Validation-001 requalification is green after auth-guard hardening.
  - Added explicit middleware protected-route matchers in `apps/web/middleware.ts` for `/dashboard/:path*` and `/onboarding/:path*`.
  - Deterministic auth reruns passed in dev and staging:
    - `/tmp/regval-dev-qa-auth-p0.json` -> `expected: 4`, `skipped: 0`, `unexpected: 0`
    - `/tmp/regval-staging-qa-auth-p0.json` -> `expected: 4`, `skipped: 0`, `unexpected: 0`

---

## 4b) Implement Auth & Onboarding UI

- **Task ID:** `T-004-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-004-API`
- **Objective:** build responsive login, signup, and household creation screens.
- **Deliverables:**
  - Login/Signup forms with error handling.
  - Household naming/setup screen.
  - Session state management (client-side).
- **Acceptance Criteria:**
  - Forms validate input before submission.
  - Loading states shown during auth requests.
  - Successful login redirects to inventory dashboard.
- **Revalidation Note (2026-02-14):**
  - Auth/onboarding UI dependency on protected-route contract has been requalified via green auth reruns and middleware hardening.

---

## 4.5) Account Menu + Sign Out

- **Task ID:** `T-004.5-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-004-API`, `T-004-UI`
- **Objective:** add account menu and reliable sign-out behavior in desktop and mobile navigation.
- **Deliverables:**
  - Account menu in app shell (desktop + mobile).
  - User identity display (email + avatar fallback).
  - Sign-out action wired to server-side auth/session invalidation.
- **Acceptance Criteria:**
  - After sign out, protected routes redirect to `/login`.
  - Browser back button does not restore authenticated pages.
  - Works in desktop and mobile navigation variants.

---

## 4.6) Auth Session UX Actions

- **Task ID:** `T-004.6-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `S`
- **Dependencies:** `T-004-API`
- **Objective:** harden auth session lifecycle actions and consistency between server, middleware, and client.
- **Deliverables:**
  - Server action for sign-out (`supabase.auth.signOut`).
  - Optional helper for current user profile in shell context.
  - Session invalidation consistency checks documented.
- **Acceptance Criteria:**
  - Session invalidates server-side and client-side.
  - Middleware observes unauthenticated state immediately after sign-out.
  - No stale authenticated shell state after sign-out.
- **Verification Notes (2026-02-14):**
  - Implemented server sign-out action at `apps/web/src/actions/auth.ts` using `supabase.auth.signOut`.
  - Added backend tests covering sign-out success path and middleware unauthenticated protected-route contract (`/dashboard`, `/onboarding` -> `/login`).

---

## 4.7) Profile Baseline (Avatar + Display Name)

- **Task ID:** `T-004.7-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P1`
- **Status:** `todo`
- **Effort:** `M`
- **Dependencies:** `T-004.5-UI`, `T-004.6-API`
- **Objective:** provide minimal profile surface for display name and avatar baseline used by account menu.
- **Deliverables:**
  - Basic profile screen or edit modal (name and avatar URL; file upload can be later).
  - Avatar rendering in account menu.
  - Deterministic fallback identity rendering.
- **Acceptance Criteria:**
  - Profile info persists and renders in shell.
  - Missing avatar uses stable fallback behavior.

---

## 4.8) Household Creation RLS Reliability Fix (Release-Critical)

- **Task ID:** `T-004.8-API`
- **Owner Agent:** Backend Agent + Security/Privacy Agent
- **Priority:** `P0` (Release-Critical)
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-004-API`, `T-003`, `T-004.9-EnvSplit`
- **Objective:** resolve policy/config drift causing onboarding household creation failures and harden first-household flow reliability.
- **Deliverables:**
  - Investigation and fix for RLS policy failure path (`42501` on `households` insert).
  - Integration/regression coverage for first-household onboarding flow.
  - Error handling path that does not silently mask policy failures.
  - Auth foundation artifacts maintained and aligned:
    - `docs/AuthFlow001.md`
    - `docs/AuthErrorCatalog001.md`
    - `docs/AuthQA-Matrix001.md`
- **Acceptance Criteria:**
  - Authenticated user can create first household from onboarding.
  - Household + owner membership are created in one successful flow.
  - Policy failures show actionable UX-safe errors with internal diagnostics.
  - QA verifies signup -> login -> onboarding -> household creation -> dashboard end-to-end.
- **Completion Notes (2026-02-14):**
  - Dev rerun green: `/tmp/t0048-dev-qa-auth-p0.json` (`expected: 4`, `skipped: 0`, `unexpected: 0`).
  - Staging rerun initially failed during onboarding due missing RPC endpoint (`POST /rest/v1/rpc/create_household_with_owner` -> `404`).
  - Applied missing staging migrations:
    - `fix_first_household_onboarding_rls`
    - `restrict_onboarding_rpc_execute_grants`
  - Staging post-fix rerun green: `/tmp/t0048-staging-qa-auth-p0-postfix.json` (`expected: 4`, `skipped: 0`, `unexpected: 0`).
  - Gate decision updated to GO by latest review: `docs/Project-Review-010.md`.
  - Residual follow-up moved to separate task: staged confirmation-ON dedicated validation.

---

## 4.9) Environment Split Readiness (Dev + Staging) for Auth Gate

- **Task ID:** `T-004.9-EnvSplit`
- **Owner Agent:** DevOps/Infra Agent + QA Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `S`
- **Dependencies:** `T-003.5-Setup`
- **Objective:** remove environment ambiguity that blocks deterministic auth gate closure.
- **Deliverables:**
  - Environment split checklist completed: `docs/EnvSplitChecklist001.md`.
  - Owner setup runbook completed: `docs/StagingSetupOwnerGuide001.md`.
  - Dedicated dev and staging Supabase targets verified.
  - Auth mode policy verified by environment (dev OFF, staging ON).
  - Seeded QA-account strategy documented for deterministic runs.
  - `docs/AuthQA-Execution-001.md` updated with environment labels on evidence.
- **Acceptance Criteria:**
  - No P0 auth scenario remains `not_run` due to environment setup ambiguity.
  - Project Reviewer confirms environment is gate-ready for next `T-004.8-API` run.
- **Completion Notes (2026-02-14):**
  - Dedicated staging project provisioned and mapped: `lsqeeunbupisvkqpzypi`.
  - Separate MCP targets validated for dev/staging.
  - Dev/staging auth mode split owner-confirmed (`dev OFF`, `staging ON`).
  - Staging parity established (schema + RLS migrations applied and validated).
  - Staging seeded confirmed user created (`nbranch1311@gmail.com`).
  - Environment-labeled rerun evidence captured in `docs/AuthQA-Execution-001.md`.

---

## 4.10) Staging Confirmation-ON Validation Follow-Up

- **Task ID:** `T-004.10-QA`
- **Owner Agent:** QA Agent + Security/Privacy Agent
- **Priority:** `P1`
- **Status:** `done`
- **Effort:** `S`
- **Dependencies:** `T-004.8-API`
- **Objective:** run dedicated auth validation in staging with confirmation ON and record production-like behavior evidence.
- **Deliverables:**
  - Staging confirmation-ON rerun evidence captured in `docs/AuthQA-Execution-001.md`.
  - Matrix status update in `docs/AuthQA-Matrix001.md`.
  - Reviewer note confirming closure of confirmation-ON follow-up.
- **Acceptance Criteria:**
  - Confirmation-ON behavior is explicitly validated and documented in staging.
  - Any gaps are documented as residual risk with owner decision.
- **Completion Notes (2026-02-14):**
  - Owner confirmed staging policy restored to confirmation ON before this pass.
  - Staging auth rerun evidence captured: `/tmp/regval-staging-qa-auth-p0.json` (`expected: 4`, `skipped: 0`, `unexpected: 0`).
  - No residual blocker raised for confirmation-mode behavior in this gate cycle.

---

## T-005 Readiness Gates (Dual Gate Required)

**T-005** (`T-005-API` + `T-005-UI`) is considered ready only when **BOTH** gates are green:

| Gate | Spec | Purpose |
| --- | --- | --- |
| Auth gate | `apps/web/qa-auth-p0.spec.ts` | Auth/session/onboarding/route-guard P0 matrix |
| Inventory CRUD gate | `apps/web/qa-inventory-crud.spec.ts` | Authenticated add/edit/delete lifecycle (desktop + mobile) |

Verification: `pnpm --filter @open-inventory/web exec playwright test qa-auth-p0.spec.ts qa-inventory-crud.spec.ts --config playwright.config.ts`
Latest evidence: `/tmp/t005-dual-gate-dev.json` (`expected: 6`, `skipped: 0`, `unexpected: 0`)
QA validation (2026-02-14): Dual gate green; unit tests (inventory, InventoryEmptyState, household) 19/19 passed.
Gate decision (2026-02-14): **GO** — T-005-UI marked done per `docs/Project-Review-011.md`.

Environment policy:
- Blocking requirement for T-005 progression: dev dual-gate green.
- Staging dual-gate remains periodic hardening evidence, not a blocking prerequisite at this phase.

---

## 5) Implement Inventory CRUD Core

- **Task ID:** `T-005-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `L`
- **Dependencies:** `T-004-API`
- **Objective:** deliver create/read/update/delete flows for inventory items.
- **Deliverables:**
  - CRUD endpoints/services.
  - Validation for required item fields.
  - Archive/delete behavior defined and implemented.
- **Acceptance Criteria:**
  - Items are household-scoped for all operations.
  - Validation errors are clear and stable.
  - CRUD flows pass integration tests.
- **Gate Tests (both required):**
  - Auth gate: `qa-auth-p0.spec.ts` green.
  - CRUD gate: `qa-inventory-crud.spec.ts` green for authenticated add/edit/delete lifecycle coverage.
- **Unblock Note (2026-02-14):**
  - Regression-Validation-001 auth-guard drift has been requalified as green; this task is no longer blocked on route-guard uncertainty.
- **Progress (2026-02-14):**
  - Added explicit household-scoping to update/delete (defense-in-depth).
  - Added household-scoping to getInventoryItem (defense-in-depth; signature now requires householdId).
  - Added required-field validation for create (name, quantity, unit).
  - Added update validation for name/quantity/unit when fields are present.
  - Added unit tests for CRUD flows (`apps/web/src/actions/inventory.test.ts`), including update validation failures and DB error paths.
  - Reviewer re-check: GO for closure of the two outstanding findings.

---

## 5b) Implement Inventory List & Detail UI

- **Task ID:** `T-005-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `L`
- **Dependencies:** `T-005-API`
- **Objective:** build main inventory dashboard and item add/edit forms.
- **Deliverables:**
  - Inventory list view with basic sorting.
  - Add/Edit Item forms with validation.
  - Item detail view.
- **Acceptance Criteria:**
  - User can create item and see it appear in list immediately.
  - Empty states guide user to add first item.
  - Edit form pre-fills correctly.
- **Gate Tests (both required):**
  - Auth gate: `qa-auth-p0.spec.ts` green.
  - CRUD gate: `qa-inventory-crud.spec.ts` green for desktop + mobile UX states (success/error/empty-state assertions).
- **Unblock Note (2026-02-14):**
  - Protected-route auth behavior has been revalidated as deterministic; this task is no longer blocked by Regression-Validation-001.
- **Progress (2026-02-14):**
  - Stronger empty-state UX: `InventoryEmptyState` component with icon, clearer copy, primary CTA, and `role="status"` for accessibility. Unit tests added.
- **Completion Notes (2026-02-14):**
  - Dual gate green (qa-auth-p0 + qa-inventory-crud) 6/6.
  - InventoryEmptyState with icon, copy, primary CTA, role="status".
  - Unit tests for InventoryEmptyState.

---

## 5.5) UI/Design Alignment Gate (Owner Review Required)

- **Task ID:** `T-005.5-Review`
- **Owner Agent:** Project Reviewer Agent + UX/Product Research Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `S`
- **Dependencies:** `T-004-API`
- **Objective:** align implemented and planned UI with product owner expectations before further UI expansion.
- **Deliverables:**
  - UI review notes covering auth, onboarding, dashboard, and item forms.
  - Gap list between current implementation and desired design direction.
  - Go/No-Go decision for continued UI feature delivery.
- **Acceptance Criteria:**
  - Product owner signs off on direction or requests explicit rework.
  - Next UI tasks have clear scope and approved design references.

---

## 5.6) Adopt shadcn Auth Template Baseline

- **Task ID:** `T-005.6-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-005.5-Review`
- **Objective:** align login/signup UX with approved `shadcn` auth template patterns.
- **Deliverables:**
  - Updated login/signup screens using approved shadcn-based structure.
  - Updated validation and error presentation patterns.
  - Notes documenting any intentional deviations.
- **Acceptance Criteria:**
  - Product owner approves visual and interaction baseline for auth.
  - Auth flow remains functionally equivalent after UI alignment.

---

## 5.7) Mobile-Ready Foundation (Post-Auth)

- **Task ID:** `T-005.7-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-005.6-UI`
- **Objective:** make post-auth core screens mobile-ready before new UI feature expansion.
- **Deliverables:**
  - Responsive layout behavior for dashboard, add/edit item, and auth-adjacent flows.
  - Mobile-friendly spacing, tap targets, and typography adjustments.
  - Breakpoint checklist for key viewports.
- **Acceptance Criteria:**
  - Core authenticated screens are usable on common mobile viewport sizes.
  - Product owner validates mobile readiness baseline.
- **Completion Notes (2026-02-14):**
  - Mobile CRUD gate and qa-browser-pass mobile viewport tests pass.
  - Responsive layout, min-h-11 tap targets, breakpoint adjustments verified.

---

## 5.8) Theme System Baseline (Light/Dark)

- **Task ID:** `T-005.8-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `S`
- **Dependencies:** `T-005.7-UI`
- **Objective:** implement a consistent app-wide light/dark theme foundation before broader UI expansion.
- **Deliverables:**
  - Theme provider setup for app-wide light/dark support.
  - User-accessible theme toggle (desktop and mobile-visible location).
  - Baseline themed states verified on auth, dashboard, and item form screens.
- **Acceptance Criteria:**
  - Theme switch persists user preference across sessions.
  - Core screens render correctly in both light and dark modes.
  - Product owner approves theme behavior baseline.
- **Completion Notes (2026-02-14):**
  - ThemeProvider + ThemeToggle wired in root layout.
  - qa-browser-pass 13/13: theme visibility (desktop + mobile), persistence across reloads, card readability in light/dark.

---

## 6) Implement Item File Upload + Retrieval

- **Task ID:** `T-006-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-004-API`, `T-005-API`, `T-003`
- **Objective:** support attaching documents/images to items securely.
- **Deliverables:**
  - Upload endpoint and storage integration.
  - File metadata persistence.
  - Retrieval and deletion rules.
- **Acceptance Criteria:**
  - Allowed file types enforced.
  - File access checks enforce owner household.
  - Upload failures return actionable errors.
- **Completion Notes (2026-02-14):**
  - ItemDocuments server actions: getItemDocuments, uploadItemDocument, getItemDocumentDownloadUrl, deleteItemDocument.
  - Household-scoped; file type (images + PDF) and size (5MB) validation.
  - Unit tests 6/6 pass. Verify inventory-files bucket in deployment.

---

## 6b) Implement File Upload UI

- **Task ID:** `T-006-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-006-API`, `T-005.8-UI`
- **Objective:** allow users to drag-and-drop or select files for items.
- **Deliverables:**
  - File picker/dropzone component.
  - Upload progress indicator.
  - File list in item detail view with preview/download.
- **Acceptance Criteria:**
  - Optimistic UI shows upload progress.
  - Error messages shown for invalid types/sizes.
  - User can delete attached file.
- **Completion Notes (2026-02-14):**
  - ItemDocumentsSection added with click + drag/drop upload, upload spinner state, and file list with View/Delete.
  - Client-side file validation (type/size) and server-action integration for upload/download/delete.
  - Tests green: ItemDocuments 12/12 and ItemDocumentsSection 6/6.
  - Review confirmation (2026-02-14): Project-Review-012 GO.

---

## 7) Implement Search + Filters

- **Task ID:** `T-007-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-005-API`
- **Objective:** deliver keyword search, filters, and sorting for inventory.
- **Deliverables:**
  - Search API supporting keyword and filter combinations.
  - Sort support (recent/name/expiration).
  - Query performance baseline.
- **Acceptance Criteria:**
  - Results always household-scoped.
  - Search correctness validated on sample dataset.
  - Typical response stays within MVP target.
- **Completion Notes (2026-02-14):**
  - `searchInventoryItems(householdId, params)` with keyword (name/description ilike), categoryId, locationId, sortBy (recent/name/expiration), sortOrder.
  - `getCategoriesForHousehold`, `getLocationsForHousehold` for filter dropdowns.
  - Unit tests 6/6 for search behavior.
  - Review confirmation (2026-02-14): Project-Review-012 GO.

---

## 7b) Implement Search & Filter UI

- **Task ID:** `T-007-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-007-API`, `T-005.8-UI`
- **Objective:** build search bar and filter controls.
- **Deliverables:**
  - Global search input (debounced).
  - Filter chips/dropdowns (Category, Location).
  - Sort controls.
- **Acceptance Criteria:**
  - List updates as user types (or hits enter).
  - Active filters are clearly visible and dismissible.
  - "No results" state is helpful.
- **Completion Notes (2026-02-14):**
  - Historical implementation used `DashboardSearchControls` for debounced search, category/location filters (graceful when empty), sort dropdown, and Clear filters.
  - `InventoryNoResultsState` with Clear filters CTA.
  - URL search params drive server-side search; Suspense wraps controls for useSearchParams.
  - Review confirmation (2026-02-14): Project-Review-012 GO.

---

## 8) Implement Reminder Engine (In-App)

- **Task ID:** `T-008-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-005-API`
- **Objective:** support item reminders and expiration-driven reminder surfacing.
- **Deliverables:**
  - Reminder create/update/complete/snooze behavior.
  - Upcoming reminders endpoint.
  - Reminder status lifecycle definition.
- **Acceptance Criteria:**
  - Reminder state persists correctly.
  - Expiration-linked reminders are queryable.
  - QA validates reminder lifecycle scenarios.
- **Completion Notes (2026-02-14):**
  - Server actions in `apps/web/src/actions/reminders.ts`: createReminder, updateReminder, completeReminder, snoozeReminder, deleteReminder, getItemReminders, getUpcomingReminders.
  - Household scoping enforced via assertItemOwnership and household_id filters.
  - Clear validation errors (date required, invalid date, item not found, reminder not found).
  - Unit tests 15/15 pass.
  - Review confirmation (2026-02-14): Project-Review-012 GO.

---

## 8b) Implement Reminder UI

- **Task ID:** `T-008-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-008-API`, `T-005.8-UI`
- **Objective:** display upcoming reminders and allow management.
- **Deliverables:**
  - Reminder widget on dashboard.
  - Reminder management in item detail.
  - Snooze/Complete actions.
- **Acceptance Criteria:**
  - User sees visual indicator for overdue/soon items.
  - Action (snooze/complete) updates UI immediately.
- **Completion Notes (2026-02-14):**
  - ItemRemindersSection in item detail: create/edit reminder form, complete/snooze/delete actions, empty state.
  - UpcomingRemindersSection on dashboard: list of upcoming reminders with complete/snooze, empty state, error state when fetch fails.
  - Overdue reminders styled in red. Unit tests 4/4 for ItemRemindersSection.
  - Review confirmation (2026-02-14): Project-Review-012 GO.

---

## 8.5) Option B: Minimal Inventory Space Management (Planning Slice)

This is a **backlog-only planning pass**. No implementation is implied by this section.

Scope is intentionally minimal and limited to:
- Rename Inventory Space
- Inventory Space settings surface
- Delete Inventory Space (with strict safety constraints)

### 8.5.1) Inventory Space Management API (Rename/Delete/Settings Read)

- **Task ID:** `T-008.5-API`
- **Owner Agent:** Backend Agent + Data Modeling Agent + Security/Privacy Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-008-API`, `T-004.8-API`
- **Objective:** add the minimum backend contract for Inventory Space management without broad schema refactors.
- **Deliverables:**
  - Rename action for the current Inventory Space.
  - Settings read action (current name, created date, member role for MVP owner path).
  - Delete action with explicit guardrails:
    - typed confirmation required (user must type the Inventory Space name)
    - deny delete when items/documents/reminders exist
    - clear UX-safe error contract for blocked delete
  - Internal naming remains `household` for DB/RLS compatibility in this phase.
- **Acceptance Criteria:**
  - Rename persists and is reflected in dashboard/app shell.
  - Delete is blocked safely when data exists; no partial deletes.
  - Auth and ownership checks remain deterministic and household-scoped.
- **Dispatch Note (2026-02-16):**
  - Product Manager Orchestrator dispatched Option B execution.
  - This task is the active execution step required before `T-008.5-UI`.
- **Completion Evidence (2026-02-16):**
  - Implemented backend actions for current inventory space settings read, owner-only rename, and owner-only delete with typed-confirmation and dependent-data guardrails.
  - Added/updated action tests for rename + settings read + delete guardrails + ownership checks.
  - Validation command: `pnpm --filter @open-inventory/web test src/actions/household.test.ts` -> `13 passed (13)`.

---

### 8.5.2) Inventory Space Settings UI (Rename/Delete Surface)

- **Task ID:** `T-008.5-UI`
- **Owner Agent:** UI Frontend Engineer Agent + UX/Product Research Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-008.5-API`, `T-005.8-UI`
- **Objective:** provide a minimal settings experience that makes Inventory Space management explicit and understandable.
- **Deliverables:**
  - New Settings route/surface for Inventory Space management (`/settings/inventory-space` unless owner changes it).
  - Rename form with loading/success/error states.
  - Delete flow with typed confirmation and clear consequences copy.
  - Mobile-ready and theme-consistent behavior (light/dark).
- **Acceptance Criteria:**
  - User can rename Inventory Space end-to-end from settings.
  - User receives explicit blocked-delete reasons when data exists.
  - No ambiguous/destructive one-click delete path exists.
- **Completion Notes (2026-02-16):**
  - Added new protected settings surface at `/settings/inventory-space` with current name, created date, and member role display.
  - Implemented owner-only rename UX with loading, success, and error states wired to `renameCurrentInventorySpace`.
  - Implemented typed-confirm delete flow with explicit consequence copy and backend blocked-delete reason rendering from `blockedBy`.
  - Added navigation entry points to Inventory Space settings in desktop and mobile account navigation.
  - Validation command: `pnpm --filter @open-inventory/web test src/components/settings/InventorySpaceSettingsForm.test.tsx src/components/navigation/AccountMenu.test.tsx src/actions/household.test.ts src/utils/supabase/middleware.test.ts` -> `25 passed (25)`.

---

### 8.5.3) Inventory Space Management Quality Gate

- **Task ID:** `T-008.5-QA`
- **Owner Agent:** Testing/QA Agent + Project Reviewer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `S`
- **Dependencies:** `T-008.5-API`, `T-008.5-UI`
- **Objective:** verify Option B management behavior before AI scope starts.
- **Deliverables:**
  - Targeted QA coverage for rename success/error and delete safety constraints.
  - Dedicated E2E coverage for Option B management flow (`qa-inventory-space-management.spec.ts` or equivalent).
  - Reviewer GO/NO-GO report for Inventory Space management readiness.
  - Backlog status updates and residual risk callouts.
- **Acceptance Criteria:**
  - Rename/delete/settings behavior is deterministic in web + mobile viewport checks.
  - Reviewer verdict is explicit GO/NO-GO with blocking findings listed.
  - If NO-GO, AI tasks remain blocked.
- **Completion Notes (2026-02-16):**
  - Added dedicated Option B management E2E spec: `apps/web/qa-inventory-space-management.spec.ts`.
  - Added targeted UI test for document-specific blocked-delete reason in `InventorySpaceSettingsForm.test.tsx`.
  - Deterministic evidence commands:
    - `pnpm --filter @open-inventory/web test src/actions/household.test.ts src/components/settings/InventorySpaceSettingsForm.test.tsx` -> `17 passed (17)`.
    - `CI= pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts --config playwright.config.ts` -> `2 passed`.
  - Reviewer decision: **GO** for Option B management scope and AI gate readiness (`docs/Project-Review-014.md`).

---

## 8.6) AI Start Gate (Policy)

`T-009-AI` and `T-009-UI` should not start until:
- `T-008.5-QA` is **done**
- Project Reviewer issues **GO** for Option B management scope
- `T-008.10-QA` is **done**
- Project Reviewer issues **GO** for the pre-AI usability expansion scope
- Any blocking findings are resolved or explicitly accepted by owner

---

## 8.7) Pre-AI Usability Expansion: Spaces + Rooms + Dashboard IA

This section captures owner-approved pre-AI usability expansion work.  
Goal: make the app strongly usable without AI before `T-009-*` begins.

### 8.7.1) Multi-Space + Room Architecture and Contract Lock

- **Task ID:** `T-008.7-ADR`
- **Owner Agent:** Architecture Agent + UX/Product Research Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-008.5-QA`
- **Objective:** lock API/UI/data contracts for multi-space tabs, room model, move flows, and top-nav IA changes before implementation.
- **Deliverables:**
  - ADR for space/room boundaries and transition strategy from current household-first flows.
  - UX interaction contract for:
    - conditional dashboard tabs (render only if space count > 1),
    - room-level add/search/sort placement,
    - per-space edit mode replacing top-level Inventory Space button.
  - Bulk-move interaction recommendation (single + multi-select move patterns).
- **Acceptance Criteria:**
  - Explicit decisions for max limits (5 spaces/user, 10 rooms/space).
  - Explicit deletion warning policy:
    - space with rooms -> warning confirmation,
    - room with items -> warning confirmation,
    - empty space/room -> no confirmation requirement.
  - Product owner approves interaction contract before API/UI implementation.
- **Dispatch Note (2026-02-16):**
  - Pre-AI usability expansion initiated per owner reprioritization.
  - `T-008.7-ADR` is now the active workstream gate before API/UI implementation.
- **Completion Notes (2026-02-16):**
  - Published architecture + UX contract ADR: `docs/ADR-002-PreAI-Usability-Spaces-Rooms-IA.md`.
  - Locked decisions for conditional space tabs, max limits (5 spaces/user, 10 rooms/space), room-required placement, single/bulk move behavior across rooms/spaces, per-space edit mode, in-room add/search/sort placement, and deletion warning policy.
  - Documented explicit in-scope/out-of-scope boundaries, migration strategy from current household-first flows, risks/mitigations, and ADR acceptance criteria.

---

### 8.7.2) Spaces + Rooms Backend/Data/Security Contract

- **Task ID:** `T-008.8-API`
- **Owner Agent:** Backend Agent + Data Modeling Agent + Security/Privacy Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `L`
- **Dependencies:** `T-008.7-ADR`
- **Objective:** implement backend and schema support for spaces/rooms constraints and item move operations.
- **Deliverables:**
  - Room CRUD actions scoped to Inventory Space ownership.
  - Enforced limits:
    - max 5 Inventory Spaces per user,
    - max 10 rooms per space.
  - Item placement/move contract:
    - room required for item creation,
    - item move across rooms and across spaces,
    - bulk item move action with deterministic validation/errors.
  - Delete policies aligned to UX contract and data safety expectations.
- **Acceptance Criteria:**
  - No cross-user/space data leakage.
  - Limits enforced server-side.
  - Move operations are deterministic and auditable.
  - Security sign-off is explicit for new destructive/move paths.
- **Completion Notes (2026-02-16):**
  - Added room backend server actions with ownership-scoped room CRUD and delete-warning policy support:
    - `getRoomsForHousehold`, `createRoom`, `renameRoom`, `deleteRoom` in `apps/web/src/actions/rooms.ts`.
  - Enforced room-required item placement and added deterministic move contracts in `apps/web/src/actions/inventory.ts`:
    - `createInventoryItem` now requires `room_id` and validates household ownership.
    - Added `moveInventoryItem` for single-item room/space moves.
    - Added `bulkMoveInventoryItems` with explicit per-item failure reporting and no silent partial behavior.
  - Added max-space and max-room server enforcement pathing:
    - `createHousehold` now maps deterministic max-space failure (`household_limit_reached`) in `apps/web/src/actions/household.ts`.
    - DB migration enforces limits and room model constraints.
  - Added migration `supabase/migrations/20260216191500_spaces_rooms_contract_enforcement.sql`:
    - creates `rooms` table + RLS policies,
    - adds `inventory_items.room_id` with backfill and NOT NULL,
    - hardens item manage policy to enforce room-household consistency,
    - enforces 10 rooms/space trigger,
    - updates `create_household_with_owner` to enforce 5 spaces/user.
  - Updated DB typings for `rooms` and `inventory_items.room_id` in `apps/web/src/types/database.types.ts`.
  - Validation command:
    - `pnpm --filter @open-inventory/web test src/actions/inventory.test.ts src/actions/rooms.test.ts src/actions/household.test.ts` -> `44 passed (44)`.
- **Remediation Notes (2026-02-16):**
  - Added selected-space APIs for per-space edit mode contract:
    - `getInventorySpaceSettings(spaceId)`
    - `renameInventorySpace(spaceId, name)`
    - `deleteInventorySpace(spaceId, opts)`
  - Aligned selected-space delete semantics to ADR:
    - non-empty space (has rooms) -> `warning_required` with deterministic warning payload `{ hasRooms, roomCount }`
    - empty space -> delete allowed without typed-name confirmation
  - Hardened 5-space/user limit at database table layer with membership trigger enforcement (not RPC-only).
  - Made room deletion deterministic: `deleteRoom` now returns `room_not_found` when no rows are deleted.
  - Remediation verification commands:
    - `pnpm --filter @open-inventory/web test src/actions/household.test.ts src/actions/rooms.test.ts` -> `24 passed (24)`.
    - `pnpm --filter @open-inventory/web test src/actions/inventory.test.ts` -> `26 passed (26)`.

---

### 8.7.3) Dashboard + Room-Centric UI Refresh (No AI)

- **Task ID:** `T-008.9-UI`
- **Owner Agent:** UI Frontend Engineer Agent + UX/Product Research Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `L`
- **Dependencies:** `T-008.8-API`, `T-005.8-UI`
- **Objective:** deliver room-centric dashboard UX and remove top-level controls per owner direction.
- **Deliverables:**
  - Dashboard Inventory Space tabs (hidden when only one space exists).
  - Room management UI per space (create/rename/delete room with policy-compliant warnings).
  - Item creation entry inside room surfaces (remove top-level Add Item button).
  - Search and sort controls inside each room surface.
  - Per-space edit mode for rename/delete space and room management (remove top-level Inventory Space button).
  - Bulk-select and move UX for items across rooms/spaces.
- **Acceptance Criteria:**
  - Core workflows are usable without AI assistance.
  - Mobile and theme behavior remain consistent.
  - `shadcn/ui` patterns are used by default; exceptions are documented owner-visible.
- **Completion Notes (2026-02-16):**
  - Implemented selected Inventory Space dashboard tabs with conditional rendering (tabs render only when user has more than one space).
  - Reworked dashboard to selected-space and selected-room context:
    - room-scoped add/search/sort controls,
    - selected room item surface,
    - selected-space-driven room and item visibility.
  - Added selected-space edit mode in dashboard:
    - rename via `renameInventorySpace(spaceId, name)`,
    - delete via `deleteInventorySpace(spaceId, opts)` with ADR warning flow for non-empty spaces.
  - Added room management UI per selected space:
    - create room,
    - rename room,
    - delete room with warning confirmation when non-empty.
  - Added bulk move UX:
    - multi-select items,
    - destination room selection across spaces,
    - deterministic per-item failure feedback in UI.
  - Removed top-level app nav controls:
    - global `Add Item` button removed from account nav,
    - global `Inventory Space` button removed from account nav.
  - Room-required add-item flow updated:
    - add-item route now requires/validates room selection within selected space.
  - Validation evidence:
    - `pnpm --filter @open-inventory/web test src/app/dashboard/page.test.tsx src/components/inventory/RoomDashboardSurface.test.tsx src/components/navigation/AccountMenu.test.tsx src/actions/rooms.test.ts src/actions/inventory.test.ts` -> `40 passed (40)`.
    - `pnpm --filter @open-inventory/web test src/components/inventory/RoomDashboardSurface.test.tsx src/components/navigation/AccountMenu.test.tsx src/actions/rooms.test.ts src/actions/inventory.test.ts` -> `45 passed (45)`.
  - `shadcn/ui` consistency note:
    - defaulted to project `shadcn` primitives (`Button`, `Input`, `Select`, `Alert`) for new dashboard flows.
    - Exception: native checkbox input used for bulk multi-select because no project `Checkbox` primitive exists yet; behavior/theme verified and kept scoped to T-008.9.
- **Post-Review Follow-Up (2026-02-16):**
  - Owner identified UX/IA gaps requiring a focused polish pass before AI phase:
    - no clear in-dashboard path to create an additional Inventory Space after onboarding,
    - space/room navigation and room action affordances need redesign for clarity and efficiency.

---

### 8.7.3a) Dashboard UX/IA Polish + Space Creation Recovery

- **Task ID:** `T-008.9a-UI`
- **Owner Agent:** UI Frontend Engineer Agent + UX/Product Research Agent + Architecture Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-008.9-UI`
- **Objective:** resolve owner-identified usability issues in dashboard information architecture and controls before AI phase starts.
- **Deliverables:**
  - Add explicit in-dashboard path to create a new Inventory Space (post-onboarding), respecting max 5 limit and error states.
  - Replace separated space/room sections with a single-line coordinated navigation pattern:
    - Space selector control
    - Room selector control scoped to selected space
  - Preferred implementation direction: `shadcn/ui` Navigation Menu or equivalent shadcn-first pattern approved by Architecture + UX.
  - Icon-first control updates with tooltips:
    - space edit control -> icon button + tooltip,
    - room delete -> trash icon button + tooltip,
    - add room -> "Add Room" with plus icon,
    - add item in room -> "Add Item" with plus icon.
  - Room row/action affordance cleanup:
    - remove ambiguous room-selection button behavior,
    - keep room actions visually proximate to room identity.
  - Item card layout refinement:
    - item name and amount inline,
    - expiration date on secondary line when present.
- **Acceptance Criteria:**
  - User can create additional spaces from dashboard without relying on onboarding-only entry.
  - Space and room controls are on one coordinated row and update deterministically on selection changes.
  - Icon controls include tooltip labels and remain keyboard-accessible.
  - Owner validates revised dashboard UX direction.
- **Subphase Update (2026-02-16, UI contract lock complete):**
  - Published architecture/UX decision lock: `docs/ADR-003-T0089a-Dashboard-UX-IA-Contract-Lock.md`.
  - Locked same-line selector pattern as shadcn-first coordinated row (`Select` + `Select` + right-aligned actions); `NavigationMenu` not selected for this interaction.
  - Locked accessibility contract for icon-only controls + tooltips (required `aria-label`, keyboard focus behavior, tooltip as supplementary label only).
  - Locked dashboard `New Space` entry placement and deterministic limit/error contract (max 5 spaces, stable state on failure).
  - Locked room row and item row interaction contract (room identity primary target, proximate row actions, item name+amount inline with expiration on secondary line).
  - Task is now ready for implementation subphase; status remains `in_progress` until UI build + QA evidence complete.
- **Completion Notes (2026-02-16, owner-approved refinement pass):**
  - Owner approval explicitly granted for polished dashboard UX and pre-AI progression.
  - Refined room-surface actions:
    - moved `Add Item` into selected room section,
    - room rename now uses icon control (`Edit Room`) with tooltip,
    - room delete action moved into room edit mode with trash icon + tooltip,
    - `Add Item` hidden while room edit mode is active.
  - Updated bulk move controls to coordinated destination selectors (`Move destination space` + `Move destination room`) to match space/room selection pattern.
  - Added `Back` action in item edit form (`ItemDetailForm`) to return to dashboard scoped to current inventory space.
  - Removed unused `DashboardSearchControls` implementation and test file.
  - Validation evidence:
    - `pnpm --filter @open-inventory/web test src/components/inventory/RoomDashboardSurface.test.tsx src/app/dashboard/page.test.tsx` -> `2 passed (2)`, `9 passed (9)`.
    - `CI='' pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts --config playwright.config.ts` -> `2 passed (2)`.
  - Reviewer verdict: **GO** for pre-AI handoff; `T-008.9a-UI` closure approved.

---

### 8.7.4) Pre-AI Usability Quality + Reviewer Gate

- **Task ID:** `T-008.10-QA`
- **Owner Agent:** Testing/QA Agent + Project Reviewer Agent
- **Priority:** `P0`
- **Status:** `done`
- **Effort:** `M`
- **Dependencies:** `T-008.8-API`, `T-008.9a-UI`
- **Objective:** validate non-AI usability baseline and decide readiness to start AI phase.
- **Deliverables:**
  - QA matrix for tabs/rooms/move/delete policies (desktop + mobile).
  - Dedicated E2E coverage for room-centric dashboard and bulk move behavior.
  - Reviewer GO/NO-GO report for pre-AI usability baseline.
- **Acceptance Criteria:**
  - Room-required item creation is enforced and validated.
  - Space/room limits and deletion warning policies behave deterministically.
  - Reviewer verdict is explicit with blockers listed.
  - If NO-GO, `T-009-AI` and `T-009-UI` remain blocked.
- **Gate Re-run Evidence (2026-02-16, T-008.10 remediation pass):**
  - `pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts`
    - Result: `failed` at runner bootstrap (`http://localhost:3000` already in use).
  - `CI='' pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts`
    - Result: `1 failed, 1 passed`.
    - Blocker: desktop gate case now fails later at stale-item bulk-move selection (`getByLabel('Select <stale item>')` timeout at `qa-inventory-space-management.spec.ts:189`).
  - `pnpm --filter @open-inventory/web test src/components/inventory/RoomDashboardSurface.test.tsx src/app/dashboard/page.test.tsx`
    - Result: `2 passed (2)`, `5 passed (5)`.
  - Reviewer verdict remains **NO-GO** (see `docs/Project-Review-017.md`).
- **Completion Notes (2026-02-16, stale-item flake remediation):**
  - Hardened stale-item selection step in `apps/web/qa-inventory-space-management.spec.ts`:
    - after clearing search input, assert input value is empty,
    - assert URL search param `q` is absent before proceeding,
    - assert stale-item checkbox is visible before `check()`.
  - Verification commands:
    - `CI='' pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts --config playwright.config.ts` -> `2 passed (2)`.
    - `pnpm --filter @open-inventory/web test src/components/inventory/RoomDashboardSurface.test.tsx src/app/dashboard/page.test.tsx` -> `2 passed (2)`, `5 passed (5)`.
  - Reviewer verdict: **GO** for `T-008.10-QA` closure (`docs/Project-Review-018.md`).
- **Reopen Note (2026-02-16):**
  - Gate reopened due owner-reported P0 usability gaps discovered post-review.
  - `T-008.10-QA` now depends on `T-008.9a-UI` completion and fresh reviewer GO.
- **Reopened Validation Evidence (2026-02-16, post T-008.9a contract alignment):**
  - Updated dedicated E2E coverage in `apps/web/qa-inventory-space-management.spec.ts` for:
    - in-dashboard `New Space` creation after onboarding,
    - same-line space/room coordinated controls,
    - icon + tooltip keyboard-focus assertions (`Edit selected space`, `Delete room`),
    - warning flows for non-empty room and non-empty space,
    - item card layout intent (name+amount primary, expiry secondary),
    - room-required add-item flow for space with no rooms.
  - Verification commands:
    - `pnpm --filter @open-inventory/web test src/app/dashboard/page.test.tsx src/components/inventory/RoomDashboardSurface.test.tsx` -> `Test Files 2 passed (2)`, `Tests 8 passed (8)`.
    - `CI='' pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts --config playwright.config.ts` -> `2 passed (2)`.
  - Reviewer verdict: **GO** for `T-008.10-QA` (see `docs/Project-Review-020.md`).

---

## 9) Implement Grounded AI Query + Suggestions

- **Task ID:** `T-009-AI`
- **Owner Agent:** AI/LLM Agent + Testing/QA Agent + Security/Privacy Agent
- **Priority:** `P0`
- **Status:** `in_progress`
- **Effort:** `L`
- **Dependencies:** `T-005-API`, `T-007-API`, `T-003`, `T-008.5-QA`, `T-008.9a-UI`, `T-008.10-QA`
- **Objective:** deliver safe AI responses for inventory questions and suggestions.
- **Deliverables:**
  - Prompt contract with grounding rules.
  - Query orchestration that uses household-scoped data only.
  - Confidence and uncertainty behavior.
  - QA test plan and execution evidence for grounded-answer behavior, uncertainty handling, and guardrail/refusal paths.
  - Reviewer GO/NO-GO report for AI readiness to progress.
- **Acceptance Criteria:**
  - AI answers include evidence references.
  - Unsupported/uncertain questions handled safely.
  - No unapproved write actions executed.
  - QA verifies deterministic behavior for core AI scenarios and key failure/refusal paths.
  - Project Reviewer issues explicit GO before `T-009-AI` is considered complete.
- **Gate Update (2026-02-16):**
  - Option B gate prerequisites are satisfied (`T-008.5-QA` done + Reviewer GO in `docs/Project-Review-014.md`).
  - Pre-AI usability gate was reopened after owner-reported P0 dashboard UX gaps.
  - `T-009-AI` remains blocked until `T-008.9a-UI` and refreshed `T-008.10-QA` reviewer GO are complete.
- **Gate Update (2026-02-16, reviewer refresh):**
  - Refreshed `T-008.10-QA` reviewer verdict is now **GO** (`docs/Project-Review-020.md`).
  - `T-008.9a-UI` closure and owner approval are now complete; dependency chain is satisfied.
- **Kickoff Update (2026-02-16):**
  - Reviewer pass returned **GO** for AI phase start.
  - `T-009-AI` is now active with required QA + Security co-ownership.

---

## 9b) Implement AI Assistant UI

- **Task ID:** `T-009-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `blocked`
- **Effort:** `M`
- **Dependencies:** `T-009-AI`, `T-005.8-UI`
- **Objective:** chat-like interface for "Ask my inventory".
- **Deliverables:**
  - Chat input component.
  - Message history display (user vs AI).
  - "Source" citation display (linking to items).
- **Acceptance Criteria:**
  - Streaming response support (if backend supports it) or loading state.
  - Citations are clickable and open item details.
  - Clear distinction between AI suggestion and fact.
- **Gate Update (2026-02-16):**
  - Option B gate is satisfied, but owner-prioritized pre-AI usability work is now active.
  - This task remains blocked until `T-009-AI` completes with QA evidence and reviewer GO.

---

## 10) MVP Quality Gate + Release Readiness

- **Task ID:** `T-010`
- **Owner Agent:** Testing/QA Agent + DevOps/Infra Agent
- **Priority:** `P0`
- **Status:** `todo`
- **Effort:** `L`
- **Dependencies:** `T-004` through `T-009`
- **Objective:** validate MVP against core flows and prepare controlled release.
- **Deliverables:**
  - Core flow test report.
  - Defect list with severity.
  - Release checklist with rollback and monitoring readiness.
- **Acceptance Criteria:**
  - All core MVP flows pass.
  - No unresolved critical or high security defects.
  - Deployment and rollback process verified.

---

## Sequencing View

1. `T-001` -> `T-002` -> `T-003`
2. `T-004.9-EnvSplit` (prerequisite for deterministic auth gate closure)
3. `T-004.8-API` (release-critical reliability gate)
4. `T-004.5-UI` + `T-004.6-API`
5. `T-004.7-UI`
6. `T-005-API` -> `T-005-UI`
7. `T-005.5-Review` -> `T-005.6-UI` -> `T-005.7-UI` -> `T-005.8-UI`
8. Parallel streams:
   - `T-006-API` -> `T-006-UI`
   - `T-007-API` -> `T-007-UI`
   - `T-008-API` -> `T-008-UI`
9. `T-008.5-API` -> `T-008.5-UI` -> `T-008.5-QA` (Option B management gate)
10. `T-008.7-ADR` -> `T-008.8-API` -> `T-008.9-UI` -> `T-008.9a-UI` -> `T-008.10-QA` (pre-AI usability gate)
11. `T-009-AI` -> `T-009-UI`
12. `T-010` closes MVP readiness

---

## Decision Dependencies (Owner Required)

These decisions should be resolved early to prevent blockers:

1. Final backend stack and hosting model (from `T-001`).
2. Auth provider selection (needed by `T-004`).
3. Auth environment mode policy (email confirmation ON/OFF in dev/staging/prod).
4. Redirect contract by auth/session state (`unauthenticated`, `authenticated_no_household`, `authenticated_with_household`, `expired_session`, `unconfirmed_email`).
5. Error copy policy (user-facing vs internal-only diagnostics).
6. File storage provider and limits (needed by `T-006`).
7. AI provider and budget caps (needed by `T-009`).

---

## First Execution Bundle (Recommended Start This Week)

- Start immediately: `T-001`, `T-002`, `T-003`.
- Prepare implementation context in parallel:
  - UX/Product Research Agent drafts quick flow notes for onboarding, add-item, search, and reminders.
  - DevOps Agent drafts baseline environment/release checklist skeleton.

---

## Change Control

If a new request adds scope, update all three:

1. `MvpAppSpec.md` (source of truth)
2. `AgentRunbooks.md` (operating responsibilities)
3. `TaskBacklog.md` (execution queue)

No task is considered approved until reflected in this backlog.
