"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  Copy,
  Eye,
  Smartphone,
  Sparkles,
  History,
  X,
  Send,
  RefreshCw,
} from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editBody, setEditBody] = useState("");
  const [previewContent, setPreviewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/core/templates");
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : (json.data?.templates || []);
        setTemplates(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openEditor = (template: any) => {
    setSelectedTemplate(template);
    const activeBody = template.versions?.[0]?.body || template.body || "";
    setEditBody(activeBody);
    updatePreview(activeBody, template.versions?.[0]?.variables || template.variables);
  };

  const updatePreview = (body: string, variablesJson: any) => {
    let preview = body;
    const sampleVars: Record<string, string> = {
      customer_name: "Rahul Sharma",
      dog_name: "Bruno",
      booking_number: "NDN-DDC-2026-0042",
      booking_date: "25 Sep 2026",
      slot_name: "Morning Half Day (09:00 AM - 01:00 PM)",
      total_amount: "₹499",
      pickup_time: "01:00 PM",
      balance_amount: "₹0",
      reason: "Customer schedule conflict",
      refund_amount: "₹499",
      notes: "Bruno had a great playtime in the agility park!",
      vaccine_name: "Rabies",
      due_date: "10 Oct 2026",
      agent_name: "Vikram (Senior Caregiver)",
    };

    try {
      const vars = typeof variablesJson === "string" ? JSON.parse(variablesJson) : variablesJson;
      if (Array.isArray(vars)) {
        vars.forEach((v: string) => {
          const val = sampleVars[v] || `[${v}]`;
          preview = preview.replaceAll(`{${v}}`, val);
        });
      }
    } catch {
      // fallback
    }

    setPreviewContent(preview);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/core/templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: editBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update template");
      }
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Needin Core — Messaging Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            WhatsApp Message Templates
          </h1>
          <p className="text-sm text-slate-400">
            Version-controlled templates for booking confirmations, lifecycle updates, and reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh templates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold">
            {templates.length} Active Templates
          </span>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search templates by code, trigger name, or text content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-semibold">No templates match search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tmpl) => {
            const activeVersion = tmpl.versions?.[0];
            const versionNumber = activeVersion?.version_number || tmpl.version || 1;
            const bodyContent = activeVersion?.body || tmpl.body || "";
            const rawVars = activeVersion?.variables || tmpl.variables;
            let variables: string[] = [];
            try {
              variables = typeof rawVars === "string" ? JSON.parse(rawVars) : (rawVars || []);
            } catch {}

            return (
              <div
                key={tmpl.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 flex flex-col justify-between transition shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                        {tmpl.code}
                      </span>
                      <h3 className="font-black text-white text-base mt-1.5">{tmpl.name}</h3>
                    </div>

                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      v{versionNumber}
                    </span>
                  </div>

                  {/* Body Snippet */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 font-sans whitespace-pre-wrap line-clamp-4 leading-relaxed">
                    {bodyContent}
                  </div>

                  {/* Variables */}
                  {Array.isArray(variables) && variables.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Variables ({variables.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {variables.map((v) => (
                          <span
                            key={v}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300"
                          >
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active</span>
                  </span>

                  <button
                    onClick={() => openEditor(tmpl)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit & Preview</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor & Live Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{selectedTemplate.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-emerald-400">
                      {selectedTemplate.code}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      Current Version: v{selectedTemplate.versions?.[0]?.version_number || selectedTemplate.version || 1}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Editor */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Template Content *
                  </label>
                  <textarea
                    rows={12}
                    value={editBody}
                    onChange={(e) => {
                      setEditBody(e.target.value);
                      updatePreview(e.target.value, selectedTemplate.variables);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-slate-100 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Available Placeholders
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      try {
                        const vars =
                          typeof selectedTemplate.variables === "string"
                            ? JSON.parse(selectedTemplate.variables)
                            : selectedTemplate.variables;
                        return vars.map((v: string) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => {
                              const inserted = editBody + ` {${v}}`;
                              setEditBody(inserted);
                              updatePreview(inserted, selectedTemplate.variables);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono text-xs border border-slate-700 transition"
                          >
                            +{`{${v}}`}
                          </button>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: WhatsApp Live Preview */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Render Preview</span>
                </span>

                <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 min-h-[300px] flex flex-col justify-center">
                  <div className="max-w-[85%] bg-[#005c4b] text-slate-100 rounded-2xl rounded-tl-none p-3.5 text-xs shadow-md space-y-2 leading-relaxed whitespace-pre-wrap font-sans">
                    {previewContent}
                    <div className="text-[9px] text-[#8696a0] text-right">
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Saving will create version <span className="text-white font-bold">v{(selectedTemplate.versions?.[0]?.version_number || selectedTemplate.version || 1) + 1}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
                >
                  {saving ? "Saving New Version..." : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
