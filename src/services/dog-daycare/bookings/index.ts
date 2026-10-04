import prisma from "@/shared/prisma";
import { BookingStatus, PaymentStatus } from "@/shared/types";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors";
import { logAudit } from "@/core/audit";
import { assertAndLockSlotCapacity, checkDateAvailability } from "../availability";
import { calculateBookingPrice } from "../pricing";
import { checkVaccinationCompliance } from "../vaccination";

export interface CreateBookingInput {
  customerId: string;
  dogId: string;
  bookingDate: Date | string;
  dropoffTime?: string;
  pickupTime?: string;
  packageCode?: string;
  addGrooming?: boolean;
  specialInstructions?: string | null;
  source?: "WHATSAPP" | "DASHBOARD_MANUAL" | "PHONE_IN";
  initialStatus?: BookingStatus;
  initialPaymentStatus?: PaymentStatus;
  actorUserId?: string;
  actorName?: string;
}

export function generateBookingNumber(): string {
  const now = new Date();
  const yyyymm = now.toISOString().slice(0, 7).replace("-", "");
  const timePart = Date.now().toString().slice(-5);
  const rand = Math.floor(100 + Math.random() * 900);
  return `ND-DDC-${yyyymm}-${timePart}${rand}`;
}

export async function createDaycareBooking(input: CreateBookingInput) {
  const dateObj = new Date(input.bookingDate);
  dateObj.setHours(0, 0, 0, 0);

  // 1. Verify customer and dog
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new NotFoundError("Customer", input.customerId);

  const dog = await prisma.dog.findUnique({ where: { id: input.dogId } });
  if (!dog) throw new NotFoundError("Dog", input.dogId);
  if (dog.customer_id !== customer.id) {
    throw new ValidationError("The selected dog does not belong to this customer.");
  }

  // 2. Calculate Pricing
  const pricing = await calculateBookingPrice({
    packageCodeOrId: input.packageCode || "SINGLE_DAY",
    addGrooming: Boolean(input.addGrooming),
  });

  const bookingNumber = generateBookingNumber();
  const initialStatus = input.initialStatus || "PENDING_PAYMENT";
  const initialPayment = input.initialPaymentStatus || "PENDING";

  // 3. Execute inside transaction with concurrency capacity check
  const booking = await prisma.$transaction(async (tx) => {
    // If creating directly as CONFIRMED, lock and verify capacity
    if (initialStatus === "CONFIRMED") {
      await assertAndLockSlotCapacity(tx, dateObj);
    }

    return tx.dogDaycareBooking.create({
      data: {
        booking_number: bookingNumber,
        customer_id: customer.id,
        dog_id: dog.id,
        package_id: pricing.package?.id || null,
        booking_date: dateObj,
        dropoff_time: input.dropoffTime || "09:00 AM",
        pickup_time: input.pickupTime || "06:00 PM",
        amount: pricing.total,
        discount: 0,
        total_amount: pricing.total,
        booking_status: initialStatus,
        payment_status: initialPayment,
        special_instructions: input.specialInstructions || null,
        source: input.source || "WHATSAPP",
      },
      include: {
        customer: true,
        dog: true,
        package: true,
      },
    });
  });

  await logAudit({
    actorUserId: input.actorUserId,
    actorName: input.actorName || "SYSTEM",
    action: "BOOKING_CREATED",
    entityType: "BOOKING",
    entityId: booking.id,
    newValue: {
      bookingNumber: booking.booking_number,
      status: booking.booking_status,
      customer: customer.name,
      dog: dog.name,
      date: dateObj.toISOString().slice(0, 10),
      amount: booking.total_amount,
    },
    reason: `Booking created via ${booking.source}.`,
  });

  return booking;
}

export async function confirmBooking(
  bookingId: string,
  params: {
    actorUserId?: string;
    actorName?: string;
    paymentId?: string;
    isOfflineManual?: boolean;
  } = {}
) {
  const booking = await prisma.dogDaycareBooking.findUnique({
    where: { id: bookingId },
    include: { customer: true, dog: true },
  });

  if (!booking) throw new NotFoundError("Booking", bookingId);

  // Validate state
  if (booking.booking_status === "CONFIRMED" || booking.booking_status === "CHECKED_IN") {
    return booking; // Idempotent
  }

  if (booking.booking_status === "CANCELLED" || booking.booking_status === "COMPLETED") {
    throw new ConflictError(`Cannot confirm booking in state '${booking.booking_status}'.`);
  }

  // Atomic capacity lock
  const updatedBooking = await prisma.$transaction(async (tx) => {
    await assertAndLockSlotCapacity(tx, booking.booking_date);

    return tx.dogDaycareBooking.update({
      where: { id: bookingId },
      data: {
        booking_status: "CONFIRMED",
        payment_status: params.isOfflineManual ? "OFFLINE_COLLECTED" : "PAID",
        payment_id: params.paymentId || booking.payment_id,
      },
      include: { customer: true, dog: true, package: true },
    });
  });

  await logAudit({
    actorUserId: params.actorUserId,
    actorName: params.actorName || "SYSTEM",
    action: params.isOfflineManual ? "MANUAL_BOOKING_CONFIRMED" : "BOOKING_CONFIRMED",
    entityType: "BOOKING",
    entityId: booking.id,
    oldValue: { status: booking.booking_status, payment: booking.payment_status },
    newValue: { status: updatedBooking.booking_status, payment: updatedBooking.payment_status },
    reason: params.isOfflineManual ? "Staff confirmed booking with offline payment." : "Payment verified.",
  });

  return updatedBooking;
}

