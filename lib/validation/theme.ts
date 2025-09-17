import { z } from "zod";

export const ThemeNameSchema = z.enum([
  "ember",
  "azure",
  "verdant",
  "amethyst",
]);
export type ThemeName = z.infer<typeof ThemeNameSchema>;

/**
 * Safely read a ThemeName from an arbitrary JSON-ish value.
 * Falls back to "ember" if missing/invalid.
 */
export function readThemeFromPreferences(prefs: unknown): ThemeName {
  if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
    const theme = (prefs as Record<string, unknown>).theme;
    const parsed = ThemeNameSchema.safeParse(theme);
    if (parsed.success) return parsed.data;
  }
  return "ember";
}
