"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Search,
  Plus,
  Mail,
  User,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function StaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");

  // New Staff State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/core/staff");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : (json.data?.staff || []);
        setStaffList(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/core/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create staff account");
      }
      setShowAddModal(false);
      setName("");
      setEmail("");
      setPassword("");
      fetchStaff();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ROLES_INFO = [
    {
      role: "OWNER",
      color: "border-purple-500/30 text-purple-400 bg-purple-500/10",
      description: "Full platform root control, database configuration & destructive privileges",
    },
    {
      role: "ADMIN",
      color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
      description: "Service management, staff onboarding, refund authorizations & template updates",
    },
    {
      role: "MANAGER",
      color: "border-blue-500/30 text-blue-400 bg-blue-500/10",
      description: "Booking overrides, capacity management & vaccination record verification",
    },
    {
      role: "STAFF",
      color: "border-slate-700 text-slate-300 bg-slate-800",
      description: "Day-to-day arrivals, pet check-in/out, live status updates to WhatsApp",
    },
  ];

  const staffArray = Array.isArray(staffList) ? staffList : [];
  const filtered = staffArray.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Needin Core — Access Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Staff Members & RBAC Permissions
          </h1>
          <p className="text-sm text-slate-400">
            Enforce role-based access across operations, audit trails, and multi-service modules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStaff}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh staff"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Staff</span>
          </button>
        </div>
      </div>

      {/* Role Descriptions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES_INFO.map((r) => (
          <div
            key={r.role}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
          >
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${r.color}`}
            >
              {r.role}
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Staff Table */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading staff directory...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No staff members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Staff Member</th>
                    <th className="py-3.5 px-4 font-bold">Email Address</th>
                    <th className="py-3.5 px-4 font-bold">RBAC Role</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {s.name[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-white">{s.name}</span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{s.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            s.role === "OWNER"
                              ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                              : s.role === "ADMIN"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : s.role === "MANAGER"
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                              : "bg-slate-800 border-slate-700 text-slate-300"
                          }`}
                        >
                          {s.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                        {new Date(s.created_at || s.createdAt || Date.now()).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Onboard Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Onboard Staff Member</span>
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

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anjali Gupta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="anjali@needin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  RBAC Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="STAFF">STAFF — Day Care Ops & Check-ins</option>
                  <option value="MANAGER">MANAGER — Bookings & Vaccines</option>
                  <option value="ADMIN">ADMIN — Full Operations & Pricing</option>
                  <option value="OWNER">OWNER — Master Root Administrator</option>
                </select>
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
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
