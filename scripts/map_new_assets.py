import json
from pathlib import Path

CATALOG_PATH = Path("backend/app/data/catalog.json")
ASSETS_DIR = Path("assets/glb")
UNUSED_ASSETS = list(ASSETS_DIR.glob("*.glb"))

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    catalog = json.load(f)

existing_ids = {item["id"] for item in catalog}

new_items = []
for asset in UNUSED_ASSETS:
    cid = asset.stem
    if cid in existing_ids:
        continue
    
    # Heuristic mapping
    name = cid.replace("_", " ").title()
    tags = ["accent"]
    rooms = ["living_room", "bedroom"]
    
    low_id = cid.lower()
    if any(x in low_id for x in ["chair", "stool", "sofa", "bench", "seating", "lounge"]):
        tags.append("seating")
    if any(x in low_id for x in ["table", "desk", "surface", "cabinet", "dresser", "shelf", "stand", "sideboard", "bookshelf"]):
        tags.append("surface")
    if any(x in low_id for x in ["lamp", "light", "fan", "sconce"]):
        tags.append("lighting")
    if "plant" in low_id:
        tags.append("plant")
    if "rug" in low_id:
        tags.append("rug")
    if any(x in low_id for x in ["tv", "monitor", "laptop", "television", "media", "computer"]):
        tags.append("media")
    if "storage" in low_id or "cabinet" in low_id or "wardrobe" in low_id or "dresser" in low_id:
        tags.append("storage")
        
    if any(x in low_id for x in ["office", "work", "computer", "laptop", "monitor", "desk", "keyboard", "mouse"]):
        if "home_office" not in rooms:
            rooms.append("home_office")
    if "dining" in low_id:
        if "dining_room" not in rooms:
            rooms.append("dining_room")
        
    item = {
        "id": cid,
        "name": name,
        "tags": sorted(list(set(tags))),
        "room_types": sorted(list(set(rooms))),
        "placement": {
            "surfaces": ["floor"],
            "against": ["none"],
            "exclusive_with": []
        },
        "footprint": {"w": 0.6, "d": 0.6, "h": 0.75},
        "clearance": {"front": 0.3, "sides": 0.1, "back": 0.1},
        "model": f"primitive:{cid}" 
    }
    
    # Specific placement logic
    if any(x in low_id for x in ["wall", "shelf", "cabinet", "dresser", "wardrobe", "bookshelf", "tv_stand", "sideboard", "console"]):
        item["placement"]["surfaces"] = ["wall"]
        item["placement"]["against"] = ["wall"]
    
    if "corner" in low_id:
        item["placement"]["surfaces"] = ["corner"]
        item["placement"]["against"] = ["wall"]
        
    if "rug" in low_id:
        item["footprint"]["h"] = 0.02
        item["clearance"] = {"front": 0.0, "sides": 0.0, "back": 0.0}
    
    new_items.append(item)

print(f"Adding {len(new_items)} new items to catalog.")
catalog.extend(new_items)

with open(CATALOG_PATH, "w", encoding="utf-8") as f:
    json.dump(catalog, f, indent=2)
    f.write("\n")
