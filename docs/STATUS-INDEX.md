# OpenInventory Docs Status Index

Use this file as the quickest reference for what matters now.

## Current Gate Status

- Gate status: `NO-GO` to move past `T-004.8-API` until staging signup ON-path rerun completes without rate-limit skips.
- Unblocked/complete: `T-004.9-EnvSplit` is done.
- Current blocker class: staging environment throughput/rate-limit behavior, not a known code regression.

## Active Sources of Truth

- Product scope: `docs/MvpAppSpec.md`
- Agent operating model: `docs/AgentRunbooks.md`
- Execution queue and status: `docs/TaskBacklog.md`

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

## Historical but Useful

- Review history: `docs/Project-Review-001.md` through `docs/Project-Review-010.md`
- Planning draft: `docs/MonorepoPlan001.md`
- Townhall summary: `docs/TownhallSummary001.md`

## Cleanup Policy (Current)

- Do not delete active gate docs until `T-004.8-API` is closed.
- Prefer archival/move of historical review docs later instead of deletion.
- Keep evidence docs that prove acceptance criteria, even when older.
