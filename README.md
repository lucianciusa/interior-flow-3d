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

### Backend

| Var | Purpose |
|-----|---------|
| `AZURE_OPENAI_ENDPOINT` / `_KEY` / `_DEPLOYMENT` | LLM client |
| `SUPABASE_URL` | PostgREST base |
| `SUPABASE_JWKS_URL` | JWT verify key set (typically `<URL>/auth/v1/.well-known/jwks.json`) |
| `SUPABASE_ANON_KEY` | Forwarded to PostgREST as `apikey` |
| `CORS_ORIGINS` | Comma-separated origins allowed by FastAPI |

### Frontend

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |

## Supabase setup

1. Create a Supabase project; copy URL + anon + JWKS URL into `backend/.env` and `frontend/.env.local`.
2. Apply migrations: `supabase db push` (or `supabase db reset` against a local stack).
3. Enable email magic link + Google providers in **Auth → Providers**.
4. Add redirect URLs to the Auth allow-list:
   - `http://localhost:3000/app`
   - `https://<your-prod-domain>/app`
   - Vercel preview pattern (if used): `https://<project>-*.vercel.app/app`
5. For the cross-user RLS test, create two test users under **Auth → Users** and capture their access tokens (sign in via the frontend once, then read `supabase.auth.getSession().data.session.access_token`).

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

## Demo seeds

Reproducible seed values for stage demos: see [`docs/demo-seeds.md`](docs/demo-seeds.md). Use `?seed=<value>` on `/app` to pre-fill the wizard.

## Phase status

Phase 0–3 complete (scaffolding, catalog + R3F viewer, LLM + wizard, auth + persistence + polish). MVP feature-complete per `.claude/PRD.md` §11.
