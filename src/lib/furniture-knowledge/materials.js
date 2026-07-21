/**
 * Furniture knowledge — material vocabulary + configurator colour mapping.
 * ----------------------------------------------------------------------
 * FSL materials describe a SUBSTRATE (mdf/hdf/plywood/...) plus a free-text
 * finish/colour. `/builder`'s FurnitureConfig.material is a single colour
 * swatch key (oak/white/black/...) from knowledgeBase.js MATERIALS. These
 * are different axes of the same real object, so the adapter needs a
 * best-effort mapping from FSL's (primary_color, finish) onto the closest
 * swatch key — this is explicitly an approximation, never presented to the
 * user as a confirmed material match.
 */
import { MATERIALS as CONFIGURATOR_MATERIALS, DEFAULT_MATERIAL } from "../knowledgeBase.js";

const KEYWORD_TO_SWATCH = Object.freeze({
  white: "white",
  black: "black",
  beige: "beige",
  cream: "beige",
  graphite: "graphite",
  grey: "graphite",
  gray: "graphite",
  sage: "sage",
  green: "sage",
  navy: "navy",
  blue: "navy",
  concrete: "concrete",
  linen: "linen",
  oak: "oak",
  walnut: "walnut",
  mahogany: "mahogany",
  dark_wood: "dark_wood",
  "dark wood": "dark_wood",
});

/**
 * Best-effort match of an FSL colour/finish description onto a configurator
 * swatch key. Returns { key, matched } — `matched` is false when we fell
 * back to the default, so callers can record that as an assumption/warning
 * instead of silently pretending it was a confirmed match.
 */
export function pickConfiguratorMaterialKey({ primary_color, finish } = {}) {
  const haystack = `${primary_color || ""} ${finish || ""}`.toLowerCase();
  for (const [keyword, swatchKey] of Object.entries(KEYWORD_TO_SWATCH)) {
    if (haystack.includes(keyword) && CONFIGURATOR_MATERIALS[swatchKey]) {
      return { key: swatchKey, matched: true };
    }
  }
  return { key: DEFAULT_MATERIAL, matched: false };
}

export function isKnownConfiguratorMaterialKey(key) {
  return Boolean(CONFIGURATOR_MATERIALS[key]);
}
