"""Cross-user RLS integration test.

Gates Phase 3 sign-off (PRD §14 R6). Hits a deployed (or locally-running)
API + a real Supabase project. Skipped when env vars are absent so local dev
without test creds still passes.

Required env vars:
- INTERIOR_FLOW_API_URL: base URL of the running FastAPI (e.g. http://localhost:8000)
- SUPABASE_TEST_USER_A_JWT: access token for test user A
- SUPABASE_TEST_USER_B_JWT: access token for test user B
"""

from __future__ import annotations

import os

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("SUPABASE_TEST_USER_A_JWT")
    or not os.getenv("SUPABASE_TEST_USER_B_JWT")
    or not os.getenv("INTERIOR_FLOW_API_URL"),
    reason="cross-user RLS test requires INTERIOR_FLOW_API_URL + SUPABASE_TEST_USER_{A,B}_JWT",
)


VALID_LAYOUT = {
    "style": "minimal",
    "palette": {
        "wall": {"name": "White", "hex": "#FAFAFA"},
        "floor": {"name": "Grey", "hex": "#E5E5E5"},
        "accent": {"name": "Charcoal", "hex": "#1A1A1A"},
    },
    "items": [
        {
            "catalogId": "sofa_3seat",
            "slot": "south_wall_center",
            "facing": "auto",
            "rationale": "I anchored the sofa.",
            "position": [0.0, 0.0, 2.5],
            "rotation_y": 0.0,
            "footprint": {"w": 2.1, "d": 0.95, "h": 0.85},
            "model": "/models/sofa_3seat.glb",
        }
    ],
    "designExplanation": (
        "I designed this minimal room with restraint and purpose,"
        " three pieces, each earning its place in the space."
    ),
    "seed": 1234,
    "warnings": [],
}


@pytest.mark.asyncio
async def test_user_b_cannot_read_or_delete_user_a_layout() -> None:
    api = os.environ["INTERIOR_FLOW_API_URL"]
    jwt_a = os.environ["SUPABASE_TEST_USER_A_JWT"]
    jwt_b = os.environ["SUPABASE_TEST_USER_B_JWT"]
    h_a = {"authorization": f"Bearer {jwt_a}"}
    h_b = {"authorization": f"Bearer {jwt_b}"}

    async with httpx.AsyncClient(base_url=api, timeout=15.0) as c:
        room_resp = await c.post(
            "/rooms",
            headers=h_a,
            json={
                "name": "RLS Test Room",
                "roomType": "living_room",
                "width_m": 5.0,
                "length_m": 6.0,
                "height_m": 2.6,
            },
        )
        assert room_resp.status_code == 201, room_resp.text
        room_id = room_resp.json()["id"]

        layout_resp = await c.post(
            "/layouts",
            headers=h_a,
            json={"roomId": room_id, "layout": VALID_LAYOUT},
        )
        assert layout_resp.status_code == 201, layout_resp.text
        layout_id = layout_resp.json()["id"]

        try:
            r_a = await c.get(f"/layouts/{layout_id}", headers=h_a)
            assert r_a.status_code == 200

            r_b_get = await c.get(f"/layouts/{layout_id}", headers=h_b)
            assert r_b_get.status_code == 404, (
                f"User B saw User A's layout: {r_b_get.status_code} — RLS broken"
            )

            r_b_del = await c.delete(f"/layouts/{layout_id}", headers=h_b)
            assert r_b_del.status_code == 404, (
                f"User B could delete User A's layout: {r_b_del.status_code} — RLS broken"
            )

            r_a_again = await c.get(f"/layouts/{layout_id}", headers=h_a)
            assert r_a_again.status_code == 200, "User A's layout disappeared after B's delete"
        finally:
            await c.delete(f"/layouts/{layout_id}", headers=h_a)
