import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { listAllDogs, createDog } from "@/services/dog-daycare/dogs";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "dogs:read");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "50", 10);

    const result = await listAllDogs({ search, customerId, skip, take });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    requirePermission(session, "dogs:create");

    const body = await req.json();
    const dog = await createDog(body);

    return NextResponse.json({ success: true, data: dog }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
