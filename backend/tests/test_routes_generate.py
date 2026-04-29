from unittest.mock import AsyncMock, patch

from app.models.layout import LayoutLLM

VALID_LLM_JSON = {
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
            "rationale": "I anchored the sofa on the south wall for a clean sightline.",
        },
        {
            "catalogId": "tv_stand",
            "slot": "north_wall_center",
            "facing": "auto",
            "rationale": "I placed the TV stand centered on the back wall.",
        },
        {
            "catalogId": "coffee_table",
            "slot": "center",
            "facing": "auto",
            "rationale": "I centered the coffee table to serve the seating zone.",
        },
    ],
    "designExplanation": (
        "I designed this minimal room with restraint and purpose"
        " — three pieces, each earning its place,"
        " creating a calm space free from visual noise."
    ),
}


def test_generate_layout_success(client):
    raw = LayoutLLM.model_validate(VALID_LLM_JSON)
    with patch("app.routers.generate.llm.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = raw
        resp = client.post(
            "/generate-layout",
            json={
                "roomType": "living_room",
                "width_m": 5.0,
                "length_m": 6.0,
                "height_m": 2.6,
                "style": "minimal",
                "preferences": [],
                "seed": 1,
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["style"] == "minimal"
    assert len(data["items"]) >= 1
    assert len(data["zones"]) >= 1
    for item in data["items"]:
        assert "position" in item
        assert "rotation_y" in item
        assert len(item["position"]) == 3
        assert item["zone"] is not None


def test_generate_layout_validation_error_returns_422(client):
    resp = client.post("/generate-layout", json={"roomType": "living_room"})
    assert resp.status_code == 422


def test_generate_layout_llm_upstream_error_returns_503(client):
    from app.services.llm import LLMUpstreamError

    with patch("app.routers.generate.llm.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = LLMUpstreamError("network error")
        resp = client.post(
            "/generate-layout",
            json={
                "roomType": "living_room",
                "width_m": 5.0,
                "length_m": 6.0,
                "height_m": 2.6,
                "style": "minimal",
                "preferences": [],
            },
        )
    assert resp.status_code == 503


def test_generate_layout_llm_validation_error_returns_502(client):
    from app.services.llm import LLMValidationError

    with patch("app.routers.generate.llm.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = LLMValidationError("bad schema")
        resp = client.post(
            "/generate-layout",
            json={
                "roomType": "living_room",
                "width_m": 5.0,
                "length_m": 6.0,
                "height_m": 2.6,
                "style": "minimal",
                "preferences": [],
            },
        )
    assert resp.status_code == 502
