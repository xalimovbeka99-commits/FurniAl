/**
 * FurniAI Sales Agent
 * -------------------
 * A conversational agent that talks to a customer, gathers furniture
 * requirements, and produces a real quote using the deterministic pricing
 * engine (NOT by guessing numbers — the LLM never invents prices).
 *
 * Design: Claude is given ONE tool, `generate_quote`. It runs the conversation
 * naturally; when it has enough detail it calls the tool, we compute the quote
 * locally, hand the result back, and Claude writes the customer-facing reply.
 * If it doesn't have enough detail yet, it just asks a follow-up question.
 *
 * Requires env: ANTHROPIC_API_KEY  (already in your stack via @anthropic-ai/sdk)
 */
import Anthropic from "@anthropic-ai/sdk";
import { generateQuote, quoteSummaryLine } from "./pricing.js";
import { KNOWN } from "./knowledgeBase.js";

const MODEL = "claude-sonnet-4-6"; // cost-appropriate for high-volume sales chat

const SYSTEM_PROMPT = `You are the sales agent for FurniAI, a UAE-based custom furniture company.
You help customers design furniture and give them an instant price quote.

Voice: warm, concise, confident. You sound like a knowledgeable showroom salesperson, not a chatbot. No emoji unless the customer uses them first.

Your job each turn:
1. Understand what the customer wants.
2. If you have enough to price it, call the generate_quote tool. You need at minimum a furniture type. Everything else can use sensible defaults — do NOT interrogate the customer for every field. One or two clarifying questions max, only when it materially changes the price (e.g. rough size, material).
3. When you receive the quote result, present the total clearly and offer 1–2 concrete next steps (e.g. adjust material, see it in the 3D builder, place the order). Mention that it's an estimate.

Pricing rules:
- NEVER state a price that didn't come from the generate_quote tool. If you haven't called the tool, don't quote a number.
- If the tool returns warnings about defaulted fields, you may gently confirm those assumptions with the customer.

Known options you can map customer language onto:
- Furniture types: ${KNOWN.furnitureTypes.join(", ")}
- Materials: ${KNOWN.materials.join(", ")}
- Door types: ${KNOWN.doorTypes.join(", ")}
- Handle styles: ${KNOWN.handleStyles.join(", ")}
- LED modes: ${KNOWN.ledModes.join(", ")}`;

const QUOTE_TOOL = {
  name: "generate_quote",
  description:
    "Generate a priced quote for a furniture design. Call this once you can identify at least the furniture type. Map the customer's natural language onto the known option keys; omit any field you're unsure about and a sensible default will be used.",
  input_schema: {
    type: "object",
    properties: {
      furnitureType: { type: "string", enum: KNOWN.furnitureTypes },
      primaryColor: { type: "string", enum: KNOWN.materials, description: "Material/colour key" },
      doorType: { type: "string", enum: KNOWN.doorTypes },
      handleStyle: { type: "string", enum: KNOWN.handleStyles },
      ledLighting: { type: "string", enum: KNOWN.ledModes },
      drawerRows: { type: "integer", minimum: 0, maximum: 6 },
      hangerRods: { type: "boolean" },
      width: { type: "number", description: "metres" },
      height: { type: "number", description: "metres" },
      depth: { type: "number", description: "metres" },
      delivery: { type: "string", enum: ["dubai", "abu_dhabi", "sharjah", "ajman", "other_uae", "pickup"] },
    },
    required: ["furnitureType"],
    additionalProperties: false,
  },
};

/**
 * Run one turn of the sales agent.
 *
 * @param {object} args
 * @param {Array<{role:'user'|'assistant', content:string}>} args.messages
 *        Prior conversation (plain text turns). The newest user message is last.
 * @param {Anthropic} [args.client] optional injected client (for testing).
 * @returns {Promise<{ reply: string, quote: object|null, spec: object|null }>}
 */
export async function runSalesAgent({ messages, client }) {
  const anthropic = client || new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Convert plain-text history into the Messages API shape.
  const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  let lastQuote = null;
  let lastSpec = null;

  // Agentic loop: allow a couple of tool round-trips, then force a text answer.
  for (let hop = 0; hop < 3; hop++) {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [QUOTE_TOOL],
      messages: apiMessages,
    });

    if (resp.stop_reason === "tool_use") {
      // Append the assistant's tool-call turn verbatim.
      apiMessages.push({ role: "assistant", content: resp.content });

      const toolResults = [];
      for (const block of resp.content) {
        if (block.type !== "tool_use") continue;
        if (block.name === "generate_quote") {
          const result = generateQuote(block.input || {});
          lastQuote = result.quote;
          lastSpec = block.input;
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({
              total: `${result.quote.total} ${result.quote.currency}`,
              breakdown: result.quote.breakdown,
              summary: quoteSummaryLine(result.quote),
              warnings: result.warnings,
            }),
          });
        }
      }
      apiMessages.push({ role: "user", content: toolResults });
      continue; // let Claude turn the quote into a customer reply
    }

    // Plain text answer — we're done.
    const reply = resp.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { reply, quote: lastQuote, spec: lastSpec };
  }

  // Safety net if the model kept calling tools.
  return {
    reply: lastQuote
      ? `Your estimate comes to ${lastQuote.total} ${lastQuote.currency}. Want me to refine the material or size?`
      : "Could you tell me a bit more about the piece you have in mind?",
    quote: lastQuote,
    spec: lastSpec,
  };
}
