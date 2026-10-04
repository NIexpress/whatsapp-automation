"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dog,
  Search,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Syringe,
  Phone,
  User,
  Calendar,
  X,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

export default function DogsPage() {
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBreed, setFilterBreed] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDog, setSelectedDog] = useState<any>(null);

  // New Dog Form State
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("MALE");
  const [ageMonths, setAgeMonths] = useState(24);
  const [weightKg, setWeightKg] = useState(20);
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [specialCareNotes, setSpecialCareNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchDogs = async () => {
    try {
      const res = await fetch("/api/dog-daycare/dogs");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : json.data?.dogs || [];
        setDogs(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/core/customers");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : json.data?.customers || [];
        setCustomers(list);
        if (list.length > 0) {
          setCustomerId(list[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDogs();
    fetchCustomers();
  }, []);

  const handleCreateDog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/dog-daycare/dogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          name,
          breed,
          gender,
          ageYears: Math.floor(Number(ageMonths) / 12),
          ageMonths: Number(ageMonths) % 12,
          weightKg: Number(weightKg),
          medicalNotes: specialCareNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create dog profile");
      }
      setShowAddModal(false);
      setName("");
      setBreed("");
      setSpecialCareNotes("");
      fetchDogs();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const dogList = Array.isArray(dogs) ? dogs : [];
  const filtered = dogList.filter((d) => {
    const matchesSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.breed?.toLowerCase().includes(search.toLowerCase()) ||
      d.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.customer?.phone?.includes(search);
    const matchesBreed = !filterBreed || d.breed === filterBreed;
    return matchesSearch && matchesBreed;
  });

  const breeds = Array.from(new Set(dogList.map((d) => d.breed).filter(Boolean)));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Dog className="w-4 h-4" />
            <span>Dog Day Care — Profiles</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Dog Profiles & Records
          </h1>
          <p className="text-sm text-slate-400">
            Medical history, size categorization, vaccine status, and owner associations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchDogs();
              fetchCustomers();
            }}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh dogs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register Dog</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Total Dogs</p>
            <p className="text-2xl font-black text-white mt-1">{dogs.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Dog className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Fully Vaccinated</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {dogs.filter((d) => (d.vaccination_records || d.vaccinations || []).length >= 1).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Vaccine Review Pending</p>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {
                dogs.filter((d) =>
                  (d.vaccination_records || d.vaccinations || []).some(
                    (v: any) => (v.verified_status || v.verificationStatus) === "PENDING"
                  )
                ).length
              }
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Syringe className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Active Bookings Today</p>
            <p className="text-2xl font-black text-purple-400 mt-1">
              {
                dogs.filter((d) =>
                  (d.daycare_bookings || d.bookings || []).some((b: any) =>
                    ["CONFIRMED", "CHECKED_IN", "IN_CARE"].includes(b.booking_status || b.status)
                  )
                ).length
              }
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search dog name, breed, or owner details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {breeds.length > 0 && (
          <select
            value={filterBreed}
            onChange={(e) => setFilterBreed(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Breeds</option>
            {breeds.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Dogs Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading dog profiles...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Dog className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-semibold">No dogs found</p>
          <p className="text-xs text-slate-500">
            Try adjusting your search filters or register a new dog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((dog) => {
            const vaxList = dog.vaccination_records || dog.vaccinations || [];
            const hasVaccines = vaxList.length > 0;
            const pendingVaccines = vaxList.filter(
              (v: any) => v.verified_status === "PENDING" || v.verificationStatus === "PENDING_REVIEW"
            );

            return (
              <div
                key={dog.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 transition flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-2xl flex items-center justify-center">
                        🐶
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">{dog.name}</h3>
                        <p className="text-xs text-emerald-400 font-semibold">{dog.breed}</p>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                      {dog.gender}
                    </span>
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Age
                      </span>
                      <span className="font-semibold text-slate-200">
                        {dog.age_years
                          ? `${dog.age_years}y ${dog.age_months || 0}m`
                          : dog.ageMonths
                          ? `${Math.floor(dog.ageMonths / 12)}y ${dog.ageMonths % 12}m`
                          : "1y"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Weight
                      </span>
                      <span className="font-semibold text-slate-200">
                        {dog.weight_kg ? `${dog.weight_kg} kg` : dog.weightKg ? `${dog.weightKg} kg` : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-300 font-medium">{dog.customer?.name}</span>
                    </div>
                    <Link
                      href={`/simulator?phone=${dog.customer?.phone}`}
                      target="_blank"
                      className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px] flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>+{dog.customer?.phone}</span>
                    </Link>
                  </div>

                  {/* Vaccine Status Pill */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Syringe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Vaccines ({vaxList.length})</span>
                    </span>

                    {pendingVaccines && pendingVaccines.length > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                        Review Needed
                      </span>
                    ) : hasVaccines ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        Compliant
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                        Missing
                      </span>
                    )}
                  </div>

                  {dog.specialCareNotes && (
                    <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                      Care Note: {dog.specialCareNotes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/dashboard/vaccinations?dogId=${dog.id}`}
                    className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    <span>View Vaccines</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <button
                    onClick={() => setSelectedDog(dog)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                  >
                    Full Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Dog Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Dog className="w-5 h-5 text-emerald-400" />
                <span>Register Dog Profile</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateDog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Owner *
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (+{c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Dog Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Leo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Breed *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Golden Retriever"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Gender *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: "MALE", label: "Male", icon: "♂" },
                      { val: "FEMALE", label: "Female", icon: "♀" },
                    ].map((g) => (
                      <button
                        key={g.val}
                        type="button"
                        onClick={() => setGender(g.val)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                          gender === g.val
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 underline decoration-emerald-400/60 decoration-1 underline-offset-2 ring-1 ring-emerald-500/40"
                            : "bg-slate-950/60 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <span className="font-bold">{g.icon}</span>
                        <span>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Age (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ageMonths}
                    onChange={(e) => setAgeMonths(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Weight (Kg)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Microchip / Tag ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 981098101234567"
                  value={microchipNumber}
                  onChange={(e) => setMicrochipNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Special Care / Medical Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Allergies, aggressive behavior triggers, dietary needs..."
                  value={specialCareNotes}
                  onChange={(e) => setSpecialCareNotes(e.target.value)}
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
                  {submitting ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Dog Detail Modal */}
      {selectedDog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-3xl flex items-center justify-center">
                  🐶
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{selectedDog.name}</h2>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {selectedDog.breed} • {selectedDog.gender}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDog(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-xs block font-semibold">Owner</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {selectedDog.customer?.name}
                </span>
                <span className="text-xs font-mono text-emerald-400 block mt-0.5">
                  +{selectedDog.customer?.phone}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-xs block font-semibold">Microchip / Tag</span>
                <span className="text-sm font-bold text-white mt-1 block font-mono">
                  {selectedDog.microchip_number || selectedDog.microchipNumber || "Not tagged"}
                </span>
              </div>
            </div>

            {(selectedDog.medical_notes || selectedDog.specialCareNotes) && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <span className="text-xs font-bold text-amber-400 uppercase">
                  Special Instructions
                </span>
                <p className="text-xs text-amber-200">{selectedDog.medical_notes || selectedDog.specialCareNotes}</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <Link
                href={`/dashboard/vaccinations?dogId=${selectedDog.id}`}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-2 transition"
              >
                <Syringe className="w-4 h-4" />
                <span>Manage Vaccines</span>
              </Link>

              <button
                onClick={() => setSelectedDog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
