import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { listAllVehicles, createVehicle } from "@/services/car-wash/vehicles";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:read");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const vehicleType = searchParams.get("vehicleType") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await listAllVehicles({ search, vehicleType, page, limit });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:create");

    const body = await req.json();
    const vehicle = await createVehicle({
      ...body,
      actorUserId: session.userId,
      actorName: session.name,
    });

    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
