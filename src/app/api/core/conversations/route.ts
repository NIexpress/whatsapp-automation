import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import prisma from "@/shared/prisma";
import { normalizePhoneNumber } from "@/core/customers";
import { handleApiError, ValidationError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:read");

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const customerId = searchParams.get("customerId");

    const where: any = {};
    if (phone) where.phone = normalizePhoneNumber(phone);
    if (customerId) where.customer_id = customerId;

    const conversation = await prisma.conversation.findFirst({
      where,
      include: {
        customer: true,
        messages: {
          orderBy: { created_at: "asc" },
          take: 50,
        },
      },
    });

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:update");

    const body = await req.json();
    const { phone, customerId, status } = body;

    if (!phone && !customerId) {
      throw new ValidationError("phone or customerId is required.");
    }

    const where: any = {};
    if (phone) where.phone = normalizePhoneNumber(phone);
    if (customerId) where.customer_id = customerId;

    const conversation = await prisma.conversation.findFirst({ where });
    if (!conversation) {
      throw new ValidationError("Conversation not found.");
    }

    const prevStatus = conversation.status;
    const newStatus = status || (prevStatus === "AI_ACTIVE" ? "HUMAN_ACTIVE" : "AI_ACTIVE");

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: newStatus,
        assigned_user_id: newStatus === "HUMAN_ACTIVE" ? session.userId : conversation.assigned_user_id,
        current_intent: newStatus === "AI_ACTIVE" ? "RESOLVED" : conversation.current_intent,
      },
    });

    await logAudit({
      action: "CONVERSATION_MODE_TOGGLED",
      entityType: "CONVERSATION",
      entityId: conversation.id,
      actorUserId: session.userId,
      actorName: session.name,
      oldValue: { status: prevStatus },
      newValue: {
        from: prevStatus,
        to: newStatus,
        phone: conversation.phone,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
