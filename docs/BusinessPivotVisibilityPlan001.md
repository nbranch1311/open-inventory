# Business Pivot Visibility Plan 001

**Date:** 2026-02-17  
**Owner:** Product + Engineering  
**Purpose:** Make the dual-mode pivot (personal + business) visible and understandable in the product UI without breaking the existing personal dashboard flow.

---

## Goal

Today, the business pivot work is mostly foundational (schema, ledger, AI tools) and is primarily visible behind `/dashboard/business`. The goal of this plan is to make the pivot *obvious* and *accessible* from the normal app experience, while preserving the personal experience.

---

## Phase 0: UX Contract Decisions (Required)

These are the only decisions needed to implement the rest cleanly.

### 0.1 Default Landing Behavior

Choose one:

- **A**: Always land on `/dashboard` (personal). Business is reachable via navigation.
- **B**: Landing is workspace-aware: if selected workspace is `workspace_type=business`, default to `/dashboard/business`.
- **C**: Split explicit top-level routes: `/dashboard/personal` and `/dashboard/business`.

**Recommendation:** **B** (workspace-aware) for clarity without a disruptive refactor.

### 0.2 How Users Create/Select a Business Workspace

Choose one:

- **A**: Onboarding asks "Personal or Business?"
- **B**: In-app creation wizard (post-onboarding) supports personal/business.
- **C**: Both onboarding + in-app wizard.

**Recommendation:** **C**. Without B, users get stuck after onboarding; without A, new users never see the pivot.

---

## Phase 1: Navigation + Entrypoints (Fastest Visibility)

### Work

- Add a persistent navigation entry to reach Business:
  - `Dashboard` (personal)
  - `Business` (business dashboard)
- Add a small non-blocking callout in the personal dashboard:
  - "Running a business? Try the Business dashboard (Receive / Fulfill / Adjust / Import)."

### Acceptance Criteria

- A signed-in user can reach `/dashboard/business` without typing a URL.
- Personal flows remain unchanged.
- No new permissions changes.

### Expected Impact

- Pivot becomes visible immediately for every user.

---

## Phase 2: Workspace Type Selection + Routing (Make Mode Real)

### Work

- Add `workspace_type` to workspace/space settings UI:
  - `personal` | `business`
  - Only owner/admin can change
  - Warning copy: changing type affects dashboards and AI behavior (no destructive action).
- Update "Dashboard" routing behavior to be workspace-aware (if Phase 0 chose option B):
  - If selected workspace is `business`, route to `/dashboard/business?space=...`
  - If `personal`, route to `/dashboard` as today

### Acceptance Criteria

- Toggling a workspace to business changes the default dashboard experience for that workspace.
- Existing personal workspaces remain personal by default.
- URL selection continues to work (e.g., `?space=<workspaceId>`).

### Notes

- This is the first moment the pivot "feels" like a real mode and not a hidden page.

---

## Phase 3: Creation Flows (Onboarding + In-App)

### Work

- **Onboarding:** Add a type selection before creating the first workspace:
  - "Personal" vs "Business"
  - Create workspace with correct `workspace_type`
  - If business, route to `/dashboard/business` after onboarding

- **In-app creation:** Ensure "New Workspace" supports type selection:
  - Create personal or business workspaces post-onboarding
  - Apply the existing space limits consistently

### Acceptance Criteria

- New user can choose Business in onboarding and lands on the business dashboard.
- Existing user can create a business workspace without re-running onboarding.
- Errors are deterministic (limits, auth, forbidden).

---

## Phase 4: Make Business Dashboard Feel First-Class (Optional Enhancement)

### Work

- Add a lightweight "Today" strip to `/dashboard/business`:
  - low stock count (<= 5)
  - recent movement count
  - last import hint (if available)
- Add "Create product" CTA (so business mode doesn't require CSV import).

### Acceptance Criteria

- Business dashboard communicates its purpose at a glance.
- Common workflows are discoverable without guesswork.

---

## AI Integration Continuation (After Visibility)

Once the pivot is visible, continue AI integration in a way that matches business workflows.

### AI-1: Fix Citation Semantics (Prevent UI Confusion)

- Current reality: a citation `itemId` may refer to:
  - `inventory_items.id` (personal)
  - `products.id` (business)
- Plan:
  - Extend AI contracts to include `entityType: 'item' | 'product'` (or separate `productId`)
  - Update future AI UI to link to the correct destination based on entity type

### AI-2: Expand Business Tool Surface Gradually

- Short list (ledger-backed):
  - stock-on-hand by SKU/product
  - low-stock lists
  - movement history summaries
- Later (analytics):
  - `get_sell_through` (requires time windows + movement classification)

### AI-3: AI UI (T-009-UI)

- Add an "Ask AI" panel in `/dashboard/business` with:
  - suggested prompts: "How many on hand for SKU ...", "What's low stock?", "Show movements for ..."
  - citations render differently for product vs item

---

## Open Questions (Log)

- Should business mode become the default for all new users, or only when explicitly selected?
- Do we allow changing workspace type after creation, or lock it (create a new workspace instead)?
- Should business mode support multiple locations/bins beyond rooms in the near term?

