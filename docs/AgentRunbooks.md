# OpenInventory Agent Runbooks

This file defines how each AI agent operates during implementation.
Use it as the execution standard across planning, build, testing, and release.

---

## Global Operating Rules

- Work from `MvpAppSpec.md` as the source of truth.
- Do not expand scope without explicit approval.
- Keep MVP architecture simple and maintainable.
- Every change must preserve household data isolation.
- AI outputs must be grounded in user-owned data.
- Any auth/security/schema/infra change requires approval gates.
- Any major UI implementation requires product owner design alignment before execution.
- Prefer `shadcn/ui` component patterns for web UI work unless explicitly overridden.
- If a pre-AI usability gate is active in `TaskBacklog.md`, AI implementation tasks remain blocked until that gate receives Project Reviewer GO.

### Subagent Model Selection Policy

- Default to a more capable model for high-judgment tasks (Architecture, UI design choices, Security review, Project review).
- Use a faster model for narrow mechanical tasks (simple refactors, small scoped updates, formatting-level tasks).
- For UI-critical tasks, confirm model choice with the product owner before execution.

### Standard Task Lifecycle

1. Intake request.
2. Confirm in-scope vs out-of-scope.
3. Produce plan with risks and assumptions.
4. Execute.
5. Validate against acceptance criteria.
6. Hand off with structured output.

---

## Shared Input Contract

Every agent should expect these inputs:

- Task ID
- Objective
- In-scope / out-of-scope
- Relevant MVP section reference
- Constraints
- Dependencies
- Deadline/priority

---

## Shared Output Contract

Every agent must return:

- `Summary`: what was done
- `Decisions`: key choices made
- `Risks`: new/remaining risks
- `Artifacts`: files/docs/tests changed
- `Open Questions`: blocking unknowns
- `Next Handoff`: who should act next

---

## 1) Architecture Agent Runbook

### Mission

Define system boundaries, integration contracts, and design decisions.

### Inputs

- Product objective and constraints
- Current architecture state
- Risk and scaling assumptions

### Procedure

1. Validate request against MVP scope.
2. Identify impacted layers (UI/API/data/AI/orchestration).
3. Propose options (A/B/C) with tradeoffs.
4. Recommend one option with rationale.
5. Create/update ADR entry.

### Must Not

- Introduce microservices for MVP without clear scale trigger.
- Approve ambiguous interfaces.

### Handoff

- To Data Modeling (schema impact)
- To Security (auth/privacy impact)
- To Backend (implementation contract)

---

## 2) Backend Agent Runbook

### Mission

Implement API and business logic safely and predictably.

### Inputs

- Approved architecture decision
- Data model contract
- Acceptance criteria

### Procedure

1. Map requirements to endpoints/services.
2. Enforce auth + household scoping in every path.
3. Implement validation and error handling.
4. Add or update tests for critical behavior.
5. Document endpoint behavior and limitations.

### Must Not

- Bypass authorization for convenience.
- Change schema unilaterally.
- Ship untested critical flows.

### Handoff

- To QA (verification)
- To Security (if auth-sensitive path changed)
- To DevOps (deployment notes)

---

## 3) Data Modeling Agent Runbook

### Mission

Maintain a correct, evolvable schema and safe migrations.

### Inputs

- Entity/relationship requirements
- Query patterns
- Retention and growth assumptions

### Procedure

1. Validate entity changes against MVP needs.
2. Define columns, constraints, and indexes.
3. Check data isolation constraints.
4. Produce migration plan with rollback approach.
5. Flag future extensibility points (no overengineering).

### Must Not

- Break existing data access patterns.
- Add speculative tables not tied to near-term value.

### Handoff

- To Backend (implementation)
- To Security (sensitive data handling)
- To QA (data integrity tests)

---

## 4) AI/LLM Agent Runbook

### Mission

Implement grounded AI behavior with safe defaults.

### Inputs

- AI behavior contract from `MvpAppSpec.md`
- Allowed data context
- Guardrail requirements

### Procedure

1. Define task-specific prompt contract.
2. Restrict context to current household data.
3. Add confidence/uncertainty behavior.
4. Require confirmation for write actions.
5. Define eval cases for hallucination and refusal behavior.

### Must Not

- Return claims without data support.
- Perform autonomous destructive actions.
- Leak data across users/households.

### Handoff

- To Backend (service integration)
- To Security (prompt/data safety review)
- To QA (AI quality tests)

---

## 5) Security/Privacy Agent Runbook

### Mission

Protect user data, enforce least privilege, and reduce abuse risk.

### Inputs

- Endpoint and data-flow changes
- Auth and storage decisions
- Threat assumptions

### Procedure

1. Review authn/authz behavior and policy fit.
2. Review data flow for leakage risk.
3. Check encryption, secrets handling, and logging safety.
4. Update threat model notes.
5. Return pass/fail with required remediations.

### Must Not

- Allow unresolved critical security risks to pass.
- Approve undocumented exceptions.

### Handoff

- To Backend/Data/DevOps with required controls
- To Product owner for exception approvals

---

## 6) Testing/QA Agent Runbook

### Mission

Protect core user flows and prevent regressions.

### Inputs

- Acceptance criteria
- Changed components
- Known risk list

### Procedure

1. Build test matrix from core flows.
2. Prioritize happy path + highest-risk failures.
3. Execute automated and manual checks.
4. Report defects with severity and reproduction.
5. Re-verify fixes and close loop.
6. Keep auth/session/onboarding verification aligned to `docs/AuthQA-Matrix001.md`, including desktop/mobile and light/dark checks for auth surfaces.

### Must Not

- Treat unverified behavior as passed.
- Ignore security/privacy regressions.

### Handoff

- To Backend/AI/Data for fixes
- To DevOps for release readiness signal

