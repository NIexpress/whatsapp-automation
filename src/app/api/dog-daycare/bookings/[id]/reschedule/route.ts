import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { rescheduleBooking } from "@/services/dog-daycare/bookings";
import { handleApiError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "bookings:update");

    const body = await req.json();
    if (!body.newDate) {
      throw new ValidationError("New booking date is required.");
    }

    const rescheduled = await rescheduleBooking(params.id, {
      newDate: body.newDate,
      newDropoff: body.newDropoff,
      newPickup: body.newPickup,
      actorUserId: session.userId,
      actorName: session.name,
    });

    return NextResponse.json({ success: true, data: rescheduled });
  } catch (error) {
    return handleApiError(error);
  }
}
