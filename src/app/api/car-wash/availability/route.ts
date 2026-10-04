import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { checkBayAvailability } from "@/services/car-wash/availability";
import { handleApiError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "bookings:read");

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const timeSlot = searchParams.get("timeSlot") || undefined;

    if (!date) {
      throw new ValidationError("Date query parameter (YYYY-MM-DD) is required.");
    }

    const availability = await checkBayAvailability(date, timeSlot);
    return NextResponse.json({ success: true, data: availability });
  } catch (error) {
    return handleApiError(error);
  }
}
