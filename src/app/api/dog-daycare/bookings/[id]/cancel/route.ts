import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { cancelBooking } from "@/services/dog-daycare/bookings";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "bookings:cancel");

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || body.cancellationReason || "Cancelled via dashboard.";

    const cancelled = await cancelBooking(params.id, {
      cancellationReason: reason,
      actorUserId: session.userId,
      actorName: session.name,
    });

    return NextResponse.json({ success: true, data: cancelled });
  } catch (error) {
    return handleApiError(error);
  }
}
