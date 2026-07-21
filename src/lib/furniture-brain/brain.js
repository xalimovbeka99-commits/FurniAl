/**
 * FurnitureBrain (Section 4) — provider-independent orchestration.
 * ----------------------------------------------------------------------
 * Turns an AI provider's narrow NL extraction into an FSL v1 candidate.
 * Deterministic, testable without a live API (inject any provider
 * satisfying `extractRequirements(message)`), and the ONLY place that
 * decides what counts as an assumption vs. missing information:
 *
 *   explicit + valid            -> goes straight into the document
 *   explicit + structurally bad -> hard error, immediately (Section 13)
 *   not given, defaults allowed -> knowledge-base default + assumption
 *   not given, defaults refused -> missing_information entry
 *
 * This module never imports an AI SDK and never decides HTTP concerns —
 * see furniture-generation-service.js for what wraps this.
 */
import { FURNITURE_TYPES, COMPONENT_TYPES, KNOWN_FEATURES, DEFAULT_VIEWS } from "../fsl/enums.js";
import { createEmptyFsl, createProject, createAssumption, createMissingInfo, createMaterialSpec, createComponent } from "../fsl/schema.js";
import { checkDimension } from "../fsl/validator.js";
import { FslError, ERROR_CODES } from "../fsl/errors.js";
import { getCategoryKnowledge } from "../furniture-knowledge/index.js";

const AXIS_LABEL = { width_mm: "Width", height_mm: "Height", depth_mm: "Depth" };
const STYLE_FIELDS = ["theme", "primary_color", "secondary_color", "finish", "door_style", "handle_style"];
const MATERIAL_KEYS = ["body", "facades", "back_panel"];

function humanize(type) {
  return String(type).replace(/_/g, " ");
}

function mergeDimensions({ extraction, explicit, knowledge, allowDefaults, assumptions, missingInformation, explicitRequirements, defaultsApplied }) {
  const dimensions = { width_mm: null, height_mm: null, depth_mm: null };
  for (const axis of ["width_mm", "height_mm", "depth_mm"]) {
    const path = `dimensions.${axis}`;
    const value = extraction.dimensions?.[axis];

    if (explicit.has(path) && value != null) {
      if (knowledge) {
        const err = checkDimension(axis, value, knowledge.dimensionRules);
        if (err) throw new FslError(err.code, err.message, { field: err.field, details: err.details });
      }
      dimensions[axis] = value;
      explicitRequirements.push(`${AXIS_LABEL[axis]}: ${value}mm`);
      continue;
    }

    if (!knowledge) continue; // no category yet — nothing sensible to default or require

    if (allowDefaults) {
      const def = knowledge.dimensionRules[axis]?.default ?? null;
      dimensions[axis] = def;
      if (def != null) {
        assumptions.push(
          createAssumption({
            field: path,
            value: def,
            reason: `No ${AXIS_LABEL[axis].toLowerCase()} was given — applied the concept default for ${knowledge.furnitureType}.`,
            confidence: "medium",
          })
        );
        defaultsApplied.push(`${AXIS_LABEL[axis]}: ${def}mm (default)`);
      }
    } else {
      missingInformation.push(
        createMissingInfo({ field: path, question: `What should the ${humanize(knowledge.furnitureType)}'s ${AXIS_LABEL[axis].toLowerCase()} be?` })
      );
    }
  }
  return dimensions;
}

function mergeStyle({ extraction, explicit, knowledge, allowDefaults, assumptions, explicitRequirements, defaultsApplied }) {
  const style = { theme: null, primary_color: null, secondary_color: null, finish: null, door_style: null, handle_style: null };
  for (const field of STYLE_FIELDS) {
    const path = `style.${field}`;
    const value = extraction.style?.[field];
    if (explicit.has(path) && value != null) {
      style[field] = value;
      explicitRequirements.push(`Style ${field.replace(/_/g, " ")}: ${value}`);
    } else if (knowledge && allowDefaults) {
      const def = knowledge.defaultStyle?.[field] ?? null;
      if (def != null) {
        style[field] = def;
        assumptions.push(createAssumption({ field: path, value: def, reason: `No ${field.replace(/_/g, " ")} was given — applied the concept default.`, confidence: "low" }));
        defaultsApplied.push(`Style ${field.replace(/_/g, " ")}: ${def} (default)`);
      }
    }
    // Style is never treated as blocking — no missing_information entry when allowDefaults is false.
  }
  return style;
}

