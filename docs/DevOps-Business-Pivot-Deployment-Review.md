# DevOps/Infra: Business Pivot Deployment Review

**Review Date:** 2026-02-17  
**Scope:** Business Pivot changes for deployability and operational risk  
**Targets:** Migrations, Edge Functions, Next.js app

---

## GO/NO-GO Verdict

### **NO-GO** for production until critical fix applied

| Environment | Verdict | Blocker |
|-------------|---------|---------|
| **Staging** | **CONDITIONAL GO** | Fix `stock_on_hand` view security before prod |
| **Production** | **NO-GO** | `stock_on_hand` view bypasses RLS (SECURITY DEFINER) |

**Critical blocker:** The `stock_on_hand` view is defined with SECURITY DEFINER semantics (PostgreSQL default). When users query it, the view runs with the view owner's privileges and **bypasses RLS** on `inventory_movements`. This allows cross-household data exposure.

---

## 1. Supabase Migrations

### 1.1 `20260217090000_business_ledger_schema.sql`

| Concern | Assessment | Details |
|---------|------------|---------|
| **Migration safety** | ✅ Good | Uses `if not exists`, `drop policy if exists`, idempotent patterns |
| **Locking** | ⚠️ Low risk | `ALTER TABLE ADD COLUMN` with constant default is metadata-only (PG 11+). New tables/indexes use standard locks. |
| **Index creation** | ✅ Non-concurrent | Indexes on new/empty tables; acceptable. For future large tables, consider `CREATE INDEX CONCURRENTLY`. |
| **View security** | ❌ **CRITICAL** | `stock_on_hand` has no `security_invoker`; runs as definer, bypasses RLS |
| **RLS** | ✅ Correct | Products and inventory_movements have View + Manage policies using `get_my_household_ids()` and `is_household_admin()` |
| **Downtime** | ✅ Minimal | Additive changes; no breaking schema changes |
| **Dependencies** | ✅ Met | `extensions.moddatetime` exists (verified in staging) |

**Required fix for `stock_on_hand`:**

```sql
-- Replace the view definition with security_invoker
create or replace view public.stock_on_hand
with (security_invoker = true)
as
select
  household_id,
  product_id,
  room_id,
  coalesce(sum(quantity_delta), 0)::numeric as quantity_on_hand
from public.inventory_movements
group by household_id, product_id, room_id;
```

PostgreSQL 17 (staging: `170006`) supports `security_invoker` (PG 15+).

---

### 1.2 `20260217093000_inventory_items_product_link.sql`

| Concern | Assessment | Details |
|---------|------------|---------|
| **Migration safety** | ✅ Good | `add column if not exists`, conditional FK creation |
| **Locking** | ✅ Minimal | Nullable `ADD COLUMN` is metadata-only |
| **FK dependency** | ✅ Correct | Depends on `products` (created in prior migration); order is correct |
| **Index** | ✅ Fine | `idx_inventory_items_product_id` on new nullable column |

---

## 2. Edge Function: `ai_assistant/index.ts`

| Concern | Assessment | Details |
|---------|------------|---------|
| **New tables** | ✅ Correct | Uses `products`, `stock_on_hand`, `inventory_movements`; `households.workspace_type` |
| **Auth** | ✅ Correct | JWT passed via `Authorization`; `getUser()` + household membership check |
| **RLS** | ⚠️ Depends on view | `stock_on_hand` queries will bypass RLS until view is fixed |
| **Error handling** | ✅ Good | Graceful fallbacks, audit logging |
| **Cost control** | ✅ Good | Budget caps, environment-based policy |

**Environment variables (already documented):**

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (injected by Supabase)
- `AI_ENABLED`, `AI_ENVIRONMENT` (staging/production)
- `AI_ALLOWED_ORIGINS` (comma-separated)
- `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY`
- `GEMINI_MODEL` (default: gemini-2.0-flash)
- `AI_BUDGET_CAP_*_USD`, `AI_BUDGET_MODE_*`, `AI_PROJECTED_MONTHLY_USD`, `AI_ESTIMATED_REQUEST_USD`

No new env vars required for Business Pivot; existing AI config applies.

---

## 3. Next.js: `apps/web/src/app/dashboard/business/*` and Server Actions

### 3.1 Routes and Components

| Path | Purpose | Risk |
|------|---------|------|
| `page.tsx` | Business dashboard; workspace picker, products list | Low |
| `receive/page.tsx`, `receive-stock-form.tsx` | Receive stock | Low |
| `fulfill/page.tsx`, `fulfill-order-form.tsx` | Fulfill order (sale) | Low |
| `adjust/page.tsx`, `adjust-stock-form.tsx` | Adjust stock | Low |
| `import/page.tsx`, `import-csv-form.tsx` | CSV import | Medium (see below) |

