import prisma from "@/shared/prisma";
import { getServiceConfig } from "@/core/services";
import { ConflictError, ValidationError } from "@/core/errors";

export const CAR_WASH_TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

export function normalizeDate(d: Date | string): { dateObj: Date; dateStr: string } {
  const dateObj = new Date(d);
  dateObj.setHours(0, 0, 0, 0);
  const dateStr = dateObj.toISOString().slice(0, 10);
  return { dateObj, dateStr };
}

export async function checkBayAvailability(targetDate: Date | string, timeSlot?: string) {
  const { dateObj, dateStr } = normalizeDate(targetDate);
  const totalBays = await getServiceConfig<number>("CAR_WASH", "BAY_CAPACITY", 3);

  if (timeSlot) {
    // Check specific time slot
    const activeBookings = await prisma.carWashBooking.findMany({
      where: {
        booking_date: dateObj,
        time_slot: timeSlot,
        booking_status: {
          in: ["CONFIRMED", "IN_QUEUE", "WASHING", "DETAILING", "READY_FOR_PICKUP"],
        },
      },
    });

    const bookedBays = activeBookings.length;
    const availableBays = Math.max(0, totalBays - bookedBays);
    const occupiedBayNumbers = activeBookings.map((b) => b.bay_number).filter(Boolean) as number[];
    const nextAvailableBay = [1, 2, 3].find((bay) => !occupiedBayNumbers.includes(bay)) || null;

    return {
      date: dateStr,
      timeSlot,
      totalBays,
      bookedBays,
      availableBays,
      isAvailable: availableBays > 0,
      assignedBay: nextAvailableBay,
    };
  }

  // Return breakdown across all time slots
  const allBookings = await prisma.carWashBooking.findMany({
    where: {
      booking_date: dateObj,
      booking_status: {
        in: ["CONFIRMED", "IN_QUEUE", "WASHING", "DETAILING", "READY_FOR_PICKUP"],
      },
    },
  });

  const slots = CAR_WASH_TIME_SLOTS.map((slot) => {
    const slotBookings = allBookings.filter((b) => b.time_slot === slot);
    const bookedCount = slotBookings.length;
    const available = Math.max(0, totalBays - bookedCount);
    return {
      slot,
      totalBays,
      bookedCount,
      availableSpots: available,
      isAvailable: available > 0,
    };
  });

  return {
    date: dateStr,
    totalBays,
    slots,
  };
}

export async function assertAndLockBayCapacity(
  tx: any,
  bookingDate: Date,
  timeSlot: string
): Promise<number> {
  const { dateObj } = normalizeDate(bookingDate);
  const totalBays = await getServiceConfig<number>("CAR_WASH", "BAY_CAPACITY", 3);

  const activeBookings = await tx.carWashBooking.findMany({
    where: {
      booking_date: dateObj,
      time_slot: timeSlot,
      booking_status: {
        in: ["CONFIRMED", "IN_QUEUE", "WASHING", "DETAILING", "READY_FOR_PICKUP"],
      },
    },
  });

  if (activeBookings.length >= totalBays) {
    throw new ConflictError(
      `All ${totalBays} bays are fully booked for slot ${timeSlot} on ${dateObj.toISOString().slice(0, 10)}.`
    );
  }

  // Determine which bay number (1, 2, or 3) is free
  const usedBays = activeBookings.map((b: any) => b.bay_number).filter(Boolean) as number[];
  const bayNumber = [1, 2, 3].find((b) => !usedBays.includes(b)) || 1;

  return bayNumber;
}
