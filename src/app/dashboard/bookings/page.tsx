"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function BookingsListPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadBookings = () => {
    setLoading(true);
    let url = `/api/dog-daycare/bookings?status=${statusFilter}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setBookings(res.data.bookings || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBookings();
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Day Care Bookings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Search, filter, manage, and inspect all pet day care reservations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBookings}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {[
            "ALL",
            "CONFIRMED",
            "CHECKED_IN",
            "IN_CARE",
            "READY_FOR_PICKUP",
            "COMPLETED",
            "PENDING_PAYMENT",
            "CANCELLED",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                statusFilter === tab
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "bg-slate-950/40 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="w-full md:w-72 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, dog, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
          >
            Search
          </button>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Dog</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Package & Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No bookings found matching selected filters.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      <Link href={`/dashboard/bookings/${b.id}`} className="hover:text-emerald-400 hover:underline">
                        {b.booking_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{b.customer.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">+{b.customer.phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-emerald-300">{b.dog.name}</p>
                      <p className="text-[11px] text-slate-400">{b.dog.breed}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">
                        {new Date(b.booking_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[10px] text-slate-500">{b.dropoff_time} – {b.pickup_time}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">{b.package?.name || "Single Day Pass"}</p>
                      <p className="text-[11px] text-emerald-400 font-bold">₹{b.total_amount}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
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
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          b.payment_status === "PAID" || b.payment_status === "OFFLINE_COLLECTED"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/bookings/${b.id}`}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 inline-flex items-center gap-1 text-xs transition"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
