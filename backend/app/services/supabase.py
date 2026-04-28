from __future__ import annotations

from types import TracebackType
from typing import Any

import httpx

from app.config import Settings


class SupabaseError(Exception):
    """Generic Supabase REST failure."""


class SupabaseNotFound(SupabaseError):
    """Row not found, or hidden by RLS."""


_LAYOUT_SUMMARY_COLS = "id,user_id,room_id,style,seed,thumbnail_url,created_at"
_LAYOUT_FULL_COLS = (
    "id,user_id,room_id,style,seed,thumbnail_url,created_at,layout,rooms(width_m,length_m,height_m)"
)


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

    @staticmethod
    def _one(rows: list[dict[str, Any]]) -> dict[str, Any]:
        if not rows:
            raise SupabaseNotFound("no rows")
        return rows[0]

    async def insert_room(self, row: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.post("rooms", json=row)
        r.raise_for_status()
        return self._one(r.json())

    async def list_rooms(self) -> list[dict[str, Any]]:
        r = await self._client.get("rooms", params={"select": "*", "order": "created_at.desc"})
        r.raise_for_status()
        return list(r.json())

    async def insert_layout(self, row: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.post("layouts", json=row)
        if r.status_code == 409:
            raise SupabaseError(f"conflict: {r.text}")
        r.raise_for_status()
        return self._one(r.json())

    async def list_layouts(self) -> list[dict[str, Any]]:
        r = await self._client.get(
            "layouts",
            params={"select": _LAYOUT_SUMMARY_COLS, "order": "created_at.desc"},
        )
        r.raise_for_status()
        return list(r.json())

    async def get_layout(self, layout_id: str) -> dict[str, Any]:
        r = await self._client.get(
            "layouts",
            params={"select": _LAYOUT_FULL_COLS, "id": f"eq.{layout_id}", "limit": "1"},
        )
        if r.status_code == 404:
            raise SupabaseNotFound(layout_id)
        r.raise_for_status()
        return self._one(r.json())

    async def delete_layout(self, layout_id: str) -> None:
        r = await self._client.delete("layouts", params={"id": f"eq.{layout_id}"})
        if r.status_code == 404:
            raise SupabaseNotFound(layout_id)
        r.raise_for_status()
        rows = r.json() if r.text else []
        if not rows:
            raise SupabaseNotFound(layout_id)
