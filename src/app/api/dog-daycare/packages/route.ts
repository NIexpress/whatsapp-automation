import { NextRequest, NextResponse } from "next/server";
import { listDaycarePackages, createDaycarePackage } from "@/services/dog-daycare/pricing";
import { handleApiError, ValidationError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = await listDaycarePackages();
    return NextResponse.json({ success: true, data: packages });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.price) {
      throw new ValidationError("Package name and price are required.");
    }
    const code = body.code || body.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const pkg = await createDaycarePackage({
      name: body.name,
      code,
      price: Number(body.price),
      description: body.description,
      validityDays: Number(body.validityDays || 1),
      totalVisits: Number(body.totalVisits || 1),
    });

    await logAudit({
      action: "CREATE_PACKAGE",
      entityType: "DAYCARE_PACKAGE",
      entityId: pkg.id,
      newValue: { name: pkg.name, code: pkg.code, price: pkg.price },
      actorName: "ADMIN",
    });

    return NextResponse.json({ success: true, data: pkg }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
