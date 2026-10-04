import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { listCarWashBookings, createCarWashBooking } from "@/services/car-wash/bookings";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "bookings:read");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const date = searchParams.get("date") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const vehicleId = searchParams.get("vehicleId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await listCarWashBookings({
      status,
      date,
      customerId,
      vehicleId,
      search,
      page,
      limit,
    });

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
    const booking = await createCarWashBooking({
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
