/**
 * Furniture knowledge — WARDROBE (Section 18: the one "robust" v1 category).
 * ----------------------------------------------------------------------
 * Every number here is a CONFIGURABLE APPLICATION RULE for FurniAI's
 * concept stage — not a building code, a manufacturing standard, or a
 * hinge-hardware spec. Tune freely; nothing outside this file needs to
 * change when you do (validator.js and furnitureBrain.js only ever read
 * through this module's exported functions).
 */
import { GENERATION_TARGETS } from "../fsl/enums.js";

export const FURNITURE_TYPE = "wardrobe";

/**
 * min/max = structurally impossible outside this range (hard error).
 * standardMin/standardMax = still valid, but unusual enough to warn about.
 * default = applied when allow_defaults is true and the user didn't say.
 */
export const DIMENSION_RULES = Object.freeze({
  width_mm: { min: 300, max: 6000, standardMin: 600, standardMax: 3600, default: 2400 },
  height_mm: { min: 600, max: 3200, standardMin: 1800, standardMax: 2800, default: 2400 },
  depth_mm: {
    min: 250,
    max: 900,
    standardMin: 500,
    standardMax: 700,
    default: 600,
    hangingClearanceMin: 550,
  },
});

export const DEFAULT_MATERIALS = Object.freeze({
  body: { material: "mdf", thickness_mm: 18, finish: "white_matte" },
  facades: { material: "mdf", thickness_mm: 18, finish: "white_matte" },
  back_panel: { material: "hdf", thickness_mm: 6, finish: "white" },
});

export const DEFAULT_STYLE = Object.freeze({
  theme: "modern",
  primary_color: "white",
  secondary_color: null,
  finish: "matte",
  door_style: "flat_panel",
  handle_style: "minimal",
});

/** Components a wardrobe concept may legitimately contain. */
export const ALLOWED_COMPONENTS = Object.freeze([
  "side_panel",
  "top_panel",
  "bottom_panel",
  "back_panel",
  "divider",
  "shelf",
  "hinged_door",
  "sliding_door",
  "drawer",
  "hanging_rail",
  "handle",
  "mirror",
  "internal_led",
  "plinth",
  "end_panel",
  "filler_panel",
]);

export const COMPONENT_RULES = Object.freeze({
  door: { minWidthMm: 350, maxWidthMm: 700 },
  maxDrawersPerColumn: 6,
});

export function isStandardDimension(axis, valueMm) {
  const rule = DIMENSION_RULES[axis];
  if (!rule) return true;
  return valueMm >= rule.standardMin && valueMm <= rule.standardMax;
}

export function isStructurallyValidDimension(axis, valueMm) {
  const rule = DIMENSION_RULES[axis];
  if (!rule) return true;
  return Number.isFinite(valueMm) && valueMm >= rule.min && valueMm <= rule.max;
}

export function defaultDimensionMm(axis) {
  return DIMENSION_RULES[axis]?.default ?? null;
}

/**
 * Wardrobe-specific semantic warnings beyond plain range checks — depth vs
 * hanging clearance, door width vs hinge-friendly range. Returns
 * `createWarning`-shaped plain objects (kept dependency-free here; the
 * validator wraps them).
 */
export function semanticWarnings({ dimensions, components = [] }) {
  const warnings = [];
  const depth = dimensions?.depth_mm;
  if (Number.isFinite(depth) && depth < DIMENSION_RULES.depth_mm.hangingClearanceMin) {
    warnings.push({
      code: "UNUSUAL_WARDROBE_DEPTH",
      field: "dimensions.depth_mm",
      message: "The requested depth may not provide enough hanging clearance for standard hangers.",
      severity: "warning",
    });
  }

  const width = dimensions?.width_mm;
  const doorComponents = components.filter((c) => c.type === "hinged_door" || c.type === "sliding_door");
  const totalDoors = doorComponents.reduce((sum, c) => sum + (c.quantity || 0), 0);
  if (Number.isFinite(width) && totalDoors > 0) {
    const perDoorWidth = width / totalDoors;
    if (perDoorWidth > COMPONENT_RULES.door.maxWidthMm) {
      warnings.push({
        code: "DOOR_WIDTH_TOO_WIDE",
        field: "components",
        message: `At ${totalDoors} door(s) across ${width}mm, each door would be ~${Math.round(perDoorWidth)}mm — wider than the recommended ${COMPONENT_RULES.door.maxWidthMm}mm hinge-friendly maximum. Consider more doors.`,
        severity: "warning",
      });
    } else if (perDoorWidth < COMPONENT_RULES.door.minWidthMm) {
      warnings.push({
        code: "DOOR_WIDTH_TOO_NARROW",
        field: "components",
        message: `At ${totalDoors} door(s) across ${width}mm, each door would be ~${Math.round(perDoorWidth)}mm — narrower than the recommended ${COMPONENT_RULES.door.minWidthMm}mm minimum. Consider fewer doors.`,
        severity: "warning",
      });
    }
  }

  return warnings;
}

/** Concept tolerates more; configurator target is held to the same rules today (kept explicit for future divergence). */
export function toleranceForTarget(target) {
  return target === GENERATION_TARGETS.CONFIGURATOR ? "strict" : "loose";
}

// --- Component defaults ---------------------------------------------------
// Simple, documented v1 placeholders (Section 18: "configurable application
// rules, not universal standards") — NOT a reverse-engineering of the
// prompt's illustrative example quantities (that example's shelf/rail
// counts imply a sizing formula the prompt never actually specifies).

const DEFAULT_QUANTITY_BY_TYPE = Object.freeze({
  shelf: 2,
  open_shelf: 2,
  hanging_rail: 1,
  internal_led: 1,
});

const DEFAULT_PROPERTIES_BY_TYPE = Object.freeze({
  hinged_door: { soft_close: true },
  sliding_door: { soft_close: true },
  drawer: { soft_close: true },
  internal_led: { activation: "door_sensor" },
  shelf: { adjustable: true },
  open_shelf: { adjustable: true },
});

const MATERIAL_REF_BY_TYPE = Object.freeze({
  hinged_door: "facades",
  sliding_door: "facades",
  drawer: "facades",
  handle: "facades",
  mirror: "facades",
  shelf: "body",
  open_shelf: "body",
  side_panel: "body",
  top_panel: "body",
  bottom_panel: "body",
  divider: "body",
  plinth: "body",
  end_panel: "body",
  filler_panel: "body",
  back_panel: "back_panel",
});

export function defaultComponentQuantity(type) {
  return DEFAULT_QUANTITY_BY_TYPE[type] ?? 1;
}

export function defaultComponentProperties(type) {
  return DEFAULT_PROPERTIES_BY_TYPE[type] ?? {};
}

export function defaultMaterialRefFor(type) {
  return MATERIAL_REF_BY_TYPE[type] ?? null;
}
