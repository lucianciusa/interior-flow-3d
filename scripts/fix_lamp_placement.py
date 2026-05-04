import json
from pathlib import Path

CATALOG_PATH = Path("backend/app/data/catalog.json")

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    catalog = json.load(f)

count = 0
for item in catalog:
    tags = set(item.get("tags", []))
    if "lighting" in tags:
        # If it's a small lamp (not floor lamp and height < 1m)
        if "floor_lamp" not in item["id"] and item["footprint"]["h"] < 1.2:
            if item["placement"]["surfaces"] == ["floor"]:
                item["placement"]["surfaces"] = ["wall", "corner"]
                item["placement"]["against"] = ["wall"]
                count += 1
        # Ceiling fans should be handled specially
        if "ceiling_fan" in item["id"]:
             item["placement"]["surfaces"] = ["wall"]
             item["placement"]["against"] = ["wall"]
             count += 1

print(f"Fixed {count} lighting items in catalog.")

with open(CATALOG_PATH, "w", encoding="utf-8") as f:
    json.dump(catalog, f, indent=2)
    f.write("\n")
