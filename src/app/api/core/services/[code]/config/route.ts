import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/rbac";
import { getServiceByCode, setServiceConfig } from "@/core/services";
import { handleApiError, ValidationError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const service = await getServiceByCode(params.code);
    const configMap: Record<string, any> = {};
    for (const c of service.configs) {
      try {
        configMap[c.key] = JSON.parse(c.value_json);
      } catch {
        configMap[c.key] = c.value_json;
      }
    }
    return NextResponse.json({ success: true, data: configMap });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await requireAuth();
    requirePermission(session, "settings:*");

    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      throw new ValidationError("Config key and value are required.");
    }

    const config = await setServiceConfig(params.code, key, value);

    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      action: "SERVICE_CONFIG_UPDATED",
      entityType: "SERVICE_CONFIG",
      entityId: config.id,
      newValue: { serviceCode: params.code, key, value },
      reason: `Configuration key '${key}' updated via administrative API.`,
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return handleApiError(error);
  }
}
