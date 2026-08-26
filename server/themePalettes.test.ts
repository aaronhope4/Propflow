import { describe, expect, it } from "vitest";
import { THEME_PALETTE_IDS, THEME_PALETTES, isThemePaletteId } from "../shared/themePalettes";

describe("approved organization theme palettes", () => {
  it("exposes a labelled option for every approved stored palette", () => {
    expect(THEME_PALETTES.map((palette) => palette.id)).toEqual([...THEME_PALETTE_IDS]);
    expect(THEME_PALETTES.every((palette) => palette.swatches.length === 3)).toBe(true);
  });

  it("rejects unapproved organization palette identifiers", () => {
    expect(isThemePaletteId("forest_slate")).toBe(true);
    expect(isThemePaletteId("custom_rainbow")).toBe(false);
  });
});