export async function rescheduleBooking(
  bookingId: string,
  params: {
    newDate: Date | string;
    newDropoff?: string;
    newPickup?: string;
    actorUserId?: string;
    actorName?: string;
  }
) {
  const booking = await prisma.dogDaycareBooking.findUnique({
    where: { id: bookingId },
    include: { customer: true, dog: true },
  });

  if (!booking) throw new NotFoundError("Booking", bookingId);

  if (["COMPLETED", "CANCELLED"].includes(booking.booking_status)) {
    throw new ConflictError(`Cannot reschedule booking in state '${booking.booking_status}'.`);
  }

  const newDateObj = new Date(params.newDate);
  newDateObj.setHours(0, 0, 0, 0);

  // Check availability on new date
  const avail = await checkDateAvailability(newDateObj);
  if (!avail.isAvailable) {
    throw new ConflictError(`Selected date ${avail.date} is not available (Status: ${avail.status}).`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (booking.booking_status === "CONFIRMED") {
      await assertAndLockSlotCapacity(tx, newDateObj);
    }

    return tx.dogDaycareBooking.update({
      where: { id: bookingId },
      data: {
        booking_date: newDateObj,
        dropoff_time: params.newDropoff || booking.dropoff_time,
        pickup_time: params.newPickup || booking.pickup_time,
        booking_status: "CONFIRMED",
      },
      include: { customer: true, dog: true, package: true },
    });
  });

  await logAudit({
    actorUserId: params.actorUserId,
    actorName: params.actorName || "STAFF",
    action: "BOOKING_RESCHEDULED",
    entityType: "BOOKING",
    entityId: booking.id,
    oldValue: { date: booking.booking_date, dropoff: booking.dropoff_time, pickup: booking.pickup_time },
    newValue: { date: updated.booking_date, dropoff: updated.dropoff_time, pickup: updated.pickup_time },
    reason: "Rescheduled by staff request.",
  });

  return updated;
}

export async function cancelBooking(
  bookingId: string,
  params: {
    cancellationReason?: string;
    actorUserId?: string;
    actorName?: string;
  }
) {
  const booking = await prisma.dogDaycareBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) throw new NotFoundError("Booking", bookingId);

  if (booking.booking_status === "CANCELLED") {
    return booking; // Idempotent
  }

  if (["CHECKED_IN", "IN_CARE", "READY_FOR_PICKUP", "COMPLETED"].includes(booking.booking_status)) {
    throw new ConflictError(`Cannot cancel booking once service has started (Status: ${booking.booking_status}).`);
  }

  // Calculate refund policy (24 hours free cancellation)
  const now = new Date();
  const bookingDate = new Date(booking.booking_date);
  const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  let refundAmount = 0;
  if (booking.payment_status === "PAID" || booking.payment_status === "OFFLINE_COLLECTED") {
    if (hoursUntilBooking >= 24) {
      refundAmount = booking.total_amount; // 100% refund
    } else {
      refundAmount = booking.total_amount * 0.5; // 50% late cancellation fee
    }
  }

  const updated = await prisma.dogDaycareBooking.update({
    where: { id: bookingId },
    data: {
      booking_status: "CANCELLED",
      payment_status: refundAmount > 0 ? "REFUNDED" : booking.payment_status,
      cancellation_reason: params.cancellationReason || "Cancelled by customer/staff request.",
      refund_amount: refundAmount,
    },
    include: { customer: true, dog: true },
  });

  await logAudit({
    actorUserId: params.actorUserId,
    actorName: params.actorName || "STAFF",
    action: "BOOKING_CANCELLED",
    entityType: "BOOKING",
    entityId: booking.id,
    oldValue: { status: booking.booking_status },
    newValue: { status: "CANCELLED", refundAmount },
    reason: params.cancellationReason || "Booking cancelled.",
  });

  return updated;
}

