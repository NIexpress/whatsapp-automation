import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import prisma from "@/shared/prisma";
import { handleApiError, NotFoundError, ValidationError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:read");

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        messages: {
          orderBy: { created_at: "asc" },
          take: 100,
        },
      },
    });

    if (!conversation) throw new NotFoundError("Conversation", params.id);

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:update");

    const body = await req.json();
    const { status, ai_enabled } = body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
    });
    if (!conversation) throw new NotFoundError("Conversation", params.id);

    const prevStatus = conversation.status;
    const newStatus = status || conversation.status;

    const updated = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        ai_enabled: ai_enabled !== undefined ? Boolean(ai_enabled) : conversation.ai_enabled,
        assigned_user_id: newStatus === "HUMAN_ACTIVE" ? session.userId : conversation.assigned_user_id,
        current_intent: newStatus === "AI_ACTIVE" ? "RESOLVED" : conversation.current_intent,
      },
      include: { customer: true },
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
        customer_phone: conversation.phone,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:update");

    const body = await req.json();
    const { content } = body;
    if (!content || !content.trim()) {
      throw new ValidationError("Message content is required.");
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
    });
    if (!conversation) throw new NotFoundError("Conversation", params.id);

    // Save staff message
    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        sender_type: "STAFF",
        message_type: "TEXT",
        content: content.trim(),
      },
    });

    // Ensure conversation is in HUMAN_ACTIVE mode since staff manually replied
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "HUMAN_ACTIVE",
        assigned_user_id: session.userId,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
