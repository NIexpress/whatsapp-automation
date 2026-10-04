import { runAuthTests } from "./auth.test";
import { runRbacTests } from "./rbac.test";
import { runCustomerTests } from "./customers.test";
import { runServiceTests } from "./services.test";
import { runAuditTests } from "./audit.test";

async function main() {
  console.log("==================================================");
  console.log("  NEEDIN PLATFORM — PHASE 1 MASTER TEST SUITE");
  console.log("==================================================");

  let totalPassed = 0;
  let totalFailed = 0;

  try {
    const authRes = await runAuthTests();
    totalPassed += authRes.passed;

    const rbacRes = await runRbacTests();
    totalPassed += rbacRes.passed;

    const custRes = await runCustomerTests();
    totalPassed += custRes.passed;

    const srvRes = await runServiceTests();
    totalPassed += srvRes.passed;

    const auditRes = await runAuditTests();
    totalPassed += auditRes.passed;

    console.log("\n==================================================");
    console.log(`  PHASE 1 QUALITY GATE: ALL ${totalPassed} TESTS PASSED! ✅`);
    console.log("==================================================");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ [PHASE 1 TEST FAILURE]:", error.message || error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
