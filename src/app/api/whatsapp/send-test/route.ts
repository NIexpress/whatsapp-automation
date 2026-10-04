import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppTextMessage, formatPhoneForWhatsApp } from "@/core/whatsapp/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { to, message } = body;

    if (!to) {
      return NextResponse.json({ error: "Parameter 'to' (phone number) is required" }, { status: 400 });
    }

    const recipient = formatPhoneForWhatsApp(to);
    const content = message || "🐾 Hello from Needin Pet Resort & Day Care! Your WhatsApp Cloud API is successfully configured.";

    const result = await sendWhatsAppTextMessage({
      to: recipient,
      text: content,
      previewUrl: true,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipient,
      messageSent: content,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
