export const SPACING = {
  4: "0.25rem",
  8: "0.5rem",
  12: "0.75rem",
  16: "1rem",
  24: "1.5rem",
  32: "2rem",
  48: "3rem",
  64: "4rem",
} as const;

export const MOTION_DURATIONS = {
  fast: "150ms",
  base: "200ms",
  slow: "250ms",
} as const;

export const RADII = {
  none: "0",
  sm: "0.125rem",
  DEFAULT: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px",
} as const;

export const Z_INDEX = {
  hero: "10",
  shell: "30",
  inspector: "35",
  modal: "50",
} as const;

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export type Spacing = keyof typeof SPACING;
export type MotionDuration = keyof typeof MOTION_DURATIONS;
export type Radius = keyof typeof RADII;
export type ZIndex = keyof typeof Z_INDEX;
export type Breakpoint = keyof typeof BREAKPOINTS;
