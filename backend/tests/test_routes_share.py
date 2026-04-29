from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
import respx
from fastapi.testclient import TestClient
from httpx import Response

from app.config import Settings, get_settings
from app.main import app
from app.services import share_tokens

SECRET = "test-share-secret"


@pytest.fixture
def share_settings() -> Iterator[Settings]:
    settings = Settings(
        SUPABASE_URL="http://supabase.test",
        SUPABASE_JWKS_URL="http://supabase.test/jwks",
        SUPABASE_ANON_KEY="anon-key",
        SUPABASE_SERVICE_ROLE_KEY="service-role-key",
        SHARE_TOKEN_SECRET=SECRET,
        SHARE_LINK_BASE_URL="http://app.test",
    )
    app.dependency_overrides[get_settings] = lambda: settings
    yield settings
    app.dependency_overrides.pop(get_settings, None)


def _layout_rpc_row() -> dict[str, object]:
    return {
        "id": "layout-1",
        "user_id": "user-1",
        "room_id": "room-1",
        "style": "minimal",
        "seed": 1,
        "thumbnail_url": None,
        "created_at": "2026-04-28T00:00:00+00:00",
        "name": "Untitled",
        "is_primary": True,
        "catalog_version": "v1.mvp",
        "width_m": 5.0,
        "length_m": 6.0,
        "height_m": 2.6,
        "room_type": "living_room",
        "layout": {
            "style": "minimal",
            "palette": {
                "wall": {"name": "White", "hex": "#FAFAFA"},
                "floor": {"name": "Grey", "hex": "#E5E5E5"},
                "accent": {"name": "Charcoal", "hex": "#1A1A1A"},
            },
            "items": [],
            "designExplanation": "x" * 90,
            "seed": 1,
            "warnings": [],
        },
    }


def test_share_get_happy_path(client: TestClient, share_settings: Settings) -> None:
    exp = datetime.now(UTC) + timedelta(days=30)
    token = share_tokens.sign("layout-1", exp, SECRET)
    with respx.mock(base_url=share_settings.SUPABASE_URL) as mock:
        mock.post("/rest/v1/rpc/get_shared_layout").mock(
            return_value=Response(200, json=[_layout_rpc_row()])
        )
        r = client.get(f"/share/{token}")
    assert r.status_code == 200
    assert r.json()["id"] == "layout-1"
    assert r.json()["rooms"]["width_m"] == 5.0


def test_share_get_tampered_token_returns_404(client: TestClient, share_settings: Settings) -> None:
    r = client.get("/share/totally-bogus.value")
    assert r.status_code == 404


def test_share_get_expired_token_returns_404(client: TestClient, share_settings: Settings) -> None:
    exp = datetime.now(UTC) - timedelta(minutes=1)
    token = share_tokens.sign("layout-1", exp, SECRET)
    r = client.get(f"/share/{token}")
    assert r.status_code == 404


def test_share_get_revoked_returns_404(client: TestClient, share_settings: Settings) -> None:
    """RPC returns no rows for revoked or unknown tokens."""
    exp = datetime.now(UTC) + timedelta(days=1)
    token = share_tokens.sign("layout-1", exp, SECRET)
    with respx.mock(base_url=share_settings.SUPABASE_URL) as mock:
        mock.post("/rest/v1/rpc/get_shared_layout").mock(return_value=Response(200, json=[]))
        r = client.get(f"/share/{token}")
    assert r.status_code == 404


def test_share_post_creates_token(
    client: TestClient,
    share_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    layout_row = {
        "id": "layout-1",
        "user_id": "user-a",
        "room_id": "room-1",
        "name": "Untitled",
        "is_primary": True,
        "style": "minimal",
        "seed": 1,
        "thumbnail_url": None,
        "created_at": "2026-04-28T00:00:00+00:00",
        "layout": {
            "style": "minimal",
            "palette": {
                "wall": {"name": "White", "hex": "#FAFAFA"},
                "floor": {"name": "Grey", "hex": "#E5E5E5"},
                "accent": {"name": "Charcoal", "hex": "#1A1A1A"},
            },
            "items": [],
            "designExplanation": "x" * 90,
            "seed": 1,
            "warnings": [],
        },
        "rooms": {"width_m": 5.0, "length_m": 6.0, "height_m": 2.6, "room_type": "living_room"},
    }
    with respx.mock(base_url=share_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/layouts").mock(return_value=Response(200, json=[layout_row]))
        mock.patch("/rest/v1/share_tokens").mock(return_value=Response(200, json=[]))
        mock.post("/rest/v1/share_tokens").mock(
            return_value=Response(201, json=[{"token_hash": "x"}])
        )
        r = client.post("/layouts/layout-1/share", headers=auth_headers_user_a)
    assert r.status_code == 201
    j = r.json()
    assert "token" in j and "url" in j and "expires_at" in j
    assert j["url"].startswith("http://app.test/share/")


def test_share_revoke_returns_204(
    client: TestClient,
    share_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=share_settings.SUPABASE_URL) as mock:
        mock.patch("/rest/v1/share_tokens").mock(return_value=Response(200, json=[]))
        r = client.delete("/layouts/layout-1/share", headers=auth_headers_user_a)
    assert r.status_code == 204
