/**
 * WhatsApp Cloud API helper (Meta / WhatsApp Business Platform)
 * ------------------------------------------------------------
 * Thin wrapper — no SDK, just fetch. You provision the credentials in Meta's
 * developer console; nothing here needs installing.
 *
 * Required env vars:
 *   WHATSAPP_TOKEN            - permanent access token from Meta
 *   WHATSAPP_PHONE_NUMBER_ID  - the phone number ID (not the phone number)
 *   WHATSAPP_VERIFY_TOKEN     - any string you choose; must match the webhook config
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH_VERSION = "v21.0";

/** Extract the first text message + sender from a webhook POST payload. */
export function parseInbound(body) {
  try {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg || msg.type !== "text") return null;
    return {
      from: msg.from,              // sender's WhatsApp number
      text: msg.text?.body || "",
      name: value?.contacts?.[0]?.profile?.name || "",
      messageId: msg.id,
    };
  } catch {
    return null;
  }
}

/** Send a plain text reply back to a WhatsApp user. */
export async function sendText(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set");
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text.slice(0, 4096) }, // WhatsApp text limit
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/** Verify the webhook handshake (Meta calls GET once on setup). */
export function verifyWebhook(searchParams) {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}
