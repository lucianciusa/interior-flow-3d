# API Endpoint Standards

Read this before adding or changing a route in `backend/`. Companion doc to `CLAUDE.md`. The product spec lives in `.claude/PRD.md`.

Stack assumed: **Python 3.12**, **FastAPI**, **Pydantic v2**, **httpx**, **openai SDK** (Azure endpoint), **Supabase** (Postgres + RLS + Auth), **PyJWT + cryptography** for JWKS, **uvicorn**, **pytest**, **ruff**, **mypy**.

---

## 1. Layered Layout

```
backend/app/
├── main.py                      # FastAPI app factory + middleware + router includes
├── config.py                    # Pydantic Settings (env-backed)
├── deps.py                      # FastAPI Depends() — auth, db, settings
├── routers/
│   ├── catalog.py               # 1 router per resource
│   ├── generate.py
│   ├── layouts.py
│   └── rooms.py
├── models/                      # Pydantic v2 — the wire contract
│   ├── layout.py
│   ├── room.py
│   └── catalog.py
├── services/                    # business logic, no FastAPI imports
│   ├── llm.py
│   ├── slot_resolver.py
│   ├── placement.py
│   └── supabase.py
├── data/catalog.json
└── prompts/system.md
```

**Layering rules:**

- `routers/` may import from `models/`, `services/`, `deps.py`. Nothing else.
- `services/` may import from `models/` and other `services/`. **Never** from `routers/` or `fastapi`.
- `models/` import only from `pydantic` and `typing`. Pure schema. **No** I/O, **no** business logic.
- `deps.py` is the only place FastAPI's `Depends()` callables live; routers import them by name.

If you catch yourself adding `from fastapi import ...` to a service module, stop and refactor.

---

## 2. Pydantic v2 Is the Contract

Every request body, every response body, every LLM JSON payload is a Pydantic model. The model is the single source of truth — TypeScript types on the frontend mirror it.

```python
# app/models/layout.py
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

Style = Literal["scandinavian", "minimal", "industrial"]
Preference = Literal["more_seating", "more_open_space", "more_storage"]
SlotId = Literal[
    "north_wall_left", "north_wall_center", "north_wall_right",
    "east_wall_left",  "east_wall_center",  "east_wall_right",
    "south_wall_left", "south_wall_center", "south_wall_right",
    "west_wall_left",  "west_wall_center",  "west_wall_right",
    "corner_NE", "corner_NW", "corner_SE", "corner_SW",
    "center", "center_front", "entry",
]
Facing = Literal["auto", "north", "south", "east", "west", "center"]


class GenerateLayoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    roomType: Literal["living_room"]
    width_m:  float = Field(ge=2, le=12)
    length_m: float = Field(ge=2, le=12)
    height_m: float = Field(ge=2.2, le=4, default=2.6)
    style: Style
    preferences: list[Preference] = Field(default_factory=list, max_length=2)
    seed: int | None = None


class LayoutItemLLM(BaseModel):
    """What the LLM emits per item — no coordinates."""
    model_config = ConfigDict(extra="forbid")

    catalogId: str
    slot: SlotId
    facing: Facing = "auto"
    rationale: str | None = Field(default=None, max_length=140)


class Palette(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    hex: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class LayoutLLM(BaseModel):
    """Raw LLM output, pre-resolution."""
    model_config = ConfigDict(extra="forbid")

    style: Style
    palette: dict[Literal["wall", "floor", "accent"], Palette]
    items: list[LayoutItemLLM] = Field(min_length=3, max_length=10)
    designExplanation: str = Field(min_length=80, max_length=600)


class ResolvedItem(LayoutItemLLM):
    """LayoutItemLLM enriched server-side after slot resolution."""
    position: tuple[float, float, float]
    rotation_y: float
    footprint: dict[Literal["w", "d", "h"], float]
    model: str


class Layout(BaseModel):
    """Final wire response from /generate-layout."""
    model_config = ConfigDict(extra="forbid")

    style: Style
    palette: dict[Literal["wall", "floor", "accent"], Palette]
    items: list[ResolvedItem]
    designExplanation: str
    seed: int | None = None
    warnings: list[str] = Field(default_factory=list)
```

### Rules

