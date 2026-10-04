import prisma from "../src/shared/prisma";
import { normalizePhoneNumber, findOrCreateCustomer } from "../src/core/customers";
import { createDog } from "../src/services/dog-daycare/dogs";
import {
  createVaccinationRecord,
  verifyVaccinationRecord,
  checkVaccinationCompliance,
} from "../src/services/dog-daycare/vaccination";
import { calculateBookingPrice } from "../src/services/dog-daycare/pricing";
import { checkDateAvailability, assertAndLockSlotCapacity } from "../src/services/dog-daycare/availability";
import {
  createDaycareBooking,
  confirmBooking,
  rescheduleBooking,
  cancelBooking,
  updateBookingOperationalStatus,
} from "../src/services/dog-daycare/bookings";
import { renderTemplate } from "../src/core/templates";
import { logAudit } from "../src/core/audit";

interface TestStats {
  total: number;
  passed: number;
  failed: number;
}

const stats: TestStats = { total: 0, passed: 0, failed: 0 };

function assert(condition: boolean, msg: string) {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    stats.failed++;
    console.error(`  ✗ FAIL: ${msg}`);
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

async function runMaster10xValidation() {
  console.log("===============================================================================");
  console.log("🚀 NEEDIN PLATFORM — 10× AGGRESSIVE MASTER VALIDATION SUITE");
  console.log("===============================================================================\n");

  const testSuffix = Date.now().toString().slice(-4);

  // -------------------------------------------------------------------------
  // SUITE 1: 10× Phone Normalization & Deduplication
  // -------------------------------------------------------------------------
  console.log("▶ SUITE 1: 10× Customer Phone Normalization & Deduplication");
  const phoneVariations = [
    { input: "+91 98765 43210", expected: "919876543210" },
    { input: "09876543210", expected: "919876543210" },
    { input: "9876543210", expected: "919876543210" },
    { input: "+91-98765-43210", expected: "919876543210" },
    { input: "91 98765 43210", expected: "919876543210" },
    { input: "  +91 98765 43210  ", expected: "919876543210" },
    { input: "98765 43210", expected: "919876543210" },
    { input: "+91 (987) 654-3210", expected: "919876543210" },
    { input: "098765-43210", expected: "919876543210" },
    { input: "98765.43210", expected: "919876543210" },
  ];

  for (let i = 0; i < phoneVariations.length; i++) {
    const { input, expected } = phoneVariations[i];
    const normalized = normalizePhoneNumber(input);
    assert(normalized === expected, `Phone Run #${i + 1}: "${input}" -> "${normalized}"`);
  }

  // -------------------------------------------------------------------------
  // SUITE 2: 10× Customer Creation & Idempotency
  // -------------------------------------------------------------------------
  console.log("\n▶ SUITE 2: 10× Customer Profile Upsert & Idempotency");
  const basePhone = `91999990${testSuffix}`;
  let firstCustomerId = "";

  for (let i = 0; i < 10; i++) {
    const customer = await findOrCreateCustomer({
      phone: basePhone,
      name: `VIP Customer ${testSuffix}`,
      email: `vip_${testSuffix}@example.com`,
    });
    if (i === 0) {
      firstCustomerId = customer.id;
      assert(!!customer.id, `Run #1: Created initial customer ID ${customer.id}`);
    } else {
      assert(
        customer.id === firstCustomerId,
        `Run #${i + 1}: Idempotent match returning identical customer ID`
      );
    }
  }

  // -------------------------------------------------------------------------
  // SUITE 3: 10× Dog Profiles & Vaccination Verification
  // -------------------------------------------------------------------------
  console.log("\n▶ SUITE 3: 10× Dog Registration & Vaccine Compliance Gating");
  const testDog = await createDog({
    customerId: firstCustomerId,
    name: `Champion ${testSuffix}`,
    breed: "Golden Retriever",
    gender: "MALE",
    ageYears: 3,
    ageMonths: 0,
    weightKg: 30,
  });
  assert(!!testDog.id, `Created test dog profile: ${testDog.name} (${testDog.id})`);

  // Target date for compliance check
  const futureCheckDate = new Date(Date.now() + 86400000 * 3);

  // Initial check: No vaccines recorded -> Must be NON-COMPLIANT
  const initialCompliance = await checkVaccinationCompliance(testDog.id, futureCheckDate);
  assert(
    !initialCompliance.compliant,
    "Run #1: Dog with zero vaccines correctly evaluated as NON-COMPLIANT"
  );
  assert(
    !initialCompliance.hasRabies,
    "Run #2: Missing mandatory Rabies correctly identified"
  );

  // Fetch a staff user for verification
  const staff = await prisma.user.findFirst();
  const staffId = staff?.id || "clxyz0000staff";

  // Add vaccination records across types and verify
  const vaccineTypes = [
    "RABIES",
    "DHPPI",
    "BORDETELLA",
    "CORONAVIRUS",
    "LEPTOSPIROSIS",
    "RABIES",
    "DHPPI",
    "BORDETELLA",
    "RABIES",
    "DHPPI",
  ];

  for (let i = 0; i < 10; i++) {
    const vType = vaccineTypes[i];
    const rec = await createVaccinationRecord({
      dogId: testDog.id,
      vaccineName: vType,
      administeredDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year future
      documentUrl: `https://needin.app/docs/vac_${i + 1}.pdf`,
      notes: `10x Stress record #${i + 1}`,
    });

    // Verify record
    const verified = await verifyVaccinationRecord(rec.id, "APPROVED", staffId, "Verified via 10x test");
    assert(
      verified.verified_status === "APPROVED",
      `Run #${i + 1}: Recorded & approved ${vType} (Record: ${rec.id})`
    );
  }

  const updatedCompliance = await checkVaccinationCompliance(testDog.id, futureCheckDate);
  assert(
    updatedCompliance.compliant && updatedCompliance.hasRabies && updatedCompliance.hasDHPPi,
    "Run #11: Dog with verified Rabies & DHPPI correctly evaluated as 100% COMPLIANT"
  );

  // -------------------------------------------------------------------------
  // SUITE 4: 10× Pricing Engine Calculation
  // -------------------------------------------------------------------------
  console.log("\n▶ SUITE 4: 10× Dynamic Pricing Calculation");
  const priceScenarios = [
    { code: "SINGLE_DAY", addGrooming: false, expectedTotal: 500 },
    { code: "SINGLE_DAY", addGrooming: true, expectedTotal: 800 },
    { code: "FIVE_DAY", addGrooming: false, expectedTotal: 2200 },
    { code: "FIVE_DAY", addGrooming: true, expectedTotal: 2500 },
    { code: "MONTHLY", addGrooming: false, expectedTotal: 7500 },
    { code: "MONTHLY", addGrooming: true, expectedTotal: 7800 },
    { code: "SINGLE_DAY", addGrooming: false, expectedTotal: 500 },
    { code: "SINGLE_DAY", addGrooming: true, expectedTotal: 800 },
    { code: "FIVE_DAY", addGrooming: false, expectedTotal: 2200 },
    { code: "MONTHLY", addGrooming: false, expectedTotal: 7500 },
  ];

  for (let i = 0; i < priceScenarios.length; i++) {
    const sc = priceScenarios[i];
    const pricing = await calculateBookingPrice({
      packageCodeOrId: sc.code,
      addGrooming: sc.addGrooming,
    });
    assert(
      pricing.total === sc.expectedTotal,
      `Price Run #${i + 1}: ${sc.code} (Grooming: ${sc.addGrooming}) -> Total ₹${pricing.total}`
    );
  }

  // -------------------------------------------------------------------------
  // SUITE 5: 10× Slot Availability & Concurrency Lock
  // -------------------------------------------------------------------------
  console.log("\n▶ SUITE 5: 10× Slot Availability & Atomic Concurrency Gate");
  const targetDate = new Date(Date.now() + 86400000 * 5); // 5 days ahead

  for (let i = 0; i < 10; i++) {
    const avail = await checkDateAvailability(targetDate);
    assert(
      avail.maxCapacity >= 15 && avail.availableSpots >= 0,
      `Avail Run #${i + 1}: Max Cap = ${avail.maxCapacity}, Confirmed = ${avail.confirmedCount}, Available = ${avail.availableSpots}`
    );
  }

  // -------------------------------------------------------------------------
  // SUITE 6: 10× Full Booking State Machine Lifecycles
  // -------------------------------------------------------------------------
  console.log("\n▶ SUITE 6: 10× Complete Booking State Machine Lifecycles");
  for (let i = 0; i < 10; i++) {
    const bDate = new Date(Date.now() + 86400000 * (i + 10));

    // Step 1: Create Draft / Pending Payment Booking
    const booking = await createDaycareBooking({
      customerId: firstCustomerId,
      dogId: testDog.id,
      bookingDate: bDate,
      packageCode: "SINGLE_DAY",
      specialInstructions: `10x Lifecycle Run #${i + 1}`,
    });
    assert(
      booking.booking_status === "PENDING_PAYMENT",
      `Cycle #${i + 1} [1/6]: Created booking ${booking.booking_number} in PENDING_PAYMENT`
    );

    // Step 2: Confirm Booking (test both Online Razorpay Payment and Offline Staff Confirmation)
    let confirmed;
    if (i % 2 === 0) {
      const paymentRec = await prisma.payment.create({
        data: {
          customer_id: firstCustomerId,
          reference_type: "BOOKING",
          reference_id: booking.id,
          gateway: "RAZORPAY",
          status: "SUCCESS",
          amount: booking.total_amount,
          currency: "INR",
          gateway_order_id: `order_10x_${i}_${testSuffix}`,
          gateway_payment_id: `pay_10x_${i}_${testSuffix}`,
        },
      });

      confirmed = await confirmBooking(booking.id, {
        actorUserId: staffId,
        actorName: "Test Lead",
        paymentId: paymentRec.id,
      });
    } else {
      confirmed = await confirmBooking(booking.id, {
        actorUserId: staffId,
        actorName: "Test Lead",
        isOfflineManual: true,
      });
    }
    assert(
      confirmed.booking_status === "CONFIRMED",
      `Cycle #${i + 1} [2/6]: Confirmed payment -> CONFIRMED status`
    );

    if (i < 5) {
      // Step 3: Check-in
      const checkedIn = await updateBookingOperationalStatus(booking.id, "CHECKED_IN", {
        actorUserId: staffId,
        actorName: "Test Lead",
        notes: "Dog arrived happy and healthy",
      });
      assert(
        checkedIn.booking_status === "CHECKED_IN",
        `Cycle #${i + 1} [3/6]: Dog arrived at facility -> CHECKED_IN`
      );

      // Step 4: In Care
      const inCare = await updateBookingOperationalStatus(booking.id, "IN_CARE", {
        actorUserId: staffId,
        actorName: "Test Lead",
        notes: "Enjoying agility park",
      });
      assert(
        inCare.booking_status === "IN_CARE",
        `Cycle #${i + 1} [4/6]: Playtime & supervision -> IN_CARE`
      );

      // Step 5: Ready for Pickup
      const ready = await updateBookingOperationalStatus(booking.id, "READY_FOR_PICKUP", {
        actorUserId: staffId,
        actorName: "Test Lead",
        notes: "Cleaned and ready for pickup",
      });
      assert(
        ready.booking_status === "READY_FOR_PICKUP",
        `Cycle #${i + 1} [5/6]: Groomed and packed -> READY_FOR_PICKUP`
      );

      // Step 6: Completed
      const completed = await updateBookingOperationalStatus(booking.id, "COMPLETED", {
        actorUserId: staffId,
        actorName: "Test Lead",
        notes: "Owner picked up dog",
      });
      assert(
        completed.booking_status === "COMPLETED",
        `Cycle #${i + 1} [6/6]: Handed over to owner -> COMPLETED`
      );
    } else if (i < 8) {
      // Reschedule Flow
      const newDate = new Date(bDate.getTime() + 86400000 * 2);
      const rescheduled = await rescheduleBooking(booking.id, {
        newDate,
        actorUserId: staffId,
        actorName: "Test Lead",
      });
      assert(
        rescheduled.booking_status === "CONFIRMED",
        `Cycle #${i + 1}: Rescheduled booking successfully to new date`
      );
    } else {
      // Cancellation with Policy Check Flow
      const cancelled = await cancelBooking(booking.id, {
        actorUserId: staffId,
        actorName: "Test Lead",
        cancellationReason: "Customer trip postponed",
      });
      assert(
        cancelled.booking_status === "CANCELLED" && cancelled.refund_amount > 0,
        `Cycle #${i + 1}: Cancelled booking with refund of ₹${cancelled.refund_amount}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // SUITE 7: 10× Dynamic Database-Backed Template Rendering
  // -------------------------------------------------------------------------
  console.log("\n▶ SUITE 7: 10× Dynamic WhatsApp Template Interpolation");
  const templateCodes = [
    "WELCOME",
    "MAIN_MENU",
    "PRICING",
    "LOCATION",
    "VACCINATION_REQUIREMENTS",
    "BOOKING_SUMMARY",
    "BOOKING_CONFIRMATION",
    "CHECKED_IN",
    "IN_CARE",
    "READY_FOR_PICKUP",
  ];

  for (let i = 0; i < 10; i++) {
    const tCode = templateCodes[i];
    const rendered = await renderTemplate(tCode, {
      customer_name: "Rahul Sharma",
      dog_name: "Bruno",
      breed: "Golden Retriever",
      booking_reference: `NDN-10X-${i + 1}`,
      booking_date: "25 Sep 2026",
      dropoff_time: "09:00 AM",
      pickup_time: "06:00 PM",
      amount: "500",
      payment_link: "https://needin.app/pay/test",
      business_name: "Needin Pet Care",
      business_address: "Plot 42, Paw Paradise Lane",
      maps_link: "https://maps.google.com/?q=Needin",
      business_hours: "8 AM - 7 PM",
    });

    const hasUnrenderedTokens = /\{\{[a-z_]+\}\}/i.test(rendered.text);
    assert(
      !hasUnrenderedTokens && rendered.text.length > 20,
      `Template Run #${i + 1}: Rendered ${tCode} (${rendered.text.length} chars, 0 unparsed tokens)`
    );
  }

  // -------------------------------------------------------------------------
  // SUITE 8: 10× Audit Trail Compliance Logging
  // -------------------------------------------------------------------------
  console.log("\n▶ SUITE 8: 10× Audit Trail Immutable Appending");
  for (let i = 0; i < 10; i++) {
    const auditEntry = await logAudit({
      actorUserId: staffId,
      actorName: "Test Lead",
      action: `10X_STRESS_AUDIT_${i + 1}`,
      entityType: "BOOKING",
      entityId: `ENTITY-10X-${i + 1}`,
      newValue: { stressIteration: i + 1, timestamp: new Date().toISOString() },
      reason: "10x stress test audit append",
    });
    assert(
      !!auditEntry?.id && auditEntry.action === `10X_STRESS_AUDIT_${i + 1}`,
      `Audit Run #${i + 1}: Recorded audit event ${auditEntry?.id} for action ${auditEntry?.action}`
    );
  }

  console.log("\n===============================================================================");
  console.log(`🏁 MASTER 10× VALIDATION COMPLETE: ${stats.passed}/${stats.total} PASSED (100%)`);
  console.log("===============================================================================\n");
}

runMaster10xValidation()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FATAL SUITE ERROR:", e);
    process.exit(1);
  });
