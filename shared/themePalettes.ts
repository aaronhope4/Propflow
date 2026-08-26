export const THEME_PALETTE_IDS = [
  "forest_slate",
  "charcoal_sapphire",
  "graphite_amber",
  "stone_cobalt",
  "midnight_teal",
  "plum_lilac",
] as const;

export type ThemePaletteId = (typeof THEME_PALETTE_IDS)[number];

export const THEME_PALETTES: Array<{
  id: ThemePaletteId;
  name: string;
  description: string;
  swatches: [string, string, string];
}> = [
  { id: "forest_slate", name: "Forest + Slate", description: "Deep forest navigation with calm green accents.", swatches: ["#064e3b", "#15803d", "#f8faf7"] },
  { id: "charcoal_sapphire", name: "Charcoal + Sapphire", description: "Neutral charcoal shell with clear blue actions.", swatches: ["#1f2937", "#2563eb", "#f8fafc"] },
  { id: "graphite_amber", name: "Graphite + Amber", description: "Warm graphite with refined commercial amber.", swatches: ["#302c28", "#c26b15", "#fdfbf7"] },
  { id: "stone_cobalt", name: "Stone + Cobalt", description: "Bright stone surfaces and crisp architectural blue.", swatches: ["#44546a", "#2563eb", "#f7f8fa"] },
  { id: "midnight_teal", name: "Midnight + Teal", description: "Technology-forward navy with vivid teal accents.", swatches: ["#172554", "#0f9e9a", "#f7fbfc"] },
  { id: "plum_lilac", name: "Plum + Lilac", description: "Distinctive upscale plum and lavender highlights.", swatches: ["#3b1f45", "#8b5cf6", "#fcfaff"] },
];

export function isThemePaletteId(value: unknown): value is ThemePaletteId {
  return typeof value === "string" && THEME_PALETTE_IDS.includes(value as ThemePaletteId);
}
