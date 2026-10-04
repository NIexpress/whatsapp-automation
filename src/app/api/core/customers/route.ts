import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";

export const dynamic = "force-dynamic";
import { requirePermission } from "@/core/auth/rbac";
import { listCustomers, findOrCreateCustomer } from "@/core/customers";
import { handleApiError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "customers:read");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "50", 10);

    const result = await listCustomers({ search, skip, take });
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
    const customer = await findOrCreateCustomer(body);

    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      action: "CUSTOMER_UPSERTED",
      entityType: "CUSTOMER",
      entityId: customer.id,
      newValue: { name: customer.name, phone: customer.phone, email: customer.email },
      reason: "Manual customer profile creation/update from dashboard.",
    });

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
