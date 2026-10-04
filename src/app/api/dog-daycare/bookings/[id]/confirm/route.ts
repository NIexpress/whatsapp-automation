import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { confirmBooking } from "@/services/dog-daycare/bookings";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "bookings:confirm");

    const body = await req.json().catch(() => ({}));
    const confirmed = await confirmBooking(params.id, {
      isOfflineManual: true,
      actorUserId: session.userId,
      actorName: session.name,
      paymentId: body.paymentId,
    });

    return NextResponse.json({ success: true, data: confirmed });
  } catch (error) {
    return handleApiError(error);
  }
}
