/**
 * Example FSL v1 documents — used by tests and referenced in docs/fsl-v1.md
 * so the documentation's examples can never quietly drift out of sync with
 * a document the validator actually accepts.
 */
import { FSL_VERSION } from "./enums.js";

/** The Section 3 "modern white wardrobe" primary user story, fully specified. */
export function completeWardrobeFsl() {
  return {
    fsl_version: FSL_VERSION,
    project: {
      name: "Modern White Wardrobe",
      furniture_type: "wardrobe",
      subtype: null,
      description: "Modern four-door wardrobe with drawers, shelves, hanging rails and internal LED lighting",
    },
    dimensions: { width_mm: 2400, height_mm: 2600, depth_mm: 600 },
    style: {
      theme: "modern",
      primary_color: "white",
      secondary_color: null,
      finish: "matte",
      door_style: "flat_panel",
      handle_style: "minimal",
    },
    materials: {
      body: { material: "mdf", thickness_mm: 18, finish: "white_matte" },
      facades: { material: "mdf", thickness_mm: 18, finish: "white_matte" },
      back_panel: { material: "hdf", thickness_mm: 6, finish: "white" },
    },
    layout: { section_count: 4, configuration: "linear" },
    components: [
      { id: "door-1", type: "hinged_door", quantity: 4, position: null, dimensions: null, material_ref: "facades", properties: { opening_direction: "auto", soft_close: true } },
      { id: "drawer-group-1", type: "drawer", quantity: 6, position: null, dimensions: null, material_ref: "facades", properties: { soft_close: true } },
      { id: "shelf-group-1", type: "shelf", quantity: 8, position: null, dimensions: null, material_ref: "body", properties: { adjustable: true } },
      { id: "rail-group-1", type: "hanging_rail", quantity: 2, position: null, dimensions: null, material_ref: null, properties: {} },
      { id: "lighting-1", type: "internal_led", quantity: 1, position: null, dimensions: null, material_ref: null, properties: { activation: "door_sensor" } },
    ],
    appliances: [],
    features: ["soft_close", "internal_led"],
    views: ["front", "side", "top", "isometric"],
    assumptions: [],
    warnings: [],
    missing_information: [],
    metadata: {},
    status: "ready",
  };
}

/** Section 7 — a wardrobe request where critical dimensions were withheld. */
export function needsClarificationWardrobeFsl() {
  return {
    fsl_version: FSL_VERSION,
    project: { name: "Wardrobe", furniture_type: "wardrobe", subtype: null, description: "A wardrobe was requested without dimensions." },
    dimensions: { width_mm: null, height_mm: null, depth_mm: null },
    style: { theme: null, primary_color: null, secondary_color: null, finish: null, door_style: null, handle_style: null },
    materials: { body: null, facades: null, back_panel: null },
    layout: { section_count: null, configuration: null },
    components: [],
    appliances: [],
    features: [],
    views: ["front", "side", "top", "isometric"],
    assumptions: [],
    warnings: [],
    missing_information: [
      { field: "dimensions.width_mm", question: "What should the wardrobe width be?", required: true },
      { field: "dimensions.height_mm", question: "What should the wardrobe height be?", required: true },
      { field: "dimensions.depth_mm", question: "What should the wardrobe depth be?", required: true },
    ],
    metadata: {},
    status: "needs_clarification",
  };
}