### 3.2 Server Actions

| Action | File | Assessment |
|--------|------|------------|
| `recordReceiving`, `recordSale`, `adjustStockTo` | `movements.ts` | ✅ Auth + role check; uses `stock_on_hand` (RLS bypass until fix) |
| `getProductsForHousehold`, `createProduct`, `setProductActive` | `products.ts` | ✅ RLS-protected; uses `stock_on_hand` |
| `importStockSnapshotCsv` | `csv-import.ts` | ⚠️ See CSV import notes |

### 3.3 CSV Import: Upsert Conflict Target

`csv-import.ts` uses:

```ts
.upsert(..., { onConflict: 'household_id,sku' })
```

The products table has a **partial** unique index:

```sql
CREATE UNIQUE INDEX uniq_products_household_sku ON products(household_id, sku)
WHERE sku IS NOT NULL AND btrim(sku) <> '';
```

PostgREST/Supabase `onConflict` expects either column names or a constraint name. For partial unique indexes, the conflict target should match. **Recommendation:** Test CSV import with duplicate SKUs in staging. If upsert fails, use `onConflict: 'uniq_products_household_sku'` (constraint name).

---

## 4. Operational Concerns Summary

| Category | Finding |
|----------|---------|
| **Migration safety** | Idempotent; safe to re-run |
| **Locking** | Minimal; additive changes only |
| **Index creation** | Standard (non-concurrent); acceptable for new tables |
| **View security** | ❌ **CRITICAL:** `stock_on_hand` must use `security_invoker` |
| **RLS** | Correct on base tables; view bypasses until fixed |
| **Downtime** | None expected |
| **Cost** | No new cost drivers; AI budget controls unchanged |

---

## 5. Environment Variables and Config

| Component | Required Updates |
|-----------|------------------|
| **Supabase** | None (migrations self-contained) |
| **Edge Functions** | Existing AI env vars; ensure `AI_ALLOWED_ORIGINS` includes staging/prod origins |
| **Next.js** | None |
| **create_household_with_owner** | No change; `workspace_type` default `'personal'` applies to new households |

---

## 6. Rollback / Restore Checkpoints

### Pre-deployment

1. **Database snapshot** (Supabase Dashboard or `pg_dump`)
2. **Edge function version** – note current `ai_assistant` version before deploy

### Rollback migrations (if needed)

Create a reverse migration, e.g. `20260217100000_rollback_business_ledger.sql`:

```sql
-- Rollback order (reverse of apply)
-- 1) Drop policies and RLS
alter table public.inventory_movements disable row level security;
alter table public.products disable row level security;
drop policy if exists "View inventory movements" on public.inventory_movements;
drop policy if exists "Manage inventory movements" on public.inventory_movements;
drop policy if exists "View products" on public.products;
drop policy if exists "Manage products" on public.products;

-- 2) Drop view
drop view if exists public.stock_on_hand;

-- 3) Drop tables (cascade to FKs)
drop table if exists public.inventory_movements;
drop table if exists public.products;

-- 4) Remove product_id from inventory_items
alter table public.inventory_items drop column if exists product_id;

-- 5) Remove workspace_type from households (optional; breaks existing business households)
-- alter table public.households drop column if exists workspace_type;
```

**Note:** Rolling back `workspace_type` is optional and may break households already set to `business`. Consider leaving it and only rolling back ledger tables if needed.

### Edge function rollback

Revert to previous `ai_assistant` version via Supabase Dashboard or CLI.

---

## 7. Recommended Next Steps

1. **Apply `stock_on_hand` security fix** (new migration):
   - Add `WITH (security_invoker = true)` to the view
   - Re-run security advisor to confirm fix

2. **Deploy to staging:**
   - Run migrations (including security fix)
   - Deploy `ai_assistant` edge function
   - Deploy Next.js app
   - Verify: receive, fulfill, adjust, CSV import, AI assistant (business mode)

3. **Validate CSV import:**
   - Test upsert with duplicate SKUs; confirm `onConflict` behavior

4. **Production:**
   - After staging validation and security fix: **GO** for production
   - Ensure `AI_ALLOWED_ORIGINS` includes production URL

---

## 8. Security Advisor (Staging)

Current findings (relevant to Business Pivot):

- **ERROR:** `stock_on_hand` – SECURITY DEFINER view (fix above)
- **WARN:** `enforce_room_limit_per_household`, `handle_new_user` – mutable search_path (pre-existing)
- **WARN:** Leaked password protection disabled (Auth; pre-existing)

---

*Generated by DevOps/Infra review.*
