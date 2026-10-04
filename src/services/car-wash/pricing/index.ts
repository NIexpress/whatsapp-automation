import prisma from "@/shared/prisma";
import { NotFoundError, ValidationError } from "@/core/errors";

export interface CalculatePriceInput {
  packageCodeOrId: string;
  vehicleType: "HATCHBACK" | "SEDAN" | "SUV" | "LUXURY";
  discountAmount?: number;
}

export async function listCarWashPackages(activeOnly = true) {
  return prisma.carWashPackage.findMany({
    where: activeOnly ? { is_active: true } : undefined,
    orderBy: { price_sedan: "asc" },
  });
}

export async function getCarWashPackageByCodeOrId(codeOrId: string) {
  let pkg = await prisma.carWashPackage.findUnique({
    where: { id: codeOrId },
  });
  if (!pkg) {
    pkg = await prisma.carWashPackage.findUnique({
      where: { code: codeOrId },
    });
  }
  return pkg;
}

export async function calculateCarWashPrice(input: CalculatePriceInput) {
  const pkg = await getCarWashPackageByCodeOrId(input.packageCodeOrId);
  if (!pkg) {
    throw new NotFoundError("CarWashPackage", input.packageCodeOrId);
  }

  let basePrice = 0;
  switch (input.vehicleType) {
    case "HATCHBACK":
      basePrice = pkg.price_hatchback;
      break;
    case "SEDAN":
      basePrice = pkg.price_sedan;
      break;
    case "SUV":
      basePrice = pkg.price_suv;
      break;
    case "LUXURY":
      basePrice = pkg.price_luxury;
      break;
    default:
      basePrice = pkg.price_sedan;
  }

  const discount = Math.max(0, input.discountAmount || 0);
  const total = Math.max(0, basePrice - discount);

  return {
    package: pkg,
    vehicleType: input.vehicleType,
    basePrice,
    discount,
    total,
    durationMinutes: pkg.duration_minutes,
  };
}

export async function createCarWashPackage(input: {
  code: string;
  name: string;
  description?: string;
  priceHatchback: number;
  priceSedan: number;
  priceSuv: number;
  priceLuxury: number;
  durationMinutes?: number;
}) {
  if (!input.code || !input.name) {
    throw new ValidationError("Package code and name are required.");
  }

  return prisma.carWashPackage.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price_hatchback: input.priceHatchback,
      price_sedan: input.priceSedan,
      price_suv: input.priceSuv,
      price_luxury: input.priceLuxury,
      duration_minutes: input.durationMinutes || 45,
      is_active: true,
    },
  });
}
