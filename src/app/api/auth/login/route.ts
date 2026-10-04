import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";
import { verifyPassword, setSessionCookie } from "@/core/auth/session";
import { logAudit } from "@/core/audit";
import { handleApiError, ValidationError, UnauthorizedError } from "@/core/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new ValidationError("Email and password are required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("Your account has been deactivated. Please contact an administrator.");
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    // Set signed JWT session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    });

    // Record audit log
    await logAudit({
      actorUserId: user.id,
      actorName: user.name,
      action: "USER_LOGIN",
      entityType: "USER",
      entityId: user.id,
      reason: "Successful web authentication.",
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
