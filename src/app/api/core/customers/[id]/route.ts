import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";

export const dynamic = "force-dynamic";
import { requirePermission } from "@/core/auth/rbac";
import { getCustomerById } from "@/core/customers";
import { handleApiError } from "@/core/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:read");

    const customer = await getCustomerById(params.id);
    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}
