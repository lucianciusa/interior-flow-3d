// TS types mirroring backend/app/models/*

export type RoomType = "living_room" | "bedroom" | "dining_room" | "home_office";

export type Style = "scandinavian" | "minimal" | "industrial" | "japandi" | "mid_century";
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
  | "entry"
  | "bed_center"
  | "table_center"
  | "desk_anchor"
  | "desk_chair"
  | "dining_chair_N"
  | "dining_chair_S"
  | "dining_chair_E"
  | "dining_chair_W";
export type Facing = "auto" | "north" | "south" | "east" | "west" | "center";

export type Palette = { name: string; hex: string };
export type PaletteMap = { wall: Palette; floor: Palette; accent: Palette };
export type Footprint = { w: number; d: number; h: number };

export type PlacementSpec = {
  surfaces: string[];
  against: string[];
  exclusive_with: string[];
};

export type CatalogItem = {
  id: string;
  name: string;
  tags: string[];
  room_types: RoomType[];
  placement: PlacementSpec;
  footprint: Footprint;
  clearance: { front: number; sides: number; back: number };
  model: string;
  is_premium?: boolean;
};
export type CatalogResponse = { items: CatalogItem[] };

export type ResolvedItem = {
  catalogId: string;
  slot: SlotId;
  facing: Facing;
  zone?: string | null;
  rationale?: string | null;
  position: [number, number, number];
  rotation_y: number;
  footprint: Footprint;
  model: string;
};

export type Zone = {
  id: string;
  kind: string;
  itemBudget: number;
};

export type Layout = {
  style: Style;
  palette: PaletteMap;
  zones?: Zone[];
  items: ResolvedItem[];
  designExplanation: string;
  seed?: number | null;
  warnings: string[];
  catalogVersion?: string | null;
};

export type GenerateRequest = {
  roomType: RoomType;
  width_m: number;
  length_m: number;
  height_m: number;
  style: Style;
  preferences: Preference[];
  seed?: number;
  language?: string;
};

export type RoomDims = {
  width_m: number;
  length_m: number;
  height_m: number;
};

export type RoomCreate = {
  name: string;
  roomType: RoomType;
  width_m: number;
  length_m: number;
  height_m: number;
  thumbnail_url?: string | null;
};

export type RoomPatch = {
  name?: string;
  width_m?: number;
  length_m?: number;
  height_m?: number;
  thumbnail_url?: string | null;
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
  thumbnail_url: string | null;
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
  project_id?: string | null;
  project_name?: string | null;
  room_type?: string | null;
};

export type LayoutRecord = LayoutSummary & {
  layout: Layout;
  rooms: {
    width_m: number;
    length_m: number;
    height_m: number;
    room_type: RoomType;
  };
};

export type LayoutCreate = {
  roomId: string;
  name?: string;
  is_primary?: boolean;
  layout: Layout;
  thumbnail_url?: string | null;
};

export type LayoutPatch = {
  name?: string;
  is_primary?: boolean;
};

export type ProjectCreate = {
  name: string;
  default_style?: string | null;
  thumbnail_url?: string | null;
};

export type ProjectPatch = {
  name?: string;
  default_style?: string | null;
  thumbnail_url?: string | null;
};

export type ProjectRecord = {
  id: string;
  user_id: string;
  name: string;
  default_style: string | null;
  default_palette: Record<string, unknown> | null;
  thumbnail_url: string | null;
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
  roomType: RoomType;
  width_m: number;
  length_m: number;
  height_m: number;
  layout: Layout;
  name?: string | null;
  thumbnail_url?: string | null;
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

export type TemplateDims = {
  width_m: number;
  length_m: number;
  height_m: number;
};

export type Template = {
  id: string;
  name: string;
  room_type: string;
  style: string;
  dims: TemplateDims;
  thumbnail_url: string | null;
};

export type TemplatesResponse = {
  items: Template[];
};

export type RoomTypeProfile = {
  slot_kinds: string[];
  slot_instances: string[];
  slot_accepted_tags: Record<string, string[]>;
  allowed_zones: string[];
  default_zone: string;
  dim_bounds: {
    width_m: [number, number];
    length_m: [number, number];
    height_m: [number, number];
  };
};
