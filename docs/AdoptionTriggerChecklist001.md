# OpenInventory Event Infrastructure Adoption Trigger Checklist 001

**Date:** 2026-02-14  
**Status:** Active planning checklist  
**Scope:** When to stay simple vs adopt queue/streaming infrastructure

---

## 1) Purpose

This checklist prevents premature infrastructure complexity.

Use it to decide when to move between:
- **Stage A:** No dedicated queue/streaming
- **Stage B:** Lightweight async queue pattern
- **Stage C:** Kafka-class event platform

---

## 2) Default Position

- Start in **Stage A**.
- Move to **Stage B** only when measured bottlenecks are persistent.
- Move to **Stage C** only when scale and architecture clearly require it.

---

## 3) Stage Definitions

| Stage | What it means | Typical tools |
|---|---|---|
| A | Request/response + minimal async jobs | Next.js server actions, cron, background functions |
| B | Managed retries/backoff and queue semantics | Cron + queue (Redis/QStash/BullMQ-style) |
| C | High-throughput multi-consumer event streaming | Kafka-class platform |

---

## 4) Gate A -> B (No Queue to Lightweight Queue)

Move from A to B only if **2 or more** triggers are true for **at least 2 consecutive weeks**.

### Reliability triggers
- [ ] Background jobs time out repeatedly (not isolated incidents).
- [ ] Job overlap causes duplicate or conflicting outcomes.
- [ ] Manual reruns are regularly needed to recover failed async tasks.
- [ ] Retry/backoff requirements cannot be handled safely in current cron/function model.

### Performance/throughput triggers
- [ ] Async backlog grows and does not clear during normal load.
- [ ] Average completion time for async tasks breaches product expectations.
- [ ] Burst traffic causes sustained queueing delays that affect user-visible behavior.

### Operations triggers
- [ ] On-call/maintenance burden for async issues is consistently high.
- [ ] Lack of idempotent execution protection causes recurring incidents.
- [ ] Cost of failures/retries in current model is higher than adding lightweight queue infra.

### Required evidence before approval
- [ ] 14-day metrics snapshot attached.
- [ ] Incident summary with frequency and impact.
- [ ] Proposed Stage B design with rollback plan.
- [ ] Security review for new infrastructure dependency.

### Approval required
- [ ] DevOps Agent
- [ ] Security/Privacy Agent
- [ ] Product Owner

---

## 5) Gate B -> C (Lightweight Queue to Kafka-Class)

Move from B to C only if **all** mandatory triggers are true.

### Mandatory triggers
- [ ] Multi-service, multi-consumer event architecture is required (not optional).
- [ ] Event replay is a hard requirement for product/ops/compliance.
- [ ] Throughput and fan-out exceed practical limits of Stage B architecture.
- [ ] Ordering and durability constraints cannot be reliably met in Stage B.

### Additional triggers (at least 2)
- [ ] Distinct consumer domains require independent scaling.
- [ ] Event retention and reprocessing workflows are product-critical.
- [ ] Cross-team platform ownership model exists for operating Kafka-class systems.
- [ ] Total cost of Stage B complexity exceeds Stage C projected TCO at target scale.

### Required evidence before approval
- [ ] 30-day load/throughput profile.
- [ ] Architecture decision doc (Option A/B/C with rationale).
- [ ] Capacity model and cost estimate (6-12 months).
- [ ] Operational readiness plan (on-call, runbooks, SLOs).
- [ ] Migration and rollback strategy.

### Approval required
- [ ] Architecture Agent
- [ ] DevOps Agent
- [ ] Security/Privacy Agent
- [ ] Product Owner

---

## 6) Anti-Triggers (Do NOT escalate for these alone)

- [ ] “Kafka is industry standard” without measured need.
- [ ] Single isolated incident.
- [ ] Team preference for new tech without production pressure.
- [ ] Anticipated scale not supported by real usage trend.
- [ ] AI feature addition alone (AI phase 1 does not require Kafka/Redis by default).

---

## 7) AI-Specific Guidance

- AI response streaming (chat-like UX) is **not** a Kafka trigger by itself.
- Suggestion-only AI flows should remain Stage A unless async reliability triggers emerge.
- OCR/vision batch jobs may justify Stage B if retries/backoff become recurring pain.

---

## 8) Review Cadence

- [ ] Re-run this checklist at each major milestone (`T-009`, `T-010`, post-launch month 1).
- [ ] Re-run immediately after any severe async reliability incident.

---

## 9) Decision Record Template

Use this block whenever a stage-change decision is made:

```md
Decision Date:
Current Stage:
Proposed Stage:
Triggers Met:
Evidence Links:
Risk Summary:
Rollback Plan:
Approvals:
Final Decision: GO / NO-GO
```