function composeFinish(color, sheen, fallback) {
  if (color && sheen) return `${color}_${sheen}`;
  if (color) return color;
  return fallback;
}

function mergeMaterials({ extraction, explicit, knowledge, allowDefaults, style, assumptions, explicitRequirements, defaultsApplied }) {
  const materials = { body: null, facades: null, back_panel: null };
  if (!knowledge) return materials;

  for (const key of MATERIAL_KEYS) {
    const path = `materials.${key}`;
    const explicitValue = extraction.materials?.[key];
    const knowledgeDefault = knowledge.defaultMaterials?.[key];

    if (explicit.has(path) && explicitValue) {
      materials[key] = createMaterialSpec({
        material: explicitValue,
        thickness_mm: knowledgeDefault?.thickness_mm ?? null,
        finish: key === "back_panel" ? composeFinish(style.primary_color, null, knowledgeDefault?.finish) : composeFinish(style.primary_color, style.finish, knowledgeDefault?.finish),
      });
      explicitRequirements.push(`${key.replace(/_/g, " ")} material: ${explicitValue}`);
    } else if (allowDefaults && knowledgeDefault) {
      const finish = key === "back_panel" ? composeFinish(style.primary_color, null, knowledgeDefault.finish) : composeFinish(style.primary_color, style.finish, knowledgeDefault.finish);
      materials[key] = createMaterialSpec({ material: knowledgeDefault.material, thickness_mm: knowledgeDefault.thickness_mm, finish });
      assumptions.push(createAssumption({ field: `${path}.material`, value: knowledgeDefault.material, reason: `No ${key.replace(/_/g, " ")} material was given — applied the concept default.`, confidence: "medium" }));
      defaultsApplied.push(`${key.replace(/_/g, " ")} material: ${knowledgeDefault.material} (default)`);
    }
  }
  return materials;
}

function mergeComponents({ extraction, knowledge, allowDefaults, assumptions, missingInformation, explicitRequirements }) {
  const components = [];
  const ordinals = {};
  for (const raw of extraction.components || []) {
    if (!COMPONENT_TYPES.includes(raw.type)) continue; // unknown vocab never survives into the candidate
    ordinals[raw.type] = (ordinals[raw.type] || 0) + 1;
    const id = `${raw.type.replace(/_/g, "-")}-${ordinals[raw.type]}`;

    let quantity = Number.isFinite(raw.quantity) ? raw.quantity : null;
    if (quantity != null) {
      explicitRequirements.push(`${quantity} × ${humanize(raw.type)}`);
    } else if (allowDefaults) {
      quantity = knowledge ? knowledge.defaultComponentQuantity(raw.type) : 1;
      assumptions.push(
        createAssumption({
          field: `components.${id}.quantity`,
          value: quantity,
          reason: `"${humanize(raw.type)}" was requested without a count — applied a default quantity.`,
          confidence: "low",
        })
      );
    } else {
      quantity = 1;
      missingInformation.push(createMissingInfo({ field: `components.${id}.quantity`, question: `How many ${humanize(raw.type)}(s) would you like?`, required: false }));
    }

    const properties = { ...(raw.properties || {}) };
    const defaults = knowledge ? knowledge.defaultComponentProperties(raw.type) : {};
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in properties)) {
        if (allowDefaults) {
          properties[key] = value;
          assumptions.push(
            createAssumption({
              field: `components.${id}.properties.${key}`,
              value,
              reason: `Applied the documented default for ${humanize(raw.type)}.`,
              confidence: "high",
            })
          );
        }
      }
    }

    components.push(
      createComponent({
        id,
        type: raw.type,
        quantity,
        material_ref: knowledge ? knowledge.defaultMaterialRefFor(raw.type) : null,
        properties,
      })
    );
  }
  return components;
}

function deriveFeatures(components, extraction) {
  const features = new Set();
  for (const c of components) {
    if (c.properties?.soft_close) features.add("soft_close");
    if (c.type === "internal_led") features.add("internal_led");
  }
  for (const f of extraction.features_mentioned || []) {
    if (KNOWN_FEATURES.includes(f)) features.add(f);
  }
  return [...features];
}

