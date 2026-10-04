import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { listVaccinationRecords, createVaccinationRecord } from "@/services/dog-daycare/vaccination";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "vaccinations:read");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const dogId = searchParams.get("dogId") || undefined;

    const records = await listVaccinationRecords({ status, dogId });
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "vaccinations:read");

    const body = await req.json();
    const record = await createVaccinationRecord(body);

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
