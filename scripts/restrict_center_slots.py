import json
from pathlib import Path

ROOM_TYPES_PATH = Path("backend/app/data/room_types.json")

with open(ROOM_TYPES_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# Fix Living Room center slots
lr = data["living_room"]
lr_slots = lr["slot_accepted_tags"]

for slot in ["center", "center_front"]:
    if slot in lr_slots:
        tags = lr_slots[slot]
        # Remove seating/upholstered from center slots to prevent floating chairs
        if "seating" in tags:
            tags.remove("seating")
        if "upholstered" in tags:
            tags.remove("upholstered")

# Fix Bedroom center slots (only bed and rug allowed)
br = data["bedroom"]
br_slots = br["slot_accepted_tags"]
if "bed_center" in br_slots:
    br_slots["bed_center"] = ["bed", "rug"]

with open(ROOM_TYPES_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print("Restricted center slots in room_types.json to prevent floating chairs.")
