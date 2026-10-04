import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppConfig, sendWhatsAppTextMessage, markWhatsAppMessageAsRead, verifyMetaWebhookSignature } from "@/core/whatsapp/client";
import { processIncomingWhatsAppMessage } from "@/core/messaging/processor";

export const dynamic = "force-dynamic";

/**
 * GET Handler: Meta Webhook Handshake & Verification Challenge
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const config = getWhatsAppConfig();

  console.log(`[WhatsApp Webhook Handshake] mode=${mode}, token=${token ? "provided" : "missing"}`);

  if (mode === "subscribe" && token === config.verifyToken) {
    console.log("[WhatsApp Webhook] Verification successful! Responding with challenge.");
    return new NextResponse(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[WhatsApp Webhook] Verification failed! Token mismatch.");
  return new NextResponse("Forbidden: Verification Token Mismatch", { status: 403 });
}

/**
 * POST Handler: Incoming WhatsApp Messages & Delivery Statuses
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // 1. Verify Meta signature if configured
    if (!verifyMetaWebhookSignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] Invalid x-hub-signature-256 signature.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Meta sends { object: "whatsapp_business_account", entry: [...] }
    if (body.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
      return NextResponse.json({ status: "ignored" });
    }

    // Process all entries asynchronously
    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        if (!value) continue;

        // Process incoming messages
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          const fromPhone = msg.from; // Customer phone number
          const messageId = msg.id; // WhatsApp message ID
          const contact = contacts.find((c: any) => c.wa_id === fromPhone);
          const senderName = contact?.profile?.name || "Customer";

          // Extract message text content
          let content = "";
          if (msg.type === "text") {
            content = msg.text?.body || "";
          } else if (msg.type === "interactive") {
            const interactive = msg.interactive;
            if (interactive?.type === "button_reply") {
              content = interactive.button_reply?.title || interactive.button_reply?.id || "";
            } else if (interactive?.type === "list_reply") {
              content = interactive.list_reply?.title || interactive.list_reply?.id || "";
            }
          } else if (msg.type === "button") {
            content = msg.button?.text || msg.button?.payload || "";
          } else if (msg.type === "location") {
            content = `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
          } else {
            content = `[${msg.type.toUpperCase()} message received]`;
          }

          if (!content.trim()) continue;

          console.log(`[WhatsApp Webhook] Inbound from ${fromPhone} (${senderName}): "${content}"`);

          // Mark incoming message as read
          markWhatsAppMessageAsRead(messageId).catch(() => {});

          // Process message through conversational AI and booking state machine
          const result = await processIncomingWhatsAppMessage({
            phone: fromPhone,
            senderName,
            content,
            messageId,
          });

          // Send AI response back to customer's WhatsApp
          if (result?.reply) {
            console.log(`[WhatsApp Webhook] Sending outbound reply to ${fromPhone}...`);
            await sendWhatsAppTextMessage({
              to: fromPhone,
              text: result.reply,
              previewUrl: true,
            });
          }
        }

        // Process message statuses (sent, delivered, read, failed)
        const statuses = value.statuses || [];
        for (const status of statuses) {
          // Log status updates for observability
          if (status.status === "failed") {
            console.error(`[WhatsApp Message Failed] ID: ${status.id} To: ${status.recipient_id} Errors:`, status.errors);
          }
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("[WhatsApp Webhook Error]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
