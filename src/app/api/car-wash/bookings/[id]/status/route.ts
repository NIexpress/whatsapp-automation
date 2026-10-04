import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { updateCarWashStatus } from "@/services/car-wash/bookings";
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
    if (!body.status) {
      throw new ValidationError("New status is required.");
    }

    const updated = await updateCarWashStatus(
      params.id,
      body.status,
      body.notes,
      session.userId,
      session.name
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
