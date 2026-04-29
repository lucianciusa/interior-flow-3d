import type { Layout } from "@/lib/types";

/**
 * Hard-coded fixture layout for the marketing hero scene.
 * Uses only primitive:* models (no GLB downloads above the fold).
 * Based on a Scandinavian living room — 4×5m.
 */
export const HERO_LAYOUT: Layout = {
  style: "scandinavian",
  palette: {
    wall: { name: "Warm White", hex: "#F5F0EB" },
    floor: { name: "Light Oak", hex: "#C8A97E" },
    accent: { name: "Sage", hex: "#8FAE8B" },
  },
  items: [
    {
      catalogId: "sofa_3seat",
      slot: "south_wall_center",
      facing: "auto",
      rationale: "I placed the sofa against the south wall to create a clear conversational zone.",
      position: [0, 0.425, 1.525],
      rotation_y: Math.PI,
      footprint: { w: 2.1, d: 0.95, h: 0.85 },
      model: "primitive:sofa_3seat",
    },
    {
      catalogId: "coffee_table",
      slot: "center",
      facing: "auto",
      rationale: "The coffee table anchors the seating zone at a comfortable reach from the sofa.",
      position: [0, 0.225, 0.4],
      rotation_y: 0,
      footprint: { w: 1.2, d: 0.6, h: 0.45 },
      model: "primitive:coffee_table",
    },
    {
      catalogId: "tv_stand",
      slot: "north_wall_center",
      facing: "auto",
      rationale: "The TV stand faces the seating zone, naturally guiding the room's focal point.",
      position: [0, 0.275, -2.025],
      rotation_y: 0,
      footprint: { w: 1.6, d: 0.45, h: 0.55 },
      model: "primitive:tv_stand",
    },
    {
      catalogId: "bookshelf",
      slot: "east_wall_center",
      facing: "auto",
      rationale: "I chose the east wall for storage to keep the entry side open.",
      position: [1.625, 0.9, 0],
      rotation_y: -Math.PI / 2,
      footprint: { w: 0.8, d: 0.35, h: 1.8 },
      model: "primitive:bookshelf",
    },
    {
      catalogId: "floor_lamp",
      slot: "corner_SW",
      facing: "auto",
      rationale: "A floor lamp in the corner adds warm ambient light near the sofa.",
      position: [-1.65, 0.8, 2.15],
      rotation_y: Math.PI / 4,
      footprint: { w: 0.35, d: 0.35, h: 1.6 },
      model: "primitive:floor_lamp",
    },
    {
      catalogId: "rug",
      slot: "center_front",
      facing: "auto",
      rationale: "The rug unifies the seating zone and adds warmth to the oak floor.",
      position: [0, 0.01, 0.3],
      rotation_y: 0,
      footprint: { w: 2.4, d: 1.6, h: 0.02 },
      model: "primitive:rug",
    },
    {
      catalogId: "plant_large",
      slot: "corner_NE",
      facing: "auto",
      rationale: "A large plant in the far corner brings life without cluttering the walkway.",
      position: [1.5, 0.8, -2.15],
      rotation_y: -Math.PI / 4,
      footprint: { w: 0.6, d: 0.6, h: 1.6 },
      model: "primitive:plant_large",
    },
  ],
  designExplanation:
    "I anchored the seating zone to the south wall with the sofa facing the TV stand on the north wall, creating a natural conversational and media axis. The bookshelf on the east wall provides storage without blocking the entry, while the floor lamp and plant in opposite corners add depth and warmth. The sage accent ties the rug to the overall Scandinavian palette.",
  seed: 42,
  warnings: [],
  catalogVersion: "v1-demo",
};

export const HERO_DIMS = {
  width_m: 4,
  length_m: 5,
  height_m: 2.6,
};
