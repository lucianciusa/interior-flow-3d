"""Walk catalog.json; HEAD each non-primitive `model` URL; assert ≤1 MB per asset
and ≤5 MB total per-room-type GLB payload.

Usage:
    python scripts/check_asset_budget.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

PER_ASSET_MAX = 1_048_576  # 1 MB
PER_ROOM_MAX = 5 * 1_048_576  # 5 MB

CATALOG = Path(__file__).parent.parent / "backend" / "app" / "data" / "catalog.json"


def head_size(url: str) -> int:
    req = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return int(resp.headers.get("Content-Length", "0"))


def main() -> int:
    items = json.loads(CATALOG.read_text())
    failures: list[str] = []
    per_room: dict[str, int] = defaultdict(int)

    for item in items:
        model = item["model"]
        if model.startswith("primitive:"):
            continue
        try:
            size = head_size(model)
        except Exception as e:
            failures.append(f"HEAD failed for {item['id']} {model}: {e}")
            continue
        if size > PER_ASSET_MAX:
            failures.append(f"{item['id']}: {size} > {PER_ASSET_MAX}")
        for room in item["room_types"]:
            per_room[room] += size

    for room, total in per_room.items():
        if total > PER_ROOM_MAX:
            failures.append(f"{room}: total {total} > {PER_ROOM_MAX}")

    if failures:
        print("FAIL:")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("OK:", {k: v for k, v in per_room.items()})
    return 0


if __name__ == "__main__":
    sys.exit(main())
