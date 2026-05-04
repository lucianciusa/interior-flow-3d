import json
from pathlib import Path

ROOM_TYPES_PATH = Path("backend/app/data/room_types.json")

with open(ROOM_TYPES_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

office = data["home_office"]
slots = office["slot_accepted_tags"]

for slot_name, tags in slots.items():
    if slot_name in ["desk_anchor", "desk_chair"]:
        continue
    
    # Remove 'desk' and 'chair' from all other slots in office
    if "desk" in tags:
        tags.remove("desk")
    if "chair" in tags:
        tags.remove("chair")

with open(ROOM_TYPES_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print("Cleaned up office slots in room_types.json")
