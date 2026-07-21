/**
 * FSL v1 — controlled vocabularies.
 * ----------------------------------------------------------------------
 * Every enum a Furniture Specification Language document is allowed to use.
 * Nothing outside these lists may reach a validated FSL document — see
 * validator.js. Keeping the vocabulary in one file means adding a new
 * furniture type, component, material, or theme is a one-line change here
 * plus a knowledge-base entry, not a hunt through services and prompts.
 */

export const FSL_VERSION = "1.0";

export const FSL_STATUS = Object.freeze({
  DRAFT: "draft",
  NEEDS_CLARIFICATION: "needs_clarification",
  READY: "ready",
  INVALID: "invalid",
  PARTIALLY_SUPPORTED: "partially_supported",
});

export const GENERATION_TARGETS = Object.freeze({
  CONCEPT: "concept",
  CONFIGURATOR: "configurator",
});

/**
 * FSL-supported furniture types (Section 12). This is the full language
 * vocabulary — NOT the same as what the current configurator can render.
 * See furniture-knowledge/categories.js for that distinction.
 */
export const FURNITURE_TYPES = Object.freeze([
  "wardrobe",
  "kitchen",
  "walk_in_closet",
  "tv_unit",
  "shoe_cabinet",
  "bookcase",
  "office_cabinet",
  "bathroom_vanity",
  "sideboard",
  "custom_cabinet",
]);

/** Controlled component vocabulary (Section 14). */
export const COMPONENT_TYPES = Object.freeze([
  "side_panel",
  "top_panel",
  "bottom_panel",
  "back_panel",
  "shelf",
  "divider",
  "hinged_door",
  "sliding_door",
  "drawer",
  "drawer_box",
  "hanging_rail",
  "handle",
  "mirror",
  "internal_led",
  "plinth",
  "leg",
  "countertop",
  "base_cabinet",
  "wall_cabinet",
  "tall_cabinet",
  "corner_cabinet",
  "open_shelf",
  "end_panel",
  "filler_panel",
]);

/** Suggested style themes (Section 15). "custom" is the escape hatch. */
export const THEMES = Object.freeze([
  "modern",
  "minimal",
  "scandinavian",
  "classic",
  "industrial",
  "luxury",
  "contemporary",
  "traditional",
  "custom",
]);

/** Controlled material substrate vocabulary (Section 16). */
export const MATERIAL_TYPES = Object.freeze([
  "mdf",
  "hdf",
  "plywood",
  "particle_board",
  "solid_wood",
  "glass",
  "mirror",
  "metal",
  "stone",
  "laminate",
  "unknown",
  "custom",
]);

/** Small, extensible known-feature vocabulary used to populate `features[]`. */
export const KNOWN_FEATURES = Object.freeze([
  "soft_close",
  "internal_led",
  "handleless",
  "corner_unit",
  "height_adjustable_shelves",
  "mirror_door",
]);

/** Default view set every FSL document requests from the configurator. */
export const DEFAULT_VIEWS = Object.freeze(["front", "side", "top", "isometric"]);

export const ASSUMPTION_CONFIDENCE = Object.freeze(["high", "medium", "low"]);

export const WARNING_SEVERITY = Object.freeze(["info", "warning", "error"]);
