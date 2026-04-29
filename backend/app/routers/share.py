"""Public read-only share endpoint.

All failure modes return 404 (NOT 403/401) so token existence cannot be
inferred from response codes. The single sanctioned use of the service
role lives here, scoped to one row via ``rpc/get_shared_layout``.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.models.layout import Layout, LayoutRecord, RoomDims
from app.services import share_tokens
from app.services.share_tokens import InvalidToken
from app.services.supabase import SupabaseError, SupabaseServiceRoleRpc

router = APIRouter(prefix="/share", tags=["share"])


_NOT_FOUND = HTTPException(status_code=404, detail="not found or expired")


@router.get("/{token}", response_model=LayoutRecord, status_code=status.HTTP_200_OK)
async def get_shared_layout(
    token: str,
    settings: Settings = Depends(get_settings),
) -> LayoutRecord:
    if not settings.SHARE_TOKEN_SECRET or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise _NOT_FOUND

    try:
        share_tokens.verify(token, settings.SHARE_TOKEN_SECRET)
    except InvalidToken as e:
        raise _NOT_FOUND from e

    th = share_tokens.token_hash(token)
    try:
        async with SupabaseServiceRoleRpc(settings) as rpc:
            row = await rpc.get_shared_layout(th)
    except SupabaseError as e:
        raise _NOT_FOUND from e

    if row is None:
        raise _NOT_FOUND

    return LayoutRecord(
        id=row["id"],
        user_id=row["user_id"],
        room_id=row["room_id"],
        name=row.get("name", "Untitled"),
        is_primary=row.get("is_primary", False),
        style=row["style"],
        seed=row.get("seed"),
        thumbnail_url=row.get("thumbnail_url"),
        created_at=row["created_at"],
        layout=Layout.model_validate(row["layout"]),
        rooms=RoomDims(
            width_m=row["width_m"],
            length_m=row["length_m"],
            height_m=row["height_m"],
        ),
    )
