from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.deps import AuthUser, require_user


def _mint(
    priv_pem: bytes,
    *,
    sub: str = "user-a",
    email: str | None = "a@example.com",
    aud: str = "authenticated",
    expires_in: int = 3600,
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, object] = {
        "sub": sub,
        "aud": aud,
        "exp": now + timedelta(seconds=expires_in),
        "iat": now,
    }
    if email is not None:
        payload["email"] = email
    return jwt.encode(payload, priv_pem, algorithm="RS256")


@pytest.fixture
def auth_app(patched_jwks: None) -> TestClient:
    app = FastAPI()

    @app.get("/whoami")
    def whoami(user: AuthUser = Depends(require_user)) -> dict[str, str | None]:
        return {"id": user.id, "email": user.email}

    return TestClient(app)


def test_require_user_happy_path(auth_app: TestClient, _rsa_keypair: tuple[bytes, Any]) -> None:
    priv, _ = _rsa_keypair
    token = _mint(priv)
    r = auth_app.get("/whoami", headers={"authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json() == {"id": "user-a", "email": "a@example.com"}


def test_require_user_missing_bearer_returns_401(auth_app: TestClient) -> None:
    r = auth_app.get("/whoami")
    assert r.status_code == 401
    assert r.json()["detail"] == "missing bearer token"


def test_require_user_expired_returns_401(
    auth_app: TestClient, _rsa_keypair: tuple[bytes, Any]
) -> None:
    priv, _ = _rsa_keypair
    token = _mint(priv, expires_in=-10)
    r = auth_app.get("/whoami", headers={"authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid token"


def test_require_user_wrong_audience_returns_401(
    auth_app: TestClient, _rsa_keypair: tuple[bytes, Any]
) -> None:
    priv, _ = _rsa_keypair
    token = _mint(priv, aud="wrong-aud")
    r = auth_app.get("/whoami", headers={"authorization": f"Bearer {token}"})
    assert r.status_code == 401
