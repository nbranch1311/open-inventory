# OpenInventory Product + AI Feature Brainstorm 001

**Date:** 2026-02-14  
**Status:** Brainstorm only (no implementation scope)  
**Facilitator:** Product/Strategy lead synthesis  
**Contributors:** Backend, Data Modeling, UX/Product Research, AI/LLM, Security/Privacy, QA, DevOps agent perspectives

---

## 1) Why this doc exists

This document captures a cross-agent brainstorm of potential product features before AI implementation work.

Goals:
- Expand feature ideas grounded in real user behavior.
- Explore multiple data input methods.
- Define how usage history should work.
- Outline AI feature directions (vision, agentic workflows, scheduler, shopper, notifier).
- Prioritize what is realistic by phase.

Non-goals:
- No code design or implementation tasks.
- No scope commitment yet.

---

## 2) Current baseline (already delivered)

Current product foundation:
- Auth + household onboarding.
- Inventory CRUD.
- File upload and retrieval per item.
- Search + filters + sorting.
- Reminder engine + reminder UI.
- Mobile-ready baseline and light/dark theme baseline.

This brainstorm focuses on what comes after that baseline.

---

## 2b) Platform expansion (Web + App Store)

### Current reality
- Current product is implemented as a web app (mobile-responsive web).
- There is no dedicated native iOS/Android app implementation yet.

### Platform options

| Option | Description | Pros | Cons | Recommendation horizon |
|---|---|---|---|---|
| A | Web app only | Fastest iteration, lowest ops overhead | Weaker native camera/notification/background UX | Keep now |
| B | Hybrid wrapper (Capacitor/TWA) | Reuses web code, faster app-store path | Native integrations can be limited/fragile | Near-term candidate |
| C | Cross-platform app (React Native/Expo/Flutter) with shared backend | Strong native UX and device APIs | New client architecture and QA surface | Mid-term |
| D | Fully native iOS + Android | Best platform depth | Highest cost and team overhead | Later only |

### App-store readiness checklist (brainstorm)

- Product-level:
  - App naming, iconography, screenshots, store copy, privacy labels.
  - App Store + Play policy compliance (account deletion path, privacy policy URL).
- Technical:
  - Native auth session handling and secure token storage.
  - Push notification channel design and opt-in UX.
  - Camera and file permissions flow for barcode/OCR/vision capture.
  - Offline behavior expectations and sync conflict policy.
- Operational:
  - Crash reporting and mobile telemetry.
  - Release trains: internal alpha -> beta -> staged rollout.
  - Mobile QA matrix (OS version/device classes/network conditions).

### Platform strategy recommendation

1. Keep web-first as source of truth while AI baseline is introduced.
2. Plan an app-store pilot with a wrapper approach once:
   - auth/session reliability is proven,
   - reminders + notifications strategy is locked,
   - image/document flows are stable.
3. Re-evaluate full cross-platform app when native-specific value is proven (camera-heavy capture, push-driven engagement, offline needs).

---

## 3) User input methods (how users want to add data)

| Input method | Best context | Why users want it | Product upside | Complexity |
|---|---|---|---|---|
| Manual quick add | Any context | Fast and predictable | Strong default path | S |
| Progressive form (minimal then expand) | First-time and repeat adds | Less friction | Higher conversion to first item | S |
| Barcode scan | Pantry, packaged goods | Speed + less typing | Structured data quality | M |
| Receipt OCR | Groceries, warranties | Reduces repetitive entry | Auto-fill item metadata | M |
| Photo-based add (AI vision) | Pantry/fridge/garage shelves | Natural capture flow | Bulk capture potential | M/L |
| Voice add | Kitchen, hands-busy moments | Hands-free entry | High convenience | M |
| CSV import | Existing inventory migration | Fast migration | Reduces onboarding drop-off | S |
| Batch edit/add | Restock sessions | Time saver for power users | Better maintenance cadence | S/M |

### Input strategy recommendation

Phase priorities:
1. Keep manual/progressive add best-in-class.
2. Add CSV import + batch operations.
3. Add barcode and OCR after AI guardrails are live.
4. Add voice/photo once QA and cost controls are ready.

---

## 3b) Domain expansion beyond groceries

### Expansion thesis
OpenInventory should support household inventory broadly:
- Food and drinks
- Electronics
- Tools and garage items
- Home goods and supplies
- Office/school supplies
- Health/medical and emergency prep
- Documents/warranties/receipts

### Why this matters
- Higher retention: users maintain one inventory system, not separate apps.
- Better AI value: cross-domain recommendations become more useful.
- Stronger real-world utility for insurance, planning, and household operations.

