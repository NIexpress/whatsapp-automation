import Link from "next/link";
import { Shield, Sparkles, Smartphone, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Multi-Service Business Automation Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Welcome to <span className="text-emerald-400">Needin</span> 🐾
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          The modular, WhatsApp-first automation platform. Service Module #1:{" "}
          <strong className="text-slate-200">Dog Day Care & Pet Care</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
          >
            <Shield className="w-5 h-5" />
            <span>Admin & Staff Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/simulator"
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Smartphone className="w-5 h-5" />
            <span>WhatsApp Simulator</span>
          </Link>
        </div>

        <div className="pt-12 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-slate-200 mb-1">Needin Core</h3>
            <p className="text-xs text-slate-400">
              Shared Auth, RBAC, Customer Identity, WhatsApp, AI & Centralized Template Engine.
            </p>
          </div>
          <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-slate-200 mb-1">Service Module #1</h3>
            <p className="text-xs text-slate-400">
              Dog Day Care with dynamic packages, medical vaccine tracking, and concurrency-safe availability.
            </p>
          </div>
          <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-800">
            <h3 className="font-bold text-slate-200 mb-1">Future Ready</h3>
            <p className="text-xs text-slate-400">
              Easily plug in Veterinary, Grooming, Training, and Boarding without core rewrites.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
