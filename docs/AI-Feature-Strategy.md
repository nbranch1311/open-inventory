# OpenInventory AI Feature Strategy

**Version:** 1.0  
**Date:** 2026-02-14  
**Status:** Draft for Product Owner Review

This document brainstorms AI feature directions for OpenInventory with strong grounding and safety. It aligns with `MvpAppSpec.md` (suggestion-only AI, no autonomous side effects) and extends toward future capability layers with explicit guardrails.

---

## 1) Executive Summary

OpenInventory’s MVP AI contract is **assistive only**: grounded answers, suggestions, no unsupervised writes. This strategy extends that into three capability layers—**assistive**, **semi-automated**, and **autonomous candidate**—with clear safety contracts, data requirements, and phased rollout.

---

## 2) AI Vision Features (Image Understanding for Inventory)

### 2.1 Use Cases

| Use Case | Description | Data Source |
|----------|-------------|-------------|
| **Receipt OCR + field extraction** | Extract product name, price, date from receipt images | `ItemDocument` (images/PDFs) |
| **Product identification** | Suggest name/category from product photo | Item image upload |
| **Expiration label reading** | Read “best by” / “expires” from packaging | Item image |
| **Condition assessment** | Suggest condition (new/used/damaged) from photo | Item image |
| **Barcode/QR decoding** | Decode barcode for product lookup (optional) | Item image |

### 2.2 Grounding and Safety

- **Input scope:** Only images/documents attached to items in the current household.
- **Output scope:** Suggestions only; user must confirm before any DB write.
- **Confidence:** Low-confidence extractions surfaced as “uncertain—please verify.”
- **Privacy:** No image data sent to third parties without explicit consent; prefer on-device or privacy-preserving APIs where feasible.

### 2.3 Technical Considerations

- `ItemDocument` already supports images and PDFs (5MB limit, `FileValidation.ts`).
- Vision APIs: OpenAI Vision, Google Cloud Vision, or local models (e.g., Tesseract for OCR).
- Cost: Vision models are typically more expensive than text; batch and cache where possible.

---

## 3) “OpenClaw”-Style Agentic Workflows (Constrained)

*OpenClaw* refers to agentic systems that plan, use tools, and execute multi-step workflows. For OpenInventory, such workflows must be **strictly constrained**.

### 3.1 Allowed Agentic Patterns

| Pattern | Description | Constraint |
|---------|-------------|------------|
| **Multi-step query** | Chain search → filter → summarize across inventory | Read-only; no writes |
| **Suggestion pipeline** | Analyze items → propose category/location/reminder → present for approval | Writes only after explicit user confirmation |
| **Batch suggestion** | “Suggest categories for all uncategorized items” | Single confirmation for batch; user can accept/reject per item |
| **Reminder surfacing** | Agent identifies items needing reminders → proposes dates | User confirms each reminder |

### 3.2 Disallowed Patterns (MVP and Near-Term)

- Autonomous purchasing or re-ordering.
- Unsupervised bulk edits (archive, delete, status change).
- Cross-household data access.
- External API calls (e.g., price lookup) without user opt-in.
- Tool use that bypasses RLS or auth checks.

### 3.3 Tool Contract for Agentic Flows

If an agentic layer is introduced, tools must:

1. **Read tools:** `search_inventory`, `get_item`, `get_reminders`, `get_categories`, `get_locations` — all household-scoped.
2. **Write tools:** `create_item`, `update_item`, `create_reminder`, etc. — all require a `user_confirmed: true` flag; never auto-execute.
3. **Audit:** Every tool call logged with household_id, user_id, action, timestamp.

---

## 4) Scheduler, Shopper, Notifier, Planner Use-Cases

### 4.1 Scheduler

| Feature | Description | Layer | Safety |
|---------|-------------|-------|--------|
| **Reminder suggestions** | “These items expire soon; add reminders?” | Assistive | User confirms each |
| **Recurring reminder templates** | “Remind me to check pantry every 2 weeks” | Semi-automated | User defines template; system creates reminders on schedule |
| **Smart scheduling** | “Best time to remind based on usage patterns” | Semi-automated | Suggestion only; user approves |
| **Auto-snooze rules** | “Snooze expiration reminders by 3 days if not acknowledged” | Autonomous candidate | Requires explicit opt-in; user can disable |

