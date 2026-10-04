import prisma from "@/shared/prisma";
import { getServiceConfig } from "@/core/services";
import { ConflictError, ValidationError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export interface AvailabilityCheckResult {
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
  maxCapacity: number;
  confirmedCount: number;
  availableSpots: number;
  isBlocked: boolean;
  blockReason?: string | null;
  status: "AVAILABLE" | "FULL" | "BLOCKED";
}

export function normalizeDate(d: Date | string): { dateObj: Date; dateStr: string } {
  const dateObj = new Date(d);
  dateObj.setHours(0, 0, 0, 0);
  const dateStr = dateObj.toISOString().slice(0, 10);
  return { dateObj, dateStr };
}

export async function checkDateAvailability(
  targetDate: Date | string
): Promise<AvailabilityCheckResult> {
  const { dateObj, dateStr } = normalizeDate(targetDate);

  // 1. Get default capacity from dynamic config
  const defaultCapacity = await getServiceConfig<number>("DOG_DAY_CARE", "DEFAULT_CAPACITY", 15);

  // 2. Check for date-specific rule override
  const rule = await prisma.dogDaycareAvailabilityRule.findFirst({
    where: {
      date: dateObj,
    },
  });

  const maxCapacity = rule ? rule.max_capacity : defaultCapacity;
  const isBlocked = rule ? rule.is_blocked : false;
  const blockReason = rule ? rule.block_reason : null;

  if (isBlocked) {
    return {
      date: dateStr,
      isAvailable: false,
      maxCapacity,
      confirmedCount: 0,
      availableSpots: 0,
      isBlocked: true,
      blockReason: blockReason || "Day care is closed on this date.",
      status: "BLOCKED",
    };
  }

  // 3. Count existing active bookings for this date
  const activeBookingsCount = await prisma.dogDaycareBooking.count({
    where: {
      booking_date: dateObj,
      booking_status: {
        in: ["CONFIRMED", "CHECKED_IN", "IN_CARE", "READY_FOR_PICKUP"],
      },
    },
  });

  const availableSpots = Math.max(0, maxCapacity - activeBookingsCount);
  const isAvailable = availableSpots > 0;

  return {
    date: dateStr,
    isAvailable,
    maxCapacity,
    confirmedCount: activeBookingsCount,
    availableSpots,
    isBlocked: false,
    status: isAvailable ? "AVAILABLE" : "FULL",
  };
}

export async function assertAndLockSlotCapacity(
  tx: any,
  bookingDate: Date
): Promise<number> {
  const dateObj = new Date(bookingDate);
  dateObj.setHours(0, 0, 0, 0);

  const defaultCapacity = await getServiceConfig<number>("DOG_DAY_CARE", "DEFAULT_CAPACITY", 15);

  const rule = await tx.dogDaycareAvailabilityRule.findFirst({
    where: { date: dateObj },
  });

  if (rule && rule.is_blocked) {
    throw new ConflictError(rule.block_reason || "Selected date is closed for bookings.");
  }

  const maxCapacity = rule ? rule.max_capacity : defaultCapacity;

  const currentCount = await tx.dogDaycareBooking.count({
    where: {
      booking_date: dateObj,
      booking_status: {
        in: ["CONFIRMED", "CHECKED_IN", "IN_CARE", "READY_FOR_PICKUP"],
      },
    },
  });

  if (currentCount >= maxCapacity) {
    throw new ConflictError(
      `Capacity limit reached for ${dateObj.toISOString().slice(0, 10)} (Max: ${maxCapacity}, Booked: ${currentCount}).`
    );
  }

  return maxCapacity - currentCount - 1;
}

export async function overrideAvailability(params: {
  date: Date | string;
  maxCapacity: number;
  isBlocked?: boolean;
  blockReason?: string | null;
  actorUserId?: string;
  actorName?: string;
}) {
  const { dateObj, dateStr } = normalizeDate(params.date);

  const rule = await prisma.dogDaycareAvailabilityRule.upsert({
    where: {
      id: (await prisma.dogDaycareAvailabilityRule.findFirst({ where: { date: dateObj } }))?.id || "new",
    },
    update: {
      max_capacity: params.maxCapacity,
      is_blocked: Boolean(params.isBlocked),
      block_reason: params.blockReason || null,
    },
    create: {
      date: dateObj,
      max_capacity: params.maxCapacity,
      is_blocked: Boolean(params.isBlocked),
      block_reason: params.blockReason || null,
    },
  });

  await logAudit({
    actorUserId: params.actorUserId,
    actorName: params.actorName || "STAFF",
    action: "AVAILABILITY_OVERRIDE",
    entityType: "AVAILABILITY_RULE",
    entityId: rule.id,
    newValue: { date: dateStr, maxCapacity: params.maxCapacity, isBlocked: params.isBlocked },
    reason: `Staff override availability for ${dateStr}.`,
  });

  return rule;
}
