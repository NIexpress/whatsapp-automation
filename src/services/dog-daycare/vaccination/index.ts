import prisma from "@/shared/prisma";
import { NotFoundError, ValidationError } from "@/core/errors";
import { logAudit } from "@/core/audit";

export interface CreateVaccineInput {
  dogId: string;
  vaccineName: string; // RABIES, DHPPI, BORDETELLA
  administeredDate?: Date | string | null;
  expiryDate?: Date | string | null;
  documentUrl?: string | null;
  documentType?: string;
  originalFilename?: string | null;
  notes?: string | null;
}

export async function createVaccinationRecord(input: CreateVaccineInput) {
  const dog = await prisma.dog.findUnique({ where: { id: input.dogId } });
  if (!dog) throw new NotFoundError("Dog", input.dogId);

  const adminDate = input.administeredDate ? new Date(input.administeredDate) : null;
  const expDate = input.expiryDate ? new Date(input.expiryDate) : null;

  const record = await prisma.vaccinationRecord.create({
    data: {
      dog_id: input.dogId,
      vaccine_name: input.vaccineName.toUpperCase().trim(),
      administered_date: adminDate,
      expiry_date: expDate,
      verified_status: "PENDING",
      notes: input.notes || null,
      ...(input.documentUrl && {
        documents: {
          create: {
            file_url: input.documentUrl,
            file_type: input.documentType || "IMAGE",
            original_filename: input.originalFilename || "vaccine_proof",
          },
        },
      }),
    },
    include: {
      documents: true,
      dog: { include: { customer: true } },
    },
  });

  return record;
}

export async function verifyVaccinationRecord(
  recordId: string,
  status: "APPROVED" | "REJECTED",
  staffUserId: string,
  notes?: string
) {
  const record = await prisma.vaccinationRecord.findUnique({
    where: { id: recordId },
    include: { dog: { include: { customer: true } } },
  });

  if (!record) throw new NotFoundError("Vaccination Record", recordId);

  const staff = await prisma.user.findUnique({ where: { id: staffUserId } });
  if (!staff) throw new NotFoundError("Staff User", staffUserId);

  const updated = await prisma.vaccinationRecord.update({
    where: { id: recordId },
    data: {
      verified_status: status,
      verified_by_user_id: staffUserId,
      verified_at: new Date(),
      notes: notes || record.notes,
    },
    include: {
      dog: { include: { customer: true } },
      verified_by: { select: { id: true, name: true, role: true } },
      documents: true,
    },
  });

  await logAudit({
    actorUserId: staff.id,
    actorName: staff.name,
    action: `VACCINATION_${status}`,
    entityType: "VACCINATION",
    entityId: record.id,
    oldValue: { status: record.verified_status },
    newValue: { status, notes },
    reason: `Staff ${staff.name} marked vaccination ${record.vaccine_name} as ${status}.`,
  });

  return updated;
}

export async function listPendingVaccinations() {
  return prisma.vaccinationRecord.findMany({
    where: { verified_status: "PENDING" },
    orderBy: { created_at: "asc" },
    include: {
      dog: { include: { customer: { select: { id: true, name: true, phone: true } } } },
      documents: true,
    },
  });
}

export async function listVaccinationRecords(params: { status?: string; dogId?: string } = {}) {
  const where: any = {};
  if (params.status && params.status !== "ALL") {
    where.verified_status = params.status;
  }
  if (params.dogId) {
    where.dog_id = params.dogId;
  }
  return prisma.vaccinationRecord.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      dog: { include: { customer: { select: { id: true, name: true, phone: true } } } },
      documents: true,
      verified_by: { select: { id: true, name: true } },
    },
  });
}

export async function checkVaccinationCompliance(dogId: string, bookingDate: Date | string) {
  const target = new Date(bookingDate);
  target.setHours(0, 0, 0, 0);

  const approvedRecords = await prisma.vaccinationRecord.findMany({
    where: {
      dog_id: dogId,
      verified_status: "APPROVED",
    },
  });

  const hasRabies = approvedRecords.some(
    (r) => r.vaccine_name.includes("RABIES") && (!r.expiry_date || new Date(r.expiry_date) >= target)
  );

  const hasDHPPi = approvedRecords.some(
    (r) =>
      (r.vaccine_name.includes("DHPPI") || r.vaccine_name.includes("7-IN-1") || r.vaccine_name.includes("9-IN-1")) &&
      (!r.expiry_date || new Date(r.expiry_date) >= target)
  );

  const hasBordetella = approvedRecords.some(
    (r) => r.vaccine_name.includes("BORDETELLA") && (!r.expiry_date || new Date(r.expiry_date) >= target)
  );

  const compliant = hasRabies && hasDHPPi;

  return {
    compliant,
    hasRabies,
    hasDHPPi,
    hasBordetella,
    records: approvedRecords,
  };
}
