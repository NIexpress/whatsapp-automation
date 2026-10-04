import prisma from "@/shared/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors";
import { logAudit } from "@/core/audit";
import { assertAndLockBayCapacity, normalizeDate } from "../availability";
import { calculateCarWashPrice } from "../pricing";

export type CarWashBookingStatus =
  | "CONFIRMED"
  | "IN_QUEUE"
  | "WASHING"
  | "DETAILING"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type CarWashPaymentStatus = "PENDING" | "PAID" | "OFFLINE_COLLECTED" | "REFUNDED";

export interface CreateCarWashBookingInput {
  customerId: string;
  vehicleId: string;
  packageCodeOrId: string;
  bookingDate: Date | string;
  timeSlot: string;
  bayNumber?: number;
  initialStatus?: CarWashBookingStatus;
  initialPaymentStatus?: CarWashPaymentStatus;
  source?: "WHATSAPP" | "DASHBOARD_MANUAL" | "PHONE_IN";
  notes?: string | null;
  actorUserId?: string;
  actorName?: string;
}

export function generateCarWashBookingNumber(): string {
  const now = new Date();
  const yyyymm = now.toISOString().slice(0, 7).replace("-", "");
  const timePart = Date.now().toString().slice(-5);
  const rand = Math.floor(100 + Math.random() * 900);
  return `ND-CW-${yyyymm}-${timePart}${rand}`;
}

export async function createCarWashBooking(input: CreateCarWashBookingInput) {
  const { dateObj } = normalizeDate(input.bookingDate);

  // 1. Verify customer and vehicle
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new NotFoundError("Customer", input.customerId);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new NotFoundError("Vehicle", input.vehicleId);
  if (vehicle.customer_id !== customer.id) {
    throw new ValidationError("The selected vehicle does not belong to this customer.");
  }

  // 2. Calculate Pricing based on package and vehicle category
  const pricing = await calculateCarWashPrice({
    packageCodeOrId: input.packageCodeOrId,
    vehicleType: vehicle.vehicle_type as any,
  });

  const bookingNumber = generateCarWashBookingNumber();
  const initialStatus = input.initialStatus || "CONFIRMED";
  const initialPayment = input.initialPaymentStatus || "PENDING";

  // 3. Execute inside transaction with capacity locking
  const booking = await prisma.$transaction(async (tx) => {
    let assignedBay = input.bayNumber;
    if (!assignedBay && initialStatus !== "CANCELLED") {
      assignedBay = await assertAndLockBayCapacity(tx, dateObj, input.timeSlot);
    }

    return tx.carWashBooking.create({
      data: {
        booking_number: bookingNumber,
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        package_id: pricing.package.id,
        booking_date: dateObj,
        time_slot: input.timeSlot,
        bay_number: assignedBay || 1,
        amount: pricing.basePrice,
        discount: pricing.discount,
        total_amount: pricing.total,
        booking_status: initialStatus,
        payment_status: initialPayment,
        special_instructions: input.notes || null,
        source: input.source || "WHATSAPP",
      },
      include: {
        customer: true,
        vehicle: true,
        package: true,
      },
    });
  });

  // 4. Audit Log
  await logAudit({
    action: "CAR_WASH_BOOKING_CREATED",
    entityType: "CAR_WASH_BOOKING",
    entityId: booking.id,
    actorUserId: input.actorUserId || null,
    actorName: input.actorName || "WhatsApp Bot",
    newValue: {
      booking_number: booking.booking_number,
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      plate: vehicle.license_plate,
      slot: input.timeSlot,
      bay: booking.bay_number,
      total_amount: booking.total_amount,
    },
  });

  return booking;
}

export async function getCarWashBookingById(id: string) {
  const booking = await prisma.carWashBooking.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      package: true,
      payment: true,
    },
  });
  if (!booking) throw new NotFoundError("CarWashBooking", id);
  return booking;
}

export async function listCarWashBookings(params?: {
  status?: string;
  date?: string;
  customerId?: string;
  vehicleId?: string;
  bayNumber?: number;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params?.status) where.booking_status = params.status;
  if (params?.customerId) where.customer_id = params.customerId;
  if (params?.vehicleId) where.vehicle_id = params.vehicleId;
  if (params?.bayNumber) where.bay_number = params.bayNumber;

  if (params?.date) {
    const { dateObj } = normalizeDate(params.date);
    where.booking_date = dateObj;
  }

  if (params?.search) {
    const q = params.search.trim();
    where.OR = [
      { booking_number: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { phone: { contains: q } } },
      { vehicle: { license_plate: { contains: q } } },
      { vehicle: { model: { contains: q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.carWashBooking.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: true,
        vehicle: true,
        package: true,
        payment: true,
      },
      orderBy: [{ booking_date: "desc" }, { time_slot: "asc" }],
    }),
    prisma.carWashBooking.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function updateCarWashStatus(
  bookingId: string,
  newStatus: CarWashBookingStatus,
  notes?: string,
  actorUserId?: string,
  actorName?: string
) {
  const booking = await prisma.carWashBooking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("CarWashBooking", bookingId);

  const prevStatus = booking.booking_status;

  const updated = await prisma.carWashBooking.update({
    where: { id: bookingId },
    data: {
      booking_status: newStatus,
      special_instructions: notes ? `${booking.special_instructions ? booking.special_instructions + " | " : ""}${notes}` : booking.special_instructions,
    },
    include: {
      customer: true,
      vehicle: true,
      package: true,
    },
  });

  await logAudit({
    action: "CAR_WASH_STATUS_UPDATED",
    entityType: "CAR_WASH_BOOKING",
    entityId: bookingId,
    actorUserId: actorUserId || null,
    actorName: actorName || "Staff",
    oldValue: { status: prevStatus },
    newValue: {
      booking_number: booking.booking_number,
      from: prevStatus,
      to: newStatus,
      notes,
    },
  });

  return updated;
}

export async function cancelCarWashBooking(
  bookingId: string,
  reason?: string,
  actorUserId?: string,
  actorName?: string
) {
  const booking = await prisma.carWashBooking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("CarWashBooking", bookingId);

  const updated = await prisma.carWashBooking.update({
    where: { id: bookingId },
    data: {
      booking_status: "CANCELLED",
      cancellation_reason: reason || "Cancelled by user",
    },
    include: { customer: true, vehicle: true },
  });

  await logAudit({
    action: "CAR_WASH_BOOKING_CANCELLED",
    entityType: "CAR_WASH_BOOKING",
    entityId: bookingId,
    actorUserId: actorUserId || null,
    actorName: actorName || "Staff",
    reason,
    newValue: {
      booking_number: booking.booking_number,
      reason,
    },
  });

  return updated;
}
