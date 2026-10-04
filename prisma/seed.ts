import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log("🌱 Starting Needin Platform Database Seeding...");

  // 1. Seed Core Staff & Admin Accounts
  console.log("👤 Seeding Staff & Admin accounts...");
  const defaultPassword = await hashPassword("Needin@2026");

  const owner = await prisma.user.upsert({
    where: { email: "owner@needin.com" },
    update: { password_hash: defaultPassword, role: "OWNER" },
    create: {
      email: "owner@needin.com",
      name: "Antigravity Owner",
      password_hash: defaultPassword,
      role: "OWNER",
      status: "ACTIVE",
      phone: "919999000001",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@needin.com" },
    update: { password_hash: defaultPassword, role: "ADMIN" },
    create: {
      email: "admin@needin.com",
      name: "Pooja Admin",
      password_hash: defaultPassword,
      role: "ADMIN",
      status: "ACTIVE",
      phone: "919999000002",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@needin.com" },
    update: { password_hash: defaultPassword, role: "MANAGER" },
    create: {
      email: "manager@needin.com",
      name: "Vikram Manager",
      password_hash: defaultPassword,
      role: "MANAGER",
      status: "ACTIVE",
      phone: "919999000003",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@needin.com" },
    update: { password_hash: defaultPassword, role: "STAFF" },
    create: {
      email: "staff@needin.com",
      name: "Aman Caretaker",
      password_hash: defaultPassword,
      role: "STAFF",
      status: "ACTIVE",
      phone: "919999000004",
    },
  });

  console.log("   ✅ Users seeded: owner, admin, manager, staff");

  // 2. Seed Registered Services: Dog Day Care / Pet Care (Service Module #1)
  console.log("🐕 Seeding Service Module #1 (Dog Day Care)...");
  const dogDaycareService = await prisma.service.upsert({
    where: { code: "DOG_DAY_CARE" },
    update: {
      name: "Dog Day Care / Pet Care",
      description: "Premium cage-free dog day care with supervised play, nap zones, and real-time WhatsApp updates.",
      is_active: true,
      icon: "paw-print",
    },
    create: {
      code: "DOG_DAY_CARE",
      name: "Dog Day Care / Pet Care",
      description: "Premium cage-free dog day care with supervised play, nap zones, and real-time WhatsApp updates.",
      is_active: true,
      icon: "paw-print",
    },
  });

  // 3. Seed Service Configuration for Dog Day Care
  console.log("⚙️  Seeding dynamic configuration for Dog Day Care...");
  const configs = [
    {
      key: "BUSINESS_HOURS",
      value: {
        open: "08:00",
        close: "19:00",
        dropoff_window: { start: "08:00", end: "11:00" },
        pickup_window: { start: "16:00", end: "19:00" },
      },
    },
    {
      key: "DEFAULT_CAPACITY",
      value: 15,
    },
    {
      key: "LOCATION",
      value: {
        name: "Needin Pet Resort & Day Care",
        address: "Plot 42, Paw Paradise Lane, Indiranagar, Bengaluru, Karnataka 560038",
        maps_link: "https://maps.google.com/?q=Needin+Pet+Resort+Bangalore",
      },
    },
    {
      key: "CANCELLATION_POLICY",
      value: {
        free_cancellation_hours: 24,
        late_cancellation_fee_percent: 50,
        rules_text: "Free cancellation up to 24 hours before scheduled drop-off. Late cancellations incur a 50% charge.",
      },
    },
    {
      key: "VACCINATION_RULES",
      value: {
        mandatory: ["RABIES", "DHPPI"],
        recommended: ["BORDETELLA"],
        grace_period_days: 0,
      },
    },
  ];

  for (const c of configs) {
    await prisma.serviceConfig.upsert({
      where: {
        service_id_key: {
          service_id: dogDaycareService.id,
          key: c.key,
        },
      },
      update: { value_json: JSON.stringify(c.value) },
      create: {
        service_id: dogDaycareService.id,
        key: c.key,
        value_json: JSON.stringify(c.value),
      },
    });
  }
  console.log("   ✅ Dynamic Service Configs seeded for Dog Day Care");

  // 3b. Service Module #2: Car Wash (Inactive)
  const carWashService = await prisma.service.upsert({
    where: { code: "CAR_WASH" },
    update: {
      name: "Car Wash & Auto Detailing",
      description: "Express foam wash, interior sanitization, high-gloss wax, and ceramic coating.",
      is_active: false,
      icon: "car",
    },
    create: {
      code: "CAR_WASH",
      name: "Car Wash & Auto Detailing",
      description: "Express foam wash, interior sanitization, high-gloss wax, and ceramic coating.",
      is_active: false,
      icon: "car",
    },
  });

  const carWashConfigs = [
    {
      key: "BUSINESS_HOURS",
      value: { open: "08:00", close: "20:00" },
    },
    {
      key: "BAY_CAPACITY",
      value: 3,
    },
    {
      key: "LOCATION",
      value: {
        name: "Needin Express Auto Spa & Detailing Hub",
        address: "Plot 45, Auto Corridor, Indiranagar, Bengaluru, Karnataka 560038",
        maps_link: "https://maps.google.com/?q=Needin+Auto+Spa",
      },
    },
    {
      key: "CANCELLATION_POLICY",
      value: {
        free_cancellation_hours: 2,
        late_cancellation_fee_percent: 25,
        rules_text: "Free cancellation up to 2 hours before scheduled slot.",
      },
    },
  ];

  for (const c of carWashConfigs) {
    await prisma.serviceConfig.upsert({
      where: {
        service_id_key: {
          service_id: carWashService.id,
          key: c.key,
        },
      },
      update: { value_json: JSON.stringify(c.value) },
      create: {
        service_id: carWashService.id,
        key: c.key,
        value_json: JSON.stringify(c.value),
      },
    });
  }
  console.log("   ✅ Dynamic Service Configs seeded for Car Wash");

  // 4. Seed Dog Day Care Pricing Packages
  console.log("💳 Seeding Dog Day Care packages...");
  const packages = [
    {
      code: "SINGLE_DAY",
      name: "Single Day Visit",
      description: "Full day pass (8:00 AM – 7:00 PM) with supervised play and meal time.",
      price: 500,
      validity_days: 1,
      total_visits: 1,
    },
    {
      code: "FIVE_DAY",
      name: "5-Day Care Package",
      description: "Pack of 5 full-day visits (flexible usage over 30 days).",
      price: 2200,
      validity_days: 30,
      total_visits: 5,
    },
    {
      code: "MONTHLY",
      name: "Monthly Unlimited Pass",
      description: "Unlimited weekday day care visits for 30 calendar days.",
      price: 7500,
      validity_days: 30,
      total_visits: 30,
    },
    {
      code: "GROOMING_ADDON",
      name: "Grooming & Bath Add-on",
      description: "Organic medicated bath, blow dry, ear cleaning, and nail clipping.",
      price: 300,
      validity_days: 1,
      total_visits: 1,
    },
  ];

  for (const pkg of packages) {
    await prisma.dogDaycarePackage.upsert({
      where: { code: pkg.code },
      update: { ...pkg, is_active: true },
      create: { ...pkg, is_active: true },
    });
  }
  console.log("   ✅ Day Care Packages seeded");

  // 5. Seed Centralized Dynamic WhatsApp Message Templates
  console.log("📱 Seeding version-controlled WhatsApp message templates...");
  const templates = [
    {
      code: "WELCOME",
      name: "Customer Welcome & Main Menu",
      category: "UTILITY",
      description: "Initial greeting and interactive main menu",
      body: `Welcome to Needin 🐾\n\nHello {{customer_name}}, how can we help you today?\n\n📅 Book Day Care\n💳 Pricing & Packages\n📍 Location & Timings\n💉 Vaccination Rules\n📋 My Bookings\n🤝 Talk to Human Support\n\nPlease select an option below or type your query:`,
      variables: ["customer_name", "business_name"],
    },
    {
      code: "MAIN_MENU",
      name: "Main Options Menu",
      category: "UTILITY",
      description: "Standard interactive options menu",
      body: `Needin 🐾 Main Menu:\n\n📅 Book Day Care\n💳 Pricing & Packages\n📍 Location & Timings\n💉 Vaccination Rules\n📋 My Bookings\n🤝 Talk to Human Support\n\nPlease select an option below:`,
      variables: [],
    },
    {
      code: "PRICING",
      name: "Pricing & Packages Information",
      category: "UTILITY",
      description: "Sent when customer inquires about rates and pricing",
      body: `🐶 *Needin Dog Day Care Pricing & Packages*\n\n1️⃣ *Single Day Visit:* ₹500 / day\n2️⃣ *5-Day Care Package:* ₹2,200 (Save ₹300)\n3️⃣ *Monthly Unlimited Pass:* ₹7,500 / month\n✨ *Grooming & Bath Add-on:* ₹300 / session\n\nAll packages include supervised socialization, climate-controlled nap areas, and complimentary meal service. Reply *1* to book now!`,
      variables: ["business_name"],
    },
    {
      code: "LOCATION",
      name: "Location & Operating Timings",
      category: "UTILITY",
      description: "Sent when customer asks for address, maps link, or timings",
      body: `📍 *Needin Pet Care Location & Timings*\n\n🏢 *Address:* {{business_address}}\n🗺️ *Google Maps:* {{maps_link}}\n\n⏰ *Operating Hours:* {{business_hours}}\n🚗 *Drop-off Window:* 8:00 AM – 11:00 AM\n🚙 *Pick-up Window:* 4:00 PM – 7:00 PM`,
      variables: ["business_address", "maps_link", "business_hours"],
    },
    {
      code: "VACCINATION_REQUIREMENTS",
      name: "Vaccination Policy Information",
      category: "UTILITY",
      description: "Explains required and recommended vaccines",
      body: `💉 *Vaccination Guidelines for Dog Day Care*\n\nTo ensure the health and safety of all dogs at {{business_name}}, all guests must have valid proof of:\n\n1. *Rabies* (Mandatory)\n2. *DHPPi* (7-in-1 / 9-in-1) (Mandatory)\n3. *Bordetella* (Kennel Cough) (Recommended)\n\nYou can upload a clear photo or PDF of your dog's vaccination certificate during the booking flow.`,
      variables: ["business_name"],
    },
    {
      code: "BOOKING_FORM",
      name: "Dog Day Care In-Chat Booking Form",
      category: "UTILITY",
      description: "Interactive in-chat WhatsApp Flow booking form card",
      body: `📋 *Needin Dog Day Care Booking Form* 🐾\n\nHi {{customer_name}}, please fill in your booking details below to reserve your dog's visit instantly in one single message:`,
      variables: ["customer_name"],
    },
    {
      code: "ASK_DOG_NAME",
      name: "Booking Step 1: Ask Dog Name",
      category: "UTILITY",
      description: "Prompts customer for dog name at start of booking",
      body: `🐾 Wonderful! Let's get your day care booking started.\n\nWhat is your dog's name?`,
      variables: ["customer_name"],
    },
    {
      code: "ASK_BREED",
      name: "Booking Step 2: Ask Breed",
      category: "UTILITY",
      description: "Prompts customer for dog breed",
      body: `Got it! What breed is {{dog_name}}? (e.g. Golden Retriever, Labrador, Beagle, Indie, Shih Tzu)`,
      variables: ["dog_name"],
    },
    {
      code: "ASK_DATE",
      name: "Booking Step 3: Ask Booking Date",
      category: "UTILITY",
      description: "Prompts customer for visit date in YYYY-MM-DD format",
      body: `What date would you like to book for {{dog_name}}?\n\nPlease reply in YYYY-MM-DD format (e.g. *{{sample_date}}*).`,
      variables: ["dog_name", "sample_date"],
    },
    {
      code: "DATE_INVALID_FORMAT",
      name: "Error: Invalid Date Format",
      category: "UTILITY",
      description: "Sent when customer inputs date in incorrect format",
      body: `⚠️ Please enter a valid date in YYYY-MM-DD format (e.g. {{sample_date}}).`,
      variables: ["sample_date"],
    },
    {
      code: "DATE_UNAVAILABLE",
      name: "Notice: Slot Full or Closed",
      category: "UTILITY",
      description: "Sent when daycare is at capacity or blocked on the selected date",
      body: `⚠️ Sorry, {{booking_date}} is currently unavailable or fully booked ({{reason}}).\n\nPlease reply with an alternative date (YYYY-MM-DD).`,
      variables: ["booking_date", "reason"],
    },
    {
      code: "BOOKING_SUMMARY",
      name: "Booking Summary & Confirmation Prompt",
      category: "UTILITY",
      description: "Displays complete booking parameters before confirmation",
      body: `📋 *Dog Day Care Booking Summary*\n\n🐾 *Dog:* {{dog_name}} ({{breed}})\n📅 *Date:* {{booking_date}}\n⏰ *Drop-off:* {{dropoff_time}} | *Pick-up:* {{pickup_time}}\n💰 *Estimated Total:* ₹{{amount}}\n\nWould you like to confirm and proceed? (Reply *YES* to proceed)`,
      variables: ["dog_name", "breed", "booking_date", "dropoff_time", "pickup_time", "amount"],
    },
    {
      code: "BOOKING_CONFIRMATION",
      name: "Booking Confirmed Notice",
      category: "UTILITY",
      description: "Sent immediately after booking is confirmed",
      body: `🎉 *Booking Confirmed!*\n\nDear {{customer_name}},\n\nYour day care visit for *{{dog_name}}* is confirmed at *{{business_name}}*!\n\n📋 *Booking Ref:* {{booking_reference}}\n📅 *Date:* {{booking_date}}\n⏰ *Drop-off:* {{dropoff_time}}\n⏰ *Pick-up:* {{pickup_time}}\n💰 *Total Paid:* ₹{{amount}}\n\n📍 *Address:* {{business_address}}\n\nWe look forward to hosting {{dog_name}}!`,
      variables: [
        "customer_name",
        "dog_name",
        "business_name",
        "booking_reference",
        "booking_date",
        "dropoff_time",
        "pickup_time",
        "amount",
        "business_address",
      ],
    },
    {
      code: "PAYMENT_LINK",
      name: "Payment Link Request",
      category: "UTILITY",
      description: "Delivers the Razorpay checkout link",
      body: `💳 *Complete Payment for {{dog_name}}'s Day Care*\n\nDear {{customer_name}},\n\nPlease complete your payment of *₹{{amount}}* to confirm your reservation for *{{booking_date}}*.\n\n🔗 *Secure Payment Link:* {{payment_link}}\n\nThis link expires in 30 minutes.`,
      variables: ["customer_name", "dog_name", "amount", "booking_date", "payment_link"],
    },
    {
      code: "HUMAN_HANDOVER",
      name: "Human Support Requested Alert",
      category: "UTILITY",
      description: "Notifies customer that front desk staff will contact them shortly",
      body: `🤝 *Connecting You with Our Team*\n\nI have notified our on-duty front desk team. A staff member will reply to this chat shortly.\n\nThank you for your patience! In the meantime, our assistant is still active to help you anytime:\n• 📅 Book Day Care\n• 💳 Pricing & Packages\n• 📋 Main Menu`,
      variables: ["customer_name"],
    },
    {
      code: "MY_BOOKINGS_EMPTY",
      name: "My Bookings (No History)",
      category: "UTILITY",
      description: "Sent when customer has no past or upcoming bookings",
      body: `🐾 You have no previous or upcoming bookings with Needin.\n\nTap *Book Day Care* below to book your dog's first day care visit!`,
      variables: ["customer_name"],
    },
    {
      code: "MY_BOOKINGS_LIST",
      name: "My Bookings (History List)",
      category: "UTILITY",
      description: "Lists customer's recent bookings",
      body: `📋 *Your Recent Bookings:*\n\n{{booking_list}}\n\nTap *Book Day Care* to book a new visit, or *Talk to Human Support* for front desk assistance.`,
      variables: ["customer_name", "booking_list"],
    },
    {
      code: "FALLBACK_HELP",
      name: "Default / Fallback Help Menu",
      category: "UTILITY",
      description: "Sent when user input is not recognized",
      body: `I am your Needin Day Care assistant 🐾\n\nHow can we help you today?\n\n📅 Book Day Care\n💳 Pricing & Packages\n📍 Location & Timings\n💉 Vaccination Rules\n📋 My Bookings\n🤝 Talk to Human Support\n\nPlease select an option below or type your query:`,
      variables: [],
    },
    {
      code: "CHECKIN",
      name: "Pet Checked-in Notification",
      category: "UTILITY",
      description: "Sent when dog arrives and is marked checked-in",
      body: `🐾 *{{dog_name}} has Arrived!*\n\nHi {{customer_name}}, {{dog_name}} has safely checked in at Needin and has joined the supervised play area. Have a wonderful day!`,
      variables: ["customer_name", "dog_name"],
    },
    {
      code: "READY_FOR_PICKUP",
      name: "Ready for Pickup Alert",
      category: "UTILITY",
      description: "Sent when dog is groomed/rested and ready for collection",
      body: `🚗 *{{dog_name}} is Ready for Pick-up!*\n\nHi {{customer_name}}, {{dog_name}} has had an eventful day and is ready to go home! Our team will bring them to the lobby when you arrive.`,
      variables: ["customer_name", "dog_name"],
    },
    {
      code: "FEEDBACK",
      name: "Post-Stay Feedback Request",
      category: "UTILITY",
      description: "Sent after visit completion to collect 1-5 star rating",
      body: `🌟 *How was {{dog_name}}'s Day Care Visit?*\n\nHi {{customer_name}}, thank you for choosing Needin! On a scale of 1 to 5 (where 5 is pawsome), how would you rate your experience today?\n\nPlease reply with your rating (1-5).`,
      variables: ["customer_name", "dog_name"],
    },
  ];

  for (const t of templates) {
    const tmpl = await prisma.messageTemplate.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        category: t.category,
        description: t.description,
        service_id: dogDaycareService.id,
      },
      create: {
        code: t.code,
        name: t.name,
        category: t.category,
        description: t.description,
        service_id: dogDaycareService.id,
      },
    });

    await prisma.templateVersion.upsert({
      where: {
        template_id_version_number: {
          template_id: tmpl.id,
          version_number: 1,
        },
      },
      update: {
        body: t.body,
        variables: JSON.stringify(t.variables),
        is_active: true,
      },
      create: {
        template_id: tmpl.id,
        version_number: 1,
        body: t.body,
        variables: JSON.stringify(t.variables),
        is_active: true,
        created_by_user_id: admin.id,
      },
    });
  }
  console.log("   ✅ Message Templates & Version 1 seeded");

  // 6. Seed Sample Customers and Dogs
  console.log("🐶 Seeding Sample Customers & Dogs...");
  const customer1 = await prisma.customer.upsert({
    where: { phone: "919876543210" },
    update: { name: "Rahul Sharma", email: "rahul.sharma@example.com" },
    create: {
      phone: "919876543210",
      name: "Rahul Sharma",
      email: "rahul.sharma@example.com",
      notes: "Frequent daycare visitor, Bruno is very friendly.",
    },
  });

  const dog1 = await prisma.dog.upsert({
    where: { id: "dog_bruno_01" },
    update: { customer_id: customer1.id, name: "Bruno", breed: "Golden Retriever" },
    create: {
      id: "dog_bruno_01",
      customer_id: customer1.id,
      name: "Bruno",
      breed: "Golden Retriever",
      age_years: 2,
      age_months: 4,
      weight_kg: 28.5,
      gender: "MALE",
      is_spayed_neutered: true,
      allergies: "None",
      medical_notes: "Prefers morning naps after play.",
      emergency_contact: "919876543210",
      status: "ACTIVE",
    },
  });

  // Bruno's vaccinations: Rabies & DHPPi approved
  await prisma.vaccinationRecord.upsert({
    where: { id: "vax_bruno_rabies" },
    update: { verified_status: "APPROVED" },
    create: {
      id: "vax_bruno_rabies",
      dog_id: dog1.id,
      vaccine_name: "RABIES",
      administered_date: new Date("2026-01-15"),
      expiry_date: new Date("2027-01-15"),
      verified_status: "APPROVED",
      verified_by_user_id: staff.id,
      verified_at: new Date(),
      notes: "Valid 1-year Rabies vaccine card verified.",
    },
  });

  await prisma.vaccinationRecord.upsert({
    where: { id: "vax_bruno_dhppi" },
    update: { verified_status: "APPROVED" },
    create: {
      id: "vax_bruno_dhppi",
      dog_id: dog1.id,
      vaccine_name: "DHPPI",
      administered_date: new Date("2026-02-10"),
      expiry_date: new Date("2027-02-10"),
      verified_status: "APPROVED",
      verified_by_user_id: staff.id,
      verified_at: new Date(),
      notes: "Valid 9-in-1 DHPPi verified.",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { phone: "919811223344" },
    update: { name: "Priya Patel", email: "priya.patel@example.com" },
    create: {
      phone: "919811223344",
      name: "Priya Patel",
      email: "priya.patel@example.com",
    },
  });

  const dog2 = await prisma.dog.upsert({
    where: { id: "dog_bella_02" },
    update: { customer_id: customer2.id, name: "Bella", breed: "Beagle" },
    create: {
      id: "dog_bella_02",
      customer_id: customer2.id,
      name: "Bella",
      breed: "Beagle",
      age_years: 1,
      age_months: 6,
      weight_kg: 10.2,
      gender: "FEMALE",
      is_spayed_neutered: true,
      allergies: "Chicken allergy, feed only fish/rice kibble.",
      emergency_contact: "919811223344",
      status: "ACTIVE",
    },
  });

  console.log("   ✅ Customers & Dogs seeded");

  // 7. Seed Sample Active Bookings in various lifecycle states
  console.log("📅 Seeding sample bookings across lifecycle states...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Booking 1: Confirmed booking for tomorrow (Bruno)
  const singleDayPkg = await prisma.dogDaycarePackage.findUnique({ where: { code: "SINGLE_DAY" } });

  await prisma.dogDaycareBooking.upsert({
    where: { booking_number: "ND-DDC-202609-1024" },
    update: { booking_status: "CONFIRMED", payment_status: "PAID" },
    create: {
      booking_number: "ND-DDC-202609-1024",
      customer_id: customer1.id,
      dog_id: dog1.id,
      package_id: singleDayPkg?.id,
      booking_date: tomorrow,
      dropoff_time: "09:00 AM",
      pickup_time: "06:00 PM",
      amount: 500,
      discount: 0,
      total_amount: 500,
      booking_status: "CONFIRMED",
      payment_status: "PAID",
      source: "WHATSAPP",
      special_instructions: "Bring Bruno's favorite squeaky ball.",
    },
  });

  // Booking 2: Checked-In booking for today (Bella)
  const booking2 = await prisma.dogDaycareBooking.upsert({
    where: { booking_number: "ND-DDC-202609-1025" },
    update: { booking_status: "CHECKED_IN", payment_status: "PAID" },
    create: {
      booking_number: "ND-DDC-202609-1025",
      customer_id: customer2.id,
      dog_id: dog2.id,
      package_id: singleDayPkg?.id,
      booking_date: today,
      dropoff_time: "08:30 AM",
      pickup_time: "05:30 PM",
      amount: 500,
      discount: 0,
      total_amount: 500,
      booking_status: "CHECKED_IN",
      payment_status: "PAID",
      source: "DASHBOARD_MANUAL",
    },
  });

  await prisma.dogDaycareCheckIn.upsert({
    where: { booking_id: booking2.id },
    update: { checked_in_by_user_id: staff.id },
    create: {
      booking_id: booking2.id,
      checked_in_at: new Date(),
      checked_in_by_user_id: staff.id,
      staff_notes: "Bella checked in calmly and had morning water.",
    },
  });

  console.log("   ✅ Bookings seeded (ND-DDC-202609-1024, ND-DDC-202609-1025)");
  // 8. Seed Initial Audit Log
  await prisma.auditLog.create({
    data: {
      actor_user_id: owner.id,
      actor_name: owner.name,
      action: "SYSTEM_INITIALIZE_SEED",
      entity_type: "SYSTEM",
      entity_id: "needin_core",
      new_value: JSON.stringify({ version: "1.0.0", service: "DOG_DAY_CARE" }),
      reason: "Initial deployment seed execution.",
    },
  });
  console.log("   ✅ Initial audit log entry created");

  console.log("\n✨ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
