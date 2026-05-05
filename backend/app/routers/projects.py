import contextlib

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.config import Settings, get_settings
from app.deps import AuthUser, require_user
from app.models.project import (
    ConversionRequest,
    ConversionResponse,
    ProjectCreate,
    ProjectPatch,
    ProjectRecord,
)
from app.services.supabase import SupabaseError, SupabaseNotFound, SupabaseRest

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectRecord, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> ProjectRecord:
    payload: dict[str, object] = {"user_id": user.id, "name": body.name}
    if body.default_style is not None:
        payload["default_style"] = body.default_style
    if body.thumbnail_url is not None:
        payload["thumbnail_url"] = body.thumbnail_url
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.insert_project(payload)
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return ProjectRecord.model_validate(row)


@router.get("", response_model=list[ProjectRecord])
async def list_projects(
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> list[ProjectRecord]:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            rows = await sb.list_projects()
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return [ProjectRecord.model_validate(r) for r in rows]


@router.get("/{project_id}", response_model=ProjectRecord)
async def get_project(
    project_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> ProjectRecord:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.get_project(project_id)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="project not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return ProjectRecord.model_validate(row)


@router.patch("/{project_id}", response_model=ProjectRecord)
async def update_project(
    project_id: str,
    body: ProjectPatch,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> ProjectRecord:
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=422, detail="no fields to update")
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.update_project(project_id, payload)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="project not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return ProjectRecord.model_validate(row)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_project(
    project_id: str,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> Response:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            await sb.delete_project(project_id)
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="project not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/conversion",
    response_model=ConversionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def convert_anon_layout(
    body: ConversionRequest,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> ConversionResponse:
    """Anon → first-project conversion.

    Sequential Project → Room → Layout under the user JWT. No DB transaction;
    on later-step failure we compensate by deleting the earlier rows.
    """
    project_id: str | None = None
    room_id: str | None = None
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            # Try to find existing project with this name first (handling both languages)
            existing_projects = await sb.list_projects()
            known_free_names = {"Free Designs", "Diseños libres"}
            target_project = next(
                (p for p in existing_projects if p["name"] in known_free_names), None
            )

            if target_project:
                project_id = target_project["id"]
            else:
                project_row = await sb.insert_project(
                    {
                        "user_id": user.id,
                        "name": body.projectName,
                        "thumbnail_url": body.thumbnail_url,
                    }
                )
                project_id = project_row["id"]

            try:
                room_row = await sb.insert_room(
                    {
                        "user_id": user.id,
                        "project_id": project_id,
                        "name": body.roomName,
                        "room_type": body.roomType,
                        "width_m": body.width_m,
                        "length_m": body.length_m,
                        "height_m": body.height_m,
                        "thumbnail_url": body.thumbnail_url,
                    }
                )
                room_id = room_row["id"]
            except SupabaseError:
                # Only delete if we just created it
                if project_id is not None and not target_project:
                    with contextlib.suppress(SupabaseError):
                        await sb.delete_project(project_id)
                raise

            try:
                layout_row = await sb.insert_layout(
                    {
                        "user_id": user.id,
                        "room_id": room_id,
                        "name": body.name or "Untitled",
                        "is_primary": True,
                        "style": body.layout.style,
                        "layout": body.layout.model_dump(),
                        "seed": body.layout.seed,
                        "thumbnail_url": body.thumbnail_url,
                        "catalog_version": body.layout.catalogVersion,
                    }
                )
            except SupabaseError:
                if room_id is not None:
                    with contextlib.suppress(SupabaseError):
                        await sb.delete_room(room_id)
                if project_id is not None:
                    with contextlib.suppress(SupabaseError):
                        await sb.delete_project(project_id)
                raise

    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    return ConversionResponse(
        project_id=project_id or "",
        room_id=room_id or "",
        layout_id=layout_row["id"],
    )
