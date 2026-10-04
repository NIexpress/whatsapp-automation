"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  Droplets,
  ArrowRight,
  X,
} from "lucide-react";

export default function CarWashDashboardPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New booking form state
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formMake, setFormMake] = useState("Hyundai");
  const [formModel, setFormModel] = useState("Creta");
  const [formVehicleType, setFormVehicleType] = useState("SUV");
  const [formPackageId, setFormPackageId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSlot, setFormSlot] = useState("10:00 AM");
  const [formBay, setFormBay] = useState<number>(1);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      let url = `/api/car-wash/bookings?limit=50`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const [resBookings, resPackages] = await Promise.all([
        fetch(url).then((r) => r.json()),
        fetch(`/api/car-wash/packages`).then((r) => r.json()),
      ]);

      if (resBookings.success) {
        setBookings(resBookings.data.items || []);
      }
      if (resPackages.success && resPackages.data) {
        setPackages(resPackages.data);
        if (resPackages.data.length > 0 && !formPackageId) {
          setFormPackageId(resPackages.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/car-wash/bookings/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (e) {
      alert("Error updating status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this car wash booking?")) return;
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/car-wash/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Staff action from Operations Board" }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error || "Failed to cancel booking");
      }
    } catch (e) {
      alert("Error cancelling booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError("");

    try {
      // 1. Resolve or create customer via core customer API or registration
      let customerId = "";
      const custRes = await fetch(`/api/core/customers?search=${encodeURIComponent(formCustomerPhone)}`).then((r) =>
        r.json()
      );
      if (custRes.success && custRes.data.customers && custRes.data.customers.length > 0) {
        customerId = custRes.data.customers[0].id;
      } else {
        const createCustRes = await fetch(`/api/core/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formCustomerName || "Car Wash Client",
            phone: formCustomerPhone,
          }),
        }).then((r) => r.json());
        if (!createCustRes.success) throw new Error(createCustRes.error || "Failed to create customer");
        customerId = createCustRes.data.id;
      }

      // 2. Resolve or create vehicle
      let vehicleId = "";
      const vehRes = await fetch(`/api/car-wash/vehicles?search=${encodeURIComponent(formPlate)}`).then((r) =>
        r.json()
      );
      if (vehRes.success && vehRes.data.items && vehRes.data.items.length > 0) {
        vehicleId = vehRes.data.items[0].id;
      } else {
        const createVehRes = await fetch(`/api/car-wash/vehicles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            licensePlate: formPlate,
            make: formMake,
            model: formModel,
            vehicleType: formVehicleType,
          }),
        }).then((r) => r.json());
        if (!createVehRes.success) throw new Error(createVehRes.error || "Failed to register vehicle");
        vehicleId = createVehRes.data.id;
      }

      // 3. Create Car Wash Booking
      const bookingRes = await fetch(`/api/car-wash/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          vehicleId,
          packageCodeOrId: formPackageId,
          bookingDate: formDate,
          timeSlot: formSlot,
          bayNumber: formBay,
          initialStatus: "CONFIRMED",
        }),
      }).then((r) => r.json());

      if (!bookingRes.success) {
        throw new Error(bookingRes.error || "Failed to create car wash booking");
      }

      setModalOpen(false);
      // Reset form
      setFormPlate("");
      setFormCustomerPhone("");
      setFormCustomerName("");
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Error creating booking");
    } finally {
      setCreating(false);
    }
  };

  // Compute live bay status (Bays 1, 2, 3)
  const activeBookings = bookings.filter((b) =>
    ["CONFIRMED", "IN_QUEUE", "WASHING", "DETAILING", "READY_FOR_PICKUP"].includes(b.booking_status)
  );

  const bay1 = activeBookings.find((b) => b.bay_number === 1 && ["WASHING", "DETAILING", "READY_FOR_PICKUP"].includes(b.booking_status)) ||
               activeBookings.find((b) => b.bay_number === 1);
  const bay2 = activeBookings.find((b) => b.bay_number === 2 && ["WASHING", "DETAILING", "READY_FOR_PICKUP"].includes(b.booking_status)) ||
               activeBookings.find((b) => b.bay_number === 2);
  const bay3 = activeBookings.find((b) => b.bay_number === 3 && ["WASHING", "DETAILING", "READY_FOR_PICKUP"].includes(b.booking_status)) ||
               activeBookings.find((b) => b.bay_number === 3);

  const completedToday = bookings.filter((b) => b.booking_status === "COMPLETED").length;
  const inQueueCount = activeBookings.filter((b) => ["CONFIRMED", "IN_QUEUE"].includes(b.booking_status)).length;
  const totalRevenue = bookings
    .filter((b) => b.booking_status !== "CANCELLED")
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
              Service Module #2
            </span>
            <span className="text-xs text-slate-400">• High-Pressure Robotic & Detail Spa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            🚗 Car Wash & Detailing Bays
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time bay automation, vehicle queues, live status progression, and slot capacity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 shadow-sm"
            title="Refresh Bays"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/dashboard/car-wash/vehicles"
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            Vehicle Directory
          </Link>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Wash Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Active In Bays</p>
            <p className="text-2xl font-black text-blue-400 mt-0.5">
              {[bay1, bay2, bay3].filter((b) => b && ["WASHING", "DETAILING"].includes(b.booking_status)).length} / 3
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Droplets className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">In Queue</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{inQueueCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Completed Today</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{completedToday}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Revenue</p>
            <p className="text-2xl font-black text-white mt-0.5">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* LIVE 3-BAY OPERATIONS BOARD */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Live Washing Bays Operations</span>
          </h2>
          <span className="text-xs text-slate-400">Automatic Bay Allocation (Capacity: 3 Bays)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((bayNum) => {
            const currentBooking = [bay1, bay2, bay3][bayNum - 1];
            const isOccupied = Boolean(currentBooking);

            const getStatusBadge = (status: string) => {
              switch (status) {
                case "CONFIRMED":
                case "IN_QUEUE":
                  return <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">QUEUED</span>;
                case "WASHING":
                  return <span className="bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">WASHING</span>;
                case "DETAILING":
                  return <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">DETAILING</span>;
                case "READY_FOR_PICKUP":
                  return <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">READY FOR PICKUP</span>;
                default:
                  return <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
              }
            };

            return (
              <div
                key={bayNum}
                className={`p-5 rounded-2xl border transition relative overflow-hidden ${
                  isOccupied
                    ? "bg-slate-900/90 border-blue-500/30 shadow-lg shadow-blue-500/5"
                    : "bg-slate-900/40 border-dashed border-slate-800"
                }`}
              >
                {/* Bay Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-blue-400 text-xs">
                      #{bayNum}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Washing Bay {bayNum}</h3>
                      <p className="text-[10px] text-slate-400">High-Pressure Soft Water</p>
                    </div>
                  </div>

                  {isOccupied ? (
                    getStatusBadge(currentBooking.booking_status)
                  ) : (
                    <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      AVAILABLE
                    </span>
                  )}
                </div>

                {/* Bay Content */}
                {isOccupied ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-black text-white tracking-wide">
                          {currentBooking.vehicle?.license_plate}
                        </p>
                        <p className="text-xs text-slate-300 font-medium">
                          {currentBooking.vehicle?.make} {currentBooking.vehicle?.model} • {currentBooking.vehicle?.vehicle_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-blue-400">
                          {currentBooking.package?.name}
                        </span>
                        <p className="text-[10px] text-slate-400">₹{currentBooking.total_amount}</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Customer:</span>
                        <span className="font-semibold text-white">{currentBooking.customer?.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Slot:</span>
                        <span className="font-semibold text-cyan-400">{currentBooking.time_slot}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Ref:</span>
                        <span className="font-mono text-[10px] text-slate-400">{currentBooking.booking_number}</span>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Update Bay Status</p>
                      <div className="grid grid-cols-2 gap-2">
                        {currentBooking.booking_status !== "WASHING" && (
                          <button
                            disabled={actionLoading === currentBooking.id}
                            onClick={() => handleStatusChange(currentBooking.id, "WASHING")}
                            className="px-2 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold text-xs transition text-center"
                          >
                            ▶ Start Wash
                          </button>
                        )}
                        {currentBooking.booking_status !== "DETAILING" && (
                          <button
                            disabled={actionLoading === currentBooking.id}
                            onClick={() => handleStatusChange(currentBooking.id, "DETAILING")}
                            className="px-2 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs transition text-center"
                          >
                            ✨ Detailing
                          </button>
                        )}
                        {currentBooking.booking_status !== "READY_FOR_PICKUP" && (
                          <button
                            disabled={actionLoading === currentBooking.id}
                            onClick={() => handleStatusChange(currentBooking.id, "READY_FOR_PICKUP")}
                            className="px-2 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition text-center"
                          >
                            🚗 Ready
                          </button>
                        )}
                        <button
                          disabled={actionLoading === currentBooking.id}
                          onClick={() => handleStatusChange(currentBooking.id, "COMPLETED")}
                          className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition text-center col-span-1"
                        >
                          ✓ Complete
                        </button>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleCancelBooking(currentBooking.id)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                        >
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-xs text-slate-500 font-medium">No vehicle currently in this bay</p>
                    <button
                      onClick={() => {
                        setFormBay(bayNum);
                        setModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
                    >
                      + Assign Slot to Bay #{bayNum}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CAR WASH BOOKINGS TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">All Car Wash Bookings</h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
              {bookings.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tabs */}
            {["ALL", "CONFIRMED", "WASHING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === st
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {st.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Vehicle & Owner</th>
                  <th className="p-4">Package</th>
                  <th className="p-4">Slot & Bay</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No car wash bookings found matching filter.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-mono font-bold text-slate-200">
                        {b.booking_number}
                        <div className="text-[10px] font-sans font-normal text-slate-400">
                          {new Date(b.booking_date).toISOString().slice(0, 10)}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-extrabold text-white text-xs tracking-wide">
                          {b.vehicle?.license_plate || "N/A"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.vehicle?.make} {b.vehicle?.model} ({b.vehicle?.vehicle_type})
                        </div>
                        <div className="text-[10px] text-blue-400">
                          👤 {b.customer?.name} ({b.customer?.phone})
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-slate-200">{b.package?.name}</span>
                        <div className="text-[10px] text-slate-400">{b.package?.duration_minutes} mins</div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-cyan-400">{b.time_slot}</div>
                        <div className="text-[10px] text-slate-400">
                          Bay <span className="font-bold text-white">#{b.bay_number}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.booking_status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : b.booking_status === "WASHING"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : b.booking_status === "READY_FOR_PICKUP"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : b.booking_status === "CANCELLED"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {b.booking_status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-black text-white">₹{b.total_amount}</span>
                        <div className="text-[10px] text-slate-400 capitalize">{b.payment_status}</div>
                      </td>

                      <td className="p-4 text-right">
                        {b.booking_status === "CONFIRMED" && (
                          <button
                            onClick={() => handleStatusChange(b.id, "WASHING")}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/30 transition"
                          >
                            Start Wash
                          </button>
                        )}
                        {b.booking_status === "WASHING" && (
                          <button
                            onClick={() => handleStatusChange(b.id, "READY_FOR_PICKUP")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition"
                          >
                            Ready
                          </button>
                        )}
                        {b.booking_status === "READY_FOR_PICKUP" && (
                          <button
                            onClick={() => handleStatusChange(b.id, "COMPLETED")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black transition"
                          >
                            Complete
                          </button>
                        )}
                        {b.booking_status === "COMPLETED" && (
                          <span className="text-[11px] text-slate-500">Done</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE NEW CAR WASH BOOKING MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-white text-base">New Car Wash Booking</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+919876543210"
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Customer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Plate # *</label>
                  <input
                    type="text"
                    required
                    placeholder="KA01MJ4421"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Make & Model</label>
                  <input
                    type="text"
                    placeholder="Hyundai Creta"
                    value={`${formMake} ${formModel}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(" ");
                      setFormMake(parts[0] || "Car");
                      setFormModel(parts.slice(1).join(" ") || "Model");
                    }}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Vehicle Type *</label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {[
                      { value: "HATCHBACK", label: "Hatchback", icon: "🚗" },
                      { value: "SEDAN", label: "Sedan", icon: "🚘" },
                      { value: "SUV", label: "SUV", icon: "🚙" },
                      { value: "LUXURY", label: "Luxury", icon: "✨" },
                    ].map((vt) => (
                      <button
                        key={vt.value}
                        type="button"
                        onClick={() => setFormVehicleType(vt.value)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-0.5 ${
                          formVehicleType === vt.value
                            ? "bg-blue-600/25 border-blue-500 text-blue-300 shadow-sm ring-1 ring-blue-500/50"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
                        }`}
                      >
                        <span className="text-sm">{vt.icon}</span>
                        <span className={formVehicleType === vt.value ? "underline decoration-blue-400/60 decoration-1 underline-offset-2" : ""}>
                          {vt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Select Wash Package *</label>
                  <span className="text-[10px] text-blue-400 font-medium underline decoration-blue-500/50 underline-offset-2">tap to select</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {packages.map((p) => {
                    const isSelected = formPackageId === p.id;
                    const price =
                      formVehicleType === "HATCHBACK"
                        ? p.price_hatchback
                        : formVehicleType === "SEDAN"
                        ? p.price_sedan
                        : formVehicleType === "SUV"
                        ? p.price_suv
                        : p.price_luxury || p.price_suv;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFormPackageId(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "bg-blue-950/40 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] text-slate-400 font-medium">{p.duration_minutes} mins</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? "text-blue-300 underline decoration-blue-400/50 underline-offset-2" : "text-white"}`}>
                            {p.name}
                          </p>
                          <p className="text-sm font-extrabold text-blue-400 font-mono mt-0.5">₹{price}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Slot *</label>
                  <div className="grid grid-cols-3 gap-1 mt-1 max-h-28 overflow-y-auto pr-0.5">
                    {[
                      "09:00 AM",
                      "10:00 AM",
                      "11:00 AM",
                      "12:00 PM",
                      "01:00 PM",
                      "02:00 PM",
                      "03:00 PM",
                      "04:00 PM",
                      "05:00 PM",
                    ].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setFormSlot(slot)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition text-center ${
                          formSlot === slot
                            ? "bg-blue-600/30 border-blue-500 text-blue-300 underline decoration-blue-400/60 decoration-1 underline-offset-2 shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
                        }`}
                      >
                        {slot.replace(":00", "")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Assign Bay *</label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {[1, 2, 3].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setFormBay(b)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition text-center ${
                          formBay === b
                            ? "bg-blue-600/30 border-blue-500 text-blue-300 underline decoration-blue-400/60 decoration-1 underline-offset-2 shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
                        }`}
                      >
                        Bay #{b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
                >
                  {creating ? "Confirming..." : "Confirm & Allocate Bay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
