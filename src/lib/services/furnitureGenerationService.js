/**
 * FurnitureGenerationService (Section 4) — the use-case coordinator.
 * ----------------------------------------------------------------------
 * Everything transport-shaped (HTTP status, request parsing) lives in the
 * API route. Everything furniture-shaped (extraction, defaults, rules)
 * lives in FurnitureBrain / the knowledge layer / the validator. This file
 * is the thin glue between them plus the configurator adapter, and the
 * one place `status` (needs_clarification / ready / draft /
 * partially_supported) gets decided from their combined output.
 */
import { interpretFurnitureRequest } from "../furniture-brain/index.js";
import { validateFsl } from "../fsl/validator.js";
import { FSL_STATUS, GENERATION_TARGETS } from "../fsl/enums.js";
import { FslError, httpStatusForCode } from "../fsl/errors.js";
import { fslToFurnitureConfig } from "../configurator-adapter/adapter.js";

function newRequestId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function log(event, fields = {}) {
  // Structured, secret-free logging (Section 22). Swap for the project's
  // real logger if one is introduced later — this is the only call site.
  console.log(JSON.stringify({ event, ...fields, at: new Date().toISOString() }));
}

function computeStatus({ hasRequiredMissingInfo, compatible, target }) {
  if (hasRequiredMissingInfo) return FSL_STATUS.NEEDS_CLARIFICATION;
  if (!compatible) return FSL_STATUS.PARTIALLY_SUPPORTED;
  return target === GENERATION_TARGETS.CONFIGURATOR ? FSL_STATUS.READY : FSL_STATUS.DRAFT;
}

/**
 * @param {{ message: string, conversation_id?: string|null, project_id?: string|null, options: object, attachments?: Array<{kind: string, mediaType: string, data: string}> }} request already route-validated
 * @param {{ aiProvider: object }} deps
 * @returns {Promise<{ httpStatus: number, body: object }>} never throws for expected furniture-domain problems — only for genuine bugs
 */
export async function generateFurnitureSpecification(request, { aiProvider }) {
  const requestId = newRequestId();
  const { message, conversation_id = null, project_id = null, options = {}, attachments = [] } = request;
  const target = options.target === GENERATION_TARGETS.CONFIGURATOR ? GENERATION_TARGETS.CONFIGURATOR : GENERATION_TARGETS.CONCEPT;
  const includeExplanation = options.include_explanation !== false;

  log("furniture_generation_request_received", {
    requestId,
    target,
    allowDefaults: options.allow_defaults !== false,
    attachmentCount: attachments.length,
    attachmentKinds: attachments.map((a) => a.kind),
  });

  let fsl, interpretation;
  try {
    const started = Date.now();
    ({ fsl, interpretation } = await interpretFurnitureRequest({ message, options, attachments }, { aiProvider }));
    log("furniture_brain_completed", { requestId, furnitureType: fsl.project.furniture_type, durationMs: Date.now() - started });
  } catch (err) {
    if (err instanceof FslError) {
      log("furniture_generation_failed", { requestId, code: err.code });
      return { httpStatus: err.httpStatus, body: { request_id: requestId, status: "error", data: null, errors: [err.toJSON()] } };
    }
    throw err;
  }

  if (conversation_id || project_id) {
    fsl.metadata = { ...fsl.metadata, conversation_id, project_id };
  }

  const validation = validateFsl(fsl, { target });
  if (validation.errors.length > 0) {
    log("fsl_validation_failed", { requestId, errorCodes: validation.errors.map((e) => e.code) });
    return {
      httpStatus: httpStatusForCode(validation.errors[0].code),
      body: { request_id: requestId, status: "error", data: null, errors: validation.errors },
    };
  }

  const adapterResult = fslToFurnitureConfig(fsl);
  const hasRequiredMissingInfo = fsl.missing_information.some((m) => m.required);
  fsl.status = computeStatus({ hasRequiredMissingInfo, compatible: validation.compatibility.compatible, target });
  fsl.warnings = [...validation.warnings, ...adapterResult.warnings.map((message) => ({ code: "CONFIGURATOR_ADAPTER_NOTE", field: null, message, severity: "info" }))];

  log("furniture_generation_completed", {
    requestId,
    status: fsl.status,
    configuratorCompatible: validation.compatibility.compatible,
    missingInfoCount: fsl.missing_information.length,
  });

  const data = {
    fsl,
    configurator: {
      compatible: validation.compatibility.compatible,
      unsupported_fields: validation.compatibility.unsupported_fields,
      adapter_payload: adapterResult.attempted ? adapterResult.config : null,
    },
  };
  if (includeExplanation) data.interpretation = interpretation;

  return {
    httpStatus: 200,
    body: {
      request_id: requestId,
      status: fsl.status === FSL_STATUS.NEEDS_CLARIFICATION ? "needs_clarification" : "success",
      data,
      errors: [],
    },
  };
}
