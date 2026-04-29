from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.config import Settings, get_settings
from app.deps import AuthUser, require_user
from app.models.layout import LayoutCreate, LayoutPatch, LayoutRecord, LayoutSummary
from app.models.share import ShareTokenResponse
from app.services import share_tokens
from app.services.supabase import (
    SupabaseConflict,
    SupabaseError,
    SupabaseNotFound,
    SupabaseRest,
)

router = APIRouter(prefix="/layouts", tags=["layouts"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_layout(
    body: LayoutCreate,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    payload = {
        "user_id": user.id,
        "room_id": body.roomId,
        "name": body.name or "Untitled",
        "is_primary": body.is_primary,
        "style": body.layout.style,
        "layout": body.layout.model_dump(),
        "seed": body.layout.seed,
        "catalog_version": body.layout.catalogVersion,
    }
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            if body.is_primary:
                # Clear any existing primary on this room before insert.
                await sb.unset_other_primaries(body.roomId, except_layout_id=None)
            row = await sb.insert_layout(payload)
    except SupabaseConflict as e:
        raise HTTPException(status_code=409, detail="primary already set") from e
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="room not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"id": row["id"]}


@router.get("", response_model=list[LayoutSummary])
async def list_layouts(
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
    room_id: str | None = None,
) -> list[LayoutSummary]:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            rows = await sb.list_layouts_for_room(room_id) if room_id else await sb.list_layouts()
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return [LayoutSummary.model_validate(r) for r in rows]


@router.get("/{layout_id}", response_model=LayoutRecord)
async def get_layout(
    layout_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> LayoutRecord:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.get_layout(layout_id)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="layout not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    return LayoutRecord.model_validate(row)


@router.patch("/{layout_id}", response_model=LayoutRecord)
async def update_layout(
    layout_id: str,
    body: LayoutPatch,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> LayoutRecord:
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=422, detail="no fields to update")
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            if body.is_primary:
                # Find the row's room_id first so the partial unique index
                # doesn't reject the update.
                existing = await sb.get_layout(layout_id)
                await sb.unset_other_primaries(existing["room_id"], except_layout_id=layout_id)
            row = await sb.update_layout(layout_id, payload)
    except SupabaseConflict as e:
        raise HTTPException(status_code=409, detail="primary already set") from e
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="layout not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return LayoutRecord.model_validate(row)


@router.post("/{layout_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_layout(
    layout_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            existing = await sb.get_layout(layout_id)
            payload = {
                "user_id": user.id,
                "room_id": existing["room_id"],
                "name": f"{existing.get('name', 'Untitled')} copy",
                "is_primary": False,
                "style": existing["style"],
                "layout": existing["layout"],
                "seed": existing.get("seed"),
                "catalog_version": existing.get("catalog_version"),
            }
            row = await sb.insert_layout(payload)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="layout not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"id": row["id"]}


@router.delete("/{layout_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_layout(
    layout_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> Response:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            await sb.delete_layout(layout_id)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="layout not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{layout_id}/share",
    response_model=ShareTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def share_layout(
    layout_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> ShareTokenResponse:
    if not settings.SHARE_TOKEN_SECRET:
        raise HTTPException(status_code=503, detail="share tokens not configured")

    expires_at = datetime.now(UTC) + timedelta(days=settings.SHARE_TOKEN_TTL_DAYS)
    token = share_tokens.sign(layout_id, expires_at, settings.SHARE_TOKEN_SECRET)
    th = share_tokens.token_hash(token)

    now_iso = datetime.now(UTC).isoformat()
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            # Layout exists + RLS-scoped to the user.
            await sb.get_layout(layout_id)
            # Locked decision: rotate. Revoke any active prior tokens.
            await sb.revoke_share_tokens(layout_id, now_iso)
            await sb.insert_share_token(
                {
                    "token_hash": th,
                    "layout_id": layout_id,
                    "user_id": user.id,
                    "expires_at": expires_at.isoformat(),
                }
            )
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="layout not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    base = settings.SHARE_LINK_BASE_URL.rstrip("/") or ""
    url = f"{base}/share/{token}" if base else f"/share/{token}"
    return ShareTokenResponse(token=token, url=url, expires_at=expires_at.isoformat())


@router.delete("/{layout_id}/share", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def revoke_layout_share(
    layout_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> Response:
    now_iso = datetime.now(UTC).isoformat()
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            await sb.revoke_share_tokens(layout_id, now_iso)
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return Response(status_code=status.HTTP_204_NO_CONTENT)
