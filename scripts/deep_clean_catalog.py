import json
from pathlib import Path

CATALOG_PATH = Path("backend/app/data/catalog.json")

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    catalog = json.load(f)

# 1. Fix desk chair co-occupancy implicitly (already handled in placement.py)
# 2. Fix lighting placement
count = 0
for item in catalog:
    tags = set(item.get("tags", []))
    low_id = item["id"].lower()
    
    # Identify items that should NOT be on the floor
    if "lighting" in tags:
        # If it's small (h < 1.2) and NOT explicitly a floor lamp
        if "floor_lamp" not in low_id and item["footprint"]["h"] < 1.2:
            item["placement"]["surfaces"] = ["wall", "corner"]
            item["placement"]["against"] = ["wall"]
            count += 1
        
    # Identification of ceiling fans and other incorrectly placed items
    if "ceiling_fan" in low_id or "lampSquareCeiling" in item["id"]:
        item["placement"]["surfaces"] = ["wall"]
        item["placement"]["against"] = ["wall"]
        count += 1

    # Ensure office_chair has 'chair' tag if it doesn't
    if "office_chair" in low_id:
        if "chair" not in tags:
            item["tags"].append("chair")

print(f"Deep cleaned {count} items in catalog.")

with open(CATALOG_PATH, "w", encoding="utf-8") as f:
    json.dump(catalog, f, indent=2)
    f.write("\n")
