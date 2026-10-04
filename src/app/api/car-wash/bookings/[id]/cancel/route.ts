import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { cancelCarWashBooking } from "@/services/car-wash/bookings";
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
    const updated = await cancelCarWashBooking(
      params.id,
      body.reason,
      session.userId,
      session.name
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
