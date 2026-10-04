import prisma from "@/shared/prisma";

export interface LogAuditInput {
  actorUserId?: string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  reason?: string | null;
  ipAddress?: string | null;
}

export async function logAudit(input: LogAuditInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        actor_user_id: input.actorUserId || null,
        actor_name: input.actorName || "SYSTEM",
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId || null,
        old_value: input.oldValue !== undefined ? JSON.stringify(input.oldValue) : null,
        new_value: input.newValue !== undefined ? JSON.stringify(input.newValue) : null,
        reason: input.reason || null,
        ip_address: input.ipAddress || null,
      },
    });
  } catch (err) {
    console.error("[AuditLog Error] Failed to write audit record:", err);
    // Audit logging should not crash business transactions, but log errors
    return null;
  }
}

export async function getAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  skip?: number;
  take?: number;
} = {}) {
  const { entityType, entityId, actorUserId, action, skip = 0, take = 50 } = params;

  const where: any = {};
  if (entityType) where.entity_type = entityType;
  if (entityId) where.entity_id = entityId;
  if (actorUserId) where.actor_user_id = actorUserId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        actor_user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, skip, take };
}
