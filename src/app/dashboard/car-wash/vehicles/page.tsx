"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  Search,
  Plus,
  Filter,
  RefreshCw,
  ChevronRight,
  Shield,
  Calendar,
  X,
} from "lucide-react";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState("SEDAN");
  const [color, setColor] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadVehicles = async () => {
    setLoading(true);
    try {
      let url = `/api/car-wash/vehicles?limit=50`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (typeFilter !== "ALL") url += `&vehicleType=${typeFilter}`;

      const res = await fetch(url).then((r) => r.json());
      if (res.success) {
        setVehicles(res.data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [typeFilter]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Check or create customer
      let customerId = "";
      const custRes = await fetch(`/api/core/customers?search=${encodeURIComponent(customerPhone)}`).then((r) =>
        r.json()
      );
      if (custRes.success && custRes.data.customers && custRes.data.customers.length > 0) {
        customerId = custRes.data.customers[0].id;
      } else {
        const createCustRes = await fetch(`/api/core/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customerName || "Car Wash Client",
            phone: customerPhone,
          }),
        }).then((r) => r.json());
        if (!createCustRes.success) throw new Error(createCustRes.error || "Failed to create customer");
        customerId = createCustRes.data.id;
      }

      // 2. Register vehicle
      const res = await fetch(`/api/car-wash/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          licensePlate: plate,
          make,
          model,
          vehicleType: type,
          color,
        }),
      }).then((r) => r.json());

      if (!res.success) throw new Error(res.error || "Failed to register vehicle");

      setModalOpen(false);
      setPlate("");
      setMake("");
      setModel("");
      setColor("");
      setCustomerPhone("");
      setCustomerName("");
      loadVehicles();
    } catch (err: any) {
      setErrorMsg(err.message || "Error registering vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
              Car Wash
            </span>
            <span className="text-xs text-slate-400">• Vehicle Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Registered Vehicles
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Automated license plate registry, vehicle classifications, and customer ownership
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/car-wash"
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            ← Back to Bays
          </Link>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Register Vehicle</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadVehicles();
          }}
          className="flex items-center gap-2 w-full sm:w-80"
        >
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search plate, model, owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {["ALL", "HATCHBACK", "SEDAN", "SUV", "LUXURY"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                typeFilter === t ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">License Plate</th>
                <th className="p-4">Make & Model</th>
                <th className="p-4">Classification</th>
                <th className="p-4">Registered Owner</th>
                <th className="p-4">Color</th>
                <th className="p-4">Last Visit</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No vehicles found. Click "Register Vehicle" to add one.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-black text-white text-sm tracking-wide">
                      {v.license_plate}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-200">
                        {v.make} {v.model}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {v.vehicle_type}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-white">{v.customer?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{v.customer?.phone}</div>
                    </td>

                    <td className="p-4 text-slate-400">{v.color || "—"}</td>

                    <td className="p-4 text-slate-400">
                      {v.car_wash_bookings && v.car_wash_bookings[0] ? (
                        <span className="text-cyan-400 font-medium">
                          {new Date(v.car_wash_bookings[0].booking_date).toISOString().slice(0, 10)}
                        </span>
                      ) : (
                        "None yet"
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/car-wash?plate=${v.license_plate}`}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/30 transition"
                      >
                        Book Wash
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-white text-base">Register Vehicle</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+919876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Owner Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">License Plate *</label>
                <input
                  type="text"
                  required
                  placeholder="KA01MJ4421"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="Hyundai / Honda / BMW"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="Creta / City / 3 Series"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Classification</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="HATCHBACK">Hatchback</option>
                    <option value="SEDAN">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="LUXURY">Luxury</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Color</label>
                  <input
                    type="text"
                    placeholder="Black / White / Silver"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
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
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
                >
                  {submitting ? "Registering..." : "Save Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
