# OpenInventory MVP Security Baseline

**Status:** Approved for MVP v1
**Owner:** Security Agent
**Date:** 2026-02-13

---

## 1. Authentication Requirements (Supabase Auth)

*   **Provider:** Email/Password (primary), Google OAuth (optional for MVP).
*   **Sign-up:** Open registration allowed.
*   **Email Confirmation:** **MANDATORY**. Users must confirm email before accessing data.
*   **Password Policy:** Minimum 8 characters (enforced by Supabase default).
*   **Session:** JWT expiration set to 1 hour. Refresh token rotation enabled.

## 2. Row Level Security (RLS) Coverage Checklist

All tables must have RLS enabled. No table should be `public` without RLS.

| Table | RLS Enabled | Policy Strategy |
| :--- | :---: | :--- |
| `profiles` | ✅ | Users can only view/edit their own profile (`id = auth.uid()`). |
| `households` | ✅ | Users can view households they are members of. |
| `household_members` | ✅ | Users can view members of their households. |
| `categories` | ✅ | Global categories visible to all. Custom categories visible to household members only. |
| `locations` | ✅ | Strict household isolation (`household_id`). |
| `inventory_items` | ✅ | Strict household isolation (`household_id`). |
| `item_documents` | ✅ | Strict household isolation (`household_id`). |
| `item_reminders` | ✅ | Strict household isolation (`household_id`). |

**Key Helper Functions:**
*   `get_my_household_ids()`: Returns array of household IDs for the current user. Used in `USING` clauses to avoid recursion.

## 3. Storage Bucket Security

We use Supabase Storage for `item_documents`.

*   **Bucket Name:** `inventory-files`
*   **Public Access:** **FALSE**. Files are private by default.
*   **RLS Policy for Storage:**
    *   **SELECT:** Allow if user is member of the household associated with the file path (e.g., `household_id/item_id/filename`).
    *   **INSERT:** Allow if user is member of the household.
    *   **UPDATE/DELETE:** Allow if user is member of the household.
*   **File Constraints:**
    *   Max size: 5MB.
    *   Allowed types: `image/*`, `application/pdf`.

## 4. API Protection & Edge Functions

*   **Service Role Key:** NEVER use `service_role` key in the client (browser/mobile).
*   **Edge Functions:**
    *   Must verify JWT (`Authorization: Bearer ...`).
    *   If performing admin tasks, use `service_role` key internally, but validate user permissions first.
*   **Input Validation:** All API inputs (via RPC or direct DB) must be validated.
    *   Text fields: Sanitize to prevent XSS (though React handles most of this).
    *   SQL Injection: Prevented by using Parameterized Queries (PostgREST handles this automatically).

## 5. Threat Model (Lightweight)

| Threat | Mitigation |
| :--- | :--- |
| **Data Leakage between Households** | RLS policies strictly filter by `household_id`. Tests must verify cross-household access fails. |
| **Unauthorized File Access** | Storage RLS + Private Buckets. Filenames should be non-guessable or path-protected. |
| **Privilege Escalation** | `household_members.role` controls admin actions. RLS checks `is_household_admin()`. |
| **Abuse / Spam** | Rate limiting (Supabase default). Email confirmation required. |

## 6. Audit & Monitoring

*   **Supabase Logs:** Monitor `auth.users` creation and `storage` access.
*   **Application Logs:** Log critical actions (household creation, member removal) to a separate `audit_logs` table (future feature, not MVP).
