/**
 * FSL Validator (Section 8 domain responsibilities).
 * ----------------------------------------------------------------------
 * Pure, deterministic, never mutates its input, never calls an AI
 * provider. Given a fully-assembled FSL candidate document, decides:
 *   - errors: hard failures that must turn the whole request into an
 *     `error` API response (bad enum values, out-of-bounds dimensions,
 *     unknown component types).
 *   - warnings: semantic concerns that never block a response.
 *   - compatibility: whether `/builder` can render this document today,
 *     and which fields it would have to drop or approximate if not.
 *
 * FurnitureBrain also pre-checks explicit user-given dimensions before
 * they ever reach here (Section 13: "invalid values create errors" must
 * happen the moment we know a number is invalid, not after silently
 * building a whole document around it) — this module is both that engine
 * AND the defense-in-depth check run again on the assembled candidate, so
 * a bug in the brain can't let a broken document slip through unvalidated.
 */
import { FSL_VERSION, FURNITURE_TYPES, COMPONENT_TYPES, MATERIAL_TYPES } from "./enums.js";
import { ERROR_CODES } from "./errors.js";
import { getCategoryKnowledge, isConfiguratorSupportedType, componentSupport, isComponentConfiguratorSupported } from "../furniture-knowledge/index.js";

function dimensionError(field, value, rule) {
  return {
    code: ERROR_CODES.INVALID_DIMENSION,
    field,
    message: `${field} must be a positive number between ${rule.min}mm and ${rule.max}mm.`,
    details: { received: value, minimum: rule.min, maximum: rule.max },
  };
}

/** Structural + range check for one dimension value. Returns an error object, or null if fine (including null/absent values — that's missing_information's job, not the validator's). */
export function checkDimension(axis, value, dimensionRules) {
  if (value === null || value === undefined) return null;
  const rule = dimensionRules?.[axis];
  if (!rule) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n < rule.min || n > rule.max) {
    return dimensionError(`dimensions.${axis}`, value, rule);
  }
  return null;
}

function validateComponents(components, knowledge) {
  const errors = [];
  const warnings = [];
  (components || []).forEach((c, i) => {
    const field = `components[${i}]`;
    if (!COMPONENT_TYPES.includes(c.type)) {
      errors.push({
        code: ERROR_CODES.INVALID_COMPONENT,
        field: `${field}.type`,
        message: `Unknown component type "${c.type}".`,
        details: { received: c.type, allowed: COMPONENT_TYPES },
      });
      return;
    }
    if (!Number.isInteger(c.quantity) || c.quantity < 1) {
      errors.push({
        code: ERROR_CODES.INVALID_COMPONENT,
        field: `${field}.quantity`,
        message: `Component "${c.type}" must have a positive integer quantity.`,
        details: { received: c.quantity },
      });
      return;
    }
    if (Array.isArray(knowledge?.allowedComponents) && !knowledge.allowedComponents.includes(c.type)) {
      warnings.push({
        code: "ATYPICAL_COMPONENT_FOR_CATEGORY",
        field: `${field}.type`,
        message: `"${c.type}" is not a typical component for ${knowledge.furnitureType} — kept, but double-check the request.`,
        severity: "info",
      });
    }
  });
  return { errors, warnings };
}

function validateMaterials(materials) {
  const errors = [];
  for (const key of ["body", "facades", "back_panel"]) {
    const spec = materials?.[key];
    if (spec && spec.material && !MATERIAL_TYPES.includes(spec.material)) {
      errors.push({
        code: ERROR_CODES.INVALID_FSL,
        field: `materials.${key}.material`,
        message: `Unknown material "${spec.material}".`,
        details: { received: spec.material, allowed: MATERIAL_TYPES },
      });
    }
  }
  return errors;
}

function computeCompatibility(fsl) {
  const unsupported_fields = [];
  const typeSupported = isConfiguratorSupportedType(fsl.project?.furniture_type);
  if (!typeSupported) {
    unsupported_fields.push({
      field: "project.furniture_type",
      code: ERROR_CODES.UNSUPPORTED_CONFIGURATOR_FEATURE,
      message: `"${fsl.project?.furniture_type}" has no configurator mapping yet — this stays a concept-only document.`,
    });
  }
  for (const c of fsl.components || []) {
    if (!isComponentConfiguratorSupported(c.type)) {
      unsupported_fields.push({
        field: `components[${c.id}]`,
        code: ERROR_CODES.UNSUPPORTED_CONFIGURATOR_FEATURE,
        message: `"${c.type}": ${componentSupport(c.type).note}`,
      });
    }
  }
  return { compatible: typeSupported && unsupported_fields.length === 0, unsupported_fields };
}

/**
 * @param {object} fsl an FSL v1 candidate document
 * @param {{ target?: string }} [opts]
 * @returns {{ errors: object[], warnings: object[], compatibility: { compatible: boolean, unsupported_fields: object[] } }}
 */
export function validateFsl(fsl, { target = "concept" } = {}) {
  const errors = [];
  let warnings = [];

  if (fsl.fsl_version !== FSL_VERSION) {
    errors.push({
      code: ERROR_CODES.INVALID_FSL,
      field: "fsl_version",
      message: `Unsupported fsl_version "${fsl.fsl_version}" — expected "${FSL_VERSION}".`,
      details: { received: fsl.fsl_version, expected: FSL_VERSION },
    });
  }

  const furnitureType = fsl.project?.furniture_type;
  if (!FURNITURE_TYPES.includes(furnitureType)) {
    errors.push({
      code: ERROR_CODES.UNSUPPORTED_FURNITURE_TYPE,
      field: "project.furniture_type",
      message: `Unknown furniture_type "${furnitureType}".`,
      details: { received: furnitureType, allowed: FURNITURE_TYPES },
    });
    // Nothing category-specific can be checked without a known type.
    return { errors, warnings, compatibility: { compatible: false, unsupported_fields: [] } };
  }

  const knowledge = getCategoryKnowledge(furnitureType);
  for (const axis of ["width_mm", "height_mm", "depth_mm"]) {
    const err = checkDimension(axis, fsl.dimensions?.[axis], knowledge.dimensionRules);
    if (err) errors.push(err);
  }

  const componentResult = validateComponents(fsl.components, knowledge);
  errors.push(...componentResult.errors);
  warnings.push(...componentResult.warnings);

  errors.push(...validateMaterials(fsl.materials));

  if (errors.length === 0) {
    warnings.push(...knowledge.semanticWarnings({ dimensions: fsl.dimensions, components: fsl.components }));
  }

  const compatibility = computeCompatibility(fsl);
  return { errors, warnings, compatibility };
}
