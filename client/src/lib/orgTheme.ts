import type { ThemePaletteId } from "@shared/themePalettes";
import { THEME_PALETTES } from "@shared/themePalettes";

export { THEME_PALETTES, type ThemePaletteId };

export function applyOrganizationTheme(palette: ThemePaletteId | null | undefined) {
  document.documentElement.dataset.orgPalette = palette ?? "forest_slate";
}
