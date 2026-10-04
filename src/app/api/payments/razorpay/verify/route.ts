import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";
import { verifyRazorpaySignature } from "@/core/payments/razorpay";
import { confirmBooking } from "@/services/dog-daycare/bookings";
import { renderTemplate } from "@/core/templates";
import { sendWhatsAppTextMessage } from "@/core/whatsapp/client";
import { handleApiError, NotFoundError, ValidationError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      throw new ValidationError(
        "Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId"
      );
    }

    // 1. Verify Cryptographic Signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      console.error("[Razorpay Verify] Invalid signature for order:", razorpay_order_id);
      throw new ValidationError("Payment signature verification failed. Potential tampering detected.");
    }

    // 2. Fetch booking
    const booking = await prisma.dogDaycareBooking.findUnique({
      where: { id: bookingId },
      include: { customer: true, dog: true, package: true },
    });

    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    // 3. Find or update Payment record
    let payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { gateway_order_id: razorpay_order_id },
          { reference_id: booking.id, gateway: "RAZORPAY" },
        ],
      },
    });

    if (payment) {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          gateway_order_id: razorpay_order_id,
          gateway_payment_id: razorpay_payment_id,
          gateway_signature: razorpay_signature,
          status: "SUCCESS",
          paid_at: new Date(),
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          customer_id: booking.customer_id,
          reference_type: "BOOKING",
          reference_id: booking.id,
          gateway: "RAZORPAY",
          gateway_order_id: razorpay_order_id,
          gateway_payment_id: razorpay_payment_id,
          gateway_signature: razorpay_signature,
          amount: booking.total_amount,
          currency: "INR",
          status: "SUCCESS",
          paid_at: new Date(),
        },
      });
    }

    // 4. Confirm Booking atomically with slot capacity
    const confirmedBooking = await confirmBooking(booking.id, {
      paymentId: payment.id,
      actorName: "RAZORPAY_CHECKOUT",
    });

    // 5. Deliver Confirmation Template into WhatsApp Chat
    try {
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

        // Also deliver to customer's live WhatsApp phone via Cloud API
        sendWhatsAppTextMessage({
          to: booking.customer.phone,
          text: rendered.text,
          previewUrl: true,
        }).catch((wErr) => {
          console.warn("[Razorpay Verify] Non-blocking WhatsApp message delivery:", wErr);
        });
      }
    } catch (msgErr) {
      console.warn("[Razorpay Verify] Non-blocking error sending confirmation message:", msgErr);
    }

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and booking confirmed!",
      data: {
        bookingId: confirmedBooking.id,
        bookingNumber: confirmedBooking.booking_number,
        bookingStatus: confirmedBooking.booking_status,
        paymentStatus: confirmedBooking.payment_status,
        transactionId: razorpay_payment_id,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
