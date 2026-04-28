from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.deps import AuthUser, require_user
from app.models.room import RoomCreate, RoomRecord
from app.services.supabase import SupabaseError, SupabaseNotFound, SupabaseRest

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomRecord, status_code=status.HTTP_201_CREATED)
async def create_room(
    body: RoomCreate,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> RoomRecord:
    payload = {
        "user_id": user.id,
        "name": body.name,
        "room_type": body.roomType,
        "width_m": body.width_m,
        "length_m": body.length_m,
        "height_m": body.height_m,
    }
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.insert_room(payload)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return RoomRecord.model_validate(row)


@router.get("", response_model=list[RoomRecord])
async def list_rooms(
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> list[RoomRecord]:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            rows = await sb.list_rooms()
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return [RoomRecord.model_validate(r) for r in rows]
