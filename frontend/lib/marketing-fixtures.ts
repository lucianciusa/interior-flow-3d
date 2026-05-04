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
      position: [0, 0, 1.525],
      rotation_y: Math.PI,
      footprint: { w: 2.1, d: 0.95, h: 0.85 },
      model: "https://interior-flow-endpoint-fkg2cxgbgbh3ffgy.a02.azurefd.net/catalog/415386897a1a37bae9e4750c75b6a325d01aeb76ee4122de0ace5e828ae1e287.glb",
    },
    {
      catalogId: "coffee_table",
      slot: "center",
      facing: "auto",
      rationale: "The coffee table anchors the seating zone at a comfortable reach from the sofa.",
      position: [0, 0, 0.4],
      rotation_y: 0,
      footprint: { w: 1.2, d: 0.6, h: 0.45 },
      model: "https://interior-flow-endpoint-fkg2cxgbgbh3ffgy.a02.azurefd.net/catalog/896b440caac1af6ec5d4e3bee596c09b9c32d3de3cc2153f3574e530bd51b5c1.glb",
    },
    {
      catalogId: "tv_stand",
      slot: "north_wall_center",
      facing: "auto",
      rationale: "The TV stand faces the seating zone, naturally guiding the room's focal point.",
      position: [0, 0, -2.025],
      rotation_y: 0,
      footprint: { w: 1.6, d: 0.45, h: 0.55 },
      model: "https://interior-flow-endpoint-fkg2cxgbgbh3ffgy.a02.azurefd.net/catalog/b2021d3693c39f4622ec2db957ab1137e9e22b15dc486ab4ad87759668cc9b01.glb",
    },
    {
      catalogId: "bookshelf",
      slot: "east_wall_center",
      facing: "auto",
      rationale: "I chose the east wall for storage to keep the entry side open.",
      position: [1.625, 0, 0],
      rotation_y: -Math.PI / 2,
      footprint: { w: 0.8, d: 0.35, h: 1.8 },
      model: "https://interior-flow-endpoint-fkg2cxgbgbh3ffgy.a02.azurefd.net/catalog/d37e9924e7945460c6239eb94ea06dbc1eb6ed78fe18ef5188f465487ffe56df.glb",
    },
    {
      catalogId: "floor_lamp",
      slot: "corner_SW",
      facing: "auto",
      rationale: "A floor lamp in the corner adds warm ambient light near the sofa.",
      position: [-1.65, 0, 2.15],
      rotation_y: Math.PI / 4,
      footprint: { w: 0.35, d: 0.35, h: 1.6 },
      model: "https://interior-flow-endpoint-fkg2cxgbgbh3ffgy.a02.azurefd.net/catalog/69dd5dcced6ae315fae1c8460a12efaaf6fc471aeec607dadeb5c3770e55fcab.glb",
    },
    {
      catalogId: "rug",
      slot: "center_front",
      facing: "auto",
      rationale: "The rug unifies the seating zone and adds warmth to the oak floor.",
      position: [0, 0, 0.3],
      rotation_y: 0,
      footprint: { w: 2.4, d: 1.6, h: 0.02 },
      model: "https://interior-flow-endpoint-fkg2cxgbgbh3ffgy.a02.azurefd.net/catalog/3878afd2be44a5fc77c9899f8a2a0c0afc197da33070dc479da92ab2a4276f9e.glb",
    },
    {
      catalogId: "plant_large",
      slot: "corner_NE",
      facing: "auto",
      rationale: "A large plant in the far corner brings life without cluttering the walkway.",
      position: [1.5, 0, -2.15],
      rotation_y: -Math.PI / 4,
      footprint: { w: 0.6, d: 0.6, h: 1.6 },
      model: "https://interior-flow-endpoint-fkg2cxgbgbh3ffgy.a02.azurefd.net/catalog/418997c48610b25174f21667f6caf4b4b465eb5735ea569dfa1958fc25f868f7.glb",
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
