import prisma from "@/shared/prisma";
import { NotFoundError, ValidationError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export interface RenderVariables {
  customer_name?: string;
  dog_name?: string;
  breed?: string;
  booking_reference?: string;
  booking_date?: string;
  dropoff_time?: string;
  pickup_time?: string;
  new_booking_date?: string;
  new_dropoff_time?: string;
  new_pickup_time?: string;
  amount?: string | number;
  payment_link?: string;
  business_name?: string;
  business_address?: string;
  maps_link?: string;
  business_hours?: string;
  cancellation_reason?: string;
  refund_notice?: string;
  rejection_reason?: string;
  [key: string]: any;
}

export async function renderTemplate(
  templateCode: string,
  variables: RenderVariables = {}
): Promise<{ text: string; templateVersionId?: string; templateId?: string }> {
  // 1. Fetch template by code
  const template = await prisma.messageTemplate.findUnique({
    where: { code: templateCode },
    include: {
      versions: {
        where: { is_active: true },
        orderBy: { version_number: "desc" },
        take: 1,
      },
    },
  });

  if (!template || template.versions.length === 0) {
    // Fallback if not in database
    return {
      text: `Notification from Needin: ${templateCode}`,
    };
  }

  const activeVersion = template.versions[0];
  let renderedText = activeVersion.body;

  // 2. Default business values
  const defaultVars: Record<string, string> = {
    business_name: "Needin Pet Resort & Day Care",
    business_address: "Plot 42, Paw Paradise Lane, Indiranagar, Bengaluru",
    maps_link: "https://maps.google.com/?q=Needin+Pet+Resort+Bangalore",
    business_hours: "08:00 AM – 07:00 PM",
  };

  const mergedVars: Record<string, string> = {
    ...defaultVars,
    ...Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, v !== undefined && v !== null ? String(v) : ""])
    ),
  };

  // 3. Replace {{key}}
  renderedText = renderedText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (mergedVars[key] !== undefined && mergedVars[key] !== "") {
      return mergedVars[key];
    }
    // Safe fallback: never send raw {{variable}} to customer
    return "";
  });

  return {
    text: renderedText.trim(),
    templateId: template.id,
    templateVersionId: activeVersion.id,
  };
}

export async function listAllTemplates() {
  return prisma.messageTemplate.findMany({
    include: {
      versions: {
        orderBy: { version_number: "desc" },
      },
      service: { select: { id: true, name: true, code: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createTemplateVersion(
  templateId: string,
  bodyText: string,
  actorUserId?: string,
  actorName?: string
) {
  const template = await prisma.messageTemplate.findUnique({
    where: { id: templateId },
    include: { versions: true },
  });

  if (!template) throw new NotFoundError("Message Template", templateId);

  // Extract variables
  const matchedVars = Array.from(new Set(Array.from(bodyText.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)).map((m) => m[1])));

  const nextVersionNumber = template.versions.length + 1;

  // Deactivate existing versions
  await prisma.templateVersion.updateMany({
    where: { template_id: templateId },
    data: { is_active: false },
  });

  const newVersion = await prisma.templateVersion.create({
    data: {
      template_id: templateId,
      version_number: nextVersionNumber,
      body: bodyText,
      variables: JSON.stringify(matchedVars),
      is_active: true,
      created_by_user_id: actorUserId || null,
    },
  });

  await logAudit({
    actorUserId,
    actorName: actorName || "STAFF",
    action: "TEMPLATE_VERSION_CREATED",
    entityType: "TEMPLATE",
    entityId: template.id,
    newValue: { version: nextVersionNumber, body: bodyText },
    reason: `New template version v${nextVersionNumber} published.`,
  });

  return newVersion;
}
