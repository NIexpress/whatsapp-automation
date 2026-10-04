import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { listBookings, createDaycareBooking } from "@/services/dog-daycare/bookings";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "bookings:read");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const date = searchParams.get("date") || undefined;
    const search = searchParams.get("search") || undefined;
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "50", 10);

    const result = await listBookings({ status, paymentStatus, date, search, skip, take });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "bookings:create");

    const body = await req.json();
    const booking = await createDaycareBooking({
      ...body,
      source: "DASHBOARD_MANUAL",
      actorUserId: session.userId,
      actorName: session.name,
    });

    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
