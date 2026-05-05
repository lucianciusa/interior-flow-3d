# Interior Flow 3D

AI-powered 3D interior design copilot. Users organize work as **Projects → Rooms → Layouts**. For each Layout, user picks a room type (living room, bedroom, dining room, home office), dimensions, a style (Scandinavian / Minimal / Industrial / Japandi / Mid-century), and up to two preferences; the backend runs a two-pass Azure OpenAI pipeline (zones + style emphasis, then items per zone in parallel) to produce a Layout — zones + items + palette + first-person designer rationale — which the frontend renders in a React Three Fiber scene with shared HDRI + PBR materials. Anonymous Generate is rate-limited (10/24h per IP); login required to save. Saved layouts support named sibling variants, item swap, compare overlay, and signed read-only share links.

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
supabase db reset     # applies all migrations (0001_init → 0004_rate_limits)
```

## Required env vars

See `.env.example` files in `backend/` and `frontend/`.

### Backend

| Var | Purpose |
|-----|---------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint |
| `AZURE_OPENAI_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | Model deployment name (default: `gpt-4o`) |
| `AZURE_OPENAI_API_VERSION` | API version (default: `2024-10-21`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_JWKS_URL` | JWT verify keyset (`<URL>/auth/v1/.well-known/jwks.json`) |
| `SUPABASE_ANON_KEY` | Forwarded to PostgREST as `apikey` |
| `SUPABASE_SERVICE_ROLE_KEY` | Used only by the share-token security-definer RPC |
| `SHARE_TOKEN_SECRET` | HMAC secret for signed share links |
| `SHARE_TOKEN_TTL_DAYS` | Share link expiry in days (default: `30`) |
| `SHARE_LINK_BASE_URL` | Public domain for share URLs (e.g. `https://your-app.com`) |
| `CATALOG_VERSION` | Version stamp on generated layouts (e.g. `v1.phase6`) |
| `CDN_BASE_URL` | Front Door CDN base URL serving catalog GLBs + HDRI |
| `AZURE_STORAGE_ACCOUNT` | Storage account name hosting `catalog` and `hdri` containers |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `LOG_LEVEL` | Logging level (default: `info`) |

### Frontend

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `NEXT_PUBLIC_HDRI_URL` | KTX2-compressed HDRI for R3F scene (~2 MB, served from CDN) |

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

Pass `?seed=<integer>` on `/app` to pre-fill the wizard with a reproducible seed. The seed is forwarded to the generation pipeline; saved layouts also embed the seed for playback.

## Phase status

All phases (0–7) shipped. v1 feature-complete per `.claude/PRD.md`:

- **0–3** — scaffolding, catalog + R3F viewer, LLM + wizard, auth + persistence + polish (MVP).
- **4** — Projects → Rooms → Layout variants, share links, dashboard, compare overlay, item swap.
- **5** — Light/dark design system (Geist + Inter), floating-panel shell, autoplay marketing hero, curated template gallery, soft Pro affordances.
- **6** — Tag-based catalog (~40 items), glTF/Meshopt/KTX2 pipeline, Azure Blob + Front Door, HDRI + PBR, 4 room types, zones-as-data.
- **7** — Two-pass LLM (Pass 1 zones + emphasis, parallel Pass 2 per zone), `StyleProfile`-driven placement, 5 styles end-to-end, demo seeds.