- **`model_config = ConfigDict(extra="forbid")`** on every wire model. Unknown fields are an error, not silent drop. Critical for LLM output hygiene.
- **`Literal[...]`** for closed enums (style, slot, preference). Never plain `str`.
- **`Field` constraints** for ranges, lengths, regex. Validation lives in the model, not in the router.
- **No `Optional[X]`** — use `X | None` (Python 3.12).
- **Frozen request models** when convenient: `frozen=True` makes them hashable and signals "do not mutate".
- **Separate LLM model from wire response.** `LayoutLLM` is what the model emits; `Layout` is what the user gets. Don't conflate them — the resolution step adds fields the LLM must never produce.
- **JSON Schema export** for the Azure OpenAI structured-output call: `LayoutLLM.model_json_schema()`. Never hand-write the schema.

---

## 3. Router Anatomy

```python
# app/routers/generate.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.deps import get_settings, optional_user
from app.models.layout import GenerateLayoutRequest, Layout
from app.services import llm, placement

router = APIRouter(prefix="/generate-layout", tags=["generate"])


@router.post("", response_model=Layout, status_code=status.HTTP_200_OK)
async def generate_layout(
    body: GenerateLayoutRequest,
    settings = Depends(get_settings),
    user = Depends(optional_user),  # may be None for anon
) -> Layout:
    try:
        raw = await llm.generate(body, settings)
    except llm.LLMValidationError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    except llm.LLMUpstreamError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return placement.resolve(raw, body)
```

### Rules

- **One `APIRouter` per file**, `prefix` set on the router (not on each route). Tags match the resource.
- **`response_model=` always set** on every route. Pydantic strips extras and enforces the contract on the way out.
- **`status_code=` always set** on every route — explicit beats default `200` everywhere except 200.
- **No business logic in the router body.** The router validates, delegates to a service, maps service errors to HTTP errors, returns. If you have more than ~15 lines of route body, the logic belongs in a service.
- **`async def`** for any handler that calls the LLM, Supabase REST, or any HTTP / DB I/O. Sync only for pure CPU (slot resolver, placement) — and even those run inside an async handler that awaits an `asyncio.to_thread` if heavy.
- **Map service exceptions to HTTP exceptions in the router**, not in the service. The service raises typed domain errors; the router translates.
- **`from e`** on every `raise HTTPException`. Never lose the original cause.

---

## 4. Endpoint Catalogue (MVP)

| Method | Path | Auth | Purpose | Status codes |
|---|---|---|---|---|
| `GET`    | `/healthz`           | none | Liveness (no DB / LLM)        | 200 |
| `GET`    | `/catalog`           | none | Static catalog                | 200 |
| `POST`   | `/generate-layout`   | optional JWT | Generate, do not persist | 200 / 422 / 502 / 503 |
| `POST`   | `/rooms`             | JWT  | Create room                   | 201 / 401 / 422 |
| `GET`    | `/rooms`             | JWT  | List user rooms               | 200 / 401 |
| `POST`   | `/layouts`           | JWT  | Persist a layout              | 201 / 401 / 404 / 422 |
| `GET`    | `/layouts`           | JWT  | List user layouts             | 200 / 401 |
| `GET`    | `/layouts/{id}`      | JWT  | Get one layout                | 200 / 401 / 404 |
| `DELETE` | `/layouts/{id}`      | JWT  | Delete a layout               | 204 / 401 / 404 |

**Conventions:**

