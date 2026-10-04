import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";
import { normalizePhoneNumber } from "@/core/customers";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = body.phone || "919876543210";
    const normalizedPhone = normalizePhoneNumber(phone);

    const conv = await prisma.conversation.findFirst({ where: { phone: normalizedPhone } });
    if (conv) {
      await prisma.message.deleteMany({ where: { conversation_id: conv.id } });
      await prisma.conversation.update({
        where: { id: conv.id },
        data: {
          session_state: null,
          status: "AI_ACTIVE",
          ai_enabled: true,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Chat reset successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