### Category framework (brainstorm)

| Level | Purpose | Example |
|---|---|---|
| Domain | Broad top-level segment | `food`, `electronics`, `tools`, `supplies` |
| Category | Functional grouping | `canned_goods`, `batteries`, `power_tools`, `cleaning` |
| Subcategory (optional) | More precise grouping | `aa_batteries`, `drill_bits`, `paper_towels` |
| Tags | Flexible attributes | `fragile`, `flammable`, `high_value`, `bulk_buy` |

### Example starter taxonomy

- **Food**
  - Pantry dry goods
  - Refrigerated
  - Frozen
  - Snacks
- **Drinks**
  - Water
  - Coffee/tea
  - Juice/soda
- **Electronics**
  - Batteries
  - Cables/adapters
  - Devices/accessories
- **Tools / Garage**
  - Hand tools
  - Power tools
  - Hardware/fasteners
  - Automotive fluids
- **Home supplies**
  - Cleaning
  - Paper/plastic goods
  - Laundry
- **Office / School**
  - Writing supplies
  - Paper
  - Printer/ink

### Data model direction

- Keep categories household-scoped with optional defaults/seed packs.
- Add tags for cross-cutting organization without exploding category depth.
- Allow per-domain metadata profiles later (for example: `warranty_end` for electronics, `calories` optional for food).

### UX direction

- Onboarding asks: "Which inventory areas do you want to track?"
- Pre-seed categories/locations from selected areas.
- Keep add flow simple by showing only relevant optional fields per selected category/domain.

---

## 4) Usage history tracking brainstorm

### Problem
Users want to know not just "what exists now", but "how inventory changed over time."

### Options

| Option | Description | Pros | Cons | Complexity |
|---|---|---|---|---|
| Transaction log | Track quantity deltas (consume/restock/adjust) | Simple and useful quickly | Limited audit depth | S |
| Audit event log | Track create/update/delete events with metadata | Strong traceability | More data volume | M |
| Hybrid (recommended) | Transaction log + audit events | Best analytics + accountability | More moving parts | M |
| Full event sourcing | Every state as events/snapshots | Maximum flexibility | Overkill pre-scale | L |

### Recommendation
- Use a **hybrid model**:
  - `item_transactions` for quantity and usage changes.
  - `audit_events` for critical writes and explainability.

This supports:
- Usage insights.
- Low-stock intelligence.
- Better AI recommendations.
- Stronger trust/debuggability.

---

## 5) Product feature brainstorm (non-AI first)

## High value / near-term
- Usage actions: "Used 1", "Restocked", "Adjusted quantity".
- Low-stock thresholds and alerts.
- Tagging system (cross-category organization).
- Bulk operations (batch update/archive/delete).
- Soft delete + restore.
- Export (CSV/PDF) for insurance and portability.
- Saved views (e.g., "Expiring soon", "Pantry", "Garage").

## Medium-term
- Item templates/presets.
- Expiration forecasting view.
- Multi-household switching UX polish.
- Email-based reminder channel (opt-in).
- Basic dashboard analytics (consumption by category).

## Later / higher complexity
- Retailer/order integrations.
- Offline-first sync model.
- Custom fields framework.
- Advanced sharing/collaboration permissions.

---

## 6) AI feature brainstorm (strategy layers)

## Assistive AI (default, safest)
- Grounded Q&A ("Do I have batteries?").
- Category/location/reminder suggestions.
- Shopping list suggestions from low-stock + reminders.
- Expiration summary and planning insights.
- Meal/usage suggestions from existing inventory.

## Semi-automated AI (user-configured)
- Recurring reminder templates.
- Digest notifications (weekly summary).
- Batch suggestion apply flows (with explicit confirmation).
- Price lookup (opt-in, no purchasing).

## Autonomous candidate AI (defer)
- Auto-snooze rules.
- Auto-rescheduling rules.
- Proactive action queues.

All autonomous-like behaviors must stay opt-in and reversible.

---

## 7) Named AI concepts requested

## AI Vision
- Extract fields from receipts/images.
- Identify items from photos.
- Detect expiration labels from packaging.
- Always return suggestions first; user confirms writes.

## OpenClaw-style agentic workflows
- Interpreted here as tool-using multi-step AI agents.
- Recommended near-term scope: read-heavy and suggestion-only.
- Disallow unsupervised destructive or purchasing actions.
- Require explicit user confirmation for every write path.

