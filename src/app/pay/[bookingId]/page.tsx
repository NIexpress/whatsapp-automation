"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Calendar,
  Clock,
  Dog,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface BookingData {
  id: string;
  bookingNumber: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  dogName: string;
  bookingDate: string;
  dropoffTime: string;
  pickupTime: string;
}

export default function PayBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [keyId, setKeyId] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [orderAmount, setOrderAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Load Razorpay Checkout.js script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Initialize order from backend
  useEffect(() => {
    if (!bookingId) return;

    const initOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/payments/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error?.message || "Failed to initiate payment order");
        }

        setBooking(data.data.booking);
        setKeyId(data.data.keyId);
        setOrderId(data.data.orderId);
        setOrderAmount(data.data.amount);
      } catch (err: any) {
        setError(err.message || "Failed to load booking payment information.");
      } finally {
        setLoading(false);
      }
    };

    initOrder();
  }, [bookingId]);

  // Open Real Razorpay Checkout
  const handleOpenRazorpay = async () => {
    if (!booking || !orderId || !keyId) {
      alert("Payment details not ready yet. Please refresh.");
      return;
    }

    setProcessing(true);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        alert("Failed to load Razorpay checkout script. Check your internet connection.");
        setProcessing(false);
        return;
      }

      const options = {
        key: keyId,
        amount: orderAmount,
        currency: "INR",
        name: "Needin Pet Resort & Day Care",
        description: `Booking #${booking.bookingNumber} (${booking.dogName})`,
        image: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
        order_id: orderId,
        prefill: {
          name: booking.customerName || "Customer",
          contact: booking.customerPhone || "",
          email: booking.customerEmail || `${booking.customerPhone}@needin.in`,
        },
        notes: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
        theme: {
          color: "#10b981", // Emerald 500
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setProcessing(true);
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: booking.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPaidSuccess(true);
              setPaymentDetails({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                bookingNumber: booking.bookingNumber,
              });
            } else {
              alert("Signature verification failed: " + (verifyData.error?.message || "Invalid signature"));
            }
          } catch (vErr: any) {
            console.error("Verification error:", vErr);
            alert("Error confirming payment. Please contact support.");
          } finally {
            setProcessing(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (res: any) => {
        alert("Payment failed: " + (res.error?.description || "Transaction declined"));
        setProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert("Error launching Razorpay checkout: " + err.message);
      setProcessing(false);
    }
  };

  // One-click instant sandbox simulation
  const handleQuickSandboxPay = async () => {
    if (!booking) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/simulator/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPaidSuccess(true);
        setPaymentDetails({
          paymentId: `pay_sim_${Date.now()}`,
          orderId: orderId,
          bookingNumber: booking.bookingNumber,
        });
      } else {
        alert("Simulation error: " + (data.error?.message || "Failed"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400">Loading secure checkout...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Payment Link Error</h2>
          <p className="text-xs text-slate-400">{error || "Booking not found or already processed."}</p>
          <div className="pt-2">
            <Link
              href="/simulator"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to WhatsApp Simulator</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (paidSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Payment Confirmed!</h1>
            <p className="text-xs text-slate-400 mt-1">
              Your booking for <span className="text-emerald-400 font-bold">{booking.dogName}</span> has been confirmed.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Booking Reference</span>
              <span className="font-mono font-bold text-white">{booking.bookingNumber}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Transaction ID</span>
              <span className="font-mono text-emerald-400">{paymentDetails?.paymentId}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Amount Paid</span>
              <span className="font-bold text-white">₹{booking.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date & Slot</span>
              <span className="text-slate-300">
                {booking.bookingDate} ({booking.dropoffTime} - {booking.pickupTime})
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/simulator"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Back to WhatsApp Chat</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
            >
              View Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 shadow-md">
              🐾
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Needin Pet Day Care</h2>
              <p className="text-[10px] text-slate-400">Secure Razorpay Checkout</p>
            </div>
          </div>
          <Link
            href="/simulator"
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Chat Simulator</span>
          </Link>
        </div>

        {/* Payment Card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          {/* Amount Badge */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Total Amount Payable
            </span>
            <div className="text-3xl font-black text-white mt-1">₹{booking.amount}</div>
            <span className="text-[10px] text-slate-400 mt-1 block">Includes all applicable taxes & care care</span>
          </div>

          {/* Booking Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Booking Summary</span>
            </h3>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Dog className="w-3.5 h-3.5 text-emerald-400" />
                  Pet Name:
                </span>
                <span className="font-bold text-white">{booking.dogName}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  Date:
                </span>
                <span className="text-slate-200 font-medium">{booking.bookingDate}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Care Timings:
                </span>
                <span className="text-slate-200 font-medium">
                  {booking.dropoffTime} - {booking.pickupTime}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/60">
                <span className="text-slate-400">Booking Ref:</span>
                <span className="font-mono text-[11px] text-slate-300">{booking.bookingNumber}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {/* Primary: Real Razorpay Popup */}
            <button
              type="button"
              onClick={handleOpenRazorpay}
              disabled={processing}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 active:scale-98 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 group cursor-pointer"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹{booking.amount} with Razorpay</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </>
              )}
            </button>

            {/* Quick Sandbox Simulation Button */}
            <button
              type="button"
              onClick={handleQuickSandboxPay}
              disabled={processing}
              className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700/60 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant Test Simulation (Skip Payment Gateway)</span>
            </button>
          </div>

          {/* Trust and Razorpay badges */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Razorpay 256-Bit SSL Secured</span>
            </span>
            <span className="font-mono text-slate-400">Key: {keyId ? `${keyId.slice(0, 10)}...` : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
