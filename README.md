# Open Inventory - Product & Technical Discovery Brief

Use this document to define product direction before implementation.
Fill in each section, then share it back for architecture and execution planning.

Primary implementation spec lives in `MvpAppSpec.md`.

---

## 1) Project Snapshot

- **Project name:**
  OpenInventory
- **Owner:**
  Nicholas Branch
- **Date started:**
  Today
- **One-line mission:**
  Much less to think about, much more to enjoy
- **Current stage:** (idea / prototype / pre-launch / launched)
  idea

### Problem Statement

- **What problem does this solve?**
  Buying things for the home can become expensive, especially when one does not know what they still have in the home. There have been so many times that I have rebought items I already have. Or bought something that is left over and do not know what to do with. Or bought something and let it go to waste. Or forgot to buy something for idea I had. It would be so nice to have something that keeps track of what I have but also give me a wide range of information around these items.
- **Who has this problem most often?**
  Families, cooks, household maintainers, young apartment renters, city people. Generally people who need to manage a household
- **Why now?**
  AI has given us a way to make this an enjoyable and interactive task. We can now have conversations, get notification, and discover how to use the things we have

### Success Criteria (next 6-12 months)

- **Primary outcome:**
  Have something I would use, suggest others to use
- **Secondary outcomes:**
  Have something someone would be willing to subscribe to
- **How success will be measured (metrics):**
  Have something that works and can be made better. Easy to use, understand, and becomes part of my daily tools

---

## 2) Phase 1 - Clarify Vision (Required)

Answer these first. Keep answers short and concrete.

1. **Target user model**
   - Single user

2. **Monetization model**
   - Other: Personal/Internal tool with the possiblity of being a Paid subscription

3. **Platform priority (first 6 months)**
   - Web + mobile

4. **AI behavior boundaries**
   - Suggestion-only

5. **Timeline target**
   - MVP target date: TBD
   - Public launch target date: TBD

6. **Expected scale (first year)**
   - Estimated active households:
   - Estimated monthly active users:
   - Peak usage expectations:

7. **Data sensitivity level**
   - Basic inventory only
   - Includes receipts/manuals/warranty docs

---

## 3) Product Scope by Phase

### MVP (must-have)

- [x] Account creation/login
- [x] Household creation and membership
- [x] Create/edit/delete inventory items
- [x] Search/filter inventory
- [ ] Item location tracking
- [x] Expiration/reminder support
- [x] Document/image upload
- [x] Basic AI query ("Do I have X?")

**MVP out-of-scope (explicitly not now):**

- Multi family memeber support
- Automated shopping
- Order item service

### Phase 2 (next)

-

### Long-term Vision

- ***

## 4) Users, Roles, and Permissions

### User Types

- **Primary user types:**
- **Admin/owner permissions:**
- **Member permissions:**
- **Read-only roles needed?**

### Household Collaboration

- **Can users belong to multiple households?**
- **Can items be shared across households?**
- **Invite flow needed?**

---

## 5) Data Model Inputs (for Architecture)

List entities you expect to need. Start simple.

### Core Entities (initial draft)

- `User`
- `Household`
- `HouseholdMember`
- `InventoryItem`
- `Location`
- `Category`
- `Receipt`
- `Warranty`
- `Manual`
- `Reminder`
- `Tag`

### Entity Details (fill at least core fields)

---

## 6) AI Capability Scope

### MVP AI Capabilities

- [x] Natural-language search over inventory
- [x] Smart categorization suggestions
- [x] Reminder recommendations
- [x] Duplicate item detection hints

### AI Guardrails

- **Can AI write to database directly?** (Only the Backend Agent)
- **Confidence thresholds required?** (I am not sure yet)
- **Human approval required for which actions?** (depends)
- **What AI should never do:** (share sensitive or at risk material and information)

### AI Context Sources

- **Structured data:** (tables/fields)
- **Unstructured data:** (receipts, manuals, notes)
- **External knowledge needed?** (yes)

---

## 7) Backend & Infrastructure Preferences

Use this section to express preferences and constraints before stack selection.

### Team Constraints

- **Primary languages known:**
- **Backend familiarity level:**
- **DevOps familiarity level:**
- **Max complexity tolerance (low/medium/high):**

### Operational Constraints

- **Monthly budget target (dev stage):**
- **Monthly budget target (post-launch):**
- **Required uptime target:**
- **Disaster recovery expectations:**

### Hosting/Platform Preferences

- **Cloud preference:** (none / AWS / GCP / Azure / other)
- **Managed services preference:** (high / medium / low)
- **Vendor lock-in tolerance:** (low / medium / high)

---

## 8) Security, Privacy, and Trust

### Security Requirements

- **Authentication method expectations:** (email+password, social login, magic link, etc.)
- **Authorization model needs:** (RBAC, household-level ACL, etc.)
- **Encryption requirements:** (at rest/in transit)
- **Audit logging needed?**

### Privacy Requirements

- **Data deletion/export requirements:**
- **PII handling constraints:**
- **Regional data requirements:** (if any)

### Trust Expectations

- **How transparent should AI answers be?** (show source item IDs, confidence, etc.)
- **Error tolerance for AI outputs:**

---

## 9) Scalability and Reliability

### Expected Load

- **Read-heavy or write-heavy?**
- **Any burst patterns?** (e.g., monthly stock check)
- **Background jobs expected:** (OCR, reminders, embeddings, etc.)

### Reliability Expectations

- **Acceptable downtime:**
- **Backup frequency target:**
- **Recovery time objective (RTO):**
- **Recovery point objective (RPO):**

---

## 10) Risk Register (Initial)

Fill with known risks now; update over time.

| Risk                                   | Category (Technical/Product/Cost/Security/Scale/Vendor) | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation idea                |
| -------------------------------------- | ------------------------------------------------------- | ------------------ | -------------- | ------------------------------ |
| Example: AI misclassification of items | Product                                                 | M                  | M              | Keep AI suggestion-only in MVP |
|                                        |                                                         |                    |                |                                |
|                                        |                                                         |                    |                |                                |

---

## 11) Decision Log

Track key decisions so architecture stays intentional.

| Date | Decision | Options considered | Why chosen | Revisit trigger |
| ---- | -------- | ------------------ | ---------- | --------------- |
| 2026-02-13 | Use Next.js + Supabase | Python, MERN | Best fit for "weaker in backend" constraint; handles Auth/DB/Storage/Vectors | Scale issues |

---

## 12) Agentic Team Design Inputs

These answers will be used to define specialized AI agents and boundaries.

### Which agents are needed first?

- [x] Architecture Agent
- [x] Backend Agent
- [x] Data Modeling Agent
- [x] AI/LLM Agent
- [x] Security/Privacy Agent
- [x] Testing/QA Agent
- [x] DevOps/Infra Agent
- [x] UX/Product Research Agent

### Collaboration Model

- **Human approval gates:** (where required)
- **Which agent can modify schema?** (Backend)
- **Which agent can deploy infra?** (DevOps)
- **Which agent can change auth/security settings?** (Security)
- **Escalation path for conflicts:** (Me)

---

## 13) Open Questions

Use this list to track unresolved decisions.

-
-
- ***

## 14) What to Share Back

When this doc is filled, share:

1. Completed `README.md`
2. Any constraints not captured here
3. Top 3 decisions you want help making first

Then the next step will be:

- Define MVP system shape (entities + boundaries)
- Compare backend options with tradeoffs
- Recommend a stage-appropriate architecture
- Design the first version of your agentic team
