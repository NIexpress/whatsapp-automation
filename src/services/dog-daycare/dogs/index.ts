import prisma from "@/shared/prisma";
import { NotFoundError, ValidationError } from "@/core/errors";

export interface CreateDogInput {
  customerId: string;
  name: string;
  breed: string;
  ageYears?: number;
  ageMonths?: number;
  weightKg?: number | null;
  gender?: string;
  isSpayedNeutered?: boolean;
  allergies?: string | null;
  medicalNotes?: string | null;
  emergencyContact?: string | null;
}

export async function createDog(input: CreateDogInput) {
  if (!input.customerId || !input.name || !input.breed) {
    throw new ValidationError("Customer ID, dog name, and breed are required.");
  }

  // Ensure customer exists
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) {
    throw new NotFoundError("Customer", input.customerId);
  }

  return prisma.dog.create({
    data: {
      customer_id: input.customerId,
      name: input.name.trim(),
      breed: input.breed.trim(),
      age_years: input.ageYears !== undefined ? input.ageYears : 1,
      age_months: input.ageMonths !== undefined ? input.ageMonths : 0,
      weight_kg: input.weightKg || null,
      gender: input.gender || "UNKNOWN",
      is_spayed_neutered: Boolean(input.isSpayedNeutered),
      allergies: input.allergies || null,
      medical_notes: input.medicalNotes || null,
      emergency_contact: input.emergencyContact || customer.phone,
      status: "ACTIVE",
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
}

export async function getDogById(id: string) {
  const dog = await prisma.dog.findUnique({
    where: { id },
    include: {
      customer: true,
      vaccination_records: {
        include: { documents: true, verified_by: { select: { id: true, name: true } } },
        orderBy: { created_at: "desc" },
      },
      daycare_bookings: {
        orderBy: { booking_date: "desc" },
        take: 10,
      },
    },
  });

  if (!dog) {
    throw new NotFoundError("Dog", id);
  }
  return dog;
}

export async function listAllDogs(params: { search?: string; customerId?: string; skip?: number; take?: number } = {}) {
  const { search, customerId, skip = 0, take = 50 } = params;

  const where: any = {};
  if (customerId) where.customer_id = customerId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { breed: { contains: search } },
      { customer: { name: { contains: search } } },
      { customer: { phone: { contains: search } } },
    ];
  }

  const [dogs, total] = await Promise.all([
    prisma.dog.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        vaccination_records: { select: { id: true, vaccine_name: true, verified_status: true, expiry_date: true } },
        _count: { select: { daycare_bookings: true } },
      },
    }),
    prisma.dog.count({ where }),
  ]);

  return { dogs, total, skip, take };
}
