from __future__ import annotations

from types import TracebackType
from typing import Any

import httpx

from app.config import Settings


class SupabaseError(Exception):
    """Generic Supabase REST failure."""


class SupabaseNotFound(SupabaseError):
    """Row not found, or hidden by RLS."""


class SupabaseConflict(SupabaseError):
    """Unique constraint or other Postgres conflict (HTTP 409)."""


_LAYOUT_SUMMARY_COLS = "id,user_id,room_id,name,is_primary,style,seed,thumbnail_url,created_at"
_LAYOUT_FULL_COLS = (
    "id,user_id,room_id,name,is_primary,style,seed,thumbnail_url,created_at,"
    "layout,rooms(width_m,length_m,height_m,room_type)"
)
_PROJECT_COLS = "id,user_id,name,default_style,default_palette,thumbnail_url,created_at"
_ROOM_COLS = "id,user_id,project_id,name,room_type,width_m,length_m,height_m,thumbnail_url,created_at"


class SupabaseRest:
    """Async wrapper around Supabase REST that forwards the user JWT.

    PostgREST applies the user's RLS policies based on the bearer token, so
    the service role is never used here.
    """

    def __init__(self, settings: Settings, user_jwt: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "authorization": f"Bearer {user_jwt}",
                "content-type": "application/json",
                "prefer": "return=representation",
            },
            timeout=10.0,
        )

    async def __aenter__(self) -> SupabaseRest:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self._client.aclose()

    async def _handle_response(self, r: httpx.Response) -> httpx.Response:
        try:
            r.raise_for_status()
            return r
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise SupabaseNotFound(str(e)) from e
            if e.response.status_code == 409:
                raise SupabaseConflict(str(e)) from e
            raise SupabaseError(str(e)) from e

    def _one(self, rows: Any) -> dict[str, Any]:
        if not rows:
            raise SupabaseNotFound("Expected at least one row, got none")
        if isinstance(rows, list):
            return rows[0]
        return rows

    # ── rooms ───────────────────────────────────────────────────────────────
    async def insert_room(self, row: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.post("rooms", json=row)
        await self._handle_response(r)
        return self._one(r.json())

    async def list_rooms(self) -> list[dict[str, Any]]:
        r = await self._client.get(
            "rooms", params={"select": _ROOM_COLS, "order": "created_at.desc"}
        )
        await self._handle_response(r)
        return list(r.json())

    async def list_rooms_for_project(self, project_id: str) -> list[dict[str, Any]]:
        r = await self._client.get(
            "rooms",
            params={
                "select": _ROOM_COLS,
                "project_id": f"eq.{project_id}",
                "order": "created_at.desc",
            },
        )
        await self._handle_response(r)
        return list(r.json())

    async def get_room(self, room_id: str) -> dict[str, Any]:
        r = await self._client.get(
            "rooms",
            params={"select": _ROOM_COLS, "id": f"eq.{room_id}", "limit": "1"},
        )
        await self._handle_response(r)
        return self._one(r.json())

    async def update_room(self, room_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.patch("rooms", params={"id": f"eq.{room_id}"}, json=payload)
        await self._handle_response(r)
        return self._one(r.json())

    async def delete_room(self, room_id: str) -> None:
        r = await self._client.delete("rooms", params={"id": f"eq.{room_id}"})
        await self._handle_response(r)
        rows = r.json() if r.text else []
        if not rows:
            raise SupabaseNotFound(room_id)

    # ── layouts ─────────────────────────────────────────────────────────────
    async def insert_layout(self, row: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.post("layouts", json=row)
        await self._handle_response(r)
        return self._one(r.json())

    async def list_layouts(self) -> list[dict[str, Any]]:
        r = await self._client.get(
            "layouts",
            params={"select": _LAYOUT_SUMMARY_COLS, "order": "created_at.desc"},
        )
        await self._handle_response(r)
        return list(r.json())

    async def list_layouts_for_room(self, room_id: str) -> list[dict[str, Any]]:
        r = await self._client.get(
            "layouts",
            params={
                "select": _LAYOUT_SUMMARY_COLS,
                "room_id": f"eq.{room_id}",
                "order": "created_at.desc",
            },
        )
        await self._handle_response(r)
        return list(r.json())

    async def get_layout(self, layout_id: str) -> dict[str, Any]:
        r = await self._client.get(
            "layouts",
            params={"select": _LAYOUT_FULL_COLS, "id": f"eq.{layout_id}", "limit": "1"},
        )
        await self._handle_response(r)
        return self._one(r.json())

    async def update_layout(self, layout_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.patch(
            "layouts",
            params={"id": f"eq.{layout_id}", "select": _LAYOUT_FULL_COLS},
            json=payload,
        )
        await self._handle_response(r)
        return self._one(r.json())

    async def unset_other_primaries(self, room_id: str, except_layout_id: str | None) -> None:
        params: dict[str, str] = {"room_id": f"eq.{room_id}", "is_primary": "eq.true"}
        if except_layout_id is not None:
            params["id"] = f"neq.{except_layout_id}"
        r = await self._client.patch("layouts", params=params, json={"is_primary": False})
        await self._handle_response(r)

    async def delete_layout(self, layout_id: str) -> None:
        r = await self._client.delete("layouts", params={"id": f"eq.{layout_id}"})
        await self._handle_response(r)
        rows = r.json() if r.text else []
        if not rows:
            raise SupabaseNotFound(layout_id)

    # ── projects ────────────────────────────────────────────────────────────
    async def insert_project(self, row: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.post("projects", json=row)
        await self._handle_response(r)
        return self._one(r.json())

    async def list_projects(self) -> list[dict[str, Any]]:
        r = await self._client.get(
            "projects", params={"select": _PROJECT_COLS, "order": "created_at.desc"}
        )
        await self._handle_response(r)
        return list(r.json())

    async def get_project(self, project_id: str) -> dict[str, Any]:
        r = await self._client.get(
            "projects",
            params={"select": _PROJECT_COLS, "id": f"eq.{project_id}", "limit": "1"},
        )
        await self._handle_response(r)
        return self._one(r.json())

    async def update_project(self, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.patch("projects", params={"id": f"eq.{project_id}"}, json=payload)
        await self._handle_response(r)
        return self._one(r.json())

    async def delete_project(self, project_id: str) -> None:
        r = await self._client.delete("projects", params={"id": f"eq.{project_id}"})
        await self._handle_response(r)
        rows = r.json() if r.text else []
        if not rows:
            raise SupabaseNotFound(project_id)

    # ── share tokens ────────────────────────────────────────────────────────
    async def insert_share_token(self, row: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.post("share_tokens", json=row)
        if r.status_code == 409:
            raise SupabaseConflict(r.text)
        r.raise_for_status()
        return self._one(r.json())

    async def revoke_share_tokens(self, layout_id: str, revoked_at_iso: str) -> int:
        """Revoke all active tokens for ``layout_id`` owned by the JWT user."""
        r = await self._client.patch(
            "share_tokens",
            params={
                "layout_id": f"eq.{layout_id}",
                "revoked_at": "is.null",
            },
            json={"revoked_at": revoked_at_iso},
        )
        if r.status_code == 404:
            return 0
        r.raise_for_status()
        rows = r.json() if r.text else []
        return len(rows)


class SupabaseServiceRoleRpc:
    """Service-role-scoped client.

    THE ONLY legitimate use is calling ``rpc/get_shared_layout`` from the
    public ``GET /share/{token}`` route. RLS is bypassed by the function,
    not the bearer; the bearer just proves we're allowed to invoke it.

    Never instantiate this from a route that already has a user JWT in scope.
    """

    def __init__(self, settings: Settings) -> None:
        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise SupabaseError("SUPABASE_SERVICE_ROLE_KEY not configured")
        self._client = httpx.AsyncClient(
            base_url=f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/",
            headers={
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "content-type": "application/json",
            },
            timeout=10.0,
        )

    async def __aenter__(self) -> SupabaseServiceRoleRpc:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self._client.aclose()

    async def get_shared_layout(self, token_hash: str) -> dict[str, Any] | None:
        r = await self._client.post("rpc/get_shared_layout", json={"p_token_hash": token_hash})
        r.raise_for_status()
        rows = r.json()
        if isinstance(rows, list):
            return rows[0] if rows else None
        if isinstance(rows, dict):
            return rows
        return None
