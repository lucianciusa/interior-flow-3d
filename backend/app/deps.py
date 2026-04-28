from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request
from jwt.jwks_client import PyJWKClient
from pydantic import BaseModel, ConfigDict

from app.config import Settings, get_settings

_jwks_clients: dict[str, PyJWKClient] = {}


def _jwks(settings: Settings) -> PyJWKClient:
    if settings.SUPABASE_JWKS_URL not in _jwks_clients:
        _jwks_clients[settings.SUPABASE_JWKS_URL] = PyJWKClient(
            settings.SUPABASE_JWKS_URL, cache_keys=True, lifespan=600
        )
    return _jwks_clients[settings.SUPABASE_JWKS_URL]


class AuthUser(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    email: str | None = None
    jwt: str


def require_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = auth.removeprefix("Bearer ").strip()
    try:
        jwks_client = _jwks(settings)
        signing_key = jwks_client.get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="invalid token") from e
    except Exception as e:
        raise HTTPException(status_code=401, detail="authentication error") from e
    return AuthUser(id=claims["sub"], email=claims.get("email"), jwt=token)


def optional_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser | None:
    if "authorization" not in request.headers:
        return None
    return require_user(request, settings)
