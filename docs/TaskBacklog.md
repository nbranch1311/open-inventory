# OpenInventory MVP Task Backlog

This backlog translates `MvpAppSpec.md` and `AgentRunbooks.md` into execution-ready tasks.

Use this as the single queue for MVP delivery.

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
- **Status:** `in_progress`
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
- **Status:** `in_progress`
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

---

## 5.8) Theme System Baseline (Light/Dark)

- **Task ID:** `T-005.8-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 6) Implement Item File Upload + Retrieval

- **Task ID:** `T-006-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 6b) Implement File Upload UI

- **Task ID:** `T-006-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 7) Implement Search + Filters

- **Task ID:** `T-007-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 7b) Implement Search & Filter UI

- **Task ID:** `T-007-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 8) Implement Reminder Engine (In-App)

- **Task ID:** `T-008-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 8b) Implement Reminder UI

- **Task ID:** `T-008-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 9) Implement Grounded AI Query + Suggestions

- **Task ID:** `T-009-AI`
- **Owner Agent:** AI/LLM Agent
- **Priority:** `P0`
- **Status:** `todo`
- **Effort:** `L`
- **Dependencies:** `T-005-API`, `T-007-API`, `T-003`
- **Objective:** deliver safe AI responses for inventory questions and suggestions.
- **Deliverables:**
  - Prompt contract with grounding rules.
  - Query orchestration that uses household-scoped data only.
  - Confidence and uncertainty behavior.
- **Acceptance Criteria:**
  - AI answers include evidence references.
  - Unsupported/uncertain questions handled safely.
  - No unapproved write actions executed.

---

## 9b) Implement AI Assistant UI

- **Task ID:** `T-009-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `todo`
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
9. `T-009-AI` -> `T-009-UI`
10. `T-010` closes MVP readiness

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
