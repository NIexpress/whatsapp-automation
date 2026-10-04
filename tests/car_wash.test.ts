import prisma from "../src/shared/prisma";
import {
  createVehicle,
  getVehicleById,
  getVehicleByPlate,
  listCustomerVehicles,
  listAllVehicles,
} from "../src/services/car-wash/vehicles";
import {
  listCarWashPackages,
  calculateCarWashPrice,
} from "../src/services/car-wash/pricing";
import {
  checkBayAvailability,
  assertAndLockBayCapacity,
} from "../src/services/car-wash/availability";
import {
  createCarWashBooking,
  getCarWashBookingById,
  updateCarWashStatus,
  cancelCarWashBooking,
} from "../src/services/car-wash/bookings";
import { processIncomingWhatsAppMessage } from "../src/core/messaging/processor";

async function runTests() {
  console.log("=================================================");
  console.log("🚗 NEEDIN SERVICE MODULE #2 — CAR WASH TEST SUITE");
  console.log("=================================================\n");

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

  try {
    // -------------------------------------------------------------
    // TEST 1: VEHICLE MANAGEMENT
    // -------------------------------------------------------------
    console.log("Test 1: Vehicle Management & Core Customer Association");
    const testPhone = "+919988776655";
    const customer = await prisma.customer.upsert({
      where: { phone: testPhone },
      update: {},
      create: { name: "Anand Verma", phone: testPhone },
    });

    const plate1 = `KA04CW${Math.floor(1000 + Math.random() * 9000)}`;
    const vehicle = await createVehicle({
      customerId: customer.id,
      make: "Tata",
      model: "Nexon EV",
      vehicleType: "SUV",
      licensePlate: plate1,
      color: "Daytona Grey",
      actorName: "TestRunner",
    });

    assert(Boolean(vehicle.id), "Vehicle registered successfully");
    assert(vehicle.license_plate === plate1, "License plate normalized & stored");
    assert(vehicle.vehicle_type === "SUV", "Vehicle classification is SUV");

    // Test duplicate plate validation
    let duplicateCaught = false;
    try {
      await createVehicle({
        customerId: customer.id,
        make: "Tata",
        model: "Punch",
        vehicleType: "HATCHBACK",
        licensePlate: plate1,
      });
    } catch (e: any) {
      duplicateCaught = true;
    }
    assert(duplicateCaught, "Duplicate vehicle license plate rejected with ValidationError");

    // -------------------------------------------------------------
    // TEST 2: PRICING & RATE CARD MATRIX
    // -------------------------------------------------------------
    console.log("\nTest 2: Tiered Rate Card & Pricing Calculations");
    const packages = await listCarWashPackages();
    assert(packages.length >= 3, `Found ${packages.length} car wash packages in database`);

    const foamHatchback = await calculateCarWashPrice({
      packageCodeOrId: "QUICK_FOAM",
      vehicleType: "HATCHBACK",
    });
    assert(foamHatchback.basePrice === 299, "Quick Foam for Hatchback is ₹299");

    const foamSUV = await calculateCarWashPrice({
      packageCodeOrId: "QUICK_FOAM",
      vehicleType: "SUV",
    });
    assert(foamSUV.basePrice === 499, "Quick Foam for SUV is ₹499");

    const ceramicLuxury = await calculateCarWashPrice({
      packageCodeOrId: "CERAMIC_SPA",
      vehicleType: "LUXURY",
      discountAmount: 100,
    });
    assert(ceramicLuxury.basePrice === 2999, "Ceramic Spa for Luxury is ₹2999");
    assert(ceramicLuxury.total === 2899, "Ceramic Spa total after ₹100 discount is ₹2899");

    // -------------------------------------------------------------
    // TEST 3: BAY CAPACITY & CONCURRENCY LOCKING
    // -------------------------------------------------------------
    console.log("\nTest 3: 3-Bay Capacity & Slot Availability");
    const testDate = `2026-11-${Math.floor(10 + Math.random() * 18)}`;
    const testSlot = "02:00 PM";

    const availBefore = await checkBayAvailability(testDate, testSlot);
    assert(availBefore.totalBays === 3, "Total capacity is 3 washing bays");
    assert(availBefore.isAvailable === true, "Bay available before test bookings");

    // Concurrently book 3 vehicles in Bay 1, 2, 3
    const plateA = `KA05A${Math.floor(1000 + Math.random() * 9000)}`;
    const plateB = `KA05B${Math.floor(1000 + Math.random() * 9000)}`;
    const plateC = `KA05C${Math.floor(1000 + Math.random() * 9000)}`;

    const [vehA, vehB, vehC] = await Promise.all([
      createVehicle({ customerId: customer.id, make: "Kia", model: "Seltos", vehicleType: "SUV", licensePlate: plateA }),
      createVehicle({ customerId: customer.id, make: "Honda", model: "City", vehicleType: "SEDAN", licensePlate: plateB }),
      createVehicle({ customerId: customer.id, make: "Maruti", model: "Swift", vehicleType: "HATCHBACK", licensePlate: plateC }),
    ]);

    const bookingA = await createCarWashBooking({
      customerId: customer.id,
      vehicleId: vehA.id,
      packageCodeOrId: "QUICK_FOAM",
      bookingDate: testDate,
      timeSlot: testSlot,
    });

    const bookingB = await createCarWashBooking({
      customerId: customer.id,
      vehicleId: vehB.id,
      packageCodeOrId: "INTERIOR_DEEP",
      bookingDate: testDate,
      timeSlot: testSlot,
    });

    const bookingC = await createCarWashBooking({
      customerId: customer.id,
      vehicleId: vehC.id,
      packageCodeOrId: "QUICK_FOAM",
      bookingDate: testDate,
      timeSlot: testSlot,
    });

    assert(
      new Set([bookingA.bay_number, bookingB.bay_number, bookingC.bay_number]).size === 3,
      `Bays allocated uniquely across 3 bookings: Bays [${bookingA.bay_number}, ${bookingB.bay_number}, ${bookingC.bay_number}]`
    );

    // 4th booking in same slot should fail
    const plateD = `KA05D${Math.floor(1000 + Math.random() * 9000)}`;
    const vehD = await createVehicle({ customerId: customer.id, make: "BMW", model: "330i", vehicleType: "LUXURY", licensePlate: plateD });

    let capacityExceeded = false;
    try {
      await createCarWashBooking({
        customerId: customer.id,
        vehicleId: vehD.id,
        packageCodeOrId: "CERAMIC_SPA",
        bookingDate: testDate,
        timeSlot: testSlot,
      });
    } catch (e: any) {
      capacityExceeded = true;
    }
    assert(capacityExceeded, "4th booking for 3-bay slot rejected with ConflictError (Bays Full)");

    // -------------------------------------------------------------
    // TEST 4: BOOKING LIFECYCLE & AUDIT TRAIL
    // -------------------------------------------------------------
    console.log("\nTest 4: Operational State Transitions & Shared Audit Trail");
    // Start Wash
    const washing = await updateCarWashStatus(bookingA.id, "WASHING", "High pressure foam cycle started", "user_123", "Staff");
    assert(washing.booking_status === "WASHING", "Status progressed to WASHING");

    // Detailing
    const detailing = await updateCarWashStatus(bookingA.id, "DETAILING", "Vacuum and dashboard polish", "user_123", "Staff");
    assert(detailing.booking_status === "DETAILING", "Status progressed to DETAILING");

    // Ready for Pickup
    const ready = await updateCarWashStatus(bookingA.id, "READY_FOR_PICKUP", "Vehicle parked in inspection bay", "user_123", "Staff");
    assert(ready.booking_status === "READY_FOR_PICKUP", "Status progressed to READY_FOR_PICKUP");

    // Complete
    const completed = await updateCarWashStatus(bookingA.id, "COMPLETED", "Key handed over", "user_123", "Staff");
    assert(completed.booking_status === "COMPLETED", "Status progressed to COMPLETED");

    // Cancel Booking B
    const cancelled = await cancelCarWashBooking(bookingB.id, "Customer requested reschedule", "user_123", "Staff");
    assert(cancelled.booking_status === "CANCELLED", "Booking B successfully cancelled");

    // Verify shared Core Audit Log entries
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity_type: "CAR_WASH_BOOKING",
        entity_id: bookingA.id,
      },
    });
    assert(auditLogs.length >= 4, `Shared Core AuditLog recorded ${auditLogs.length} state transitions`);

    // -------------------------------------------------------------
    // TEST 5: WHATSAPP BOT MULTI-SERVICE ROUTING
    // -------------------------------------------------------------
    console.log("\nTest 5: Multi-Service WhatsApp Bot Interaction");
    const waPhone = `919777${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Menu
    const msg1 = await processIncomingWhatsAppMessage({
      phone: waPhone,
      senderName: "Sameer Joshi",
      content: "hi",
    });
    assert(
      Boolean(msg1.reply?.includes("Needin Multi-Service Platform")),
      "Main menu presents both Dog Day Care and Car Wash"
    );

    // 2. Select Car Wash
    const msg2 = await processIncomingWhatsAppMessage({
      phone: waPhone,
      senderName: "Sameer Joshi",
      content: "2",
    });
    assert(
      Boolean(msg2.reply?.includes("Car Wash & Auto Detailing")),
      "Selecting 2 displays Car Wash specific menu & rate card options"
    );

    // 3. Initiate booking
    const msg3 = await processIncomingWhatsAppMessage({
      phone: waPhone,
      senderName: "Sameer Joshi",
      content: "1",
    });
    assert(
      Boolean(msg3.reply?.includes("Select a Car Wash Package")),
      "Car wash booking flow prompts for Package selection"
    );

    // 4. Select Package (Quick Foam)
    const msg4 = await processIncomingWhatsAppMessage({
      phone: waPhone,
      senderName: "Sameer Joshi",
      content: "1",
    });
    assert(
      Boolean(msg4.reply?.includes("Select your vehicle type")),
      "Car wash booking flow prompts for Vehicle Type classification"
    );

    // 5. Select Vehicle Type (SUV)
    const msg5 = await processIncomingWhatsAppMessage({
      phone: waPhone,
      senderName: "Sameer Joshi",
      content: "3",
    });
    assert(
      Boolean(msg5.reply?.includes("license plate number")),
      "Car wash booking flow prompts for License Plate"
    );

    // 6. Enter License Plate
    const botPlate = `KA03CW${Math.floor(1000 + Math.random() * 9000)}`;
    const msg6 = await processIncomingWhatsAppMessage({
      phone: waPhone,
      senderName: "Sameer Joshi",
      content: botPlate,
    });
    assert(
      Boolean(msg6.reply?.includes("date and slot")),
      "Car wash booking flow prompts for Date & Slot"
    );

    // 7. Enter Slot
    const msg7 = await processIncomingWhatsAppMessage({
      phone: waPhone,
      senderName: "Sameer Joshi",
      content: "2026-11-25 11:00 AM",
    });
    assert(
      Boolean(msg7.reply?.includes("Car Wash Booking Summary") && msg7.reply?.includes("Assigned Bay")),
      "Summary calculates pricing (SUV = ₹499) and assigns washing bay"
    );

    // 8. Confirm Booking
    const msg8 = await processIncomingWhatsAppMessage({
      phone: waPhone,
      senderName: "Sameer Joshi",
      content: "YES",
    });
    assert(
      Boolean(msg8.reply?.includes("Car Wash Confirmed!") && msg8.reply?.includes("ND-CW-")),
      "Booking generated with ND-CW- booking reference and bay instructions"
    );

    // Verify booking in database
    const botBooking = await prisma.carWashBooking.findFirst({
      where: { vehicle: { license_plate: botPlate } },
      include: { customer: true, vehicle: true },
    });
    assert(Boolean(botBooking), "Bot booking verified in SQLite database");
    assert(botBooking?.vehicle.license_plate === botPlate, "Auto-registered vehicle matches license plate");
    assert(botBooking?.total_amount === 499, "Correct price charged for SUV Quick Foam (₹499)");

    console.log("\n=================================================");
    console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
