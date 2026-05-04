import json
from pathlib import Path

ROOM_TYPES_PATH = Path("backend/app/data/room_types.json")

with open(ROOM_TYPES_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# Re-allow seating in Living Room center slots
lr = data["living_room"]
lr_slots = lr["slot_accepted_tags"]

for slot in ["center", "center_front"]:
    if slot in lr_slots:
        tags = lr_slots[slot]
        if "seating" not in tags:
            tags.append("seating")
        if "upholstered" not in tags:
            tags.append("upholstered")

with open(ROOM_TYPES_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print("Re-allowed seating in center slots for Living Room.")
