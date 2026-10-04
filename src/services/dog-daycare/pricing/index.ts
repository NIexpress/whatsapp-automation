import prisma from "@/shared/prisma";
import { NotFoundError } from "@/core/errors";

export async function listDaycarePackages() {
  return prisma.dogDaycarePackage.findMany({
    where: { is_active: true },
    orderBy: { price: "asc" },
  });
}

export async function createDaycarePackage(params: {
  name: string;
  code: string;
  price: number;
  description?: string;
  validityDays?: number;
  totalVisits?: number;
}) {
  return prisma.dogDaycarePackage.create({
    data: {
      name: params.name,
      code: params.code.toUpperCase().replace(/\s+/g, "_"),
      price: Number(params.price),
      description: params.description || null,
      validity_days: Number(params.validityDays || 1),
      total_visits: Number(params.totalVisits || 1),
      is_active: true,
    },
  });
}

export async function getPackageByCode(code: string) {
  const pkg = await prisma.dogDaycarePackage.findUnique({
    where: { code },
  });
  if (!pkg) throw new NotFoundError("Dog Day Care Package", code);
  return pkg;
}

export async function calculateBookingPrice(params: {
  packageCodeOrId?: string;
  addGrooming?: boolean;
}) {
  const { packageCodeOrId = "SINGLE_DAY", addGrooming = false } = params;

  let pkg = await prisma.dogDaycarePackage.findFirst({
    where: {
      OR: [{ id: packageCodeOrId }, { code: packageCodeOrId }],
      is_active: true,
    },
  });

  if (!pkg) {
    pkg = await prisma.dogDaycarePackage.findFirst({
      where: { code: "SINGLE_DAY" },
    });
  }

  const basePrice = pkg ? pkg.price : 500;
  let groomingPrice = 0;

  if (addGrooming) {
    const groomingPkg = await prisma.dogDaycarePackage.findUnique({
      where: { code: "GROOMING_ADDON" },
    });
    groomingPrice = groomingPkg ? groomingPkg.price : 300;
  }

  const total = basePrice + groomingPrice;

  return {
    package: pkg,
    basePrice,
    groomingPrice,
    discount: 0,
    total,
    currency: "INR",
  };
}
