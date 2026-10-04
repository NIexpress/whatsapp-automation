import prisma from "../src/shared/prisma";
import { processIncomingWhatsAppMessage } from "../src/core/messaging/processor";

async function runTests() {
  console.log("=========================================================");
  console.log("🤝 NEEDIN TEST: HUMAN SUPPORT & MANUAL DASHBOARD SWITCH");
  console.log("=========================================================\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  };

  const testPhone = `919666${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Send "hi" to initialize conversation
  console.log("Step 1: Customer initiates chat with 'hi'");
  const msg1 = await processIncomingWhatsAppMessage({
    phone: testPhone,
    senderName: "Kavita Rao",
    content: "hi",
  });
  assert(Boolean(msg1.reply?.includes("Needin Multi-Service Platform")), "Menu returned");

  let conv = await prisma.conversation.findFirst({
    where: { phone: testPhone },
  });
  assert(conv?.status === "AI_ACTIVE", "Conversation initial status is AI_ACTIVE");

  // 2. Customer sends "4" (Human Support)
  console.log("\nStep 2: Customer selects Option 4 (Human Support)");
  const msg2 = await processIncomingWhatsAppMessage({
    phone: testPhone,
    senderName: "Kavita Rao",
    content: "4",
  });

  assert(
    Boolean(msg2.reply?.includes("Connecting You with Our Team") && msg2.reply?.includes("notified our on-duty front desk")),
    "Bot politely informs customer that front desk staff will contact them shortly"
  );

  conv = await prisma.conversation.findFirst({
    where: { phone: testPhone },
  });
  assert(
    conv?.status === "AI_ACTIVE",
    "CRITICAL REQUIREMENT: Conversation status DID NOT switch to manual mode! (Remains AI_ACTIVE)"
  );
  assert(
    conv?.current_intent === "HUMAN_SUPPORT_REQUESTED",
    "Conversation current_intent flagged as HUMAN_SUPPORT_REQUESTED for dashboard staff"
  );

  // 3. Customer sends subsequent message "menu" - bot MUST still respond!
  console.log("\nStep 3: Customer sends subsequent message 'menu'");
  const msg3 = await processIncomingWhatsAppMessage({
    phone: testPhone,
    senderName: "Kavita Rao",
    content: "menu",
  });
  assert(
    Boolean(msg3.reply?.includes("Needin Multi-Service Platform")),
    "AI bot is still active and continues responding to customer"
  );

  // 4. Staff manually switches conversation to HUMAN_ACTIVE via dashboard
  console.log("\nStep 4: Staff manually toggles conversation to HUMAN_ACTIVE from Dashboard");
  await prisma.conversation.update({
    where: { id: conv!.id },
    data: { status: "HUMAN_ACTIVE" },
  });

  conv = await prisma.conversation.findFirst({
    where: { phone: testPhone },
  });
  assert(conv?.status === "HUMAN_ACTIVE", "Status is now HUMAN_ACTIVE via staff dashboard action");

  // 5. Customer sends a message while in HUMAN_ACTIVE mode - bot does NOT auto-reply
  console.log("\nStep 5: Customer sends message while in MANUAL staff mode");
  const msg4 = await processIncomingWhatsAppMessage({
    phone: testPhone,
    senderName: "Kavita Rao",
    content: "Are you there?",
  });
  assert(msg4.reply === null, "AI does NOT auto-reply when in manual HUMAN_ACTIVE mode");
  assert(msg4.status === "HUMAN_ACTIVE", "Returned status indicates manual staff mode");

  // 6. Staff manually switches back to AI_ACTIVE from Dashboard
  console.log("\nStep 6: Staff switches back to AI_ACTIVE from Dashboard");
  await prisma.conversation.update({
    where: { id: conv!.id },
    data: { status: "AI_ACTIVE" },
  });

  const msg5 = await processIncomingWhatsAppMessage({
    phone: testPhone,
    senderName: "Kavita Rao",
    content: "1",
  });
  assert(
    Boolean(msg5.reply?.includes("Dog Day Care")),
    "AI bot resumes automated handling after staff toggles back to AI mode"
  );

  console.log("\n=========================================================");
  console.log(`🏁 RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================");

  if (failed > 0) process.exit(1);
}

runTests();
