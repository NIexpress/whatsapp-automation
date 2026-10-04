import prisma from "@/shared/prisma";
import { NotFoundError, ValidationError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export interface CreateVehicleInput {
  customerId: string;
  make: string;
  model: string;
  vehicleType: "HATCHBACK" | "SEDAN" | "SUV" | "LUXURY";
  licensePlate: string;
  color?: string | null;
  notes?: string | null;
  actorUserId?: string;
  actorName?: string;
}

export async function createVehicle(input: CreateVehicleInput) {
  if (!input.customerId || !input.make || !input.model || !input.licensePlate) {
    throw new ValidationError("Customer ID, make, model, and license plate are required.");
  }

  const cleanPlate = input.licensePlate.trim().toUpperCase().replace(/\s+/g, "");

  // Check customer exists
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) {
    throw new NotFoundError("Customer", input.customerId);
  }

  // Check unique plate
  const existing = await prisma.vehicle.findUnique({ where: { license_plate: cleanPlate } });
  if (existing) {
    throw new ValidationError(`Vehicle with license plate ${cleanPlate} already registered.`);
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      customer_id: input.customerId,
      make: input.make.trim(),
      model: input.model.trim(),
      vehicle_type: input.vehicleType || "SEDAN",
      license_plate: cleanPlate,
      color: input.color?.trim() || null,
      notes: input.notes?.trim() || null,
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  await logAudit({
    action: "VEHICLE_REGISTERED",
    entityType: "VEHICLE",
    entityId: vehicle.id,
    actorUserId: input.actorUserId || null,
    actorName: input.actorName || "System",
    newValue: { license_plate: vehicle.license_plate, customer_id: input.customerId },
  });

  return vehicle;
}

export async function getVehicleById(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      customer: true,
      bookings: {
        orderBy: { booking_date: "desc" },
        take: 10,
        include: { package: true },
      },
    },
  });
  if (!vehicle) throw new NotFoundError("Vehicle", id);
  return vehicle;
}

export async function getVehicleByPlate(plate: string) {
  const cleanPlate = plate.trim().toUpperCase().replace(/\s+/g, "");
  return prisma.vehicle.findUnique({
    where: { license_plate: cleanPlate },
    include: { customer: true },
  });
}

export async function listCustomerVehicles(customerId: string) {
  return prisma.vehicle.findMany({
    where: { customer_id: customerId },
    include: { bookings: { take: 1, orderBy: { booking_date: "desc" } } },
    orderBy: { created_at: "desc" },
  });
}

export async function listAllVehicles(params?: {
  search?: string;
  vehicleType?: string;
  page?: number;
  limit?: number;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params?.search) {
    const q = params.search.trim();
    where.OR = [
      { license_plate: { contains: q } },
      { make: { contains: q } },
      { model: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { phone: { contains: q } } },
    ];
  }

  if (params?.vehicleType) {
    where.vehicle_type = params.vehicleType;
  }

  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        bookings: { take: 1, orderBy: { booking_date: "desc" } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
