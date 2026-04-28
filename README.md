# Interior Flow 3D

AI-powered 3D living-room design copilot. User picks dimensions, style (Scandinavian / Minimal / Industrial), and up to two preferences; backend calls Azure OpenAI to produce a layout — items + slots + palette + first-person designer rationale — which the frontend renders in a React Three Fiber scene.

For full product scope see [`.claude/PRD.md`](.claude/PRD.md). For project-wide engineering rules see [`CLAUDE.md`](CLAUDE.md).

## Required tools

- Node 20 (`.nvmrc` pinned)
- pnpm 9
- Python 3.12 + [uv](https://docs.astral.sh/uv/)
- Docker Desktop (for backend container build + Supabase local stack)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- Azure CLI (`az`) with Bicep

## Quickstart

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload    # http://localhost:8000
uv run pytest
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev                                  # http://localhost:3000
```

### Supabase (local)

```bash
supabase start
supabase db reset                         # applies migrations/0001_init.sql
```

## Required env vars

See `.env.example` files in `backend/` and `frontend/`. Backend reads Azure OpenAI + Supabase JWKS configuration; frontend reads Supabase public keys + the FastAPI base URL. Names are documented in `.claude/PRD.md` §9.

## Deployment

- **Frontend** → Vercel via `.github/workflows/frontend.yml`
- **Backend** → Azure Container Apps via `.github/workflows/backend.yml` (image built into ACR, revision rolled with `az containerapp update`)
- **Infra** → `az deployment group create -g <rg> -f infra/main.bicep -p @infra/params.json`

Required GitHub Actions secrets: `AZURE_CREDENTIALS`, `AZURE_RG`, `ACR_NAME`, `ACA_NAME`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Structure

```
frontend/   Next.js 14 App Router + R3F viewer
backend/    FastAPI + Pydantic v2 + Azure OpenAI
supabase/   SQL migrations (Postgres + RLS)
infra/      Azure Bicep (Container Apps + Key Vault)
.claude/    Product spec + reference docs + commands
.agents/    Implementation plans
```

## Phase status

Phase 0 (scaffolding) complete. Phase 1 (catalog + slot resolver + R3F components) next. See `.agents/plans/` for plans.