export async function updateBookingOperationalStatus(
  bookingId: string,
  newStatus: BookingStatus,
  params: {
    actorUserId?: string;
    actorName?: string;
    notes?: string;
    photoUrls?: string[];
  } = {}
) {
  const booking = await prisma.dogDaycareBooking.findUnique({
    where: { id: bookingId },
    include: { checkin: true, customer: true, dog: true },
  });

  if (!booking) throw new NotFoundError("Booking", bookingId);

  // Validate state transitions
  const validTransitions: Record<string, string[]> = {
    CONFIRMED: ["CHECKED_IN", "CANCELLED"],
    CHECKED_IN: ["IN_CARE"],
    IN_CARE: ["READY_FOR_PICKUP"],
    READY_FOR_PICKUP: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
    PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  };

  const allowed = validTransitions[booking.booking_status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ConflictError(
      `Invalid transition from '${booking.booking_status}' to '${newStatus}'. Allowed: ${allowed.join(", ")}`
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Upsert CheckIn operational tracking
    if (newStatus === "CHECKED_IN") {
      await tx.dogDaycareCheckIn.upsert({
        where: { booking_id: bookingId },
        update: {
          checked_in_at: new Date(),
          checked_in_by_user_id: params.actorUserId || null,
          staff_notes: params.notes || null,
        },
        create: {
          booking_id: bookingId,
          checked_in_at: new Date(),
          checked_in_by_user_id: params.actorUserId || null,
          staff_notes: params.notes || null,
        },
      });
    } else if (newStatus === "IN_CARE" && booking.checkin) {
      await tx.dogDaycareCheckIn.update({
        where: { booking_id: bookingId },
        data: { in_care_at: new Date() },
      });
    } else if (newStatus === "READY_FOR_PICKUP" && booking.checkin) {
      await tx.dogDaycareCheckIn.update({
        where: { booking_id: bookingId },
        data: { ready_for_pickup_at: new Date() },
      });
    } else if (newStatus === "COMPLETED" && booking.checkin) {
      await tx.dogDaycareCheckIn.update({
        where: { booking_id: bookingId },
        data: {
          picked_up_at: new Date(),
          picked_up_by_user_id: params.actorUserId || null,
        },
      });
    }

    return tx.dogDaycareBooking.update({
      where: { id: bookingId },
      data: { booking_status: newStatus },
      include: { customer: true, dog: true, checkin: true },
    });
  });

  await logAudit({
    actorUserId: params.actorUserId,
    actorName: params.actorName || "STAFF",
    action: `BOOKING_STATUS_${newStatus}`,
    entityType: "BOOKING",
    entityId: booking.id,
    oldValue: { status: booking.booking_status },
    newValue: { status: newStatus, notes: params.notes },
    reason: `Operational state updated to ${newStatus}.`,
  });

  return updated;
}

export async function listBookings(params: {
  status?: string;
  paymentStatus?: string;
  date?: string;
  search?: string;
  skip?: number;
  take?: number;
} = {}) {
  const { status, paymentStatus, date, search, skip = 0, take = 50 } = params;

  const where: any = {};
  if (status && status !== "ALL") where.booking_status = status;
  if (paymentStatus && paymentStatus !== "ALL") where.payment_status = paymentStatus;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    where.booking_date = d;
  }
  if (search) {
    where.OR = [
      { booking_number: { contains: search } },
      { customer: { name: { contains: search } } },
      { customer: { phone: { contains: search } } },
      { dog: { name: { contains: search } } },
      { dog: { breed: { contains: search } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.dogDaycareBooking.findMany({
      where,
      skip,
      take,
      orderBy: { booking_date: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        dog: { select: { id: true, name: true, breed: true } },
        package: { select: { id: true, name: true, code: true } },
        checkin: true,
      },
    }),
    prisma.dogDaycareBooking.count({ where }),
  ]);

  return { bookings, total, skip, take };
}

export async function getBookingDetails(bookingId: string) {
  const booking = await prisma.dogDaycareBooking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      dog: {
        include: {
          vaccination_records: {
            include: { documents: true },
          },
        },
      },
      package: true,
      checkin: {
        include: {
          checked_in_by_user: { select: { id: true, name: true } },
          picked_up_by_user: { select: { id: true, name: true } },
        },
      },
      payment: true,
    },
  });

  if (!booking) throw new NotFoundError("Booking", bookingId);

  // Check vaccination compliance
  const vaxCheck = await checkVaccinationCompliance(booking.dog_id, booking.booking_date);

  // Fetch audit trail for this booking
  const auditLogs = await prisma.auditLog.findMany({
    where: { entity_type: "BOOKING", entity_id: bookingId },
    orderBy: { created_at: "desc" },
  });

  return {
    ...booking,
    vaccination_compliance: vaxCheck,
    timeline: auditLogs,
  };
}
