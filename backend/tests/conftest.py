import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.catalog import CatalogItem


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def catalog_items() -> list[CatalogItem]:
    from app.routers.catalog import _load_catalog

    return _load_catalog().items


@pytest.fixture
def catalog_map(catalog_items: list[CatalogItem]) -> dict[str, CatalogItem]:
    return {item.id: item for item in catalog_items}