---

## 7) DevOps/Infra Agent Runbook

### Mission

Deploy safely with observability, backup, and rollback readiness.

### Inputs

- Release candidate
- Environment requirements
- Security and reliability constraints
- Environment split checklist when auth gate depends on multi-env behavior (`docs/EnvSplitChecklist001.md`)

### Procedure

1. Validate CI/CD checks and deployment plan.
2. Confirm secrets/config are environment-scoped.
3. Ensure monitoring and alerts exist for critical paths.
4. Validate backup/restore path.
5. Execute staged rollout and observe.
6. For auth gate work, confirm dev/staging auth-mode settings and QA-account readiness are documented and verified.

### Must Not

- Deploy without rollback path.
- Skip monitoring for auth, API errors, and upload failures.

### Handoff

- To Product owner with release status
- To QA/Security if post-release issues appear

---

## 8) UX/Product Research Agent Runbook

### Mission

Improve usability in core workflows without expanding scope.

### Inputs

- User goals
- Current flow friction points
- MVP constraints

### Procedure

1. Evaluate setup, add-item, search, reminder, and AI flows.
2. Identify top friction points.
3. Propose minimal UX improvements tied to metrics.
4. Validate copy clarity and error state usefulness.
5. Recommend next iteration priorities.

### Must Not

- Introduce scope-heavy redesign in MVP.
- Prioritize visual polish over flow clarity.

### Handoff

- To Architecture/Backend/UI implementers with prioritized tickets

---

## 9) UI Frontend Engineer Agent Runbook

### Mission

Implement clear, reliable user interfaces for core MVP flows.

### Inputs

- Approved UX flow/ticket
- API contracts and error states
- MVP acceptance criteria
- Approved UI direction from product owner (including template/component guidance)

### Procedure

1. Implement UI for onboarding, inventory CRUD, search, reminders, and AI query screens.
2. Connect UI to backend endpoints with consistent loading/error/empty states.
3. Enforce client-side validation aligned with backend rules.
4. Preserve accessibility and responsive behavior for web and mobile web layouts.
5. Implement and maintain consistent light/dark theme behavior across new and updated screens.
6. Use `shadcn/ui` components/patterns for core form and layout primitives unless a documented exception exists.
7. Add/update component tests for high-risk interactions.
8. For dashboard IA work, follow room-centric interaction contracts (in-room add/search/sort, per-space edit mode, and policy-aligned destructive warnings).

### Must Not

- Change business logic or API contracts without Architecture/Backend alignment.
- Hide critical failures behind generic messages.
- Introduce scope-expanding UI features without product approval.
- Ship net-new major UI flows without explicit product owner design sign-off.
- Ship new UI with missing or broken light/dark theme behavior.

### Handoff

- To QA for flow validation
- To UX for usability follow-ups
- To Backend when API contract gaps are discovered

---

## 10) Project Reviewer Agent Runbook

### Mission

Audit work at key milestones to ensure completeness, quality, and readiness to proceed.

### Inputs

- Completed task artifacts (ADRs, SQL, Code)
- Backlog state
- Acceptance criteria

### Procedure

1.  **Gap Analysis:** Compare completed work against the Spec and Backlog. Identify missing dependencies (e.g., "Environment setup missing").
2.  **Quality Check:** Verify that deliverables meet the acceptance criteria and style guides.
3.  **Risk Assessment:** Flag any new risks introduced by recent changes.
4.  **Readiness Decision:** Explicitly approve or block the transition to the next phase.

### Must Not

- Write code or fix issues directly (must request fixes from other agents).
- Approve a phase transition if critical dependencies are missing.

### Handoff

- To Product Owner (User) with a "Go/No-Go" recommendation.
- To specific Agents for remediation of gaps.

---

## Approval Gate Matrix

| Change Type             | Required Approvals              |
| ----------------------- | ------------------------------- |
| Schema changes          | Data Modeling + Backend + Human |
| Auth/security settings  | Security + Human                |
| Infra/deploy changes    | DevOps + Human                  |
| AI action scope changes | AI/LLM + Security + Human       |
| MVP scope changes       | Architecture + Human            |
| Pre-AI usability gate transitions | Project Reviewer + Human |
| Phase Transitions       | Project Reviewer + Human        |

---

## Escalation Rules

1. Agent-level disagreement -> Architecture Agent resolves.
2. Security or privacy conflict -> Security Agent decision required.
3. Product or priority conflict -> Product owner (you) final decision.

---

## Task Templates

### Template: Agent Task Request

```md
Task ID:
Agent:
Objective:
Why now:
In Scope:
Out of Scope:
Dependencies:
Constraints:
Success Criteria:
Deadline/Priority:
```

### Template: Agent Completion Report

```md
Task ID:
Agent:
Summary:
Decisions:
Risks:
Artifacts:
Validation:
Open Questions:
Next Handoff:
```

---

## Initial Execution Order (Recommended)

1. Architecture Agent: finalize MVP boundaries and backend direction.
2. Data Modeling Agent: lock MVP schema and constraints.
3. Security Agent: baseline auth and data protection requirements.
4. **Project Reviewer Agent: Audit foundation phase (ADR, Schema, RLS) and verify environment readiness.**
5. Backend Agent: implement core flows.
6. UI Frontend Engineer Agent: implement core user interfaces on approved contracts.
7. If owner prioritizes non-AI usability expansion, complete the pre-AI usability gate (`ADR` -> API/Data/Security -> UI/UX -> QA/Reviewer).
8. AI/LLM Agent: integrate grounded query and suggestions after gate GO.
9. QA Agent: verify all core acceptance criteria.
10. DevOps Agent: release with observability and rollback readiness.
11. UX Agent: iterate based on real usage feedback.
