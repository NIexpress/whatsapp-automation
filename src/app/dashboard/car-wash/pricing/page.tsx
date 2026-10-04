"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Tags,
  Plus,
  Car,
  Clock,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  X,
} from "lucide-react";

export default function CarWashPricingPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(45);
  const [hatchbackPrice, setHatchbackPrice] = useState(399);
  const [sedanPrice, setSedanPrice] = useState(499);
  const [suvPrice, setSuvPrice] = useState(649);
  const [luxuryPrice, setLuxuryPrice] = useState(899);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/car-wash/packages`).then((r) => r.json());
      if (res.success) {
        setPackages(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/car-wash/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          description,
          durationMinutes: Number(duration),
          priceHatchback: Number(hatchbackPrice),
          priceSedan: Number(sedanPrice),
          priceSuv: Number(suvPrice),
          priceLuxury: Number(luxuryPrice),
        }),
      }).then((r) => r.json());

      if (!res.success) throw new Error(res.error || "Failed to create package");

      setModalOpen(false);
      setCode("");
      setName("");
      setDescription("");
      loadPackages();
    } catch (err: any) {
      setErrorMsg(err.message || "Error creating package");
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
            <span className="text-xs text-slate-400">• Dynamic Rate Matrix</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Wash Packages & Rate Card
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Multi-tier pricing based on vehicle size classification (Hatchback, Sedan, SUV, Luxury)
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
            <span>Add Package</span>
          </button>
        </div>
      </div>

      {/* Package Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="p-6 rounded-3xl bg-slate-900 border border-slate-800/90 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20">
                  {pkg.code}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {pkg.duration_minutes} mins
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">{pkg.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{pkg.description || "Professional wash & detailing treatment"}</p>
              </div>

              {/* Price Breakdown Table */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tiered Pricing</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Hatchback</span>
                    <p className="font-black text-white text-base">₹{pkg.price_hatchback}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Sedan</span>
                    <p className="font-black text-white text-base">₹{pkg.price_sedan}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">SUV</span>
                    <p className="font-black text-white text-base">₹{pkg.price_suv}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Luxury</span>
                    <p className="font-black text-white text-base">₹{pkg.price_luxury}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-800/80">
              <Link
                href={`/dashboard/car-wash?packageId=${pkg.id}`}
                className="w-full py-2.5 rounded-xl bg-slate-800 group-hover:bg-blue-600 text-slate-200 group-hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <span>Book with this Package</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE PACKAGE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-white text-base">Create Wash Package</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Package Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UNDERBODY_COAT"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Underbody Rust Protection & Wash"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details of chemical treatment, wash cycles..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Tiered Prices (INR) *</label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Hatchback</span>
                    <input
                      type="number"
                      required
                      value={hatchbackPrice}
                      onChange={(e) => setHatchbackPrice(Number(e.target.value))}
                      className="mt-0.5 w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Sedan</span>
                    <input
                      type="number"
                      required
                      value={sedanPrice}
                      onChange={(e) => setSedanPrice(Number(e.target.value))}
                      className="mt-0.5 w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">SUV</span>
                    <input
                      type="number"
                      required
                      value={suvPrice}
                      onChange={(e) => setSuvPrice(Number(e.target.value))}
                      className="mt-0.5 w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Luxury</span>
                    <input
                      type="number"
                      required
                      value={luxuryPrice}
                      onChange={(e) => setLuxuryPrice(Number(e.target.value))}
                      className="mt-0.5 w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                    />
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
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
