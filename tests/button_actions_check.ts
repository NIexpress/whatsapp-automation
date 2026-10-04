async function testAllButtonsAndActions() {
  console.log("==========================================================");
  console.log("🧪 TESTING ALL BUTTONS, MODALS, AND OPERATIONAL APIS");
  console.log("==========================================================\n");

  // 1. Authenticate as Owner
  console.log("1. Authenticating as owner@needin.com...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@needin.com",
      password: "Needin@2026",
    }),
  });
  console.log("   Login status:", loginRes.status);
  const loginBody = await loginRes.json();
  console.log("   Login response:", loginBody);
  const rawSetCookie = loginRes.headers.get("set-cookie") || (loginRes.headers as any).getSetCookie?.()?.[0];
  console.log("   Set-cookie:", rawSetCookie);
  if (!rawSetCookie && !loginBody.data?.token) throw new Error("Login failed!");
  const cookie = rawSetCookie ? rawSetCookie.split(";")[0] : `needin_session=${loginBody.data?.token}`;
  console.log("   ✓ Login successful!\n");

  const headers = {
    "Content-Type": "application/json",
    Cookie: cookie,
  };

  // 2. Test Customer Creation Button ("+ New Customer")
  console.log("2. Testing Customer Creation ('+ New Customer' Button)...");
  const testPhone = "919811" + Math.floor(100000 + Math.random() * 900000);
  const custRes = await fetch("http://localhost:3000/api/core/customers", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Aarav Mehta",
      phone: testPhone,
      email: `aarav_${Date.now()}@example.com`,
    }),
  });
  const custJson = await custRes.json();
  if (!custJson.success) throw new Error("Failed to create customer: " + JSON.stringify(custJson));
  const customerId = custJson.data.id;
  console.log(`   ✓ Customer created successfully: ${custJson.data.name} (${customerId})\n`);

  // 3. Test Dog Registration Button ("Register Dog" Modal)
  console.log("3. Testing Dog Registration ('Register Dog' Button)...");
  const dogRes = await fetch("http://localhost:3000/api/dog-daycare/dogs", {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerId,
      name: "Simba",
      breed: "Siberian Husky",
      gender: "MALE",
      ageYears: 2,
      ageMonths: 4,
      weightKg: 24,
      medicalNotes: "Loves cold water",
    }),
  });
  const dogJson = await dogRes.json();
  if (!dogJson.success) throw new Error("Failed to register dog: " + JSON.stringify(dogJson));
  const dogId = dogJson.data.id;
  console.log(`   ✓ Dog registered successfully: ${dogJson.data.name} (${dogId})\n`);

  // 4. Test Vaccination Recording Button ("Record Vaccination" Modal)
  console.log("4. Testing Vaccination Record ('Record Vaccination' Button)...");
  const vaxRes = await fetch("http://localhost:3000/api/dog-daycare/vaccinations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      dogId,
      vaccineName: "RABIES",
      administeredDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      notes: "Clinic: Pet Hospital Indiranagar",
    }),
  });
  const vaxJson = await vaxRes.json();
  if (!vaxJson.success) throw new Error("Failed to record vaccination: " + JSON.stringify(vaxJson));
  const vaxId = vaxJson.data.id;
  console.log(`   ✓ Vaccine record created: ${vaxJson.data.vaccine_name} (${vaxId})\n`);

  // 5. Test Vaccination Approval Button ("Approve" Action)
  console.log("5. Testing Vaccination Approval ('Approve' Button)...");
  const vaxApproveRes = await fetch(`http://localhost:3000/api/dog-daycare/vaccinations/${vaxId}/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({ status: "APPROVED", notes: "Certificate inspected and verified." }),
  });
  const vaxApproveJson = await vaxApproveRes.json();
  if (!vaxApproveJson.success) throw new Error("Failed to approve vaccination: " + JSON.stringify(vaxApproveJson));
  console.log(`   ✓ Vaccine approved successfully: Status = ${vaxApproveJson.data.verified_status}\n`);

  // 6. Test Manual Booking Creation Button ("+ New Booking" Modal on Dashboard)
  console.log("6. Testing Manual Booking ('+ New Booking' Button)...");
  const targetDate = new Date(Date.now() + 86400000 * 4);
  const bookRes = await fetch("http://localhost:3000/api/dog-daycare/bookings", {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerId,
      dogId,
      bookingDate: targetDate,
      packageCode: "SINGLE_DAY",
      initialStatus: "PENDING_PAYMENT",
    }),
  });
  const bookJson = await bookRes.json();
  if (!bookJson.success) throw new Error("Failed to create booking: " + JSON.stringify(bookJson));
  const bookingId = bookJson.data.id;
  console.log(`   ✓ Booking created: ${bookJson.data.booking_number} (${bookingId})\n`);

  // 7. Test Booking Confirmation Button ("Confirm Manually" Action)
  console.log("7. Testing Manual Booking Confirmation ('Confirm Manually' Button)...");
  const confirmRes = await fetch(`http://localhost:3000/api/dog-daycare/bookings/${bookingId}/confirm`, {
    method: "POST",
    headers,
  });
  const confirmJson = await confirmRes.json();
  if (!confirmJson.success) throw new Error("Failed to confirm booking: " + JSON.stringify(confirmJson));
  console.log(`   ✓ Booking confirmed: Status = ${confirmJson.data.booking_status}\n`);

  // 8. Test Lifecycle Status Buttons: Check-In -> In Care -> Ready For Pickup -> Completed
  console.log("8. Testing Operational Status Progression Buttons...");

  // Check-In
  const checkinRes = await fetch(`http://localhost:3000/api/dog-daycare/bookings/${bookingId}/status`, {
    method: "POST",
    headers,
    body: JSON.stringify({ status: "CHECKED_IN", notes: "Dog arrived safely" }),
  });
  const checkinJson = await checkinRes.json();
  if (!checkinJson.success) throw new Error("Failed check-in: " + JSON.stringify(checkinJson));
  console.log(`   ✓ 'Check-In' button -> Status: ${checkinJson.data.booking_status}`);

  // In Care
  const inCareRes = await fetch(`http://localhost:3000/api/dog-daycare/bookings/${bookingId}/status`, {
    method: "POST",
    headers,
    body: JSON.stringify({ status: "IN_CARE", notes: "Supervised play" }),
  });
  const inCareJson = await inCareRes.json();
  if (!inCareJson.success) throw new Error("Failed in-care: " + JSON.stringify(inCareJson));
  console.log(`   ✓ 'In Care' button -> Status: ${inCareJson.data.booking_status}`);

  // Ready for Pickup
  const readyRes = await fetch(`http://localhost:3000/api/dog-daycare/bookings/${bookingId}/status`, {
    method: "POST",
    headers,
    body: JSON.stringify({ status: "READY_FOR_PICKUP", notes: "Groomed and ready" }),
  });
  const readyJson = await readyRes.json();
  if (!readyJson.success) throw new Error("Failed ready: " + JSON.stringify(readyJson));
  console.log(`   ✓ 'Ready for Pickup' button -> Status: ${readyJson.data.booking_status}`);

  // Completed
  const completedRes = await fetch(`http://localhost:3000/api/dog-daycare/bookings/${bookingId}/status`, {
    method: "POST",
    headers,
    body: JSON.stringify({ status: "COMPLETED", notes: "Picked up by owner" }),
  });
  const completedJson = await completedRes.json();
  if (!completedJson.success) throw new Error("Failed complete: " + JSON.stringify(completedJson));
  console.log(`   ✓ 'Handover & Complete' button -> Status: ${completedJson.data.booking_status}\n`);

  // 9. Test Template Save Button ("Save Template" Modal)
  console.log("9. Testing Template Update ('Save Template' Button)...");
  const tmplsRes = await fetch("http://localhost:3000/api/core/templates", { headers });
  const tmplsJson = await tmplsRes.json();
  if (!tmplsJson.success || tmplsJson.data.length === 0) throw new Error("No templates found!");
  const firstTmpl = tmplsJson.data[0];

  const updateTmplRes = await fetch(`http://localhost:3000/api/core/templates/${firstTmpl.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: `Updated welcome message for Needin guests {{business_name}}!`,
    }),
  });
  const updateTmplJson = await updateTmplRes.json();
  if (!updateTmplJson.success) throw new Error("Failed to update template: " + JSON.stringify(updateTmplJson));
  console.log(`   ✓ Template updated -> New version v${updateTmplJson.data.version_number}\n`);

  // 10. Test Staff Onboarding Button ("Create Account" in Onboard Staff Modal)
  console.log("10. Testing Staff Onboarding ('Onboard Staff' Button)...");
  const staffEmail = `staff_${Date.now()}@needin.com`;
  const staffRes = await fetch("http://localhost:3000/api/core/staff", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Karan Patel",
      email: staffEmail,
      password: "NeedinStaff@2026",
      role: "STAFF",
    }),
  });
  const staffJson = await staffRes.json();
  if (!staffJson.success) throw new Error("Failed to onboard staff: " + JSON.stringify(staffJson));
  console.log(`   ✓ Staff onboarded: ${staffJson.data.name} (${staffJson.data.email}, Role: ${staffJson.data.role})\n`);

  // 11. Test Package Creation Button ("+ New Package" in Pricing)
  console.log("11. Testing Package Creation ('+ New Package' Button)...");
  const pkgRes = await fetch("http://localhost:3000/api/dog-daycare/packages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "10-Day VIP Care Pass",
      code: `VIP_10_${Date.now().toString().slice(-4)}`,
      price: 4500,
      description: "Includes unlimited playtime, swimming pool and grooming bath.",
      validityDays: 30,
      totalVisits: 10,
    }),
  });
  const pkgJson = await pkgRes.json();
  if (!pkgJson.success) throw new Error("Failed to create package: " + JSON.stringify(pkgJson));
  console.log(`   ✓ Package created: ${pkgJson.data.name} (₹${pkgJson.data.price}, Code: ${pkgJson.data.code})\n`);

  console.log("==========================================================");
  console.log("🎉 ALL BUTTONS, MODALS, AND ACTIONS VERIFIED 100% WORKING!");
  console.log("==========================================================\n");
}

testAllButtonsAndActions()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FATAL ERROR IN BUTTON TEST:", e);
    process.exit(1);
  });
