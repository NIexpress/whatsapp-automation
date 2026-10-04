"use client";

import { useEffect, useState } from "react";
import {
  Tags,
  Clock,
  Check,
  Sparkles,
  Layers,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

export default function PricingPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newValidityDays, setNewValidityDays] = useState(1);
  const [newTotalVisits, setNewTotalVisits] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dog-daycare/packages");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : json.data?.packages || [];
        setPackages(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/dog-daycare/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          code: newCode || newName.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
          price: Number(newPrice),
          description: newDescription,
          validityDays: Number(newValidityDays),
          totalVisits: Number(newTotalVisits),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create package");
      }
      setShowAddModal(false);
      setNewName("");
      setNewCode("");
      setNewPrice("");
      setNewDescription("");
      fetchPackages();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ADDONS = [
    {
      name: "Organic Nutrient Lunch Meal",
      price: 200,
      description: "Boiled chicken, pumpkin puree, bone broth & brown rice",
      popular: true,
    },
    {
      name: "Luxury Bath & Blow-dry",
      price: 450,
      description: "Organic shampoo, detangle conditioner, ear clean & fragrance",
      popular: true,
    },
    {
      name: "Pet Cab Pick & Drop",
      price: 300,
      description: "Air-conditioned secure vehicle with seatbelt harness",
      popular: false,
    },
    {
      name: "Nail Trimming & Paw Balm",
      price: 150,
      description: "Safe clipping, smoothing, and organic beeswax paw hydration",
      popular: false,
    },
  ];

  const SLOTS = [
    {
      type: "HALF_DAY_MORNING",
      label: "Morning Half Day",
      time: "09:00 AM — 01:00 PM",
      capacity: 15,
      features: "Agility park playtime, socialization circle, fresh filtered water",
    },
    {
      type: "HALF_DAY_AFTERNOON",
      label: "Afternoon Half Day",
      time: "02:00 PM — 06:00 PM",
      capacity: 15,
      features: "Snack time, brain puzzles, cooling splash pool session",
    },
    {
      type: "FULL_DAY",
      label: "Full Day Care",
      time: "09:00 AM — 06:00 PM",
      capacity: 15,
      features: "Full 9-hour supervised play, rest cubicle nap, photo updates on WhatsApp",
    },
  ];

  const packageList = Array.isArray(packages) ? packages : [];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Tags className="w-4 h-4" />
            <span>Dog Day Care — Rate Card</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Pricing, Packages & Day Care Slots
          </h1>
          <p className="text-sm text-slate-400">
            Single source of truth for all automated WhatsApp quotes and staff POS checkouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPackages}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh pricing"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Package</span>
          </button>
        </div>
      </div>

      {/* Main Packages Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Active Day Care Packages</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading packages...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packageList.map((pkg) => {
              const packageType = (pkg.slotType || pkg.code || "PACKAGE").replace(/_/g, " ");
              const isPopular = pkg.code === "SINGLE_DAY" || pkg.code === "FIVE_DAY";

              return (
                <div
                  key={pkg.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition relative group shadow-xl"
                >
                  {isPopular && (
                    <div className="absolute -top-2.5 right-4 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
                      Popular
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        {packageType}
                      </span>
                      <h3 className="text-lg font-black text-white mt-0.5">{pkg.name}</h3>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-slate-400 font-bold">₹</span>
                      <span className="text-3xl font-black text-white">{pkg.price}</span>
                      <span className="text-xs text-slate-500">
                        {pkg.validity_days > 1 ? ` / ${pkg.validity_days} days` : " / session"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{pkg.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Free photo update on WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Supervised playtime & rest</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slots & Capacity Configuration */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Daily Operating Slots & Capacity Control</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SLOTS.map((slot) => (
            <div
              key={slot.type}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">{slot.label}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
                  Cap: {slot.capacity} dogs
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 text-xs text-slate-300 font-semibold font-mono">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{slot.time}</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{slot.features}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add-ons Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Available Add-on Services</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ADDONS.map((addon) => (
            <div
              key={addon.name}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{addon.name}</h4>
                  {addon.popular && (
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-bold uppercase">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{addon.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-lg font-black text-emerald-400">₹{addon.price}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Per Dog</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Tags className="w-5 h-5 text-emerald-400" />
                <span>Create Day Care Package</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10-Day Flex Pass"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 4200"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TEN_DAY_FLEX"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newValidityDays}
                    onChange={(e) => setNewValidityDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Total Visits
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTotalVisits}
                    onChange={(e) => setNewTotalVisits(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Includes play, rest, and photo updates..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
                >
                  {submitting ? "Creating..." : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
