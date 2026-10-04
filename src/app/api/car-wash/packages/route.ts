import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { listCarWashPackages, createCarWashPackage } from "@/services/car-wash/pricing";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "services:read");

    const packages = await listCarWashPackages(false);
    return NextResponse.json({ success: true, data: packages });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "config:update");

    const body = await req.json();
    const pkg = await createCarWashPackage(body);
    return NextResponse.json({ success: true, data: pkg }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
