// TS types mirroring backend/app/models/*

export type Style = "scandinavian" | "minimal" | "industrial";
export type Preference = "more_seating" | "more_open_space" | "more_storage";
export type SlotId =
  | "north_wall_left"
  | "north_wall_center"
  | "north_wall_right"
  | "east_wall_left"
  | "east_wall_center"
  | "east_wall_right"
  | "south_wall_left"
  | "south_wall_center"
  | "south_wall_right"
  | "west_wall_left"
  | "west_wall_center"
  | "west_wall_right"
  | "corner_NE"
  | "corner_NW"
  | "corner_SE"
  | "corner_SW"
  | "center"
  | "center_front"
  | "entry";
export type Facing = "auto" | "north" | "south" | "east" | "west" | "center";

export type Palette = { name: string; hex: string };
export type PaletteMap = { wall: Palette; floor: Palette; accent: Palette };
export type Footprint = { w: number; d: number; h: number };

export type CatalogItem = {
  id: string;
  name: string;
  footprint: Footprint;
  clearance: { front: number; sides: number; back: number };
  allowedSlotKinds: string[];
  model: string;
};
export type CatalogResponse = { items: CatalogItem[] };

export type ResolvedItem = {
  catalogId: string;
  slot: SlotId;
  facing: Facing;
  rationale?: string | null;
  position: [number, number, number];
  rotation_y: number;
  footprint: Footprint;
  model: string;
};

export type Layout = {
  style: Style;
  palette: PaletteMap;
  items: ResolvedItem[];
  designExplanation: string;
  seed?: number | null;
  warnings: string[];
  catalogVersion?: string | null;
};

export type GenerateRequest = {
  roomType: "living_room";
  width_m: number;
  length_m: number;
  height_m: number;
  style: Style;
  preferences: Preference[];
  seed?: number;
};

export type RoomDims = {
  width_m: number;
  length_m: number;
  height_m: number;
};

export type RoomCreate = {
  name: string;
  roomType: "living_room";
  width_m: number;
  length_m: number;
  height_m: number;
};

export type RoomPatch = {
  name?: string;
  width_m?: number;
  length_m?: number;
  height_m?: number;
};

export type RoomRecord = {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  room_type: string;
  width_m: number;
  length_m: number;
  height_m: number;
  created_at: string;
};

export type LayoutSummary = {
  id: string;
  user_id: string;
  room_id: string;
  name: string;
  is_primary: boolean;
  style: Style;
  seed: number | null;
  thumbnail_url: string | null;
  created_at: string;
};

export type LayoutRecord = LayoutSummary & {
  layout: Layout;
  rooms: {
    width_m: number;
    length_m: number;
    height_m: number;
  };
};

export type LayoutCreate = {
  roomId: string;
  name?: string;
  is_primary?: boolean;
  layout: Layout;
};

export type LayoutPatch = {
  name?: string;
  is_primary?: boolean;
};

export type ProjectCreate = {
  name: string;
  default_style?: string | null;
};

export type ProjectPatch = {
  name?: string;
  default_style?: string | null;
};

export type ProjectRecord = {
  id: string;
  user_id: string;
  name: string;
  default_style: string | null;
  default_palette: Record<string, unknown> | null;
  created_at: string;
};

export type ShareTokenResponse = {
  token: string;
  url: string;
  expires_at: string;
};

export type ConversionRequest = {
  projectName: string;
  roomName: string;
  width_m: number;
  length_m: number;
  height_m: number;
  layout: Layout;
};

export type ConversionResponse = {
  project_id: string;
  room_id: string;
  layout_id: string;
};

export type SwapRequest = {
  catalogId: string;
  replacementId: string;
};
