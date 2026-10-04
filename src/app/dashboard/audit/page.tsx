"use client";

import { useEffect, useState } from "react";
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  User,
  Activity,
  Code,
  ChevronDown,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Download,
} from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/core/audit");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : json.data?.logs || [];
        setLogs(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filtered, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `needin_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const logList = Array.isArray(logs) ? logs : [];
  const actions = Array.from(new Set(logList.map((l) => l.action).filter(Boolean)));

  const filtered = logList.filter((l) => {
    const actorName = l.actor_user?.name || l.actor_name || l.staff?.name || "";
    const entType = l.entity_type || l.entityType || "";
    const entId = l.entity_id || l.entityId || "";
    const matchesSearch =
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      entType.toLowerCase().includes(search.toLowerCase()) ||
      actorName.toLowerCase().includes(search.toLowerCase()) ||
      entId.toLowerCase().includes(search.toLowerCase());
    const matchesAction = !actionFilter || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Needin Core — Immutable Compliance Log</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            System Audit Trail
          </h1>
          <p className="text-sm text-slate-400">
            Append-only security and operational audit trail recording every state mutation across modules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh audit trail"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Trail</span>
          </button>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Tamper-Resistant Log</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by actor, entity ID, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {actions.length > 0 && (
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Actions ({actions.length})</option>
            {actions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading audit records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No audit events match filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Timestamp</th>
                  <th className="py-3.5 px-4 font-bold">Action</th>
                  <th className="py-3.5 px-4 font-bold">Entity Type</th>
                  <th className="py-3.5 px-4 font-bold">Entity ID</th>
                  <th className="py-3.5 px-4 font-bold">Actor</th>
                  <th className="py-3.5 px-4 font-bold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filtered.map((l) => {
                  const isExpanded = expandedLogId === l.id;
                  let parsedMetadata = null;
                  try {
                    parsedMetadata =
                      typeof l.metadata === "string" ? JSON.parse(l.metadata) : l.metadata;
                  } catch {}

                  return (
                    <tr
                      key={l.id}
                      onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 text-slate-400 font-sans text-xs whitespace-nowrap">
                        {new Date(l.created_at || l.createdAt || Date.now()).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            l.action.includes("CREATE")
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : l.action.includes("CANCEL") || l.action.includes("DELETE")
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              : l.action.includes("STATUS") || l.action.includes("VERIF")
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          }`}
                        >
                          {l.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-sans text-white font-semibold">
                        {l.entity_type || l.entityType}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 truncate max-w-[140px]">
                        {l.entity_id || l.entityId || "—"}
                      </td>

                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        {l.actor_user ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                              {l.actor_user.name[0]}
                            </span>
                            <span>{l.actor_user.name}</span>
                          </div>
                        ) : l.actor_name ? (
                          <span className="text-slate-300 font-medium">{l.actor_name}</span>
                        ) : (
                          <span className="text-slate-500 italic">SYSTEM</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
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

      {/* Expanded Metadata Modal */}
      {expandedLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-emerald-400" />
                <span>Audit Log Entry Payload</span>
              </h3>
              <button
                onClick={() => setExpandedLogId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
            </div>

            {(() => {
              const log = logs.find((l) => l.id === expandedLogId);
              if (!log) return null;
              let metaObj = null;
              try {
                metaObj =
                  typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
              } catch {
                metaObj = log.metadata;
              }

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block font-bold uppercase text-[10px]">
                        Action
                      </span>
                      <span className="font-bold text-emerald-400 mt-1 block font-mono">
                        {log.action}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block font-bold uppercase text-[10px]">
                        Actor
                      </span>
                      <span className="font-bold text-white mt-1 block">
                        {log.staff ? `${log.staff.name} (${log.staff.role})` : (log.actor_user ? `${log.actor_user.name}` : (log.actor_name || "SYSTEM"))}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 mb-1.5 block">
                      Context & Metadata Payload
                    </span>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs overflow-x-auto">
                      {JSON.stringify(metaObj, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
