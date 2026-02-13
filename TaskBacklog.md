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
- **Status:** `todo`
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
- **Status:** `todo`
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

## 4) Implement Auth + Session + Household Setup

- **Task ID:** `T-004-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 4b) Implement Auth & Onboarding UI

- **Task ID:** `T-004-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 5) Implement Inventory CRUD Core

- **Task ID:** `T-005-API`
- **Owner Agent:** Backend Agent
- **Priority:** `P0`
- **Status:** `todo`
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

---

## 5b) Implement Inventory List & Detail UI

- **Task ID:** `T-005-UI`
- **Owner Agent:** UI Frontend Engineer Agent
- **Priority:** `P0`
- **Status:** `todo`
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
- **Dependencies:** `T-006-API`
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
- **Dependencies:** `T-007-API`
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
- **Dependencies:** `T-008-API`
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
- **Dependencies:** `T-009-AI`
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
2. `T-004-API` -> `T-004-UI` -> `T-005-API` -> `T-005-UI`
3. Parallel streams:
   - `T-006-API` -> `T-006-UI`
   - `T-007-API` -> `T-007-UI`
   - `T-008-API` -> `T-008-UI`
4. `T-009-AI` -> `T-009-UI`
5. `T-010` closes MVP readiness

---

## Decision Dependencies (Owner Required)

These decisions should be resolved early to prevent blockers:

1. Final backend stack and hosting model (from `T-001`).
2. Auth provider selection (needed by `T-004`).
3. File storage provider and limits (needed by `T-006`).
4. AI provider and budget caps (needed by `T-009`).

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
