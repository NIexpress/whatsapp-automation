import { NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";

export const dynamic = "force-dynamic";
import { ROLE_PERMISSIONS } from "@/core/auth/rbac";
import prisma from "@/shared/prisma";
import { handleApiError, UnauthorizedError } from "@/core/errors";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      throw new UnauthorizedError("No active session found.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        created_at: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedError("User is no longer active.");
    }

    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        permissions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
