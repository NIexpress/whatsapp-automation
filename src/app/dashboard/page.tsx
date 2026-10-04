"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  Dog,
  Syringe,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Search,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [pendingVaccines, setPendingVaccines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Booking Form State
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newDogName, setNewDogName] = useState("");
  const [newBreed, setNewBreed] = useState("Golden Retriever");
  const [newBookingDate, setNewBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [newPackageCode, setNewPackageCode] = useState("SINGLE_DAY");
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, vaccinesRes] = await Promise.all([
        fetch("/api/dog-daycare/bookings?take=15"),
        fetch("/api/dog-daycare/vaccinations"),
      ]);

      const bData = await bookingsRes.json();
      const vData = await vaccinesRes.json();

      if (bData.success) {
        const bList = Array.isArray(bData.data) ? bData.data : (bData.data?.bookings || []);
        setBookings(bList);
      }
      if (vData.success) {
        const vList = Array.isArray(vData.data) ? vData.data : (vData.data?.vaccinations || []);
        setPendingVaccines(vList);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (bookingId: string, endpoint: string, body: any = {}) => {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/dog-daycare/bookings/${bookingId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert("Action error: " + (data.error?.message || "Operation failed."));
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    try {
      // 1. Create or upsert customer
      const custRes = await fetch("/api/core/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName, phone: newCustomerPhone }),
      });
      const custData = await custRes.json();
      if (!custData.success) throw new Error(custData.error?.message || "Failed to create customer.");
      const customer = custData.data;

      // 2. Create or find dog
      const dogRes = await fetch("/api/dog-daycare/dogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          name: newDogName,
          breed: newBreed,
        }),
      });
      const dogData = await dogRes.json();
      if (!dogData.success) throw new Error(dogData.error?.message || "Failed to create dog.");
      const dog = dogData.data;

      // 3. Create booking
      const bookRes = await fetch("/api/dog-daycare/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          dogId: dog.id,
          bookingDate: newBookingDate,
          packageCode: newPackageCode,
          initialStatus: "CONFIRMED",
          initialPaymentStatus: "OFFLINE_COLLECTED",
        }),
      });
      const bookData = await bookRes.json();
      if (!bookData.success) throw new Error(bookData.error?.message || "Failed to create booking.");

      setShowNewBookingModal(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewDogName("");
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Failed to create manual booking.");
    }
  };

  // KPIs
  const totalBookings = bookings.length;
  const inCareNow = bookings.filter((b) => b.booking_status === "CHECKED_IN" || b.booking_status === "IN_CARE").length;
  const pendingVaccineCount = pendingVaccines.length;
  const totalRevenue = bookings
    .filter((b) => b.payment_status === "PAID" || b.payment_status === "OFFLINE_COLLECTED")
    .reduce((acc, b) => acc + (b.total_amount || 0), 0);

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>Dog Day Care Operations</span>
            <span className="text-emerald-400">🐾</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time daily arrivals, pet care lifecycle, bookings, and vaccination compliance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowNewBookingModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Manual Booking</span>
          </button>
        </div>
      </div>

      {/* Multi-Service Platform Banner */}
      {/* <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-blue-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl shrink-0">
            🚗
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase">
                Service Module #2 Online
              </span>
              <span className="text-xs font-bold text-white">Car Wash & Auto Detailing</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              3 automated high-pressure bays, vehicle classification rate card, and dedicated WhatsApp flow are active!
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/car-wash"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm shrink-0"
        >
          <span>Open Washing Bays</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div> */}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Active Bookings</span>
            <CalendarDays className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{totalBookings}</p>
          <p className="text-[11px] text-slate-500">Confirmed & upcoming</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>In Care Now</span>
            <Dog className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">{inCareNow}</p>
          <p className="text-[11px] text-slate-500">Checked in at facility</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pending Vaccines</span>
            <Syringe className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">{pendingVaccineCount}</p>
          <Link href="/dashboard/vaccinations" className="text-[11px] text-amber-400/90 hover:underline flex items-center gap-1">
            <span>Review queue</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Verified Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">₹{totalRevenue.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-500">Paid & offline collected</p>
        </div>
      </div>

      {/* Today's Operational Board / Live Arrivals */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Arrivals & In-Care Active Management</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                Live
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              State-aware action buttons: check-in dogs, update care status, and mark ready for pickup
            </p>
          </div>

          <Link
            href="/dashboard/bookings"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>View All Bookings Table</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-2">
            <Dog className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
            <p>No bookings currently scheduled. Click "New Manual Booking" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Booking Ref</th>
                  <th className="py-3 px-3">Customer & Phone</th>
                  <th className="py-3 px-3">Dog & Breed</th>
                  <th className="py-3 px-3">Date & Schedule</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-right">Operational Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((b) => {
                  const isActionLoading = actionLoadingId === b.id;

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-200">
                        <Link href={`/dashboard/bookings/${b.id}`} className="hover:text-emerald-400 hover:underline">
                          {b.booking_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-white">{b.customer.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">+{b.customer.phone}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-emerald-300">{b.dog.name}</p>
                        <p className="text-[11px] text-slate-400">{b.dog.breed}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-200">
                          {new Date(b.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                        <p className="text-[10px] text-slate-500">{b.dropoff_time} - {b.pickup_time}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.booking_status === "CONFIRMED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : b.booking_status === "CHECKED_IN"
                              ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                              : b.booking_status === "IN_CARE"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : b.booking_status === "READY_FOR_PICKUP"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : b.booking_status === "COMPLETED"
                              ? "bg-slate-800 text-slate-300"
                              : b.booking_status === "PENDING_PAYMENT"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {b.booking_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[11px] font-semibold ${
                            b.payment_status === "PAID" || b.payment_status === "OFFLINE_COLLECTED"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          ₹{b.total_amount} ({b.payment_status})
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* State-aware action buttons */}
                          {b.booking_status === "PENDING_PAYMENT" && (
                            <button
                              onClick={() => handleAction(b.id, "confirm")}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-[11px] transition shadow"
                            >
                              Confirm Manually
                            </button>
                          )}

                          {b.booking_status === "CONFIRMED" && (
                            <button
                              onClick={() => handleAction(b.id, "status", { status: "CHECKED_IN" })}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-lg text-[11px] transition shadow"
                            >
                              Check-In Dog
                            </button>
                          )}

                          {b.booking_status === "CHECKED_IN" && (
                            <button
                              onClick={() => handleAction(b.id, "status", { status: "IN_CARE" })}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-[11px] transition shadow"
                            >
                              Mark In Care
                            </button>
                          )}

                          {b.booking_status === "IN_CARE" && (
                            <button
                              onClick={() => handleAction(b.id, "status", { status: "READY_FOR_PICKUP" })}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-[11px] transition shadow"
                            >
                              Ready for Pickup
                            </button>
                          )}

                          {b.booking_status === "READY_FOR_PICKUP" && (
                            <button
                              onClick={() => handleAction(b.id, "status", { status: "COMPLETED" })}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-[11px] transition shadow"
                            >
                              Mark Picked Up
                            </button>
                          )}

                          <Link
                            href={`/dashboard/bookings/${b.id}`}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="View full booking details"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Booking Modal */}
      {showNewBookingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  🐾
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Manual Day Care Booking</h3>
                  <p className="text-[10px] text-slate-400">Walk-in or phone reservation (Instant Confirmation)</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewBookingModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateManualBooking} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Dog Name</label>
                  <input
                    type="text"
                    required
                    value={newDogName}
                    onChange={(e) => setNewDogName(e.target.value)}
                    placeholder="e.g. Bruno"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Breed</label>
                  <input
                    type="text"
                    required
                    value={newBreed}
                    onChange={(e) => setNewBreed(e.target.value)}
                    placeholder="e.g. Golden Retriever"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold text-xs uppercase tracking-wider">Booking Date *</label>
                <input
                  type="date"
                  required
                  value={newBookingDate}
                  onChange={(e) => setNewBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:ring-1 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-xs uppercase tracking-wider">
                    Select Day Care Package *
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium underline decoration-emerald-500/50 underline-offset-2">
                    tap option to select
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      code: "SINGLE_DAY",
                      title: "Single Day Visit",
                      price: "₹500",
                      sub: "1 visit / day",
                      badge: "Standard",
                      badgeStyle: "bg-slate-800 text-slate-300 border-slate-700",
                    },
                    {
                      code: "FIVE_DAY",
                      title: "5-Day Care Package",
                      price: "₹2,200",
                      sub: "save ₹300",
                      badge: "Popular",
                      badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                    },
                    {
                      code: "MONTHLY",
                      title: "Monthly Unlimited",
                      price: "₹7,500",
                      sub: "VIP 30 days",
                      badge: "Best Value",
                      badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                    },
                  ].map((pkg) => {
                    const isSelected = newPackageCode === pkg.code;
                    return (
                      <button
                        key={pkg.code}
                        type="button"
                        onClick={() => setNewPackageCode(pkg.code)}
                        className={`group relative p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/50"
                            : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${pkg.badgeStyle}`}>
                            {pkg.badge}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${
                            isSelected
                              ? "text-emerald-300 underline decoration-emerald-400/50 underline-offset-2"
                              : "text-white group-hover:underline decoration-slate-500/50 underline-offset-2"
                          }`}>
                            {pkg.title}
                          </p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-sm font-extrabold text-white font-mono">{pkg.price}</span>
                            <span className="text-[10px] text-slate-400 italic">({pkg.sub})</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBookingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Create & Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
