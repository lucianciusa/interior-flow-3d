import type { SlotId } from "@/lib/types";

export const SLOT_LABELS: Record<SlotId, string> = {
  north_wall_left: "Back wall — left side",
  north_wall_center: "Back wall — centered",
  north_wall_right: "Back wall — right side",
  east_wall_left: "Right wall — far end",
  east_wall_center: "Right wall — centered",
  east_wall_right: "Right wall — near end",
  south_wall_left: "Front wall — left side",
  south_wall_center: "Front wall — centered",
  south_wall_right: "Front wall — right side",
  west_wall_left: "Left wall — far end",
  west_wall_center: "Left wall — centered",
  west_wall_right: "Left wall — near end",
  corner_NE: "Back-right corner",
  corner_NW: "Back-left corner",
  corner_SE: "Front-right corner",
  corner_SW: "Front-left corner",
  center: "Room center",
  center_front: "Center, toward the front",
  entry: "Near the entryway",
};
