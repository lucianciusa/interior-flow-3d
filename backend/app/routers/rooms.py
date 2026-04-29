from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.config import Settings, get_settings
from app.deps import AuthUser, require_user
from app.models.room import RoomCreate, RoomPatch, RoomRecord
from app.services.supabase import SupabaseError, SupabaseNotFound, SupabaseRest

router = APIRouter(tags=["rooms"])


@router.post(
    "/projects/{project_id}/rooms",
    response_model=RoomRecord,
    status_code=status.HTTP_201_CREATED,
)
async def create_room(
    project_id: str,
    body: RoomCreate,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> RoomRecord:
    payload = {
        "user_id": user.id,
        "project_id": project_id,
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
        raise HTTPException(status_code=404, detail="project not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return RoomRecord.model_validate(row)


@router.get("/projects/{project_id}/rooms", response_model=list[RoomRecord])
async def list_rooms_for_project(
    project_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> list[RoomRecord]:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            rows = await sb.list_rooms_for_project(project_id)
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return [RoomRecord.model_validate(r) for r in rows]


@router.patch("/rooms/{room_id}", response_model=RoomRecord)
async def update_room(
    room_id: str,
    body: RoomPatch,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> RoomRecord:
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=422, detail="no fields to update")
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.update_room(room_id, payload)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="room not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return RoomRecord.model_validate(row)


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_room(
    room_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> Response:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            await sb.delete_room(room_id)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="room not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return Response(status_code=status.HTTP_204_NO_CONTENT)
