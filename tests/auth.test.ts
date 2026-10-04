import prisma from "../src/shared/prisma";
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from "../src/core/auth/session";

export async function runAuthTests() {
  console.log("\n🧪 Running Phase 1 Auth Tests...");

  // 1. Password Hashing & Verification
  const testPassword = "SuperSecretPassword@123";
  const hash = await hashPassword(testPassword);
  if (!hash || hash.length < 20) {
    throw new Error("Password hash generation failed.");
  }
  const isMatch = await verifyPassword(testPassword, hash);
  if (!isMatch) {
    throw new Error("Password verification failed for valid password.");
  }
  const isFalseMatch = await verifyPassword("WrongPassword", hash);
  if (isFalseMatch) {
    throw new Error("Password verification succeeded for invalid password.");
  }
  console.log("   ✅ Password hashing & verification passed");

  // 2. JWT Session Token Sign & Verify
  const sessionPayload = {
    userId: "usr_test_123",
    email: "test.staff@needin.com",
    name: "Test Staff",
    role: "STAFF" as const,
  };
  const token = await signSessionToken(sessionPayload);
  if (!token || typeof token !== "string") {
    throw new Error("Session token generation failed.");
  }
  const verified = await verifySessionToken(token);
  if (!verified || verified.userId !== sessionPayload.userId || verified.role !== "STAFF") {
    throw new Error("Session token verification returned invalid payload.");
  }

  const invalidToken = await verifySessionToken("invalid.tampered.token");
  if (invalidToken !== null) {
    throw new Error("Tampered token verification did not return null.");
  }
  console.log("   ✅ JWT Session signing & verification passed");

  // 3. Database Authentication against Seeded Accounts
  const owner = await prisma.user.findUnique({ where: { email: "owner@needin.com" } });
  if (!owner) throw new Error("Seeded owner account not found.");

  const isOwnerValid = await verifyPassword("Needin@2026", owner.password_hash);
  if (!isOwnerValid) throw new Error("Seeded owner password does not match.");

  const staff = await prisma.user.findUnique({ where: { email: "staff@needin.com" } });
  if (!staff) throw new Error("Seeded staff account not found.");
  const isStaffValid = await verifyPassword("Needin@2026", staff.password_hash);
  if (!isStaffValid) throw new Error("Seeded staff password does not match.");
  console.log("   ✅ Database user credentials verification passed");

  return { passed: 3, failed: 0 };
}
