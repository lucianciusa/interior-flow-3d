import type { Style } from "./types";

export const STYLES: ReadonlyArray<{
  id: Style;
  label: string;
  tagline: string;
  image: string;
  swatches: [string, string, string];
}> = [
  {
    id: "scandinavian",
    label: "Scandinavian",
    tagline: "Light woods, soft textiles, cozy warmth",
    image: "/images/styles/scandinavian.png",
    swatches: ["#F4F1EC", "#D6BFA0", "#A7B79A"],
  },
  {
    id: "minimal",
    label: "Minimal",
    tagline: "Calm surfaces, intentional negative space",
    image: "/images/styles/minimal.png",
    swatches: ["#FAFAFA", "#E5E5E5", "#1A1A1A"],
  },
  {
    id: "japandi",
    label: "Japandi",
    tagline: "Japanese minimalism meets Scandi comfort",
    image: "/images/styles/japandi.png",
    swatches: ["#E8E1D5", "#A6998A", "#403C38"],
  },
  {
    id: "mid_century",
    label: "Mid-Century",
    tagline: "Retro curves, bold colors, teak accents",
    image: "/images/styles/mid_century.png",
    swatches: ["#9C6644", "#7F5539", "#D4A373"],
  },
  {
    id: "industrial",
    label: "Industrial",
    tagline: "Raw metal, concrete, exposed structure",
    image: "/images/styles/industrial.png",
    swatches: ["#C4C0BA", "#3A3A3A", "#C8943A"],
  },
];
