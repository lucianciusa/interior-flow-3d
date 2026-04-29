from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import catalog, generate, layouts, projects, rooms, share, swap, templates


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Interior Flow 3D API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["authorization", "content-type"],
        max_age=600,
    )

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(catalog.router)
    app.include_router(generate.router)
    app.include_router(projects.router)
    app.include_router(rooms.router)
    app.include_router(layouts.router)
    app.include_router(swap.router)
    app.include_router(share.router)
    app.include_router(templates.router)

    return app


app = create_app()
