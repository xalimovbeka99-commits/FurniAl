/**
 * Consolidated snapshot of what `/builder` can actually render today.
 * One function, read by the validator (compatibility warnings), the
 * adapter (unsupported_fields), and docs/fsl-v1.md's generation script —
 * so all three describe the exact same capabilities, never three
 * hand-copied lists that quietly drift apart.
 */
import { FURNITURE_TYPES as CONFIGURATOR_FURNITURE_TYPES, MATERIALS, HANDLE_STYLES, DOOR_TYPES, LED_LIGHTING } from "../knowledgeBase.js";
import { CONFIGURATOR_TYPE_MAP } from "./categories.js";
import { CONFIGURATOR_COMPONENT_SUPPORT } from "./components.js";

export function getConfiguratorCapabilities() {
  return {
    pipeline: "/builder (furnitureConfig.js + configSchema.js + buildGeometry.js)",
    supportedFurnitureTypes: Object.entries(CONFIGURATOR_TYPE_MAP)
      .filter(([, v]) => v && CONFIGURATOR_FURNITURE_TYPES[v])
      .map(([fslType]) => fslType),
    supportedMaterialKeys: Object.keys(MATERIALS),
    supportedHandleStyles: Object.keys(HANDLE_STYLES),
    supportedDoorTypes: Object.keys(DOOR_TYPES),
    supportedLedModes: Object.keys(LED_LIGHTING),
    componentSupport: CONFIGURATOR_COMPONENT_SUPPORT,
    limitations: [
      "Models exactly one rectangular carcass per request — no multi-cabinet runs (a 'kitchen' means one cabinet, not a fitted layout).",
      "One material, one door style, one handle style, one LED mode per whole piece — not per component.",
      "No hanging rails, drawer boxes, legs, countertops, or corner geometry.",
      "Sliding doors are accepted as data but rendered identically to hinged doors.",
    ],
  };
}
