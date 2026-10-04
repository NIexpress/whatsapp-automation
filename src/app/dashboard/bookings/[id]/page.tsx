"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  Dog,
  Syringe,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  AlertCircle,
  History,
  ShieldAlert,
} from "lucide-react";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Customer requested cancellation.");

  const loadBooking = () => {
    setLoading(true);
    fetch(`/api/dog-daycare/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setBooking(res.data);
          setNewDate(new Date(res.data.booking_date).toISOString().slice(0, 10));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const executeAction = async (endpoint: string, body: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/dog-daycare/bookings/${bookingId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowRescheduleModal(false);
        setShowCancelModal(false);
        loadBooking();
      } else {
        alert("Action error: " + (data.error?.message || "Failed to execute."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p>Loading booking details...</p>
      </div>
    );
  }

  const vax = booking.vaccination_compliance || {};

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/bookings"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white font-mono">{booking.booking_number}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  booking.booking_status === "CONFIRMED"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : booking.booking_status === "CHECKED_IN"
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                    : booking.booking_status === "IN_CARE"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    : booking.booking_status === "READY_FOR_PICKUP"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : booking.booking_status === "COMPLETED"
                    ? "bg-slate-800 text-slate-300"
                    : booking.booking_status === "PENDING_PAYMENT"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {booking.booking_status}
              </span>
            </div>
            <p className="text-xs text-slate-400">Created via {booking.source} on {new Date(booking.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* State-aware action buttons bar */}
        <div className="flex flex-wrap items-center gap-2">
          {booking.booking_status === "PENDING_PAYMENT" && (
            <button
              onClick={() => executeAction("confirm")}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow transition"
            >
              Confirm Manually
            </button>
          )}

          {booking.booking_status === "CONFIRMED" && (
            <>
              <button
                onClick={() => executeAction("status", { status: "CHECKED_IN" })}
                disabled={actionLoading}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow transition"
              >
                Check-in Pet
              </button>
              <button
                onClick={() => setShowRescheduleModal(true)}
                disabled={actionLoading}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition"
              >
                Reschedule
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-xl text-xs border border-rose-500/30 transition"
              >
                Cancel Booking
              </button>
            </>
          )}

          {booking.booking_status === "CHECKED_IN" && (
            <button
              onClick={() => executeAction("status", { status: "IN_CARE" })}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs shadow transition"
            >
              Mark In Care
            </button>
          )}

          {booking.booking_status === "IN_CARE" && (
            <button
              onClick={() => executeAction("status", { status: "READY_FOR_PICKUP" })}
              disabled={actionLoading}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-xs shadow transition"
            >
              Mark Ready for Pickup
            </button>
          )}

          {booking.booking_status === "READY_FOR_PICKUP" && (
            <button
              onClick={() => executeAction("status", { status: "COMPLETED" })}
              disabled={actionLoading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs shadow transition"
            >
              Complete & Picked Up
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Customer & Dog */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Customer Information</span>
            </h3>
            <div>
              <p className="text-base font-bold text-white">{booking.customer.name}</p>
              <p className="text-xs text-slate-400 font-mono">+{booking.customer.phone}</p>
              {booking.customer.email && <p className="text-xs text-slate-400">{booking.customer.email}</p>}
            </div>
            {booking.customer.notes && (
              <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                Note: {booking.customer.notes}
              </p>
            )}
          </div>

          {/* Dog Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Dog className="w-4 h-4 text-emerald-400" />
              <span>Pet Profile</span>
            </h3>
            <div>
              <p className="text-base font-bold text-emerald-300">{booking.dog.name}</p>
              <p className="text-xs text-slate-400">{booking.dog.breed}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div>Age: <span className="font-semibold text-white">{booking.dog.age_years}y {booking.dog.age_months}m</span></div>
              <div>Weight: <span className="font-semibold text-white">{booking.dog.weight_kg ? `${booking.dog.weight_kg} kg` : "N/A"}</span></div>
              <div>Gender: <span className="font-semibold text-white">{booking.dog.gender}</span></div>
              <div>Neutered: <span className="font-semibold text-white">{booking.dog.is_spayed_neutered ? "Yes" : "No"}</span></div>
            </div>
            {booking.dog.allergies && (
              <div className="text-xs p-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl">
                Allergies: {booking.dog.allergies}
              </div>
            )}
          </div>

          {/* Vaccination Compliance Badge */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Syringe className="w-4 h-4 text-emerald-400" />
              <span>Vaccination Compliance</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Rabies (Mandatory):</span>
                <span className={vax.hasRabies ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {vax.hasRabies ? "Verified" : "Missing / Expired"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>DHPPi (Mandatory):</span>
                <span className={vax.hasDHPPi ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {vax.hasDHPPi ? "Verified" : "Missing / Expired"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bordetella (Recommended):</span>
                <span className={vax.hasBordetella ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  {vax.hasBordetella ? "Verified" : "Not on file"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Reservation & Audit History */}
        <div className="md:col-span-2 space-y-6">
          {/* Reservation Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Booking Parameters & Pricing
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Booking Date</span>
                <span className="text-sm font-bold text-white">
                  {new Date(booking.booking_date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Timing Window</span>
                <span className="text-sm font-bold text-white">
                  {booking.dropoff_time} – {booking.pickup_time}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Selected Package</span>
                <span className="text-sm font-bold text-emerald-400">
                  {booking.package?.name || "Single Day Visit"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">Payment Status:</span>
                <span className="font-bold text-emerald-400">{booking.payment_status}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Total Amount</span>
                <span className="text-base font-black text-white">₹{booking.total_amount}</span>
              </div>
            </div>

            {booking.special_instructions && (
              <p className="text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-slate-300">
                <strong className="text-emerald-400">Special Instructions:</strong> {booking.special_instructions}
              </p>
            )}
          </div>

          {/* Operational Checkin Log */}
          {booking.checkin && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Operational Check-in Tracking</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Checked In</span>
                  <span className="font-semibold text-white">
                    {booking.checkin.checked_in_at
                      ? new Date(booking.checkin.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">In Care</span>
                  <span className="font-semibold text-white">
                    {booking.checkin.in_care_at
                      ? new Date(booking.checkin.in_care_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Ready for Pickup</span>
                  <span className="font-semibold text-white">
                    {booking.checkin.ready_for_pickup_at
                      ? new Date(booking.checkin.ready_for_pickup_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Picked Up</span>
                  <span className="font-semibold text-white">
                    {booking.checkin.picked_up_at
                      ? new Date(booking.checkin.picked_up_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
              </div>
              {booking.checkin.staff_notes && (
                <p className="text-xs text-slate-400 mt-2">
                  Staff Notes: {booking.checkin.staff_notes}
                </p>
              )}
            </div>
          )}

          {/* Audit History Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Audit History Timeline</span>
            </h3>
            {(!booking.timeline || booking.timeline.length === 0) ? (
              <p className="text-xs text-slate-500">No audit logs recorded for this booking yet.</p>
            ) : (
              <div className="space-y-3">
                {booking.timeline.map((log: any) => (
                  <div key={log.id} className="text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-bold text-emerald-300">{log.action}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300">
                      Actor: <strong className="text-white">{log.actor_name}</strong> &bull; Reason: {log.reason || "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white">Reschedule Day Care Booking</h3>
            <p className="text-slate-400">Select a new date. System will check capacity automatically.</p>
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">New Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => executeAction("reschedule", { newDate })}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white text-rose-400">Cancel Booking</h3>
            <p className="text-slate-400">
              Cancellation policy applies (100% refund if &gt; 24h prior, 50% late fee if within 24h).
            </p>
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Cancellation Reason</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={() => executeAction("cancel", { reason: cancelReason })}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
