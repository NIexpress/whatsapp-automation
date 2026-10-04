import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";
import { requireAuth } from "@/core/auth/session";
import { requirePermission, canManageRole } from "@/core/auth/rbac";
import { handleApiError, NotFoundError, ForbiddenError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "staff:manage");

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      throw new NotFoundError("Staff User", params.id);
    }

    if (!canManageRole(session.role, targetUser.role as any)) {
      throw new ForbiddenError(`Cannot modify user with role '${targetUser.role}' (insufficient privilege).`);
    }

    const body = await req.json();
    const { role, status, name, phone } = body;

    if (role && !canManageRole(session.role, role)) {
      throw new ForbiddenError(`Cannot promote user to role '${role}'.`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(role && { role }),
        ...(status && { status }),
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        updated_at: true,
      },
    });

    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      action: "STAFF_UPDATED",
      entityType: "USER",
      entityId: updatedUser.id,
      oldValue: { role: targetUser.role, status: targetUser.status },
      newValue: { role: updatedUser.role, status: updatedUser.status },
      reason: `Staff profile modified by ${session.name}.`,
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    return handleApiError(error);
  }
}
