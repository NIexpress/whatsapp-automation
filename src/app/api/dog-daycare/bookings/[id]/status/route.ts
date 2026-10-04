import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { updateBookingOperationalStatus } from "@/services/dog-daycare/bookings";
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

    const updated = await updateBookingOperationalStatus(
      params.id,
      body.status,
      {
        actorUserId: session.userId,
        actorName: session.name,
        notes: body.notes,
        photoUrls: body.photoUrls,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
