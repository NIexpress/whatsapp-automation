import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { createTemplateVersion } from "@/core/templates";
import { handleApiError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "templates:*");

    const body = await req.json();
    if (!body.body) throw new ValidationError("Template body text is required.");

    const newVersion = await createTemplateVersion(
      params.id,
      body.body,
      session.userId,
      session.name
    );

    return NextResponse.json({ success: true, data: newVersion }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = POST;

