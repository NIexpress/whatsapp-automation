import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";

export const dynamic = "force-dynamic";
import { requireAuth, hashPassword } from "@/core/auth/session";
import { requirePermission, canManageRole } from "@/core/auth/rbac";
import { handleApiError, ValidationError, ForbiddenError, ConflictError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export async function GET() {
  try {
    const session = await requireAuth();
    requirePermission(session, "staff:read");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "staff:manage");

    const body = await req.json();
    const { name, email, password, role = "STAFF", phone } = body;

    if (!name || !email || !password) {
      throw new ValidationError("Name, email, and password are required.");
    }

    if (!canManageRole(session.role, role)) {
      throw new ForbiddenError(`Cannot assign role '${role}' because it exceeds or equals your privilege level.`);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError(`User with email '${normalizedEmail}' already exists.`);
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password_hash: hashedPassword,
        role,
        status: "ACTIVE",
        phone: phone || null,
      },
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

    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      action: "STAFF_CREATED",
      entityType: "USER",
      entityId: user.id,
      newValue: { name: user.name, email: user.email, role: user.role },
      reason: `Staff account created by ${session.name}.`,
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
