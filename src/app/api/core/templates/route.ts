import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { listAllTemplates } from "@/core/templates";
import { handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    requirePermission(session, "templates:read");

    const templates = await listAllTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    return handleApiError(error);
  }
}
