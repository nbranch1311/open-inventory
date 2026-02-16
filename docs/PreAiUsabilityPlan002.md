# Pre-AI Usability Plan 002

**Date:** 2026-02-16  
**Coordinator:** OpenInventory Product Manager Orchestrator Agent  
**Purpose:** Execute owner-directed dashboard UX/IA polish required before `T-009-AI`.

---

## 1) Why This Follow-Up Exists

Post-gate owner review identified a practical usability regression:
- users do not have an explicit in-dashboard path to create additional Inventory Spaces after onboarding.

Additional UX direction requires a focused pass:
- consolidate space and room navigation on one line,
- improve action affordance clarity with icon + tooltip patterns,
- refine room and item row layouts.

This is treated as a blocking pre-AI refinement.

---

## 2) Scope Lock (T-008.9a-UI)

In scope:
- Add dashboard-native "create space" path with max-limit handling.
- Put Space and Room controls on one coordinated navigation line.
- Implement icon-first action affordances with tooltips.
- Improve room action placement and remove ambiguous room-selection affordances.
- Refine item card row layout (name+amount inline, expiration secondary row).

Out of scope:
- AI behavior work.
- New collaboration roles/invites.
- Net-new non-dashboard feature expansion.

---

## 3) Agent Dispatch Plan

### Architecture Agent + UX/Product Research Agent
Task ID: `T-008.9a-UI` (contract subphase)  
Objective:
- Lock final interaction contract for one-line Space/Room navigation.
- Decide between `shadcn` Navigation Menu vs equivalent shadcn-first pattern.
- Define tooltip/icon accessibility requirements and keyboard behavior.

Required artifacts:
- UX interaction decision note (component choice + rationale).
- Accessibility checklist for icon controls and tooltips.

### UI Frontend Engineer Agent + UX/Product Research Agent
Task ID: `T-008.9a-UI` (implementation subphase)  
Objective:
- Implement approved dashboard UX polish and space creation path.

Required artifacts:
- Updated dashboard UI behavior and tests.
- Owner-visible exception note for any non-shadcn usage.

### Testing/QA Agent + Project Reviewer Agent
Task ID: `T-008.10-QA` (re-gate)  
Objective:
- Re-run pre-AI gate with focused coverage for new dashboard UX changes.

Required artifacts:
- Updated QA evidence.
- Reviewer GO/NO-GO decision for AI readiness.

---

## 4) Gate Policy

`T-009-AI` remains blocked until:
1. `T-008.9a-UI` is complete,
2. `T-008.10-QA` is revalidated and marked done,
3. Reviewer issues explicit GO.
