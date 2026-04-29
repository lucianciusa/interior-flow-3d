## Project Overview

*   **Purpose & Type:** "Interior Flow 3D" is an AI-powered web app that generates 3D interior design proposals. It acts as an opinionated design copilot for non-designers, organizing work via a hierarchy of Projects → Rooms → Layouts. It employs an AI that operates on a constrained slot/zone vocabulary, abstracting away CAD-like complexity.
*   **Technologies & Frameworks:** 
    *   **Frontend:** Next.js 14 App Router, React 18, React Three Fiber (R3F) for 3D visualization, Tailwind CSS, Zustand, TanStack Query.
    *   **Backend:** FastAPI, Pydantic v2, orchestrating two-pass LLM interactions with Azure OpenAI (utilizing JSON schema strict mode).
    *   **Datastore/Auth:** Supabase (Postgres, RLS policies).
    *   **Infra:** Azure Container Apps, Azure Blob Storage (for 3D assets/models like GLB via `gltfpack`), Azure Key Vault.
*   **Current Version/State:** Version 1.0 (v1 in planning). MVP (Phases 0–3) has shipped, demonstrating core capabilities. Current focus is entering Phase 5 (design system & marketing) having recently completed Phase 4 (product hierarchy: projects, variants, share).

## Architecture

*   **Overall Structure:** 
    *   **Frontend / `frontend/`**: Hosts a dashboard, R3F viewer, wizards, and comparison views. Reads JSON generated layouts.
    *   **Backend / `backend/`**: Serves REST points via FastAPI. Translates user dimensions and constraints into constrained prompts for the LLM. 
        *   Utilizes a two-pass LLM pipeline:
            1. Picks zones + global style constraints.
            2. Chooses specific items for those allocated zones concurrently.
        *   Implements an AABB validation and 'slot resolution' layer in pure Python mapping items securely to standard room configurations prior to rendering.
    *   **Database / `supabase/`**: Persists configurations to Postgres with strict Row-Level Security (RLS) tied to authorized user identities.
*   **Key Architectural Patterns:** 
    *   **Pydantic-as-contract:** Identical shape definition models drive Python data structures, LLM schema constraint mechanisms, and frontend TypeScript typings.
    *   **Constrained ML output:** The LLM does not estimate geometric matrices or absolute locations. A logic module solves the 3D translation matrix based on abstract semantic allocations evaluated by the LLM.
    *   **Immutable Assets:** Catalog JSON is static checked-in code, referring to 3D object properties stored in CDN blobs.

## Tech Stack

*   **Languages:** TypeScript, Python 3.12, SQL.
*   **Frameworks:** Next.js 14, React 18, FastAPI.
*   **Libraries/Tools:** Pydantic v2, Zustand, TanStack Query, React Three Fiber, Three.js, Tailwind CSS. Next-Themes. Azure OpenAI SDK.
*   **Build/Package Managers:** `pnpm` (Node module management), `uv` (Fast Python dependency routing).
*   **Testing:** `pytest` + `pytest-asyncio` for backend endpoints and LLM mock evaluation.

## Core Principles

*   **Code Style:**
    *   Python favors clear abstraction, using `snake_case` functions and `PascalCase` Pydantic abstractions separated into modular layers (`routers` / `services` / `models`).
    *   TypeScript utilizes robust component partitioning following standard Next.js conventions (`kebab-case` files, `PascalCase` components).
    *   Styling limits arbitrary literals by enforcing a defined token system via Tailwind configurations scaling (e.g. `frontend/lib/design-tokens.ts`).
*   **Documentation Standards:** Rules of engineering and constraints are rigorously captured in `CLAUDE.md`, `.claude/PRD.md`, and specific `.claude/reference` subdirectories. They emphasize checking context before architectural adjustments.
*   **Testing Approach:** Tests ensure the schema validation pipeline is watertight. The placement functions (`test_placement.py`, `test_resolver.py`) evaluate geometric translation and AABB exclusivity constraints. Cross-user isolation is guaranteed through Supabase user test stubs validating RLS implementation over REST architectures.

## Current State

*   **Active Branch:** `main` (up to date with default origin).
*   **Recent Focus:** Recent commits involve checking off Phase 4 development loops ("Product hierarchy: projects, named layout variants, share links...") and configuring rule constraints properly on `CLAUDE.md`. The workflow plan `phase-5-design-system-marketing.md` was recently prepared.
*   **Observations:** The workflow leans heavily on a strictly orchestrated sequence described in MVP phases. Structural database migration constraints enforce aggressive resets ("Existing prod data wiped during v1 migration"). The development logic clearly expects a high level of fidelity against product requirement mandates stored in text markdown records on the repository root.