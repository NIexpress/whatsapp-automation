import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";
import { createRazorpayOrder, getRazorpayKeys } from "@/core/payments/razorpay";
import { handleApiError, NotFoundError, ValidationError, ConflictError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { bookingId } = body;

    if (!bookingId) {
      throw new ValidationError("bookingId is required to generate Razorpay order.");
    }

    // 1. Fetch booking with customer and dog details
    const booking = await prisma.dogDaycareBooking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        dog: true,
        package: true,
      },
    });

    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    if (booking.booking_status === "CONFIRMED" && booking.payment_status === "PAID") {
      throw new ConflictError("This booking is already confirmed and paid for.");
    }

    if (booking.booking_status === "CANCELLED") {
      throw new ConflictError("Cannot initiate payment for a cancelled booking.");
    }

    const { keyId } = getRazorpayKeys();
    if (!keyId) {
      throw new ValidationError("Razorpay credentials are not configured on the server.");
    }

    // 2. Create Order on Razorpay
    const order = await createRazorpayOrder({
      amountInRupees: booking.total_amount,
      currency: "INR",
      receipt: booking.booking_number,
      notes: {
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        customerId: booking.customer_id,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        dogName: booking.dog.name,
      },
    });

    // 3. Upsert / record pending Payment in Database
    const payment = await prisma.payment.create({
      data: {
        customer_id: booking.customer_id,
        reference_type: "BOOKING",
        reference_id: booking.id,
        gateway: "RAZORPAY",
        gateway_order_id: order.id,
        amount: booking.total_amount,
        currency: "INR",
        status: "PENDING",
        metadata: JSON.stringify({
          booking_number: booking.booking_number,
          dog_name: booking.dog.name,
          order_receipt: order.receipt,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount, // in paise
        currency: order.currency,
        keyId,
        paymentId: payment.id,
        booking: {
          id: booking.id,
          bookingNumber: booking.booking_number,
          amount: booking.total_amount,
          customerName: booking.customer.name,
          customerPhone: booking.customer.phone,
          customerEmail: booking.customer.email,
          dogName: booking.dog.name,
          bookingDate: booking.booking_date.toISOString().slice(0, 10),
          dropoffTime: booking.dropoff_time,
          pickupTime: booking.pickup_time,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
