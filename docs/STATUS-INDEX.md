# OpenInventory Docs Status Index

Use this file as the quickest reference for what matters now.

## Current Gate Status

- Gate status is tracked in `docs/TaskBacklog.md` (task statuses + gate notes).
- Project review gate decisions are recorded in `docs/Project-Review-*.md` and referenced from the backlog.

## Active Sources of Truth

- Product scope: `docs/MvpAppSpec.md`
- Agent operating model: `docs/AgentRunbooks.md`
- Execution queue and status: `docs/TaskBacklog.md`

## Business Pivot (Active)

- Dual-mode pivot ADR (personal + business, retail/ecom first): `docs/ADR-005-Business-Pivot-DualMode-Workspace-Ledger.md`
- Deployment review for ledger + AI tool surface: `docs/DevOps-Business-Pivot-Deployment-Review.md`

## Auth and QA (Active)

- Redirect/state contract: `docs/AuthFlow001.md`
- Error handling policy: `docs/AuthErrorCatalog001.md`
- QA scenario matrix: `docs/AuthQA-Matrix001.md`
- QA execution evidence: `docs/AuthQA-Execution-001.md`
- Env split checklist: `docs/EnvSplitChecklist001.md`
- Staging owner runbook: `docs/StagingSetupOwnerGuide001.md`
- Regression evidence: `docs/Regression-Validation-001.md`

## UI and UX Baselines

- Auth UI baseline: `docs/UiBaselineAuth001.md`
- Theme baseline: `docs/ThemeBaseline001.md`
- Mobile baseline: `docs/MobileReadyFoundation001.md`
- Product/feature brainstorm: `docs/ProductFeatureBrainstorm001.md`
- AI brainstorm strategy: `docs/AI-Feature-Strategy.md`

## Architecture and Security

- Architecture decision: `docs/ADR-001-MVP-Architecture.md`
- Schema source: `docs/Schema-MVP-v1.sql`
- RLS source: `docs/Security-RLS-v1.sql`
- Security baseline: `docs/Security-Baseline.md`
- Event/streaming adoption checklist: `docs/AdoptionTriggerChecklist001.md`
- AI QA execution evidence: `docs/AI-QA-Execution-001.md`

## Historical but Useful

- Review history (evidence): `docs/Project-Review-001.md` through `docs/Project-Review-022.md`
- Recent gate decisions (commonly referenced from TaskBacklog):
  - `docs/Project-Review-010.md`, `docs/Project-Review-011.md`, `docs/Project-Review-012.md`
  - `docs/Project-Review-014.md`, `docs/Project-Review-017.md`, `docs/Project-Review-018.md`
  - `docs/Project-Review-020.md`, `docs/Project-Review-022.md`
- Planning draft: `docs/MonorepoPlan001.md`
- Townhall summary: `docs/TownhallSummary001.md`
- Execution dispatch artifacts (superseded by TaskBacklog + reviews; keep as history):
  - `docs/OptionBDispatch001.md`
  - `docs/PreAiUsabilityPlan001.md`
  - `docs/PreAiUsabilityPlan002.md`

## Cleanup Policy (Current)

- Prefer clarity over deletion: keep evidence, but mark what is source-of-truth vs historical.
- Prefer archival/move of historical review docs later instead of deletion (once we have a stable archive convention).
- Keep evidence docs that prove acceptance criteria, even when older.
