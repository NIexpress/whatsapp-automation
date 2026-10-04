import prisma from "@/shared/prisma";
import { findOrCreateCustomer, normalizePhoneNumber } from "@/core/customers";
import { renderTemplate } from "@/core/templates";
import { logAudit } from "@/core/audit";
import { checkDateAvailability } from "@/services/dog-daycare/availability";
import { calculateBookingPrice } from "@/services/dog-daycare/pricing";
import { createDaycareBooking } from "@/services/dog-daycare/bookings";
import { createDog } from "@/services/dog-daycare/dogs";

export interface ProcessWhatsAppMessageInput {
  phone: string;
  senderName?: string;
  content: string;
  messageId?: string;
}

export async function processIncomingWhatsAppMessage(input: ProcessWhatsAppMessageInput) {
  const normalizedPhone = normalizePhoneNumber(input.phone);
  const senderName = input.senderName || "Valued Customer";
  const userText = input.content.trim();
  const lowerText = userText.toLowerCase();

  // 1. Resolve or create customer
  const customer = await findOrCreateCustomer({
    phone: normalizedPhone,
    name: senderName,
  });

  // 2. Fetch or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: { phone: normalizedPhone },
  });

  if (!conversation) {
    const ddc = await prisma.service.findUnique({ where: { code: "DOG_DAY_CARE" } });
    conversation = await prisma.conversation.create({
      data: {
        customer_id: customer.id,
        phone: normalizedPhone,
        active_service_id: ddc?.id || null,
        status: "AI_ACTIVE",
        current_intent: "GREETING",
      },
    });
  }

  // 3. Persist incoming customer message
  await prisma.message.create({
    data: {
      conversation_id: conversation.id,
      sender_type: "CUSTOMER",
      message_type: "TEXT",
      content: userText,
      whatsapp_message_id: input.messageId || null,
    },
  });

  // If conversation is in HUMAN_ACTIVE mode (switched manually from dashboard), do not auto-reply
  if (conversation.status === "HUMAN_ACTIVE" || !conversation.ai_enabled) {
    return {
      reply: null,
      status: "HUMAN_ACTIVE",
    };
  }

  // Parse session state
  let sessionState: any = {};
  try {
    sessionState = conversation.session_state ? JSON.parse(conversation.session_state) : {};
  } catch {
    sessionState = {};
  }

  let replyText = "";

  // 4. Intent Routing & State Machine (All responses rendered via Database Templates!)

  // Reset commands / Menu
  if (lowerText === "hi" || lowerText === "hello" || lowerText === "start" || lowerText === "menu" || lowerText === "0") {
    sessionState = {};
    const rendered = await renderTemplate("WELCOME", {
      customer_name: customer.name,
    });
    replyText = rendered.text;
  }
  // Priority: In-Chat BOOKING_FORM Submission (All-in-one Single Message Booking)
  else if (
    lowerText.includes("booking request") ||
    lowerText.includes("booking form submitted") ||
    (lowerText.includes("dog name") && lowerText.includes("date")) ||
    (sessionState.step === "BOOKING_FORM" && (lowerText.includes("dog") || lowerText.includes("breed") || /\d{4}-\d{2}-\d{2}/.test(userText)))
  ) {
    // 1. Extract Dog Name
    const dogMatch = userText.match(/(?:•\s*)?(?:Dog(?:\s*Name|\'s\s*Name)?|Pet(?:\s*Name)?)[:*]\s*([^\n•,]+)/i);
    let dogName = dogMatch ? dogMatch[1].replace(/\*/g, "").trim() : "";
    if (!dogName) {
      const nonHeaderLines = userText.split("\n").filter((l) => !l.toLowerCase().includes("booking") && l.trim().length > 0);
      dogName = nonHeaderLines[0] ? nonHeaderLines[0].replace(/^[^a-zA-Z0-9]+/, "").trim() : "Bruno";
    }

    // 2. Extract Breed
    const breedMatch = userText.match(/(?:•\s*)?Breed[:*]\s*([^\n•,]+)/i);
    const breed = breedMatch ? breedMatch[1].replace(/\*/g, "").trim() : "Mixed Breed";

    // 3. Extract Booking Date
    const dateMatch = userText.match(/(\d{4}-\d{2}-\d{2})/);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const bookingDate = dateMatch ? dateMatch[1] : tomorrowStr;

    // 4. Extract Package
    let packageCode = "SINGLE_DAY";
    if (lowerText.includes("5-day") || lowerText.includes("five_day") || lowerText.includes("2,200") || lowerText.includes("2200")) {
      packageCode = "FIVE_DAY";
    } else if (lowerText.includes("monthly") || lowerText.includes("7,500") || lowerText.includes("7500") || lowerText.includes("unlimited")) {
      packageCode = "MONTHLY";
    }

    // 5. Verify Availability
    const avail = await checkDateAvailability(bookingDate);
    if (!avail.isAvailable) {
      const rendered = await renderTemplate("DATE_UNAVAILABLE", {
        booking_date: bookingDate,
        reason: avail.blockReason || "Capacity reached",
      });
      replyText = rendered.text;
    } else {
      // 6. Resolve or create Dog
      let dog = await prisma.dog.findFirst({
        where: { customer_id: customer.id, name: dogName },
      });

      if (!dog) {
        dog = await createDog({
          customerId: customer.id,
          name: dogName,
          breed: breed,
        });
      }

      // 7. Create Booking directly in one shot!
      const booking = await createDaycareBooking({
        customerId: customer.id,
        dogId: dog.id,
        bookingDate: bookingDate,
        dropoffTime: "09:00 AM",
        pickupTime: "06:00 PM",
        packageCode: packageCode,
        source: "WHATSAPP",
        initialStatus: "PENDING_PAYMENT",
      });

      const paymentLink = `http://localhost:3000/simulator?paymentBookingId=${booking.id}&amount=${booking.total_amount}`;

      // 9. Deliver Confirmation + Payment Link
      const rendered = await renderTemplate("PAYMENT_LINK", {
        customer_name: customer.name,
        dog_name: dog.name,
        amount: booking.total_amount,
        booking_date: bookingDate,
        payment_link: paymentLink,
      });

      replyText = rendered.text;
      sessionState = { completedBookingId: booking.id };
    }
  }
  // Option 1: Start Day Care Booking -> In-Chat Form (Reduces messaging costs)
  else if (
    !lowerText.includes("my booking") &&
    !lowerText.includes("booking request") &&
    !lowerText.includes("booking form submitted") &&
    (lowerText === "1" || lowerText.includes("book day care") || lowerText === "book")
  ) {
    sessionState.step = "BOOKING_FORM";
    const rendered = await renderTemplate("BOOKING_FORM", {
      customer_name: customer.name,
    });
    replyText = rendered.text;
  }
  // Option 2: Pricing & Packages
  else if (lowerText === "2" || lowerText.includes("pricing") || lowerText.includes("package") || lowerText.includes("rate")) {
    sessionState = {};
    const rendered = await renderTemplate("PRICING");
    replyText = rendered.text;
  }
  // Option 3: Location & Operating Timings
  else if (lowerText === "3" || lowerText.includes("location") || lowerText.includes("address") || lowerText.includes("timing") || lowerText.includes("hour")) {
    sessionState = {};
    const rendered = await renderTemplate("LOCATION");
    replyText = rendered.text;
  }
  // Option 4: Vaccination Policy
  else if (lowerText === "4" || lowerText.includes("vaccin") || lowerText.includes("rabies") || lowerText.includes("dhppi") || lowerText.includes("rule")) {
    sessionState = {};
    const rendered = await renderTemplate("VACCINATION_REQUIREMENTS");
    replyText = rendered.text;
  }
  // Option 5: My Bookings
  else if (
    lowerText === "5" ||
    lowerText.includes("my booking") ||
    lowerText === "my bookings" ||
    lowerText === "bookings" ||
    lowerText.includes("booking history") ||
    (lowerText.includes("booking") && !lowerText.includes("book day care") && !lowerText.includes("booking request") && !lowerText.includes("booking form"))
  ) {
    sessionState = {};
    const dogBookings = await prisma.dogDaycareBooking.findMany({
      where: { customer_id: customer.id },
      include: { dog: true },
      orderBy: { booking_date: "desc" },
      take: 5,
    });

    if (dogBookings.length === 0) {
      const rendered = await renderTemplate("MY_BOOKINGS_EMPTY", {
        customer_name: customer.name,
      });
      replyText = rendered.text;
    } else {
      const statusBadge: Record<string, string> = {
        CONFIRMED: "✅ Confirmed",
        PENDING_PAYMENT: "⏳ Pending Payment",
        CHECKED_IN: "🐾 Checked In",
        COMPLETED: "✨ Completed",
        CANCELLED: "❌ Cancelled",
      };

      const bookingList = dogBookings
        .map(
          (b) =>
            `• *${b.booking_number}* (${b.dog?.name || "Dog"})\n  📅 Date: ${b.booking_date.toISOString().slice(0, 10)} | Drop-off: ${b.dropoff_time || "09:00 AM"} | Status: *${statusBadge[b.booking_status] || b.booking_status}* | Total: ₹${b.total_amount}${
              b.booking_status === "PENDING_PAYMENT"
                ? `\n  🔗 Pay: http://localhost:3000/simulator?paymentBookingId=${b.id}&amount=${b.total_amount}`
                : ""
            }`
        )
        .join("\n\n");

      const rendered = await renderTemplate("MY_BOOKINGS_LIST", {
        customer_name: customer.name,
        booking_list: bookingList,
      });
      replyText = rendered.text;
    }
  }
  // Option 6: Talk to Human Support (Staff will contact later, does NOT switch to manual mode)
  else if (lowerText === "6" || lowerText.includes("human") || lowerText.includes("agent") || lowerText.includes("support") || lowerText.includes("help") || lowerText.includes("talk")) {
    sessionState = {};
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        current_intent: "HUMAN_SUPPORT_REQUESTED",
      },
    });

    await logAudit({
      action: "CUSTOMER_REQUESTED_HUMAN_SUPPORT",
      entityType: "CONVERSATION",
      entityId: conversation.id,
      newValue: {
        customer_name: customer.name,
        phone: customer.phone,
        message: userText,
      },
    });

    const rendered = await renderTemplate("HUMAN_HANDOVER", {
      customer_name: customer.name,
    });
    replyText = rendered.text;
  }
  // Step: ASK_DOG_NAME
  else if (sessionState.step === "ASK_DOG_NAME") {
    sessionState.dogName = userText;
    sessionState.step = "ASK_BREED";
    const rendered = await renderTemplate("ASK_BREED", {
      dog_name: userText,
    });
    replyText = rendered.text;
  }
  // Step: ASK_BREED
  else if (sessionState.step === "ASK_BREED") {
    sessionState.breed = userText;
    sessionState.step = "ASK_DATE";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const rendered = await renderTemplate("ASK_DATE", {
      dog_name: sessionState.dogName,
      sample_date: tomorrowStr,
    });
    replyText = rendered.text;
  }
  // Step: ASK_DATE
  else if (sessionState.step === "ASK_DATE") {
    const dateInput = userText.match(/\d{4}-\d{2}-\d{2}/) ? userText : null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    if (!dateInput) {
      const rendered = await renderTemplate("DATE_INVALID_FORMAT", {
        sample_date: tomorrowStr,
      });
      replyText = rendered.text;
    } else {
      const avail = await checkDateAvailability(dateInput);
      if (!avail.isAvailable) {
        const rendered = await renderTemplate("DATE_UNAVAILABLE", {
          booking_date: dateInput,
          reason: avail.blockReason || "Capacity reached",
        });
        replyText = rendered.text;
      } else {
        sessionState.bookingDate = dateInput;
        sessionState.step = "ASK_CONFIRMATION";
        const priceInfo = await calculateBookingPrice({});
        sessionState.amount = priceInfo.total;

        const rendered = await renderTemplate("BOOKING_SUMMARY", {
          dog_name: sessionState.dogName,
          breed: sessionState.breed,
          booking_date: dateInput,
          dropoff_time: "09:00 AM",
          pickup_time: "06:00 PM",
          amount: priceInfo.total,
        });
        replyText = rendered.text;
      }
    }
  }
  // Step: ASK_CONFIRMATION -> On YES/CONFIRM
  else if (sessionState.step === "ASK_CONFIRMATION" && (lowerText === "yes" || lowerText === "confirm" || lowerText === "y")) {
    let dog = await prisma.dog.findFirst({
      where: { customer_id: customer.id, name: sessionState.dogName },
    });

    if (!dog) {
      dog = await createDog({
        customerId: customer.id,
        name: sessionState.dogName,
        breed: sessionState.breed || "Mixed Breed",
      });
    }

    const booking = await createDaycareBooking({
      customerId: customer.id,
      dogId: dog.id,
      bookingDate: sessionState.bookingDate,
      dropoffTime: "09:00 AM",
      pickupTime: "06:00 PM",
      source: "WHATSAPP",
      initialStatus: "PENDING_PAYMENT",
    });

    const paymentLink = `http://localhost:3000/simulator?paymentBookingId=${booking.id}&amount=${booking.total_amount}`;

    const rendered = await renderTemplate("PAYMENT_LINK", {
      customer_name: customer.name,
      dog_name: dog.name,
      amount: booking.total_amount,
      booking_date: sessionState.bookingDate,
      payment_link: paymentLink,
    });

    replyText = rendered.text;
    sessionState = { completedBookingId: booking.id };
  }
  // Fallback unrecognized input -> renders FALLBACK_HELP
  else {
    const rendered = await renderTemplate("FALLBACK_HELP");
    replyText = rendered.text;
    sessionState = {};
  }

  // 5. Persist AI response
  const aiMessage = await prisma.message.create({
    data: {
      conversation_id: conversation.id,
      sender_type: "AI",
      message_type: "TEXT",
      content: replyText,
    },
  });

  // 6. Update session state on conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      session_state: JSON.stringify(sessionState),
      updated_at: new Date(),
    },
  });

  return {
    reply: replyText,
    messageId: aiMessage.id,
    conversationId: conversation.id,
  };
}
