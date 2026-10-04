import prisma from "@/shared/prisma";
import { NotFoundError, ValidationError } from "@/core/errors";

export interface RegisterServiceInput {
  code: string;
  name: string;
  description?: string;
  icon?: string;
}

export async function registerService(input: RegisterServiceInput) {
  if (!input.code || !input.name) {
    throw new ValidationError("Service code and name are required.");
  }

  const normalizedCode = input.code.toUpperCase().trim();

  return prisma.service.upsert({
    where: { code: normalizedCode },
    update: {
      name: input.name.trim(),
      description: input.description || null,
      icon: input.icon || "paw-print",
      is_active: true,
    },
    create: {
      code: normalizedCode,
      name: input.name.trim(),
      description: input.description || null,
      icon: input.icon || "paw-print",
      is_active: true,
    },
  });
}

export async function listActiveServices() {
  return prisma.service.findMany({
    where: { is_active: true },
    orderBy: { created_at: "asc" },
  });
}

export async function getServiceByCode(code: string) {
  const normalized = code.toUpperCase().trim();
  const service = await prisma.service.findUnique({
    where: { code: normalized },
    include: {
      configs: true,
    },
  });

  if (!service) {
    throw new NotFoundError("Service", code);
  }
  return service;
}

export async function getServiceConfig<T = any>(
  serviceCode: string,
  key: string,
  defaultValue?: T
): Promise<T> {
  const service = await getServiceByCode(serviceCode);
  const config = service.configs.find((c) => c.key === key);

  if (!config) {
    if (defaultValue !== undefined) return defaultValue;
    throw new NotFoundError(`Config key '${key}' for service`, serviceCode);
  }

  try {
    return JSON.parse(config.value_json) as T;
  } catch {
    return config.value_json as unknown as T;
  }
}

export async function setServiceConfig(
  serviceCode: string,
  key: string,
  value: any
) {
  const service = await getServiceByCode(serviceCode);
  const serialized = typeof value === "string" ? value : JSON.stringify(value);

  return prisma.serviceConfig.upsert({
    where: {
      service_id_key: {
        service_id: service.id,
        key,
      },
    },
    update: {
      value_json: serialized,
    },
    create: {
      service_id: service.id,
      key,
      value_json: serialized,
    },
  });
}
