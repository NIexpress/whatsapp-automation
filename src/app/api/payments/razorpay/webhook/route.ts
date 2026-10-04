import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/prisma";
import { verifyWebhookSignature } from "@/core/payments/razorpay";
import { confirmBooking } from "@/services/dog-daycare/bookings";
import { renderTemplate } from "@/core/templates";
import { logAudit } from "@/core/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    // Verify webhook signature if secret configured
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;
    if (webhookSecret && webhookSecret !== "replace_with_razorpay_webhook_secret") {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error("[Razorpay Webhook] Invalid signature received.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const notes = paymentEntity?.notes || {};
      const bookingId = notes.bookingId;

      if (bookingId) {
        const booking = await prisma.dogDaycareBooking.findUnique({
          where: { id: bookingId },
          include: { customer: true, dog: true },
        });

        if (booking && booking.booking_status !== "CONFIRMED") {
          // Update or create payment record
          let payment = await prisma.payment.findFirst({
            where: {
              OR: [
                { gateway_order_id: orderId },
                { gateway_payment_id: paymentId },
                { reference_id: booking.id },
              ],
            },
          });

          if (payment) {
            payment = await prisma.payment.update({
              where: { id: payment.id },
              data: {
                gateway_payment_id: paymentId,
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
                gateway_order_id: orderId,
                gateway_payment_id: paymentId,
                amount: booking.total_amount,
                currency: "INR",
                status: "SUCCESS",
                paid_at: new Date(),
              },
            });
          }

          // Confirm booking
          await confirmBooking(booking.id, {
            paymentId: payment.id,
            actorName: "RAZORPAY_WEBHOOK",
          });

          // Deliver confirmation message if not sent
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

          await logAudit({
            actorName: "RAZORPAY_WEBHOOK",
            action: "PAYMENT_WEBHOOK_PROCESSED",
            entityType: "PAYMENT",
            entityId: payment.id,
            newValue: { event, orderId, paymentId, bookingId },
          });
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Razorpay Webhook Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
