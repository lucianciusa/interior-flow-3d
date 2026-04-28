from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock, patch

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.models.catalog import CatalogItem


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def supabase_settings() -> Iterator[Settings]:
    settings = Settings(
        SUPABASE_URL="http://supabase.test",
        SUPABASE_JWKS_URL="http://supabase.test/jwks",
        SUPABASE_ANON_KEY="anon-key",
    )
    app.dependency_overrides[get_settings] = lambda: settings
    yield settings
    app.dependency_overrides.pop(get_settings, None)


@pytest.fixture
def catalog_items() -> list[CatalogItem]:
    from app.routers.catalog import _load_catalog

    return _load_catalog().items


@pytest.fixture
def catalog_map(catalog_items: list[CatalogItem]) -> dict[str, CatalogItem]:
    return {item.id: item for item in catalog_items}


@pytest.fixture(scope="session")
def _rsa_keypair() -> tuple[bytes, Any]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return priv_pem, key.public_key()


def _mint_token(
    priv_pem: bytes,
    *,
    sub: str,
    email: str,
) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": sub,
            "aud": "authenticated",
            "exp": now + timedelta(hours=1),
            "iat": now,
            "email": email,
        },
        priv_pem,
        algorithm="RS256",
    )


@pytest.fixture
def patched_jwks(_rsa_keypair: tuple[bytes, Any]) -> Iterator[None]:
    _, pub = _rsa_keypair
    fake = MagicMock()
    signing_key = MagicMock()
    signing_key.key = pub
    fake.get_signing_key_from_jwt.return_value = signing_key
    with patch("app.deps._jwks", return_value=fake):
        yield


@pytest.fixture
def auth_headers_user_a(_rsa_keypair: tuple[bytes, Any], patched_jwks: None) -> dict[str, str]:
    priv, _ = _rsa_keypair
    token = _mint_token(priv, sub="user-a", email="a@example.com")
    return {"authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_user_b(_rsa_keypair: tuple[bytes, Any], patched_jwks: None) -> dict[str, str]:
    priv, _ = _rsa_keypair
    token = _mint_token(priv, sub="user-b", email="b@example.com")
    return {"authorization": f"Bearer {token}"}
