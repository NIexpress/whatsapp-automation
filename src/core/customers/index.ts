import prisma from "@/shared/prisma";
import { ValidationError, NotFoundError } from "@/core/errors";

export interface UpsertCustomerInput {
  phone: string;
  name: string;
  email?: string | null;
  notes?: string | null;
}

export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) throw new ValidationError("Phone number is required.");
  // Normalize: keep digits, ensure minimum length
  let digits = rawPhone.replace(/\D/g, "");
  // If user entered 0 prefix (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.substring(1);
  }
  if (digits.length < 10) {
    throw new ValidationError(`Invalid phone number: ${rawPhone}. Must have at least 10 digits.`);
  }
  // Standardize 10 digit Indian numbers to 91XXXXXXXXXX
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export async function findOrCreateCustomer(input: UpsertCustomerInput) {
  const normalizedPhone = normalizePhoneNumber(input.phone);
  if (!input.name || input.name.trim().length === 0) {
    throw new ValidationError("Customer name is required.");
  }

  const customer = await prisma.customer.upsert({
    where: { phone: normalizedPhone },
    update: {
      name: input.name.trim(),
      ...(input.email !== undefined && { email: input.email ? input.email.trim() : null }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    create: {
      phone: normalizedPhone,
      name: input.name.trim(),
      email: input.email ? input.email.trim() : null,
      notes: input.notes || null,
    },
    include: {
      dogs: true,
    },
  });

  return customer;
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      dogs: {
        include: {
          vaccination_records: true,
        },
      },
      bookings: {
        orderBy: { booking_date: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) {
    throw new NotFoundError("Customer", id);
  }
  return customer;
}

export async function getCustomerByPhone(phone: string) {
  const normalized = normalizePhoneNumber(phone);
  return prisma.customer.findUnique({
    where: { phone: normalized },
    include: {
      dogs: {
        include: {
          vaccination_records: true,
        },
      },
    },
  });
}

export async function listCustomers(params: { search?: string; skip?: number; take?: number } = {}) {
  const { search, skip = 0, take = 50 } = params;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        dogs: { select: { id: true, name: true, breed: true } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, total, skip, take };
}