### 4.2 Shopper (Constrained)

| Feature | Description | Layer | Safety |
|---------|-------------|-------|--------|
| **Low-stock detection** | “You have 1 battery left; consider restocking” | Assistive | Suggestion only |
| **Shopping list generation** | “Generate list from low-stock + expiring items” | Assistive | User edits before use |
| **Re-order suggestions** | “Items you often restock: X, Y, Z” | Assistive | No purchase action |
| **Price/availability lookup** | “Check price for X at Store Y” (opt-in) | Semi-automated | External API; user must opt in; no auto-purchase |

*Note: MvpAppSpec explicitly excludes shopping automation and autonomous purchasing.*

### 4.3 Notifier

| Feature | Description | Layer | Safety |
|---------|-------------|-------|--------|
| **In-app reminders** | Already implemented (`item_reminders`, `UpcomingRemindersSection`) | Assistive | N/A |
| **Email/push reminders** | “Send me email when reminder due” | Semi-automated | User opt-in; configurable frequency |
| **Digest notifications** | “Weekly summary: 3 expiring, 2 low-stock” | Semi-automated | User opt-in |
| **Proactive alerts** | “Unusual: 5 items expired this week” | Assistive | In-app only initially |

### 4.4 Planner

| Feature | Description | Layer | Safety |
|---------|-------------|-------|--------|
| **Meal planning from inventory** | “What can I make with what I have?” | Assistive | Read-only; no inventory edits |
| **Trip prep checklist** | “Items to pack based on trip type + inventory” | Assistive | Suggestion only |
| **Expiration forecasting** | “By end of month, 8 items will expire” | Assistive | Read-only |
| **Usage pattern insights** | “You restock batteries every ~6 weeks” | Assistive | Analytics only; no writes |

---

## 5) Confidence, Guardrails, Human Approval Patterns

### 5.1 Confidence Tiers

| Tier | Behavior | UX |
|------|----------|-----|
| **High** | Model is confident; data supports answer | Show answer with source links; no disclaimer |
| **Medium** | Partial match or inference | “Based on your data…”; show sources; optional “Verify” prompt |
| **Low** | Uncertain or no data | “I’m not sure” or “No matching items”; suggest clarifying question |
| **Refuse** | Out-of-scope or unsafe | “I can’t help with that”; explain scope |

### 5.2 Guardrails

1. **Input guardrails:** Reject prompts that request cross-household data, destructive actions, or external purchases.
2. **Output guardrails:** Never return fabricated item names/IDs; every claim must map to real household data.
3. **Rate limits:** Per-user and per-household caps to control cost and abuse.
4. **Prompt injection defense:** Sanitize user input; avoid passing raw user text to tools without validation.

### 5.3 Human Approval Patterns

| Action Type | Approval Pattern |
|-------------|------------------|
| **Read-only answer** | No approval; show sources |
| **Suggestion (category, reminder, etc.)** | “Apply” button; user explicitly confirms |
| **Batch suggestion** | “Apply all” / “Apply selected” with checkbox per item |
| **Scheduled action** | User defines schedule; first run may require confirmation |
| **External API call** | Explicit opt-in per feature; no silent calls |

---

## 6) Cost-Aware Model Strategy and Latency Tiers

### 6.1 Latency Tiers

| Tier | Use Case | Target Latency | Model Type |
|------|----------|----------------|------------|
| **Real-time chat** | “Do I have X?” | < 2s | Fast LLM (e.g., GPT-4o-mini, Claude Haiku) |
| **Batch/suggestions** | “Suggest categories for 20 items” | < 30s | Same or slightly larger |
| **Vision/OCR** | Receipt extraction | < 5s per image | Vision-capable model |
| **Background/async** | Digest generation, analytics | Minutes OK | Cheapest capable model |

### 6.2 Cost Strategy

1. **Default to small models:** Use GPT-4o-mini, Claude Haiku, or equivalent for most queries.
2. **Upgrade on demand:** If user asks complex question or low-confidence, optionally retry with larger model (with user-facing “Thinking…”).
3. **Caching:** Cache common queries (e.g., “what do I have?”) with short TTL; invalidate on inventory change.
4. **Budget caps:** Per-household monthly token budget; graceful degradation when exceeded.
5. **Structured outputs:** Use JSON mode / function calling to reduce token waste and improve reliability.

