"use client";

import { useEffect, useState } from "react";
import {
  Syringe,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  Filter,
  FileText,
  AlertTriangle,
  Dog,
  User,
  ExternalLink,
  X,
  Check,
  RefreshCw,
} from "lucide-react";

export default function VaccinationsPage() {
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING_REVIEW" | "APPROVED" | "REJECTED">("ALL");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionModal, setActionModal] = useState<{
    record: any;
    action: "APPROVE" | "REJECT";
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // New Record Form State
  const [dogs, setDogs] = useState<any[]>([]);
  const [selectedDogId, setSelectedDogId] = useState("");
  const [vaccineType, setVaccineType] = useState("RABIES");
  const [administeredDate, setAdministeredDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [batchNumber, setBatchNumber] = useState("");
  const [vetClinicName, setVetClinicName] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchVaccinations = async () => {
    try {
      const res = await fetch("/api/dog-daycare/vaccinations");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : json.data?.vaccinations || [];
        setVaccinations(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDogs = async () => {
    try {
      const res = await fetch("/api/dog-daycare/dogs");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : json.data?.dogs || [];
        setDogs(list);
        if (list.length > 0) {
          setSelectedDogId(list[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchVaccinations();
    fetchDogs();
  }, []);

  const handleVerify = async (status: "APPROVED" | "REJECTED") => {
    if (!actionModal) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `/api/dog-daycare/vaccinations/${actionModal.record.id}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            notes: reviewNotes || (status === "APPROVED" ? "Verified by staff" : "Rejected by staff"),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Action failed");
      }
      setActionModal(null);
      setReviewNotes("");
      fetchVaccinations();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/dog-daycare/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dogId: selectedDogId,
          vaccineName: vaccineType,
          administeredDate: new Date(administeredDate).toISOString(),
          expiryDate: new Date(validUntil).toISOString(),
          documentUrl: documentUrl || "https://needin.app/docs/sample_vaccine.pdf",
          notes: vetClinicName ? `Clinic: ${vetClinicName}${batchNumber ? ` (Batch: ${batchNumber})` : ""}` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to record vaccination");
      }
      setShowAddModal(false);
      fetchVaccinations();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const vaxList = Array.isArray(vaccinations) ? vaccinations : [];

  const filtered = vaxList.filter((v) => {
    const vStatus = v.verified_status || v.verificationStatus || "PENDING";
    const matchesTab =
      filterTab === "ALL" ||
      vStatus === filterTab ||
      (filterTab === "PENDING_REVIEW" && vStatus === "PENDING");

    const vName = v.vaccine_name || v.vaccineType || "";
    const dName = v.dog?.name || "";
    const cName = v.dog?.customer?.name || "";
    const cPhone = v.dog?.customer?.phone || "";

    const matchesSearch =
      vName.toLowerCase().includes(search.toLowerCase()) ||
      dName.toLowerCase().includes(search.toLowerCase()) ||
      cName.toLowerCase().includes(search.toLowerCase()) ||
      cPhone.includes(search);

    return matchesTab && matchesSearch;
  });

  const pendingCount = vaxList.filter(
    (v) => (v.verified_status || v.verificationStatus) === "PENDING" || (v.verified_status || v.verificationStatus) === "PENDING_REVIEW"
  ).length;
  const approvedCount = vaxList.filter(
    (v) => (v.verified_status || v.verificationStatus) === "APPROVED"
  ).length;
  const rejectedCount = vaxList.filter(
    (v) => (v.verified_status || v.verificationStatus) === "REJECTED"
  ).length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Syringe className="w-4 h-4" />
            <span>Dog Day Care — Compliance Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Vaccination Review Queue
          </h1>
          <p className="text-sm text-slate-400">
            Mandatory Rabies, DHPP & Bordetella verification with document audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchVaccinations();
              fetchDogs();
            }}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh vaccinations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Vaccination</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterTab("PENDING_REVIEW")}
          className={`p-5 rounded-2xl border cursor-pointer transition ${
            filterTab === "PENDING_REVIEW"
              ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/30"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase">Pending Review</p>
              <p className="text-2xl font-black text-white mt-1">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilterTab("APPROVED")}
          className={`p-5 rounded-2xl border cursor-pointer transition ${
            filterTab === "APPROVED"
              ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/30"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase">Approved Records</p>
              <p className="text-2xl font-black text-white mt-1">{approvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilterTab("REJECTED")}
          className={`p-5 rounded-2xl border cursor-pointer transition ${
            filterTab === "REJECTED"
              ? "bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/30"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-400 uppercase">Rejected Records</p>
              <p className="text-2xl font-black text-white mt-1">{rejectedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-full sm:w-auto">
          {(["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                filterTab === tab
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search dog, owner, or vaccine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Vaccination Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading vaccine records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Syringe className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No records found</p>
            <p className="text-xs text-slate-500">
              All records have been verified or match no current filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Dog & Owner</th>
                  <th className="py-3.5 px-4 font-bold">Vaccine Type</th>
                  <th className="py-3.5 px-4 font-bold">Administered</th>
                  <th className="py-3.5 px-4 font-bold">Valid Until</th>
                  <th className="py-3.5 px-4 font-bold">Clinic / Batch</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((v) => {
                  const vName = v.vaccine_name || v.vaccineType || "VACCINE";
                  const vAdmin = v.administered_date || v.administeredDate;
                  const vExp = v.expiry_date || v.validUntil;
                  const isExpired = vExp ? new Date(vExp) < new Date() : false;
                  const vStatus = v.verified_status || v.verificationStatus || "PENDING";
                  const vNotes = v.notes || v.vetClinicName || "Uploaded Proof";

                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{v.dog?.name}</span>
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            ({v.dog?.breed})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{v.dog?.customer?.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs">
                          {vName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {vAdmin ? new Date(vAdmin).toLocaleDateString("en-IN") : "—"}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono">
                        {vExp ? (
                          <>
                            <span className={isExpired ? "text-rose-400 font-bold" : "text-emerald-400"}>
                              {new Date(vExp).toLocaleDateString("en-IN")}
                            </span>
                            {isExpired && (
                              <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold uppercase">
                                Expired
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 italic">No expiry</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        <div>{vNotes}</div>
                        {v.batchNumber && (
                          <div className="text-[10px] font-mono text-slate-500">
                            Batch: {v.batchNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {vStatus === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {(vStatus === "PENDING" || vStatus === "PENDING_REVIEW") && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                        {vStatus === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(vStatus === "PENDING" || vStatus === "PENDING_REVIEW") ? (
                            <>
                              <button
                                onClick={() =>
                                  setActionModal({ record: v, action: "APPROVE" })
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() =>
                                  setActionModal({ record: v, action: "REJECT" })
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                setActionModal({
                                  record: v,
                                  action: v.verificationStatus === "APPROVED" ? "REJECT" : "APPROVE",
                                })
                              }
                              className="text-xs text-slate-400 hover:text-white font-semibold underline underline-offset-2"
                            >
                              Change Status
                            </button>
                          )}
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

      {/* Review Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {actionModal.action === "APPROVE" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Approve Vaccination Record</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span>Reject Vaccination Record</span>
                  </>
                )}
              </h2>
              <button
                onClick={() => setActionModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="text-slate-300 font-bold">
                Dog: <span className="text-white">{actionModal.record.dog?.name}</span>
              </p>
              <p className="text-slate-300 font-bold">
                Vaccine: <span className="text-emerald-400">{actionModal.record.vaccine_name || actionModal.record.vaccineType || "VACCINE"}</span>
              </p>
              <p className="text-slate-400">
                Valid until: {(actionModal.record.expiry_date || actionModal.record.validUntil)
                  ? new Date(actionModal.record.expiry_date || actionModal.record.validUntil).toLocaleDateString("en-IN")
                  : "No expiry"}
              </p>
            </div>

            {actionModal.action === "REJECT" && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Rejection Reason (Sent via WhatsApp to Owner) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Certificate image is blurry, or date is past expiry..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => handleVerify(actionModal.action === "APPROVE" ? "APPROVED" : "REJECTED")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                  actionModal.action === "APPROVE"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                }`}
              >
                {processing ? "Updating..." : `Confirm ${actionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Upload Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Syringe className="w-5 h-5 text-emerald-400" />
                <span>Record Vaccination</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Select Dog *
                </label>
                <select
                  required
                  value={selectedDogId}
                  onChange={(e) => setSelectedDogId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {dogs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.breed}) — Owner: {d.customer?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center justify-between">
                  <span>Vaccine Type *</span>
                  <span className="text-[10px] text-emerald-400 font-medium underline decoration-emerald-500/50 underline-offset-2">select one</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { val: "RABIES", label: "Rabies", badge: "Mandatory", mandatory: true },
                    { val: "DHPP", label: "DHPP / 7-in-1", badge: "Mandatory", mandatory: true },
                    { val: "BORDETELLA", label: "Bordetella", badge: "Kennel Cough", mandatory: false },
                    { val: "CORONAVIRUS", label: "Coronavirus", badge: "Canine", mandatory: false },
                    { val: "LEPTOSPIROSIS", label: "Leptospirosis", badge: "Optional", mandatory: false },
                  ].map((v) => (
                    <button
                      key={v.val}
                      type="button"
                      onClick={() => setVaccineType(v.val)}
                      className={`py-2 px-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                        vaccineType === v.val
                          ? "bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500/40 shadow-xs"
                          : "bg-slate-950/60 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      <span className={`text-xs font-bold ${vaccineType === v.val ? "text-emerald-300 underline decoration-emerald-400/50 underline-offset-2" : ""}`}>
                        {v.label}
                      </span>
                      <span className={`text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded w-fit ${
                        v.mandatory
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {v.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Administered Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={administeredDate}
                    onChange={(e) => setAdministeredDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Valid Until (Expiry) *
                  </label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Batch / Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VAC-2026-99"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Vet / Clinic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PetCare Hospital"
                    value={vetClinicName}
                    onChange={(e) => setVetClinicName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Document / Certificate Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
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
                  {submitting ? "Saving..." : "Record Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
