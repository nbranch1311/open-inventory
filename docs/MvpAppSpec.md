# OpenInventory MVP App Specification

This document defines exactly what the MVP must do, what it must not do, and how AI agents should collaborate to build it.

If a requirement is missing, treat it as out of scope for MVP until added to this file.

---

## 1) MVP Intent

### Product Goal

Help a single household user quickly know what they have at home, where it is, and what needs attention soon (expiration, low stock, reminders), with AI as an assistant.

### MVP Success Definition

The MVP is successful if a user can:

1. Create an account and sign in.
2. Create one household.
3. Add/edit/remove inventory items with basic metadata.
4. Upload item-related files/images.
5. Search inventory with filters and natural language.
6. Receive useful reminders (expiration/date-based).
7. Ask "Do I have X?" and get grounded answers from their own data.

---

## 2) Scope Lock (MVP vs Not MVP)

### In Scope (MVP)

- Authentication and user account.
- Single-user household management.
- Inventory CRUD.
- Search/filter and AI-assisted query.
- Document/image upload tied to items.
- Expiration/reminder support.
- Suggestion-only AI features (no autonomous side effects).

### Out of Scope (MVP)

- Multi-family collaboration and invite workflows.
- Shopping automation or re-ordering.
- Autonomous purchasing.
- Advanced agent autonomy (no unsupervised writes).
- IoT integrations and external smart-home sync.

---

## 3) Target User and Assumptions

### Current Assumptions

- Primary user: one person managing one household.
- Deployment target: web first, mobile-ready UX (native app can come later).
- Data may include receipts/manuals/warranties.
- AI should help decisions, not make irreversible actions.

### Open Assumptions To Confirm Later

- MAU target and scale envelope.
- Timeline target dates.
- Budget and infrastructure constraints.

---

## 4) Core User Flows (Must Work End-to-End)

### Flow A: Account + Household Setup

1. User signs up and logs in.
2. User creates a household profile.
3. User lands on empty inventory state with guided "Add first item."

**Acceptance Criteria**

- New user can complete setup in under 3 minutes.
- Failed auth events return clear actionable errors.

### Flow B: Add and Maintain Inventory

1. User adds item with required fields.
2. User optionally adds metadata (location, expiration, docs, notes).
3. User can edit or archive/delete item later.

**Acceptance Criteria**

- Required fields validated before save.
- Item appears in list/search immediately after save.

### Flow C: Upload Supporting Files

1. User uploads receipt/manual/warranty/image on item detail.
2. File is associated to item and visible in item detail.
3. User can remove file from item.

**Acceptance Criteria**

- Upload status is visible (uploading/success/failure).
- Unsupported file types are blocked with clear feedback.

### Flow D: Search + Filters

1. User enters keyword or applies filters (category/location/status/expiration).
2. Results update quickly and are scoped to user household only.

**Acceptance Criteria**

- Typical search response target: under 1 second for MVP data size.
- Empty states explain next action (clear filters/add item).

### Flow E: AI Question

1. User asks natural language question, e.g. "Do I have batteries?"
2. System maps question to inventory query.
3. Response includes answer + supporting items.

**Acceptance Criteria**

- AI answer must be grounded in user data (no fabrication).
- If uncertain, AI says uncertain and asks clarifying question.

### Flow F: Reminder Cycle

1. User sets reminder or expiration date on item.
2. System surfaces upcoming reminders in app.
3. User can mark reminder done/snooze.

**Acceptance Criteria**

- Reminder state changes persist reliably.
- Reminders only visible to household owner in MVP.

---

## 5) Functional Requirements

### Auth and Access

- Email/password auth required.
- Session handling with secure token/session storage.
- Every data read/write must enforce household ownership boundary.

### Inventory

Each `InventoryItem` must support:

- Name (required)
- Category (required)
- Quantity + unit (required)
- Optional location
- Optional expiration date
- Optional purchase date
- Optional notes
- Optional condition/status
- Optional usage frequency

### Documents and Images

- User can attach files to an item.
- Store metadata: filename, type, upload time, size.
- File retrieval only allowed for owner household.

### Search

- Keyword search on item name + notes + tags.
- Filters: category, location, expiration window, status.
- Sort: recent, name, soonest expiration.

### AI Assistant (MVP Behavior Contract)

- AI can suggest category/tag/reminders.
- AI can answer inventory questions grounded in current household data.
- AI cannot execute destructive or purchasing actions.
- AI writes require explicit user confirmation (default behavior).

---

## 6) Data Model (MVP Minimum)

### Required Entities

- `User`
- `Household`
- `HouseholdMember` (single-owner in MVP, but keeps model future-ready)
- `InventoryItem`
- `ItemDocument`
- `ItemReminder`
- `Category`
- `Location` (optional but supported)
- `Tag` (optional for MVP, can be basic)

### Key Relationship Rules

- A `User` owns one `Household` in MVP.
- A `Household` owns many `InventoryItem` records.
- An `InventoryItem` can have many `ItemDocument` records.
- An `InventoryItem` can have many `ItemReminder` records.
- All queries must be household-scoped.

---

## 7) Non-Functional Requirements (MVP)

### Security

- Encrypt in transit and at rest.
- Passwords hashed with modern standard.
- Access control checks on every endpoint.
- Basic audit logging for auth and critical write actions.

### Reliability

- Daily backup minimum.
- Basic monitoring for auth errors, API errors, and file upload failures.

### Performance

- List/search usable with at least 5k items per household.
- File upload should show progress and error states.

### Cost Discipline

