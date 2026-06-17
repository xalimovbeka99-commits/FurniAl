/**
 * POST /api/quote
 * Body: a design spec (the MASTER_PLAN Phase One JSON).
 * Returns: { ok, quote, warnings }
 *
 * Pure compute — no AI, no external calls. Safe to hammer.
 */
import { NextResponse } from "next/server";
import { generateQuote } from "@/lib/pricing";

export async function POST(req) {
  let spec;
  try {
    spec = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = generateQuote(spec || {});
  return NextResponse.json(result, { status: 200 });
}
