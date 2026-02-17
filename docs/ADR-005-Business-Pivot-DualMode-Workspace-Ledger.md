# ADR-005: Business Pivot (Dual-Mode) and Ledger-Driven Inventory

**Date:** 2026-02-16  
**Status:** Accepted  
**Owners:** Human Owner + Architecture Agent + Security/Privacy Agent + UX/Product Research Agent

---

## Context

The original target user was an individual managing household inventory. That model relies on the user manually adding/removing/updating items over time, which is a poor fit for most consumers long-term.

Small businesses have a stronger need to maintain inventory accurately because it connects directly to revenue (sales), cost (purchasing), operations (shipping/receiving), and planning (restock, trends).

We are also planning native mobile apps (iOS/Android), so the backend boundaries must support cross-client reuse without sacrificing AI capability (text now, multimodal later).

---

## Decision

1. **Dual-mode product direction**
   - Support both `personal` and `business` workspaces.
   - Primary optimization target is **Retail + E-commerce**.
   - Secondary segment to keep in mind (non-blocking) is **Restaurant ops**.

2. **Tenant/workspace model**
   - Continue using `household` as the internal multi-tenant container for now.
   - Introduce a workspace type flag (e.g., `workspace_type`) to distinguish `personal` vs `business`.
   - Keep membership + RLS enforcement as the core security boundary.

3. **Inventory as a ledger**
   - Business inventory is modeled as **stock movements** (a ledger), not only editable item rows.
   - Movements are created from:
     - receiving,
     - fulfillment/sales,
     - adjustments/cycle counts,
     - integration events (e.g., orders).
   - Stock on hand is derived from movements (and/or maintained as a materialized summary later).

4. **AI scope alignment**
   - AI answers must be grounded in workspace-scoped data.
   - For business mode, AI should reference products and movements (evidence is stronger and auditable).
   - The cross-client hybrid AI boundary remains the default:
     - Edge gateway for text/tool calls,
     - live-session broker foundations for future multimodal.

---

## Consequences

### Positive

- Business workflows reduce manual inventory maintenance by tying inventory to transactions and events.
- Ledger provides an audit trail and better grounding for AI (citations can reference movements/orders).
- Cross-client architecture supports web and mobile without duplicating AI policy logic.

### Negative

- Schema and UX become more complex than household-only inventory.
- Integrations become a first-class engineering concern (webhooks, imports, idempotency).

---

## Scope Boundaries

- This ADR does not mandate immediate implementation of all integrations, analytics, or multimodal live AI.
- It mandates that the system direction and schema choices support those paths without repainting later.
