from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.config import Settings, get_settings
from app.deps import AuthUser, require_user
from app.models.layout import LayoutCreate, LayoutRecord, LayoutSummary
from app.services.supabase import SupabaseError, SupabaseNotFound, SupabaseRest

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
        "style": body.layout.style,
        "layout": body.layout.model_dump(),
        "seed": body.layout.seed,
    }
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.insert_layout(payload)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="room not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"id": row["id"]}


@router.get("", response_model=list[LayoutSummary])
async def list_layouts(
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> list[LayoutSummary]:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            rows = await sb.list_layouts()
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
