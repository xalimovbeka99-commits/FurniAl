/**
 * AI Provider Adapter — the replaceable boundary (Section 4).
 * ----------------------------------------------------------------------
 * FurnitureBrain depends only on this shape:
 *
 *   interface FurnitureAIProvider {
 *     extractRequirements(message: string): Promise<ExtractionResult>
 *   }
 *
 * ExtractionResult is defined by ./extractionSchema.js's tool schema, not
 * by FSL — see promptTemplate.js and anthropicProvider.js for why the
 * model's job is narrow extraction, not FSL assembly. Swapping to OpenAI/
 * Gemini/etc. means writing one new file that satisfies this same shape;
 * nothing in furniture-brain or above needs to change.
 */
export { createAnthropicProvider } from "./anthropicProvider.js";
export { createFakeProvider } from "./fakeProvider.js";
export { PROMPT_VERSION, buildSystemPrompt } from "./promptTemplate.js";
