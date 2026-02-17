# ADR-004: T-009 AI Provider Selection (Gemini Flash)

**Date:** 2026-02-16  
**Status:** Accepted  
**Owners:** Human Owner + AI/LLM Agent + Security/Privacy Agent

---

## Context

`T-009-AI` requires a provider decision to finalize implementation details for grounded inventory Q&A and suggestion behavior.

Open requirements from MVP contracts:

- grounded responses from household-scoped data only,
- deterministic refusal for destructive/purchasing actions,
- uncertainty handling when evidence is insufficient,
- explicit confirmation before write actions.

---

## Decision

Use **Google Gemini Flash** as the primary provider for `T-009` implementation.

Implementation pattern:

1. Use function-calling style tool orchestration with household-scoped tools (starting with `search_inventory`).
2. Keep Supabase as source of truth for grounding; no vector DB is required for MVP.
3. Keep AI behavior read-first and suggestion-only unless an explicit confirmation path exists.

---

## Scope Boundaries

Included in MVP (`T-009-AI`):

- grounded text Q&A (e.g., "Do I have X?"),
- suggestion generation (category/reminder/restock) with explicit confirmation requirement,
- guardrails + uncertainty behavior + QA/Security validation.

Explicitly out of MVP closure criteria:

- real-time multimodal live voice/video interactions,
- streaming camera-first assistant workflows,
- calendar integrations and external action execution.

These are tracked as post-MVP expansion candidates.

---

## Consequences

Benefits:

- single-provider operational model for MVP,
- strong fit for future multimodal roadmap without blocking current text-based grounded delivery,
- cost profile aligned with high-volume assistant queries.

Risks:

- provider lock-in if abstractions are not maintained,
- runtime dependency on provider credentials and quotas.

Mitigations:

- preserve provider adapter boundary in code,
- maintain deterministic local/fallback behavior for safe degradation,
- enforce budget throttling via explicit owner-approved caps.

---

## Required Follow-Ups

1. Owner must set budget caps and throttling policy for dev/staging/prod.
2. Security Agent review for key handling, logging redaction, and abuse controls.
3. QA Agent must execute grounded-answer/refusal/uncertainty matrix before GO close on `T-009-AI`.
