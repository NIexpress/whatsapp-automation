import crypto from "crypto";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  verifyToken: string;
  appSecret?: string;
  apiVersion: string;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const wabaId = process.env.WHATSAPP_WABA_ID || "";
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";
  const appSecret = process.env.WHATSAPP_APP_SECRET || "";
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  return {
    accessToken,
    phoneNumberId,
    wabaId,
    verifyToken,
    appSecret,
    apiVersion,
  };
}

const META_GRAPH_BASE = "https://graph.facebook.com";

export interface SendTextMessageParams {
  to: string; // E.164 without '+' e.g. 919876543210
  text: string;
  previewUrl?: boolean;
}

export interface SendButtonOption {
  id: string;
  title: string; // Max 20 chars
}

export interface SendInteractiveButtonsParams {
  to: string;
  bodyText: string;
  buttons: SendButtonOption[];
  headerText?: string;
  footerText?: string;
}

export interface SendInteractiveListSection {
  title: string;
  rows: { id: string; title: string; description?: string }[];
}

export interface SendInteractiveListParams {
  to: string;
  bodyText: string;
  buttonText: string;
  sections: SendInteractiveListSection[];
  headerText?: string;
  footerText?: string;
}

/**
 * Format phone number to clean digits for WhatsApp API (no +, no spaces, no hyphens)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If 10 digits Indian mobile, prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Send a standard WhatsApp text message
 */
export async function sendWhatsAppTextMessage(params: SendTextMessageParams) {
  const config = getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    console.warn("[WhatsApp Client] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID.");
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  const recipient = formatPhoneForWhatsApp(params.to);
  const url = `${META_GRAPH_BASE}/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: params.previewUrl !== undefined ? params.previewUrl : true,
      body: params.text,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[WhatsApp Client Error] sendWhatsAppTextMessage failed:", data);
      return { success: false, error: data };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId, data };
  } catch (err: any) {
    console.error("[WhatsApp Client Network Error]", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send WhatsApp Interactive Quick-Reply Buttons (up to 3 buttons)
 */
export async function sendWhatsAppInteractiveButtons(params: SendInteractiveButtonsParams) {
  const config = getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  const recipient = formatPhoneForWhatsApp(params.to);
  const url = `${META_GRAPH_BASE}/${config.apiVersion}/${config.phoneNumberId}/messages`;

  // WhatsApp allows maximum 3 quick reply buttons. Truncate title to 20 chars
  const validButtons = params.buttons.slice(0, 3).map((b) => ({
    type: "reply",
    reply: {
      id: b.id.slice(0, 256),
      title: b.title.slice(0, 20),
    },
  }));

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "interactive",
    interactive: {
      type: "button",
      header: params.headerText ? { type: "text", text: params.headerText } : undefined,
      body: { text: params.bodyText },
      footer: params.footerText ? { text: params.footerText } : undefined,
      action: {
        buttons: validButtons,
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn("[WhatsApp Client] Interactive buttons rejected, falling back to text:", data);
      // Fallback: send text with buttons listed
      const fallbackText = `${params.bodyText}\n\n${params.buttons.map((b) => `👉 ${b.title}`).join("\n")}`;
      return sendWhatsAppTextMessage({ to: recipient, text: fallbackText });
    }

    return { success: true, messageId: data.messages?.[0]?.id, data };
  } catch (err: any) {
    console.error("[WhatsApp Client] Interactive buttons failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send WhatsApp Interactive List (for menus, services, packages, time slots)
 */
export async function sendWhatsAppInteractiveList(params: SendInteractiveListParams) {
  const config = getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  const recipient = formatPhoneForWhatsApp(params.to);
  const url = `${META_GRAPH_BASE}/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "interactive",
    interactive: {
      type: "list",
      header: params.headerText ? { type: "text", text: params.headerText } : undefined,
      body: { text: params.bodyText },
      footer: params.footerText ? { text: params.footerText } : undefined,
      action: {
        button: params.buttonText.slice(0, 20),
        sections: params.sections,
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn("[WhatsApp Client] Interactive list failed, falling back to text:", data);
      return sendWhatsAppTextMessage({ to: recipient, text: params.bodyText });
    }

    return { success: true, messageId: data.messages?.[0]?.id, data };
  } catch (err: any) {
    console.error("[WhatsApp Client] Interactive list failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mark message as read on customer device (turns double checkmarks blue)
 */
export async function markWhatsAppMessageAsRead(messageId: string) {
  const config = getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId || !messageId) return;

  const url = `${META_GRAPH_BASE}/${config.apiVersion}/${config.phoneNumberId}/messages`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch (err) {
    // Non-blocking
    console.warn("[WhatsApp Client] Failed to mark message as read:", err);
  }
}

/**
 * Verify HMAC-SHA256 signature from Meta webhook
 */
export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const config = getWhatsAppConfig();
  if (!config.appSecret || config.appSecret === "replace_with_meta_app_secret") {
    // If user hasn't set custom app secret, allow pass-through
    return true;
  }

  if (!signatureHeader) return false;

  const [prefix, signature] = signatureHeader.split("=");
  if (prefix !== "sha256" || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", config.appSecret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}
