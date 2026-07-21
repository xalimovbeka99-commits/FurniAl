/**
 * The AI's ONLY job is natural-language extraction — never assembling the
 * final FSL document itself (Section 20: "the LLM proposes, the
 * application validates and decides"). This schema is intentionally
 * narrower than FSL: it separates what the model is CONFIDENT the user
 * said explicitly (`explicit_fields`) from values it is guessing, and
 * FurnitureBrain — deterministic code — is what turns that into a full
 * document, applies knowledge-base defaults, and records assumptions.
 *
 * Every enum here is imported from the same source the validator checks
 * against, so the model is structurally incapable of using a value the
 * validator would later reject.
 */
import { FURNITURE_TYPES, COMPONENT_TYPES, THEMES, MATERIAL_TYPES } from "../fsl/enums.js";

export const EXTRACT_TOOL_NAME = "extract_furniture_requirements";

export function extractionToolSchema() {
  return {
    name: EXTRACT_TOOL_NAME,
    description:
      "Record what the user explicitly stated about a piece of furniture they want designed. Only fill in a field when you are confident the user actually said it (or something that clearly implies it) — leave anything else null and do not list its path in explicit_fields. Never guess a specific number or enum value just to fill the schema.",
    input_schema: {
      type: "object",
      properties: {
        furniture_type: { type: ["string", "null"], enum: [...FURNITURE_TYPES, null], description: "Best-matching supported category, or null if genuinely unclear." },
        project_name: { type: ["string", "null"] },
        description: { type: ["string", "null"], description: "One sentence describing the concept in the user's own terms." },
        dimensions: {
          type: "object",
          properties: {
            width_mm: { type: ["number", "null"] },
            height_mm: { type: ["number", "null"] },
            depth_mm: { type: ["number", "null"] },
          },
        },
        style: {
          type: "object",
          properties: {
            theme: { type: ["string", "null"], enum: [...THEMES, null] },
            primary_color: { type: ["string", "null"] },
            secondary_color: { type: ["string", "null"] },
            finish: { type: ["string", "null"] },
            door_style: { type: ["string", "null"] },
            handle_style: { type: ["string", "null"] },
          },
        },
        materials: {
          type: "object",
          description: "Substrate material per part, only if the user specified one.",
          properties: {
            body: { type: ["string", "null"], enum: [...MATERIAL_TYPES, null] },
            facades: { type: ["string", "null"], enum: [...MATERIAL_TYPES, null] },
            back_panel: { type: ["string", "null"], enum: [...MATERIAL_TYPES, null] },
          },
        },
        components: {
          type: "array",
          description: "Only components the user explicitly asked for (doors, drawers, shelves, rails, LEDs, etc.) with the quantity they gave.",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: COMPONENT_TYPES },
              quantity: { type: ["number", "null"] },
              properties: { type: "object" },
            },
            required: ["type"],
          },
        },
        features_mentioned: { type: "array", items: { type: "string" } },
        explicit_fields: {
          type: "array",
          items: { type: "string" },
          description: "Dotted paths (e.g. 'dimensions.width_mm', 'style.primary_color') for every field above that the user actually stated explicitly.",
        },
        ambiguities: { type: "array", items: { type: "string" }, description: "Anything unclear worth asking the user about." },
      },
      required: ["furniture_type", "dimensions", "components", "explicit_fields"],
    },
  };
}
