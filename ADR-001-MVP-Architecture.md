# ADR-001: MVP Architecture & Stack Selection

- **Status:** Proposed
- **Date:** 2026-02-13
- **Deciders:** Architecture Agent, User
- **Consulted:** MvpAppSpec, TaskBacklog

## Context

We are building "OpenInventory", a household inventory management system.
**Key Constraints & Requirements:**

1.  **Greenfield:** Starting from scratch.
2.  **Team:** "Weaker in backend" constraint; preference for low-maintenance, managed infrastructure.
3.  **MVP Scope:** Auth, Inventory CRUD, File Uploads (Receipts/Manuals), Search, Reminders, and AI-assisted queries ("Do I have X?").
4.  **AI Integration:** Requires vector search and LLM processing.
5.  **Platforms:** Web-first, mobile-responsive.

The goal is to select a stack that minimizes "plumbing" (setting up auth, db hosting, file servers) and maximizes product velocity.

## Options Considered

### Option A: Next.js + Supabase (Recommended)

- **Frontend:** Next.js (React) with App Router.
- **Backend:** Supabase (Postgres, GoTrue Auth, Storage, Edge Functions).
- **AI:** OpenAI API called via Next.js Server Actions; Embeddings stored in Postgres (`pgvector`).
- **Pros:**
  - **"Backend-less" feel:** Supabase handles Auth, DB, and Storage with minimal setup.
  - **Postgres:** Strong relational data model for Inventory/Households.
  - **Integrated AI:** `pgvector` allows storing embeddings directly next to data, simplifying RAG (Retrieval-Augmented Generation).
  - **Type Safety:** Strong TypeScript support across the stack.
- **Cons:**
  - Supabase vendor abstraction (though based on standard Postgres).

### Option B: Python (FastAPI) + React + Postgres

- **Frontend:** React (Vite).
- **Backend:** FastAPI (Python) connected to a managed Postgres.
- **AI:** Native Python integration with LangChain/LlamaIndex.
- **Pros:**
  - Python is the native language of AI; easier to integrate complex ML libraries later.
  - Full control over backend logic and architecture.
- **Cons:**
  - **High Boilerplate:** Must manually implement Auth, File Upload handling, Database migrations, and API CRUD layers.
  - **Infra Complexity:** Requires managing separate frontend and backend deployments/hosting.
  - Violates the "weaker in backend" constraint by requiring significant backend code.

### Option C: MERN Stack (Mongo, Express, React, Node)

- **Frontend:** React.
- **Backend:** Express/Node.js with MongoDB.
- **Pros:**
  - JavaScript everywhere.
  - Flexible schema (NoSQL).
- **Cons:**
  - **Relational Mismatch:** Inventory data (Household -> Items -> Docs/Reminders) is inherently relational; NoSQL requires more application-side join logic.
  - **Manual Plumbing:** Still requires manual setup for Auth and File Storage compared to a BaaS like Supabase.

## Decision

**We will use Option A: Next.js + Supabase.**

### The Stack

1.  **Frontend Framework:** **Next.js 14+ (App Router)**.
    - Why: Industry standard, handles routing, server-side rendering, and API proxying easily.
2.  **Database & Auth:** **Supabase**.
    - Why: Provides Postgres (Relational), Auth (Row Level Security is critical for multi-tenant/household security), and Storage (S3-compatible) in one managed platform.
3.  **Language:** **TypeScript** (End-to-End).
4.  **AI/Vector Store:** **Supabase `pgvector`** + **OpenAI API**.
    - Why: Keeps embeddings in the same transaction-safe database as the inventory data.
5.  **Styling:** **Tailwind CSS** + **Shadcn/UI**.
    - Why: Rapid UI development with accessible components.

## Rationale

This stack specifically addresses the "weaker in backend" constraint by offloading the hardest parts of backend engineering (Auth, Database hosting, File Storage security) to Supabase. Next.js Server Actions allow us to write "backend" logic (like calling OpenAI) within the frontend project structure, keeping the codebase unified and simple to deploy (e.g., to Vercel).

## Consequences

- **Positive:**
  - Rapid development cycle; CRUD operations are trivial.
  - Security (RLS) is handled at the database level, reducing API security risks.
  - Single repository (Monorepo-like feel) for the entire application.
- **Negative:**
  - Heavy reliance on Supabase specific features (RLS, Edge Functions).
  - Next.js App Router has a learning curve if used to older React patterns.

## System Diagram

```mermaid
graph TD
    User[User (Web/Mobile)] -->|HTTPS| NextJS[Next.js App Router]

    subgraph "Frontend / Edge"
        NextJS -->|Auth & Data| SupabaseClient[Supabase SDK]
        NextJS -->|Server Actions| OpenAI[OpenAI API]
    end

    subgraph "Backend Services (Supabase)"
        SupabaseClient -->|Auth| GoTrue[Auth Service]
        SupabaseClient -->|Query| Postgres[(Postgres DB)]
        SupabaseClient -->|Upload| Storage[File Storage]

        Postgres -->|pgvector| Embeddings[Vector Index]
    end

    OpenAI -->|Embeddings| NextJS
    NextJS -->|Store Vectors| Postgres
```
