import { NextRequest, NextResponse } from "next/server";
import { checkDateAvailability, overrideAvailability } from "@/services/dog-daycare/availability";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { handleApiError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const result = await checkDateAvailability(date);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "settings:*");

    const body = await req.json();
    if (!body.date || body.maxCapacity === undefined) {
      throw new ValidationError("date and maxCapacity are required.");
    }

    const rule = await overrideAvailability({
      date: body.date,
      maxCapacity: parseInt(body.maxCapacity, 10),
      isBlocked: body.isBlocked,
      blockReason: body.blockReason,
      actorUserId: session.userId,
      actorName: session.name,
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    return handleApiError(error);
  }
}
