/**
 * FSL v1 — document factory.
 * ----------------------------------------------------------------------
 * Plain-object factories for the FSL root and its sub-objects (Section 10).
 * This is the JS equivalent of the Pydantic models the prompt describes:
 * no runtime type system exists in this repo (no TypeScript, no Pydantic),
 * so schema.js defines SHAPE (what a well-formed document looks like) and
 * validator.js defines CORRECTNESS (whether a given document satisfies it).
 *
 * Millimetres everywhere. Nothing here calls an AI provider or touches the
 * configurator — this module only knows how to construct and stamp
 * plain FSL objects.
 */
import { FSL_VERSION, FSL_STATUS } from "./enums.js";

let idCounter = 0;
/** Deterministic-enough, collision-safe id for components within one document. */
export function nextComponentId(type, ordinal) {
  idCounter += 1;
  return `${type}-${ordinal ?? idCounter}`;
}

export function createProject({ name = "Untitled Concept", furniture_type, subtype = null, description = "" } = {}) {
  return { name, furniture_type, subtype, description };
}

export function createDimensions({ width_mm = null, height_mm = null, depth_mm = null } = {}) {
  return { width_mm, height_mm, depth_mm };
}

export function createStyle({
  theme = null,
  primary_color = null,
  secondary_color = null,
  finish = null,
  door_style = null,
  handle_style = null,
} = {}) {
  return { theme, primary_color, secondary_color, finish, door_style, handle_style };
}

export function createMaterialSpec({ material = "unknown", thickness_mm = null, finish = null } = {}) {
  return { material, thickness_mm, finish };
}

export function createMaterials({ body = null, facades = null, back_panel = null } = {}) {
  return { body, facades, back_panel };
}

export function createComponent({ id, type, quantity = 1, position = null, dimensions = null, material_ref = null, properties = {} }) {
  return { id, type, quantity, position, dimensions, material_ref, properties };
}

/** One entry in `assumptions[]` — every default the system applies must produce one of these. */
export function createAssumption({ field, value, reason, confidence = "high", requires_confirmation = true }) {
  return { field, value, reason, confidence, requires_confirmation };
}

/** One entry in `warnings[]` — never blocks the request, only informs. */
export function createWarning({ code, field, message, severity = "warning" }) {
  return { code, field, message, severity };
}

/** One entry in `missing_information[]` — critical facts the system refused to guess. */
export function createMissingInfo({ field, question, required = true }) {
  return { field, question, required };
}

/** A fresh, empty FSL v1 document matching the Section 10 root structure. */
export function createEmptyFsl() {
  return {
    fsl_version: FSL_VERSION,
    project: createProject({ furniture_type: null }),
    dimensions: createDimensions(),
    style: createStyle(),
    materials: createMaterials(),
    layout: { section_count: null, configuration: null },
    components: [],
    appliances: [],
    features: [],
    views: [],
    assumptions: [],
    warnings: [],
    missing_information: [],
    metadata: {},
    status: FSL_STATUS.DRAFT,
  };
}