- Prefer managed services and low-ops setup.
- AI usage limits and guardrails to avoid runaway cost.

---

## 8) UX Expectations (MVP)

- Fast add-item flow (minimal required fields).
- Clear empty states and "next best action" prompts.
- No hidden AI actions; always transparent when AI is used.
- Explainable AI responses with linked source items.
- Use `shadcn/ui` components and patterns as the default UI foundation.
- Use a `shadcn` auth template/pattern for login/signup as the baseline implementation direction.
- Product owner design approval is required before major UI flow implementation or redesign.
- After auth is working, prioritize mobile-ready responsive behavior for all core MVP screens.

---

## 9) Agent Team Definition (Initial)

Each agent has strict responsibilities and boundaries.

### 1) Architecture Agent

- **Responsibility:** define system boundaries, integration contracts, and versioned architecture decisions.
- **Inputs:** product scope, constraints, risk register.
- **Outputs:** architecture decision records (ADR), high-level diagrams, API boundary definitions.
- **Constraints:** cannot implement code directly; must avoid premature microservices.
- **Boundaries:** approves interfaces; does not own feature delivery.

### 2) Backend Agent

- **Responsibility:** implement API endpoints, auth integration, and core business logic.
- **Inputs:** ADRs, data model spec, acceptance criteria.
- **Outputs:** backend code, endpoint contracts, migration drafts.
- **Constraints:** must enforce auth and household scoping everywhere.
- **Boundaries:** cannot change security policy without Security Agent approval.

### 3) Data Modeling Agent

- **Responsibility:** define schema, relationships, indexes, migration safety.
- **Inputs:** MVP entity definitions, query patterns, growth assumptions.
- **Outputs:** schema design docs, migration plans, index strategy.
- **Constraints:** optimize for correctness and evolvability over early cleverness.
- **Boundaries:** no deployment responsibility.

### 4) AI/LLM Agent

- **Responsibility:** implement prompt strategy, grounding logic, confidence handling.
- **Inputs:** AI behavior contract, allowed actions, context schema.
- **Outputs:** prompt specs, eval cases, guardrail definitions.
- **Constraints:** no ungrounded claims; no autonomous destructive actions.
- **Boundaries:** cannot bypass product guardrails or security controls.

### 5) Security/Privacy Agent

- **Responsibility:** authz patterns, data protection, threat model, privacy controls.
- **Inputs:** architecture draft, endpoint list, data sensitivity assumptions.
- **Outputs:** security checklist, threat model updates, policy requirements.
- **Constraints:** security exceptions must be explicitly documented.
- **Boundaries:** advises and approves controls; does not own feature UX.

### 6) Testing/QA Agent

- **Responsibility:** define and execute test strategy for core flows and regressions.
- **Inputs:** user flows, acceptance criteria, API contracts.
- **Outputs:** test plan, automated tests, defect reports.
- **Constraints:** prioritize end-to-end critical flows before edge-case expansion.
- **Boundaries:** cannot redefine product behavior without product approval.

### 7) DevOps/Infra Agent

- **Responsibility:** environments, CI/CD, monitoring, backup/recovery setup.
- **Inputs:** architecture constraints, security requirements, SLO targets.
- **Outputs:** deployment pipelines, runbooks, observability config.
- **Constraints:** keep infra simple and low-ops for MVP.
- **Boundaries:** no schema changes without Data Modeling + Backend alignment.

### 8) UX/Product Research Agent

- **Responsibility:** interaction design for add/search/reminder/AI flows.
- **Inputs:** product goal, user problem, scope lock.
- **Outputs:** wireframes, usability findings, prioritized UX improvements.
- **Constraints:** avoid introducing net-new scope without explicit decision.
- **Boundaries:** cannot alter security or data model contracts directly.

---

## 10) Agent Orchestration Rules

### Decision Path

1. Product/Architecture define requirement.
2. Data Modeling validates schema impact.
3. Security reviews auth/privacy impact.
4. Backend implements.
5. QA validates acceptance criteria.
6. DevOps handles release and monitoring.

### Approval Gates

- Schema changes: Data Modeling + Backend + Human approval.
- Auth/security changes: Security + Human approval.
- Infra changes: DevOps + Human approval.
- AI action-scope changes: AI/LLM + Security + Human approval.

### Conflict Resolution

- First escalation: Architecture Agent.
- Final escalation: Product owner (you).

---

## 11) Risks and Countermeasures (MVP)

### High Priority Risks

1. **AI trust risk** - inaccurate answers can damage user confidence.
   - Mitigation: grounded responses + source references + uncertainty fallback.
2. **Data boundary risk** - household data leakage is unacceptable.
   - Mitigation: strict access control tests on every query path.
3. **Scope creep risk** - too many "smart" features before stable core.
   - Mitigation: enforce scope lock and acceptance criteria.
4. **Cost risk** - AI and file storage can scale unexpectedly.
   - Mitigation: quotas, usage monitoring, and conservative defaults.

---

## 12) Open Decisions Before Build Starts

1. Final backend stack selection.
2. Auth provider and session strategy.
3. File storage provider and limits.
4. Reminder delivery method (in-app only vs email/push).
5. AI provider and budget caps.

---

## 13) Implementation Readiness Checklist

- [ ] MVP scope approved.
- [ ] Agent responsibilities approved.
- [ ] Core entities approved.
- [ ] Security baseline approved.
- [ ] Acceptance criteria approved.
- [ ] Top 5 risks acknowledged with mitigations.

When all boxes are checked, implementation planning can start.
