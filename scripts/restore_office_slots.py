import json
from pathlib import Path

ROOM_TYPES_PATH = Path("backend/app/data/room_types.json")

with open(ROOM_TYPES_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

office = data["home_office"]
slots = office["slot_accepted_tags"]

for slot_name, tags in slots.items():
    # Re-add 'desk' and 'chair' to wall slots where they were before
    if "wall" in slot_name:
        if "desk" not in tags:
            tags.append("desk")
        if "chair" not in tags:
            tags.append("chair")

with open(ROOM_TYPES_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print("Restored office slots in room_types.json")
