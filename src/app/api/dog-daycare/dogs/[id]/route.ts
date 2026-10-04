import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { getDogById } from "@/services/dog-daycare/dogs";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "dogs:read");

    const dog = await getDogById(params.id);
    return NextResponse.json({ success: true, data: dog });
  } catch (error) {
    return handleApiError(error);
  }
}