- POST that creates a resource → `201` + `Location` header pointing at the new resource.
- DELETE → `204 No Content`, empty body.
- Auth failures → `401 Unauthorized`, never `403` (we don't have role-based gates yet).
- Not-found is **always `404`**, even when RLS is the reason — never expose "exists but not yours" because that leaks existence.
- **No trailing slashes** in paths; FastAPI normalizes, but be explicit on the router prefix.

---

## 5. Authentication Pattern

`deps.py` exposes two dependencies:

```python
# app/deps.py
from typing import Annotated
from fastapi import Depends, HTTPException, Request, status
import jwt
from jwt import PyJWKClient
from functools import lru_cache
from app.config import Settings, get_settings

_jwks_clients: dict[str, PyJWKClient] = {}

def _jwks(settings: Settings) -> PyJWKClient:
    if settings.SUPABASE_JWKS_URL not in _jwks_clients:
        _jwks_clients[settings.SUPABASE_JWKS_URL] = PyJWKClient(
            settings.SUPABASE_JWKS_URL, cache_keys=True, lifespan=600
        )
    return _jwks_clients[settings.SUPABASE_JWKS_URL]


def _decode(token: str, settings: Settings) -> dict:
    signing_key = _jwks(settings).get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        signing_key,
        algorithms=["RS256"],
        audience="authenticated",
        options={"require": ["exp", "sub"]},
    )


class AuthUser(BaseModel):
    id: str  # auth.users.id (uuid)
    email: str | None = None


def require_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
    try:
        claims = _decode(auth.removeprefix("Bearer "), settings)
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token") from e
    return AuthUser(id=claims["sub"], email=claims.get("email"))


def optional_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser | None:
    if "authorization" not in request.headers:
        return None
    return require_user(request, settings)
```

**Rules:**

- **JWKS keys cached in-process** for ~10 minutes. PyJWKClient does this; don't re-fetch per request.
- **Audience must match** what Supabase emits (`"authenticated"`).
- **Algorithm pinned** to `RS256`. Never accept `none` or HMAC.
- **Required claims** (`exp`, `sub`) enforced via `options={"require": ...}`.
- **Backend never uses the Supabase service role for end-user requests.** Service role is for migrations and offline scripts only — keep the env var out of the runtime container if possible.
- **RLS is the real authorization gate.** The backend just forwards the user's JWT to Supabase REST (or uses the user id to filter) — Postgres enforces ownership.

---

## 6. Talking to Supabase

Two paths, pick per route:

- **Supabase REST (PostgREST)** for simple CRUD: forward the user JWT in the `Authorization` header to `https://<project>.supabase.co/rest/v1/...`. RLS applies automatically. Best for `/rooms`, `/layouts` CRUD.
- **Direct Postgres** via `asyncpg` for anything that needs joins, transactions, or pgvector. Connect with the **service role**'s connection string and pass `set_config('request.jwt.claims', ...)` per transaction so RLS still applies.

For MVP, **prefer Supabase REST**. Direct Postgres only when REST falls short.

```python
# app/services/supabase.py
import httpx
from app.config import Settings

class SupabaseRest:
    def __init__(self, settings: Settings, user_jwt: str):
        self._client = httpx.AsyncClient(
            base_url=f"{settings.SUPABASE_URL}/rest/v1",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "authorization": f"Bearer {user_jwt}",
                "content-type": "application/json",
                "prefer": "return=representation",
            },
            timeout=10.0,
        )

    async def insert_layout(self, row: dict) -> dict:
        r = await self._client.post("/layouts", json=row)
        r.raise_for_status()
        return r.json()[0]

    async def aclose(self) -> None:
        await self._client.aclose()
```

**Rules:**

- One `httpx.AsyncClient` per request scope; close in a FastAPI dependency `yield` block.
- **Always `r.raise_for_status()`** and translate `httpx.HTTPStatusError` to a domain exception in the service, then to an `HTTPException` in the router.
- **Forward the user's JWT** for any user-scoped operation. RLS is the gate.
- **Set `prefer: return=representation`** so inserts return the row.
- Timeouts: 10s for normal CRUD, 30s for the LLM service.

---

## 7. The LLM Service

```python
# app/services/llm.py
import json
from openai import AsyncAzureOpenAI, BadRequestError, APIError
from pydantic import ValidationError
from app.config import Settings
from app.models.layout import GenerateLayoutRequest, LayoutLLM


class LLMError(Exception): ...
class LLMValidationError(LLMError): ...   # response did not match schema after retry
class LLMUpstreamError(LLMError): ...     # network / 5xx / quota


async def generate(req: GenerateLayoutRequest, settings: Settings) -> LayoutLLM:
    client = AsyncAzureOpenAI(
        api_key=settings.AZURE_OPENAI_KEY,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_version=settings.AZURE_OPENAI_API_VERSION,
    )
    schema = LayoutLLM.model_json_schema()
    messages = _build_messages(req)

    for attempt in (1, 2):
        try:
            resp = await client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=messages,
                temperature=0.7,
                seed=req.seed,
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": "Layout", "schema": schema, "strict": True},
                },
                timeout=20.0,
            )
        except (APIError, BadRequestError) as e:
            raise LLMUpstreamError(str(e)) from e

        raw = resp.choices[0].message.content
        try:
            return LayoutLLM.model_validate_json(raw)
        except ValidationError as e:
            if attempt == 2:
                raise LLMValidationError(f"schema mismatch: {e}") from e
            messages = _add_correction(messages, raw, str(e))

    raise LLMValidationError("unreachable")
```

**Rules:**

- **Structured output mode (`response_format=json_schema, strict=True`)** — non-negotiable. Don't parse free-text JSON.
- **Pydantic validation after** the LLM call regardless. `strict=True` is best-effort; the model is the contract.
- **One retry** with a correction message that includes the validation error. Never loop. The user is waiting.
- **Two typed errors:** `LLMValidationError` (schema), `LLMUpstreamError` (network). Routers map to 502 / 503.
- **Timeout 20s.** P95 latency target is <8s; budget the upstream call below that.
- **Don't log the full prompt or response body at INFO** — they're large. Log token counts, attempt number, latency, error class.
- **Seed is forwarded as-is.** If `req.seed is None`, omit the param so Azure picks. Echo the resolved seed back in `Layout.seed` (read from `resp.system_fingerprint` and a generated uuid if needed for repeatable demos).

---

## 8. Error Handling

### Domain → HTTP mapping

| Service exception | HTTP status |
|---|---|
| `pydantic.ValidationError` (request) | 422 (FastAPI does this automatically) |
| `LLMValidationError` | 502 Bad Gateway |
| `LLMUpstreamError` | 503 Service Unavailable |
| `NotFound` (custom) | 404 |
| `Forbidden` (custom) | 401 |
| `httpx.HTTPStatusError` from Supabase 404 | 404 |
| `httpx.HTTPStatusError` from Supabase 401/403 | 401 |
| Unhandled | 500 (generic message, full trace logged) |

### Error response shape

FastAPI's default `{"detail": "..."}` is fine for MVP. **Never** return raw exception messages — always a short, user-safe `detail`. Stack traces go to logs only.

### Rules

- **Validate at the boundary, trust internally.** A `ResolvedItem` reaching `placement.resolve` is already valid. Don't re-validate every hop.
- **No silent fallbacks.** If the placement step has to drop an item, it appends to `Layout.warnings` — visible to the client, not buried.
- **No `try / except Exception`** without logging and re-raising or translating. Catch the exception classes you actually expect.
- **Validation errors in the LLM service** are recoverable (one retry). Validation errors at the API boundary are not — they're the client's problem.

---

## 9. Configuration

```python
# app/config.py
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    AZURE_OPENAI_ENDPOINT:    str
    AZURE_OPENAI_KEY:         str
    AZURE_OPENAI_DEPLOYMENT:  str = "gpt-4o"
    AZURE_OPENAI_API_VERSION: str = "2024-10-21"

    SUPABASE_URL:       str
    SUPABASE_JWKS_URL:  str
    SUPABASE_ANON_KEY:  str

    CORS_ORIGINS: list[str] = Field(default_factory=list)
    LOG_LEVEL: str = "info"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
```

**Rules:**

- **Pydantic Settings**, not `os.getenv`. Type-checked, defaulted, validated at boot.
- **`@lru_cache`** on `get_settings` — one instance per process.
- **Mounted from Azure Key Vault** in production via the Container App's secret refs. `.env` for local dev only.
- **Never log the settings object.** Mark sensitive fields with `repr=False` if you need to print.

---

## 10. CORS & Middleware

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import catalog, generate, layouts, rooms

def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Interior Flow 3D API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["authorization", "content-type"],
        max_age=600,
    )

    app.include_router(catalog.router)
    app.include_router(generate.router)
    app.include_router(layouts.router)
    app.include_router(rooms.router)

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app

