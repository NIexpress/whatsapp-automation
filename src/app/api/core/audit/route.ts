import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";

export const dynamic = "force-dynamic";
import { requirePermission } from "@/core/auth/rbac";
import { getAuditLogs } from "@/core/audit";
import { handleApiError } from "@/core/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "audit:read");

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const actorUserId = searchParams.get("actorUserId") || undefined;
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "50", 10);

    const result = await getAuditLogs({
      action,
      entityType,
      entityId,
      actorUserId,
      skip,
      take,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