## Scheduler
- Suggest reminder timing.
- Recurring reminder templates.
- Later: smarter scheduling based on user behavior.

## Shopper
- Suggest restock lists.
- Prioritize items likely needed soon.
- Optional price-check integrations later.
- No autonomous purchase in current strategy.

## Notifier
- In-app notifications baseline.
- Opt-in email/push follow-up.
- Digest format to reduce notification fatigue.

---

## 8) Current design observations and opportunities

From UX + QA + product angles:
- Strengths:
  - Core flows are reliable and test-backed.
  - Clear empty states and strong baseline UX.
  - Good readiness for iterative feature layering.
- Friction opportunities:
  - Reduce add-item form friction further (progressive add).
  - Improve long-term maintenance workflow (usage quick actions).
  - Add stronger post-capture insight loops (history, trends, recommendations).

---

## 9) Risk and governance summary

| Area | Main risk | Mitigation direction |
|---|---|---|
| Privacy | Sensitive docs/images in AI flows | Explicit consent + data minimization + retention limits |
| Cost | Vision/AI and external APIs can spike | Budget caps, rate limits, feature flags |
| Reliability | Non-deterministic AI and external dependencies | Strong fallback paths, canary rollouts, robust QA fixtures |
| Security | Cross-household leakage risk | Household-scoped checks and audit trails everywhere |
| Product trust | AI overreach/hallucinations | Grounding, confidence labels, explicit human confirmation |

---

## 9b) Data streaming and event infrastructure strategy (DevOps)

### Do we need Redis/Kafka now?
- **Short answer: no (for current stage).**
- Current workload is mostly request/response with moderate async needs.
- AI phase 1 can use standard HTTP response streaming (SSE/fetch streaming) without Kafka/Redis.

### Option framework

| Option | Description | Pros | Cons | Complexity |
|---|---|---|---|---|
| A (recommended now) | No dedicated streaming infra | Lowest ops and cost; fastest delivery | Limited queue/retry semantics | S |
| B (next step if needed) | Lightweight async queue pattern (cron + edge functions, then optional Redis/QStash) | Adds retries/backoff without full platform overhead | Extra service and operational surface | M |
| C (defer) | Kafka-class event platform | Powerful at high scale, replay/multi-consumer patterns | Significant complexity and cost | L |

### Trigger points to adopt lightweight queueing
- Background jobs start overlapping or timing out.
- Need guaranteed retries/backoff for OCR/notification jobs.
- Multiple async consumers appear (digest + notifier + analytics).
- Serverless limits become a recurring bottleneck.

### Trigger points for Kafka-class architecture (not current)
- High-throughput multi-service event flows.
- Event replay requirements across many consumers.
- Team/scale justifies dedicated streaming operations.

### Recommendation
1. Keep Option A for MVP and AI phase 1.
2. Use cron-triggered background jobs for notifier/digest in post-MVP.
3. Move to Option B only when concrete bottlenecks appear.
4. Revisit Option C only at materially higher scale.

---

## 10) Recommended phased feature sequence

## Pre-AI phase (quality + value)
1. Usage transactions + quick usage actions.
2. Low-stock thresholds + alerts.
3. Bulk operations + CSV import.
4. Saved views + export.

## AI phase 1 (safe assistive)
1. Grounded Q&A.
2. Suggestion flows (category/reminder/list).
3. Confidence + citation UX pattern.

## AI phase 2 (media + notifications)
1. Receipt OCR and image-assisted suggestions.
2. Opt-in notifier channels (email/push).
3. Digest and scheduling templates.

## AI phase 3 (advanced automation candidates)
1. Opt-in autonomous helpers with strict kill-switches.
2. Integration-driven shopper workflows (still user-approved).

---

## 11) Decision framework for next planning session

For each proposed feature, decide via:
- Option A: implement now.
- Option B: defer to next phase.
- Option C: reject for MVP-era scope.

Evaluate each by:
- User value.
- Security/privacy exposure.
- Cost to operate.
- QA confidence and rollout risk.
- Long-term maintainability.

---

## 12) Open product questions

1. Which input method should be first after current baseline: barcode, OCR, or CSV?
2. How much autonomous behavior is acceptable before explicit confirmation?
3. Should notifier channels (email/push) be introduced before AI vision?
4. Is shopper scope recommendation-only, or should external cart integrations be planned?
5. What monthly AI budget cap should trigger feature throttling?

---

## 13) Related docs

- `docs/MvpAppSpec.md`
- `docs/TaskBacklog.md`
- `docs/AgentRunbooks.md`
- `docs/AI-Feature-Strategy.md`

