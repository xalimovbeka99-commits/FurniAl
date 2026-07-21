/**
 * POST /api/v1/furniture/generate
 * ----------------------------------------------------------------------
 * The one HTTP entry point for the Furniture Generation API (Section 5).
 * This file does ONLY transport: parse, validate the request shape,
 * construct the real AI provider, call the service, map the result to an
 * HTTP response. No prompts, no furniture rules, no configurator logic —
 * see furnitureGenerationService.js / furniture-brain / fsl / configurator-adapter.
 *
 * Deliberately new and versioned, alongside (not replacing) api/chat.js
 * (live static-site agent) and src/app/api/cad-lab/route.js (the separate
 * tool-based CAD Lab experiment) — see docs/furniai-existing-system-analysis.md.
 */
import { NextResponse } from "next/server";
import { generateFurnitureSpecification } from "@/lib/services/furnitureGenerationService";
import { createAnthropicProvider } from "@/lib/ai-provider";
import { ERROR_CODES, FslError, httpStatusForCode } from "@/lib/fsl/errors";
import { GENERATION_TARGETS } from "@/lib/fsl/enums";

const MESSAGE_MIN_LENGTH = 3;
const MESSAGE_MAX_LENGTH = 4000;

function errorResponse(code, message, { field = null, details = null, requestId = null } = {}) {
  return NextResponse.json(
    { request_id: requestId, status: "error", data: null, errors: [{ code, field, message, details }] },
    { status: httpStatusForCode(code) }
  );
}

/** Route-level request-schema validation only (Section 5) — no furniture semantics here. */
function validateRequestBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: { code: ERROR_CODES.INVALID_REQUEST, message: "Request body must be a JSON object." } };
  }
  if (typeof body.message !== "string") {
    return { error: { code: ERROR_CODES.MISSING_REQUIRED_FIELD, message: "`message` is required and must be a string.", field: "message" } };
  }
  const message = body.message.trim();
  if (message.length === 0) {
    return { error: { code: ERROR_CODES.EMPTY_MESSAGE, message: "`message` must not be empty.", field: "message" } };
  }
  if (message.length < MESSAGE_MIN_LENGTH || message.length > MESSAGE_MAX_LENGTH) {
    return {
      error: {
        code: ERROR_CODES.INVALID_REQUEST,
        message: `\`message\` must be between ${MESSAGE_MIN_LENGTH} and ${MESSAGE_MAX_LENGTH} characters.`,
        field: "message",
        details: { received: message.length, minimum: MESSAGE_MIN_LENGTH, maximum: MESSAGE_MAX_LENGTH },
      },
    };
  }

  for (const idField of ["conversation_id", "project_id"]) {
    const v = body[idField];
    if (v !== undefined && v !== null && typeof v !== "string") {
      return { error: { code: ERROR_CODES.INVALID_REQUEST, message: `\`${idField}\` must be a string or null.`, field: idField } };
    }
  }

  const rawOptions = body.options && typeof body.options === "object" ? body.options : {};
  if (rawOptions.target !== undefined && !Object.values(GENERATION_TARGETS).includes(rawOptions.target)) {
    return {
      error: {
        code: ERROR_CODES.INVALID_REQUEST,
        message: `\`options.target\` must be one of: ${Object.values(GENERATION_TARGETS).join(", ")}.`,
        field: "options.target",
        details: { received: rawOptions.target },
      },
    };
  }

  return {
    request: {
      message,
      conversation_id: body.conversation_id ?? null,
      project_id: body.project_id ?? null,
      options: {
        allow_defaults: rawOptions.allow_defaults !== false,
        target: rawOptions.target === GENERATION_TARGETS.CONFIGURATOR ? GENERATION_TARGETS.CONFIGURATOR : GENERATION_TARGETS.CONCEPT,
        include_explanation: rawOptions.include_explanation !== false,
      },
    },
  };
}

export async function POST(req) {
  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse(ERROR_CODES.INVALID_REQUEST, "Request body must be valid JSON.");
  }

  const { request, error } = validateRequestBody(rawBody);
  if (error) {
    return errorResponse(error.code, error.message, { field: error.field, details: error.details });
  }

  let aiProvider;
  try {
    aiProvider = createAnthropicProvider();
  } catch (err) {
    if (err instanceof FslError) {
      return errorResponse(err.code, err.message);
    }
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "Furniture generation is not available right now.");
  }

  try {
    const { httpStatus, body } = await generateFurnitureSpecification(request, { aiProvider });
    return NextResponse.json(body, { status: httpStatus });
  } catch (err) {
    console.error("furniture generation route error:", err);
    return errorResponse(ERROR_CODES.INTERNAL_ERROR, "Something went wrong generating the furniture specification.");
  }
}
