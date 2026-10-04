import { logAudit, getAuditLogs } from "../src/core/audit";

export async function runAuditTests() {
  console.log("\n🧪 Running Phase 1 Audit Logging Tests...");

  // 1. Write Audit Log
  const testAction = "TEST_SECURITY_ACTION_" + Date.now();
  const entry = await logAudit({
    actorName: "Test Suite",
    action: testAction,
    entityType: "SECURITY_TEST",
    entityId: "test_entity_99",
    oldValue: { status: "DRAFT" },
    newValue: { status: "ACTIVE" },
    reason: "Verifying audit immutability and record integrity.",
  });

  if (!entry || !entry.id) {
    throw new Error("Audit log creation failed.");
  }
  console.log("   ✅ Audit log creation passed");

  // 2. Query Audit Log
  const queryResult = await getAuditLogs({ action: testAction });
  if (queryResult.total === 0 || queryResult.logs[0].id !== entry.id) {
    throw new Error("Audit log query failed to locate recent entry.");
  }

  const log = queryResult.logs[0];
  if (!log.new_value || !log.new_value.includes("ACTIVE")) {
    throw new Error("Audit log payload verification failed.");
  }
  console.log("   ✅ Audit log querying and payload verification passed");

  return { passed: 2, failed: 0 };
}
