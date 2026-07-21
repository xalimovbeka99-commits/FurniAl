/**
 * Furniture knowledge — category support map (Section 12 / 18).
 * ----------------------------------------------------------------------
 * Two DIFFERENT questions live in this file, and the prompt is explicit
 * they must never be conflated:
 *   1. Which furniture types does FSL v1 know how to describe at all?
 *      -> fsl/enums.js FURNITURE_TYPES (the language's vocabulary).
 *   2. Which of those can today's `/builder` configurator pipeline
 *      (furnitureConfig.js + buildGeometry.js) actually turn into a
 *      rendered model?
 *      -> CONFIGURATOR_TYPE_MAP below.
 *
 * `/builder` models a SINGLE rectangular carcass with vertical modules
 * (doors/drawers/shelves). It has no concept of a multi-cabinet run, so
 * kitchen/sideboard support here means "one cabinet carcass in that
 * style", not "a full fitted kitchen" — see docs/fsl-v1.md limitations.
 */
import { FURNITURE_TYPES as CONFIGURATOR_FURNITURE_TYPES } from "../knowledgeBase.js";

/** FSL furniture_type -> the existing FurnitureConfig `type` it maps onto, or null if unsupported today. */
export const CONFIGURATOR_TYPE_MAP = Object.freeze({
  wardrobe: "wardrobe",
  kitchen: "kitchen",
  bookcase: "shelves",
  office_cabinet: "office",
  sideboard: "cabinet",
  walk_in_closet: null,
  tv_unit: null,
  shoe_cabinet: null,
  bathroom_vanity: null,
  custom_cabinet: null,
});

export function isConfiguratorSupportedType(fslType) {
  return Boolean(CONFIGURATOR_TYPE_MAP[fslType] && CONFIGURATOR_FURNITURE_TYPES[CONFIGURATOR_TYPE_MAP[fslType]]);
}

export function configuratorTypeFor(fslType) {
  return CONFIGURATOR_TYPE_MAP[fslType] ?? null;
}