function buildSummary({ furnitureType, explicitRequirements, missingInformation }) {
  if (!furnitureType) return "The request could not be matched to a supported furniture type yet.";
  const required = missingInformation.filter((m) => m.required);
  if (required.length > 0) {
    return `A ${humanize(furnitureType)} was requested, but critical information is missing: ${required.map((m) => m.field).join(", ")}.`;
  }
  const noun = humanize(furnitureType);
  return explicitRequirements.length > 0
    ? `The request was interpreted as a ${noun} (${explicitRequirements.slice(0, 4).join("; ")}${explicitRequirements.length > 4 ? "; …" : ""}).`
    : `The request was interpreted as a ${noun} concept using standard defaults.`;
}

/**
 * @param {{ message: string, options: { allow_defaults?: boolean, target?: string }, attachments?: Array<{kind: string, mediaType: string, data: string}> }} request
 * @param {{ aiProvider: { extractRequirements: (message: string, attachments?: Array) => Promise<object> } }} deps
 * @returns {Promise<{ fsl: object, interpretation: object }>}
 */
export async function interpretFurnitureRequest({ message, options = {}, attachments = [] }, { aiProvider }) {
  const allowDefaults = options.allow_defaults !== false;

  const extraction = await aiProvider.extractRequirements(message, attachments);
  const explicit = new Set(Array.isArray(extraction.explicit_fields) ? extraction.explicit_fields : []);

  const assumptions = [];
  const missingInformation = [];
  const explicitRequirements = [];
  const defaultsApplied = [];

  let furnitureType = FURNITURE_TYPES.includes(extraction.furniture_type) ? extraction.furniture_type : null;
  if (furnitureType && explicit.has("furniture_type")) explicitRequirements.push(`Furniture type: ${furnitureType}`);
  if (!furnitureType) {
    missingInformation.push(
      createMissingInfo({ field: "project.furniture_type", question: `What type of furniture would you like? (e.g. ${FURNITURE_TYPES.slice(0, 4).join(", ")}, …)` })
    );
  }

  const knowledge = furnitureType ? getCategoryKnowledge(furnitureType) : null;

  const dimensions = mergeDimensions({ extraction, explicit, knowledge, allowDefaults, assumptions, missingInformation, explicitRequirements, defaultsApplied });
  const style = mergeStyle({ extraction, explicit, knowledge, allowDefaults, assumptions, explicitRequirements, defaultsApplied });
  const materials = mergeMaterials({ extraction, explicit, knowledge, allowDefaults, style, assumptions, explicitRequirements, defaultsApplied });
  const components = mergeComponents({ extraction, knowledge, allowDefaults, assumptions, missingInformation, explicitRequirements });
  const features = deriveFeatures(components, extraction);

  const doorLikeCount = components
    .filter((c) => c.type === "hinged_door" || c.type === "sliding_door")
    .reduce((sum, c) => sum + (c.quantity || 0), 0);

  const fsl = createEmptyFsl();
  fsl.project = createProject({
    name: extraction.project_name || (furnitureType ? `${style.theme ? `${style.theme[0].toUpperCase()}${style.theme.slice(1)} ` : ""}${humanize(furnitureType)}` : "Untitled Concept"),
    furniture_type: furnitureType,
    description: extraction.description || "",
  });
  fsl.dimensions = dimensions;
  fsl.style = style;
  fsl.materials = materials;
  fsl.layout = { section_count: doorLikeCount || null, configuration: doorLikeCount > 1 ? "linear" : null };
  fsl.components = components;
  fsl.appliances = [];
  fsl.features = features;
  fsl.views = [...DEFAULT_VIEWS];
  fsl.assumptions = assumptions;
  fsl.missing_information = missingInformation;
  fsl.metadata = {};

  return {
    fsl,
    interpretation: {
      summary: buildSummary({ furnitureType, explicitRequirements, missingInformation }),
      explicit_requirements: explicitRequirements,
      defaults_applied: defaultsApplied,
      clarifications_required: missingInformation.filter((m) => m.required).map((m) => m.question),
    },
  };
}
