import { UserRole, SessionPayload } from "@/shared/types";
import { ForbiddenError } from "@/core/errors";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  STAFF: 40,
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: ["*"],
  ADMIN: [
    "bookings:*",
    "customers:*",
    "dogs:*",
    "vaccinations:*",
    "payments:*",
    "templates:*",
    "automations:*",
    "pricing:*",
    "services:*",
    "staff:read",
    "staff:manage",
    "settings:*",
    "audit:read",
  ],
  MANAGER: [
    "bookings:*",
    "customers:*",
    "dogs:*",
    "vaccinations:*",
    "payments:read",
    "payments:create",
    "templates:read",
    "automations:read",
    "pricing:read",
    "staff:read",
    "audit:read",
  ],
  STAFF: [
    "bookings:read",
    "bookings:create",
    "bookings:confirm",
    "bookings:checkin",
    "bookings:status",
    "customers:read",
    "customers:create",
    "dogs:read",
    "dogs:create",
    "vaccinations:read",
    "vaccinations:verify",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  if (role === "OWNER") return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  if (permissions.includes("*")) return true;

  const [resource, action] = permission.split(":");
  return permissions.some((p) => {
    if (p === "*") return true;
    if (p === `${resource}:*`) return true;
    return p === permission;
  });
}

export function canManageRole(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[targetUserRole];
}

export function requirePermission(session: SessionPayload, permission: string): void {
  if (!hasPermission(session.role, permission)) {
    throw new ForbiddenError(`Permission denied: '${permission}' required for role '${session.role}'.`);
  }
}
