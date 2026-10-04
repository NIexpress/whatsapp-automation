import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { getBookingDetails } from "@/services/dog-daycare/bookings";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "bookings:read");

    const booking = await getBookingDetails(params.id);
    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    return handleApiError(error);
  }
}
