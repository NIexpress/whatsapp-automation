"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Dog,
  Calendar,
  IndianRupee,
  ExternalLink,
  Filter,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  Bot,
} from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Conversation control state
  const [customerConversation, setCustomerConversation] = useState<any>(null);
  const [togglingMode, setTogglingMode] = useState(false);
  const [staffReplyText, setStaffReplyText] = useState("");
  const [sendingStaffMsg, setSendingStaffMsg] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/core/customers");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data)
          ? json.data
          : json.data?.customers || [];
        setCustomers(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (phone: string) => {
    try {
      const res = await fetch(`/api/core/conversations?phone=${encodeURIComponent(phone)}`);
      const json = await res.json();
      if (json.success) {
        setCustomerConversation(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer?.phone) {
      loadConversation(selectedCustomer.phone);
    } else {
      setCustomerConversation(null);
    }
  }, [selectedCustomer]);

  const handleToggleMode = async () => {
    if (!customerConversation) return;
    setTogglingMode(true);
    try {
      const targetStatus = customerConversation.status === "HUMAN_ACTIVE" ? "AI_ACTIVE" : "HUMAN_ACTIVE";
      const res = await fetch(`/api/core/conversations/${customerConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setCustomerConversation(json.data);
      }
    } catch (e) {
      alert("Failed to toggle mode");
    } finally {
      setTogglingMode(false);
    }
  };

  const handleSendStaffMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerConversation || !staffReplyText.trim()) return;
    setSendingStaffMsg(true);
    try {
      const res = await fetch(`/api/core/conversations/${customerConversation.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: staffReplyText }),
      });
      const json = await res.json();
      if (json.success) {
        setStaffReplyText("");
        loadConversation(selectedCustomer.phone);
      }
    } catch (e) {
      alert("Failed to send staff message");
    } finally {
      setSendingStaffMsg(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/core/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          email: newEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create customer");
      }
      setShowAddModal(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const customerList = Array.isArray(customers) ? customers : [];
  const filtered = customerList.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Needin Core — Directory</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-400">
            Unified multi-service customer profiles, pets, and automated touchpoints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh customers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Total Customers</p>
            <p className="text-2xl font-black text-white mt-1">{customers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Registered Pets</p>
            <p className="text-2xl font-black text-white mt-1">
              {customers.reduce((acc, c) => acc + (c.dogs?.length || 0), 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Dog className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">WhatsApp Connected</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">100%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Customer List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No customers found</p>
            <p className="text-xs text-slate-500">
              Try adjusting your search criteria or register a new customer profile.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Customer Name</th>
                  <th className="py-3.5 px-4 font-bold">Phone (WhatsApp)</th>
                  <th className="py-3.5 px-4 font-bold">Registered Dogs</th>
                  <th className="py-3.5 px-4 font-bold">Total Bookings</th>
                  <th className="py-3.5 px-4 font-bold">Created Date</th>
                  <th className="py-3.5 px-4 font-bold text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                        {c.name ? c.name[0].toUpperCase() : "C"}
                      </div>
                      <div>
                        <span>{c.name}</span>
                        {c.email && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-normal">
                            <Mail className="w-3 h-3" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+{c.phone}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {c.dogs && c.dogs.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {c.dogs.map((d: any) => (
                            <span
                              key={d.id}
                              className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-1"
                            >
                              <span>🐶</span>
                              <span className="font-semibold">{d.name}</span>
                              <span className="text-[10px] text-slate-400">({d.breed})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No dogs registered</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {c._count?.bookings || c.bookings?.length || 0}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(c.created_at || c.createdAt || Date.now()).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/simulator?phone=${c.phone}`}
                          target="_blank"
                          title="Open in WhatsApp Simulator"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-xs flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Simulate</span>
                        </Link>

                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-semibold"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Add New Customer</span>
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

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Seth"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Phone Number (WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="vikram@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
                >
                  {submitting ? "Registering..." : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  {selectedCustomer.name ? selectedCustomer.name[0].toUpperCase() : "C"}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-400 font-mono">+{selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pets Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Dog className="w-4 h-4 text-emerald-400" />
                <span>Registered Pets</span>
              </h3>

              {selectedCustomer.dogs && selectedCustomer.dogs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCustomer.dogs.map((dog: any) => (
                    <div
                      key={dog.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{dog.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          {dog.breed}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>Age: {dog.age_years ? `${dog.age_years}y ${dog.age_months || 0}m` : (dog.ageMonths ? `${Math.floor(dog.ageMonths / 12)}y` : "1y")}</span>
                        <span>Weight: {dog.weight_kg ? `${dog.weight_kg} kg` : (dog.weightKg ? `${dog.weightKg} kg` : "N/A")}</span>
                      </div>
                      {(dog.medical_notes || dog.specialCareNotes) && (
                        <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                          Note: {dog.medical_notes || dog.specialCareNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No dogs registered yet.</p>
              )}
            </div>

            {/* Bookings Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Recent Service History</span>
              </h3>

              {selectedCustomer.bookings && selectedCustomer.bookings.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.bookings.map((b: any) => (
                    <Link
                      key={b.id}
                      href={`/dashboard/bookings/${b.id}`}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            {b.booking_number || b.bookingNumber}
                          </span>
                          <span className="text-[10px] uppercase px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-bold">
                            {b.booking_status || b.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(b.booking_date || b.bookingDate || Date.now()).toLocaleDateString("en-IN")} • {b.package?.name || b.slotType || "Day Care Pass"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">₹{b.total_amount || b.totalAmount || 500}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No bookings on record.</p>
              )}
            </div>

            {/* WhatsApp Conversation & Mode Control */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span>WhatsApp & AI Mode Control</span>
                </h3>
                {customerConversation && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      customerConversation.status === "HUMAN_ACTIVE"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }`}
                  >
                    {customerConversation.status === "HUMAN_ACTIVE"
                      ? "🔴 Manual Staff Mode (AI Paused)"
                      : "🟢 AI Automated Mode (Active)"}
                  </span>
                )}
              </div>

              {customerConversation?.current_intent === "HUMAN_SUPPORT_REQUESTED" && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤝</span>
                    <div>
                      <p className="font-bold">Customer Requested Front Desk Staff!</p>
                      <p className="text-[11px] text-amber-400/80">
                        Customer selected Option 4 in WhatsApp. Automated bot informed them staff will contact them.
                      </p>
                    </div>
                  </div>
                  {customerConversation.status !== "HUMAN_ACTIVE" && (
                    <button
                      onClick={handleToggleMode}
                      disabled={togglingMode}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition shrink-0"
                    >
                      Take Over Now
                    </button>
                  )}
                </div>
              )}

              {customerConversation && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {customerConversation.status === "HUMAN_ACTIVE"
                          ? "Manual Staff Control is Active"
                          : "AI Bot is Automatically Replying"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {customerConversation.status === "HUMAN_ACTIVE"
                          ? "AI auto-replies are paused. Messages sent here appear from Staff."
                          : "AI responds to customer booking requests, prices, and menus."}
                      </p>
                    </div>

                    <button
                      onClick={handleToggleMode}
                      disabled={togglingMode}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition border ${
                        customerConversation.status === "HUMAN_ACTIVE"
                          ? "bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-emerald-500/40"
                          : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {togglingMode
                        ? "Switching..."
                        : customerConversation.status === "HUMAN_ACTIVE"
                        ? "▶ Resume AI Assistant"
                        : "⏸ Switch to Manual Mode"}
                    </button>
                  </div>

                  {customerConversation.status === "HUMAN_ACTIVE" && (
                    <form onSubmit={handleSendStaffMessage} className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type reply to customer as Staff..."
                        value={staffReplyText}
                        onChange={(e) => setStaffReplyText(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingStaffMsg || !staffReplyText.trim()}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl disabled:opacity-50 transition"
                      >
                        {sendingStaffMsg ? "Sending..." : "Send Staff Reply"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <Link
                href={`/simulator?phone=${selectedCustomer.phone}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Open WhatsApp Simulator</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
