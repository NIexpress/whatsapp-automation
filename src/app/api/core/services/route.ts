import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { listActiveServices, registerService } from "@/core/services";
import { handleApiError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export async function GET() {
  try {
    const services = await listActiveServices();
    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "services:*");

    const body = await req.json();
    const service = await registerService(body);

    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      action: "SERVICE_REGISTERED",
      entityType: "SERVICE",
      entityId: service.id,
      newValue: { code: service.code, name: service.name },
      reason: "New vertical registered in Needin Core.",
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
