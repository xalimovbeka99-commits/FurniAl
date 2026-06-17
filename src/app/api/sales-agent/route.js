/**
 * POST /api/sales-agent
 * Body: { messages: [{ role: "user"|"assistant", content: string }, ...] }
 * Returns: { reply, quote, spec }
 *
 * Stateless: the client sends the full conversation each time. Persist it
 * client-side (or later in your DB) and replay it here.
 */
import { NextResponse } from "next/server";
import { runSalesAgent } from "@/lib/salesAgent";

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty `messages` array" },
      { status: 400 }
    );
  }

  try {
    const result = await runSalesAgent({ messages });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("sales-agent error:", err);
    return NextResponse.json({ error: "Agent failed" }, { status: 500 });
  }
}
