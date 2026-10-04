import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { verifyVaccinationRecord } from "@/services/dog-daycare/vaccination";
import { handleApiError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "vaccinations:verify");

    const body = await req.json();
    const { status, notes } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      throw new ValidationError("Status must be either 'APPROVED' or 'REJECTED'.");
    }

    const updated = await verifyVaccinationRecord(params.id, status, session.userId, notes);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