### 6.3 Model Selection Matrix

| Task | Preferred Model | Fallback | Rationale |
|------|-----------------|----------|-----------|
| Simple Q&A | Fast (Haiku/mini) | — | Cost-effective, low latency |
| Multi-step reasoning | Medium (Sonnet/4o) | Fast | Better planning |
| Vision/OCR | Vision-capable | — | Required for images |
| Refusal/guardrails | Any | — | Implement in prompt + post-processing |

---

## 7) Feature Catalog by AI Capability Layer

### 7.1 Assistive (User in Control)

| Feature | Description | Data/Context | Safety Contract |
|---------|-------------|-------------|-----------------|
| **Grounded Q&A** | “Do I have X?” with source links | `inventory_items`, `categories`, `locations` | Read-only; no fabrication |
| **Category/location suggestions** | Suggest based on name/description | Item metadata, household taxonomy | Suggestion only; user confirms |
| **Reminder suggestions** | “Add reminder for X?” | Item + `expiry_date` | User confirms each |
| **Receipt OCR** | Extract fields from receipt image | `ItemDocument` image | Suggestion only; user edits before save |
| **Product ID from photo** | Suggest name/category from image | Item image | Suggestion only |
| **Low-stock alerts** | “Consider restocking X” | `inventory_items` quantity | In-app notification only |
| **Shopping list generation** | List from low-stock + expiring | `inventory_items`, `item_reminders` | User edits before use |
| **Meal planning from inventory** | “What can I make?” | `inventory_items` | Read-only |
| **Expiration forecast** | “8 items expire by end of month” | `inventory_items` | Read-only |

### 7.2 Semi-Automated (User Configures, System Executes)

| Feature | Description | Data/Context | Safety Contract |
|---------|-------------|-------------|-----------------|
| **Recurring reminder templates** | “Remind me every 2 weeks” | User-defined template | User approves template; system creates reminders |
| **Email/push reminders** | Send reminder via email/push | `item_reminders`, user preferences | User opt-in; can disable |
| **Digest notifications** | Weekly summary | `inventory_items`, `item_reminders` | User opt-in |
| **Batch category apply** | “Apply suggested categories to selected items” | AI suggestions + user selection | User selects items; single confirmation |
| **Price lookup (opt-in)** | “Check price for X” | External API + user opt-in | No purchase; user initiates |

### 7.3 Autonomous Candidate (Future, High Scrutiny)

| Feature | Description | Data/Context | Safety Contract |
|---------|-------------|-------------|-----------------|
| **Auto-snooze rules** | Snooze reminder if not acknowledged | `item_reminders`, user rule | Explicit opt-in; easy disable |
| **Smart reminder scheduling** | Adjust reminder time by pattern | Usage history | User approves algorithm; audit trail |
| **Proactive low-stock ordering** | “Add to cart” suggestion (no purchase) | `inventory_items`, history | No auto-purchase; user must click |

*Note: Full autonomous purchasing remains out of scope per MvpAppSpec.*

---

## 8) Required Data/Context per Feature

### 8.1 Core Context (Always Required)

- `household_id` — strict scope
- `user_id` — for audit and preferences
- Auth/session — all AI calls authenticated

### 8.2 Per-Feature Context

| Feature | Required Data | Optional |
|---------|---------------|----------|
| Grounded Q&A | `inventory_items`, `categories`, `locations` | `item_reminders` |
| Category suggestions | Item name, description; household `categories` | Existing item categories |
| Receipt OCR | `ItemDocument` image bytes | — |
| Product ID from photo | Item image | Household categories |
| Reminder suggestions | Item, `expiry_date`, `item_reminders` | — |
| Low-stock alerts | `inventory_items` (quantity, unit) | User-defined thresholds |
| Shopping list | `inventory_items`, `item_reminders` | User preferences |
| Digest | `inventory_items`, `item_reminders`, `item_documents` | User notification prefs |
| Recurring reminders | User template, `inventory_items` | — |

### 8.3 Data Minimization

- Send only fields needed for the task (e.g., for Q&A: name, quantity, location, category, expiry).
- Never send raw file bytes to external APIs without user consent; consider on-device or self-hosted vision.
- Log minimal PII; avoid logging full prompts in production.

