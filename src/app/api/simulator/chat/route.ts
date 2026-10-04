import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";
import { normalizePhoneNumber } from "@/core/customers";
import { processIncomingWhatsAppMessage } from "@/core/messaging/processor";
import { handleApiError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || "919876543210";
    const normalizedPhone = normalizePhoneNumber(phone);

    const conversation = await prisma.conversation.findFirst({
      where: { phone: normalizedPhone },
      include: {
        customer: true,
        messages: {
          orderBy: { created_at: "asc" },
          take: 50,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: conversation || { phone: normalizedPhone, messages: [] },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, content, senderName } = body;

    if (!phone || !content) {
      throw new ValidationError("phone and content are required.");
    }

    const result = await processIncomingWhatsAppMessage({
      phone,
      content,
      senderName,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
