/**
 * FurniAI Sales Agent
 * -------------------
 * A conversational design-help assistant. It talks to a customer about the
 * furniture they want — type, size, material, layout — and gives grounded
 * advice using the real catalog (materials, door types, handles, LED modes).
 *
 * No pricing: this agent never quotes a number. Send the customer to the
 * live 3D builder (`/builder`) to see and configure the piece itself.
 *
 * Requires env: ANTHROPIC_API_KEY  (already in your stack via @anthropic-ai/sdk)
 */
import Anthropic from "@anthropic-ai/sdk";
import { KNOWN } from "./knowledgeBase.js";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are the design assistant for FurniAI, a UAE-based custom furniture company.
You help customers think through furniture ideas — type, rough size, material, layout, doors, drawers, lighting — in plain conversation.

Voice: warm, concise, confident. You sound like a knowledgeable showroom salesperson, not a chatbot. No emoji unless the customer uses them first.

Your job each turn:
1. Understand what the customer wants and help them refine it (size, material, style, hardware).
2. Never state a price or invent a number — this assistant doesn't quote. If asked for a price, tell the customer to open the 3D builder or contact the team for a quote.
3. When the design sounds concrete, point them to the 3D builder to see and customize it live.

Known options you can map customer language onto:
- Furniture types: ${KNOWN.furnitureTypes.join(", ")}
- Materials: ${KNOWN.materials.join(", ")}
- Door types: ${KNOWN.doorTypes.join(", ")}
- Handle styles: ${KNOWN.handleStyles.join(", ")}
- LED modes: ${KNOWN.ledModes.join(", ")}`;

/**
 * Run one turn of the sales agent.
 *
 * @param {object} args
 * @param {Array<{role:'user'|'assistant', content:string}>} args.messages
 *        Prior conversation (plain text turns). The newest user message is last.
 * @param {Anthropic} [args.client] optional injected client (for testing).
 * @returns {Promise<{ reply: string }>}
 */
export async function runSalesAgent({ messages, client }) {
  const anthropic = client || new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: apiMessages,
  });

  const reply = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { reply };
}