---

## 9) Safety Contract Summary per Feature

| Feature | Max Autonomy | Human Check | Rollback |
|---------|--------------|-------------|----------|
| Grounded Q&A | Read-only | None | N/A |
| Suggestions (category, reminder) | Propose | User confirms each | User can undo edit |
| Receipt OCR | Propose | User edits before save | User can reject |
| Batch apply | Propose | User selects + confirms | Per-item undo or batch revert |
| Recurring reminders | Create on schedule | User approves template | User deletes template |
| Email/push | Send on schedule | User opt-in | User disables |
| Auto-snooze | Snooze if rule matches | User defines rule | User disables rule |

---

## 10) Phased Rollout (v1 / v2 / v3)

### v1 (MVP — T-009)

- **Grounded Q&A:** “Do I have X?” with source links.
- **Confidence handling:** Refuse when uncertain; no fabrication.
- **Suggestion-only:** Category/reminder suggestions with explicit “Apply.”
- **No vision, no agentic tools, no notifications.**

### v2 (Post-MVP)

- **Receipt OCR:** Extract fields from receipt images; user confirms before save.
- **Product ID from photo:** Suggest name/category from item photo.
- **Email/push reminders:** User opt-in; in-app + optional email.
- **Batch suggestions:** “Suggest categories for uncategorized items” with multi-select apply.
- **Digest notifications:** Weekly summary (opt-in).

### v3 (Future)

- **Recurring reminder templates:** User-defined schedules.
- **Meal planning from inventory:** Read-only “what can I make?”
- **Low-stock alerts:** Configurable thresholds.
- **Auto-snooze rules:** Opt-in; user-configurable.
- **Price lookup (opt-in):** External API for price check; no purchase.

---

## 11) Kill-Switch and Rollback Ideas

### 11.1 Feature Flags

- **Global AI kill-switch:** `AI_ENABLED=false` — disables all AI features; falls back to non-AI search/suggestions.
- **Per-feature flags:** `AI_VISION_ENABLED`, `AI_SUGGESTIONS_ENABLED`, `AI_NOTIFICATIONS_ENABLED` — granular disable.
- **Per-household override:** Allow household owner to disable AI for their household (stored in user/household prefs).

### 11.2 Rollback Mechanisms

| Scenario | Rollback |
|----------|----------|
| **AI returns bad data** | Hide AI answer; show “Try again” or fall back to keyword search |
| **Cost spike** | Auto-disable non-essential AI when budget exceeded; alert owner |
| **Security incident** | Global kill-switch; revoke API keys; audit logs |
| **User reports harm** | Disable for that household; investigate; fix before re-enable |
| **Model regression** | Pin model version; rollback to previous version |

### 11.3 Monitoring and Alerts

- **Latency:** Alert if p95 > 5s for real-time queries.
- **Error rate:** Alert if AI error rate > 5%.
- **Cost:** Alert if daily spend > threshold.
- **Refusal rate:** Track how often AI refuses; high rate may indicate prompt issues.
- **User feedback:** “Was this helpful?” to detect quality drift.

### 11.4 Audit Trail

- Log: `household_id`, `user_id`, `feature`, `action`, `timestamp`, `model`, `tokens_used`.
- Retain for 90 days minimum for debugging and compliance.
- No logging of full prompts or responses in production (or only with explicit consent).

---

## 12) Open Decisions

1. **AI provider:** OpenAI, Anthropic, Google, or self-hosted? (Affects cost, latency, privacy.)
2. **Vision provider:** Same as text, or dedicated (e.g., Google Vision for OCR)?
3. **Notification channel:** Email only, or push (web push / mobile)?
4. **Budget caps:** Per-household monthly limit; default value?
5. **Feature flag backend:** Env vars, database, or dedicated (e.g., LaunchDarkly)?

---

## 13) References

- `docs/MvpAppSpec.md` — MVP scope, AI behavior contract
- `docs/AgentRunbooks.md` — AI/LLM Agent procedure, guardrails
- `docs/TaskBacklog.md` — T-009-AI, T-009-UI
- `apps/web/src/utils/FileValidation.ts` — Supported file types for vision
- `apps/web/src/actions/ItemDocuments.ts` — Document upload flow
