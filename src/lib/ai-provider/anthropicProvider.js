/**
 * Real AI provider adapter — Claude via @anthropic-ai/sdk, same package and
 * hop-loop-free single-call pattern already proven in api/chat.js and
 * src/app/api/cad-lab/route.js. This is the ONLY file that imports the SDK
 * for the Furniture Generation API; FurnitureBrain talks to the small
 * `extractRequirements(message)` interface only, so swapping providers
 * later means writing one new file like this one, not touching the brain.
 *
 * Structured-output strategy (Section 19): force the single extraction
 * tool call (`tool_choice`), bound every call with a timeout, and allow
 * exactly one repair attempt before failing safely — never expose the
 * raw provider error or payload to the client.
 */
import Anthropic from "@anthropic-ai/sdk";
import { FslError, ERROR_CODES } from "../fsl/errors.js";
import { extractionToolSchema, EXTRACT_TOOL_NAME } from "./extractionSchema.js";
import { buildSystemPrompt } from "./promptTemplate.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_TIMEOUT_MS = 20000;

function emptyExtraction() {
  return {
    furniture_type: null,
    project_name: null,
    description: null,
    dimensions: { width_mm: null, height_mm: null, depth_mm: null },
    style: { theme: null, primary_color: null, secondary_color: null, finish: null, door_style: null, handle_style: null },
    materials: { body: null, facades: null, back_panel: null },
    components: [],
    features_mentioned: [],
    explicit_fields: [],
    ambiguities: [],
  };
}

/** Guarantee shape even if the model omits optional nested objects — never trust one layer alone. */
function normalizeExtraction(raw) {
  const base = emptyExtraction();
  return {
    ...base,
    ...raw,
    dimensions: { ...base.dimensions, ...(raw.dimensions || {}) },
    style: { ...base.style, ...(raw.style || {}) },
    materials: { ...base.materials, ...(raw.materials || {}) },
    components: Array.isArray(raw.components) ? raw.components : [],
    features_mentioned: Array.isArray(raw.features_mentioned) ? raw.features_mentioned : [],
    explicit_fields: Array.isArray(raw.explicit_fields) ? raw.explicit_fields : [],
    ambiguities: Array.isArray(raw.ambiguities) ? raw.ambiguities : [],
  };
}

function extractToolInput(resp) {
  const block = resp?.content?.find((b) => b.type === "tool_use" && b.name === EXTRACT_TOOL_NAME);
  if (!block || typeof block.input !== "object" || block.input === null) return null;
  return block.input;
}

/**
 * @param {{ apiKey?: string, model?: string, timeoutMs?: number }} [config]
 * @returns {{ extractRequirements: (message: string) => Promise<object> }}
 */
export function createAnthropicProvider({ apiKey = process.env.ANTHROPIC_API_KEY, model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!apiKey) {
    throw new FslError(ERROR_CODES.AI_PROVIDER_ERROR, "ANTHROPIC_API_KEY is not configured on the server.");
  }
  const anthropic = new Anthropic({ apiKey });

  async function callOnce(userContent) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await anthropic.messages.create(
        {
          model,
          max_tokens: 1024,
          system: buildSystemPrompt(),
          tools: [extractionToolSchema()],
          tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
          messages: [{ role: "user", content: userContent }],
        },
        { signal: controller.signal }
      );
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new FslError(ERROR_CODES.AI_PROVIDER_TIMEOUT, "The AI provider did not respond in time.");
      }
      throw new FslError(ERROR_CODES.AI_PROVIDER_ERROR, "The AI provider request failed.");
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async extractRequirements(message) {
      let resp = await callOnce(message);
      let input = extractToolInput(resp);

      if (!input) {
        // Section 19: "strict repair attempt with a maximum retry limit" — exactly one.
        resp = await callOnce(
          `${message}\n\n[system: your previous reply did not include a valid ${EXTRACT_TOOL_NAME} tool call with well-formed arguments — call the tool again with valid arguments and nothing else]`
        );
        input = extractToolInput(resp);
      }

      if (!input) {
        throw new FslError(ERROR_CODES.STRUCTURED_OUTPUT_ERROR, "The AI provider did not return a valid structured response.");
      }
      return normalizeExtraction(input);
    },
  };
}
