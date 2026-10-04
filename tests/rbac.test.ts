import { hasPermission, canManageRole, requirePermission, ROLE_HIERARCHY } from "../src/core/auth/rbac";
import { ForbiddenError } from "../src/core/errors";

export async function runRbacTests() {
  console.log("\n🧪 Running Phase 1 RBAC & Permission Tests...");

  // 1. Role Hierarchy Checks
  if (ROLE_HIERARCHY.OWNER <= ROLE_HIERARCHY.ADMIN) throw new Error("OWNER must rank higher than ADMIN.");
  if (ROLE_HIERARCHY.ADMIN <= ROLE_HIERARCHY.MANAGER) throw new Error("ADMIN must rank higher than MANAGER.");
  if (ROLE_HIERARCHY.MANAGER <= ROLE_HIERARCHY.STAFF) throw new Error("MANAGER must rank higher than STAFF.");

  if (!canManageRole("OWNER", "ADMIN")) throw new Error("OWNER should be able to manage ADMIN.");
  if (!canManageRole("ADMIN", "STAFF")) throw new Error("ADMIN should be able to manage STAFF.");
  if (canManageRole("STAFF", "MANAGER")) throw new Error("STAFF must NOT be able to manage MANAGER.");
  if (canManageRole("MANAGER", "MANAGER")) throw new Error("MANAGER must NOT be able to manage same role.");
  console.log("   ✅ Role hierarchy and management checks passed");

  // 2. Permission Wildcard and Exact Match Checks
  if (!hasPermission("OWNER", "any:random:permission")) {
    throw new Error("OWNER must have all permissions via wildcard.");
  }
  if (!hasPermission("ADMIN", "bookings:confirm")) {
    throw new Error("ADMIN must have bookings:confirm via bookings:*.");
  }
  if (!hasPermission("ADMIN", "settings:edit")) {
    throw new Error("ADMIN must have settings:*.");
  }

  // STAFF specific checks
  if (!hasPermission("STAFF", "bookings:read")) {
    throw new Error("STAFF must have bookings:read.");
  }
  if (!hasPermission("STAFF", "bookings:checkin")) {
    throw new Error("STAFF must have bookings:checkin.");
  }
  if (hasPermission("STAFF", "settings:edit")) {
    throw new Error("STAFF must NOT have settings permission.");
  }
  if (hasPermission("STAFF", "staff:manage")) {
    throw new Error("STAFF must NOT have staff:manage permission.");
  }
  console.log("   ✅ Permission pattern matching passed");

  // 3. requirePermission Guard
  const staffSession = { userId: "u1", email: "staff@needin.com", name: "Staff", role: "STAFF" as const };
  requirePermission(staffSession, "bookings:read"); // Should not throw

  let thrown = false;
  try {
    requirePermission(staffSession, "staff:manage");
  } catch (err) {
    if (err instanceof ForbiddenError) thrown = true;
  }
  if (!thrown) throw new Error("requirePermission did not throw ForbiddenError for unauthorized action.");
  console.log("   ✅ Server-side requirePermission guard passed");

  return { passed: 3, failed: 0 };
}