app = create_app()
```

**Rules:**

- **`allow_origins` from settings**, never `*` in production. Vercel preview domains can be regex-matched via `allow_origin_regex` if needed.
- **`allow_credentials=True`** required for cookie-based sessions; harmless for bearer-only.
- **Method allow-list** is explicit — don't `["*"]`.
- **`max_age=600`** caches preflights for 10 min.
- **No custom middleware for auth.** Use `Depends(require_user)` on routes; middleware can't be route-scoped without ugly path matching.
- **`/healthz`** is the only route outside a router. Container Apps probe hits it.

---

## 11. Logging & Observability

- **Standard library `logging`**, configured once in `main.py`. Level from `settings.LOG_LEVEL`.
- **Structured logs** (JSON) in production; human-readable in dev. Use `python-json-logger` or write a small formatter.
- **Per request:** method, path, status, duration_ms, user_id (if any). Not the body.
- **Per LLM call:** attempt, latency_ms, prompt_tokens, completion_tokens, status (ok / validation / upstream).
- **Never log:** raw JWTs, full prompts, full LLM responses, the settings object.
- **OpenTelemetry / Application Insights** is post-MVP. For MVP, structured stdout logs aggregated by Container Apps are enough.

---

## 12. Testing

```
backend/tests/
├── conftest.py                    # fixtures: settings override, http client, mock LLM
├── test_resolver.py               # pure unit, no FastAPI
├── test_placement.py              # pure unit
├── test_llm_mock.py               # mocked openai client
├── test_routes_generate.py        # FastAPI TestClient + mocked LLM
├── test_routes_layouts.py         # CRUD with mocked Supabase REST
└── test_rls_cross_user.py         # integration, real Supabase test users
```

**Rules:**

- **Pure functions get pure tests.** `slot_resolver` and `placement` need no FastAPI, no mocks.
- **Routers tested via `TestClient`**, not by importing handlers directly. The dependency graph is part of the contract.
- **Mock the LLM at the `openai` client boundary**, not at the service boundary — exercise your retry logic.
- **Mock Supabase REST with `respx`** (httpx mocking lib) for unit tests; use real Supabase against a test project for integration tests.
- **Cross-user RLS test** authenticates as user A, attempts to read user B's layout, asserts 404 (not 403, not 200, not 500). This test gates Phase 3.
- **No tests for Pydantic itself** — trust the library.
- **Coverage target:** services 90 %+, routers 80 %+. Coverage isn't a goal, it's a smell detector.

---

## 13. Performance

- **`async def` everywhere** for I/O-bound paths. The placement pipeline is CPU-bound but tiny; running synchronously inside an async handler is fine for MVP.
- **Connection pooling:** one `httpx.AsyncClient` per request via dependency. Don't open a new client per call.
- **Pydantic v2 is fast** — don't reach for `dataclasses` for "performance". The validator is the wire contract; keep it.
- **JSON serialization:** FastAPI uses `orjson` if installed — install it.
- **Request size limits:** uvicorn defaults are generous; tighten via reverse proxy if needed. MVP has no large bodies.
- **Latency target:** `/generate-layout` p95 < 8s (LLM dominates). Other routes < 200ms p95.

---

## 14. Security Checklist (per route)

When adding a route, confirm each:

- ✅ Input is a Pydantic model with `extra="forbid"` and field constraints.
- ✅ Output uses `response_model=` set to a Pydantic model.
- ✅ Auth dependency (`require_user` or `optional_user`) is set correctly.
- ✅ Returns 404 (not 403) on RLS misses.
- ✅ Does not log secrets, JWTs, or full request bodies.
- ✅ Errors are typed and translated; no raw exceptions to the client.
- ✅ Rate / size limits are reasonable (rely on Azure defaults for MVP).
- ✅ CORS allow-list covers the route's expected origins.
- ✅ A test exists for at least: happy path, auth failure (if applicable), validation failure.

---

## 15. Common Pitfalls

- **Forgetting `extra="forbid"`** on an LLM model. Symptom: model adds fields, validation passes silently, frontend chokes. Fix: forbid extras everywhere on wire models.
- **Service module imports `fastapi`.** Symptom: circular imports, hard-to-test logic. Fix: move HTTP concerns to the router; keep services pure.
- **Catching `Exception` and re-raising as `HTTPException(500)`.** Symptom: 500s with no log context. Fix: catch typed exceptions; let unknown exceptions bubble to FastAPI's default handler (which logs the trace).
- **Returning raw Supabase REST JSON.** Symptom: schema drift, leaked internal columns. Fix: parse into Pydantic, return Pydantic.
- **Using the service role from a request handler.** Symptom: RLS bypassed, cross-tenant leak. Fix: forward the user JWT.
- **Letting the LLM emit coordinates.** Symptom: floating sofas. Fix: schema forbids `position` / `rotation_y`; resolver adds them server-side.
- **No `await` on an async client.** Symptom: coroutine warnings, requests don't fire. Fix: ruff + mypy + pytest catch this; keep them green.

---

## 16. When in Doubt

- Read `.claude/PRD.md` for product behaviour (esp. §10 API spec, §9 Security).
- Read `CLAUDE.md` for project-wide rules.
- For anything not covered here, follow the official docs:
  - FastAPI: https://fastapi.tiangolo.com
  - Pydantic v2: https://docs.pydantic.dev/latest/
  - Azure OpenAI structured output: https://learn.microsoft.com/azure/ai-services/openai/how-to/structured-outputs
  - Supabase Postgres / RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
  - Supabase JWT verification: https://supabase.com/docs/guides/auth/server-side
  - PyJWT: https://pyjwt.readthedocs.io

External docs evolve. Verify before adopting any specific API surface from training-data memory.
