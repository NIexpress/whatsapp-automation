import { NextRequest, NextResponse } from "next/server";
import { renderTemplate } from "@/core/templates";
import { handleApiError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code) throw new ValidationError("template code is required.");

    const rendered = await renderTemplate(body.code, body.variables || {});
    return NextResponse.json({ success: true, data: rendered });
  } catch (error) {
    return handleApiError(error);
  }
}
