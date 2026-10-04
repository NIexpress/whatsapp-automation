import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";
import { confirmBooking } from "@/services/dog-daycare/bookings";
import { renderTemplate } from "@/core/templates";
import { handleApiError, ValidationError, NotFoundError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId } = body;
    if (!bookingId) throw new ValidationError("bookingId is required.");

    const booking = await prisma.dogDaycareBooking.findUnique({
      where: { id: bookingId },
      include: { customer: true, dog: true },
    });
    if (!booking) throw new NotFoundError("Booking", bookingId);

    // 1. Create simulated payment record
    const payment = await prisma.payment.create({
      data: {
        customer_id: booking.customer_id,
        reference_type: "BOOKING",
        reference_id: booking.id,
        gateway: "RAZORPAY_SIMULATOR",
        gateway_order_id: `order_sim_${Date.now()}`,
        gateway_payment_id: `pay_sim_${Date.now()}`,
        amount: booking.total_amount,
        status: "SUCCESS",
        paid_at: new Date(),
      },
    });

    // 2. Confirm booking
    const confirmed = await confirmBooking(booking.id, {
      paymentId: payment.id,
      actorName: "GATEWAY_WEBHOOK",
    });

    // 3. Render and append Booking Confirmation message in WhatsApp conversation
    const conv = await prisma.conversation.findFirst({
      where: { phone: booking.customer.phone },
    });

    if (conv) {
      const rendered = await renderTemplate("BOOKING_CONFIRMATION", {
        customer_name: booking.customer.name,
        dog_name: booking.dog.name,
        booking_reference: booking.booking_number,
        booking_date: booking.booking_date.toISOString().slice(0, 10),
        dropoff_time: booking.dropoff_time,
        pickup_time: booking.pickup_time,
        amount: booking.total_amount,
      });

      await prisma.message.create({
        data: {
          conversation_id: conv.id,
          sender_type: "SYSTEM",
          message_type: "TEMPLATE",
          content: rendered.text,
        },
      });
    }

    return NextResponse.json({ success: true, data: confirmed });
  } catch (error) {
    return handleApiError(error);
  }
}
