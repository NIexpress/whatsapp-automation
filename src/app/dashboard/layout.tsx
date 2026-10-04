"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Dog,
  Syringe,
  Tags,
  FileText,
  ShieldCheck,
  History,
  Smartphone,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  Car,
  Layers,
  Droplets,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active service from route or local state
  const isCarWashRoute = pathname.startsWith("/dashboard/car-wash");
  const [selectedService, setSelectedService] = useState<"DOG_DAY_CARE" | "CAR_WASH">(
    isCarWashRoute ? "CAR_WASH" : "DOG_DAY_CARE"
  );

  useEffect(() => {
    if (pathname.startsWith("/dashboard/car-wash")) {
      setSelectedService("CAR_WASH");
    } else if (
      pathname.startsWith("/dashboard/dogs") ||
      pathname.startsWith("/dashboard/vaccinations") ||
      pathname === "/dashboard/bookings" ||
      pathname === "/dashboard/pricing"
    ) {
      setSelectedService("DOG_DAY_CARE");
    }
  }, [pathname]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.success) {
          setCurrentUser(data.data);
        }
      })
      .catch(() => router.push("/login"));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const dogNavItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Day Care Bookings", href: "/dashboard/bookings", icon: CalendarDays },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    { name: "Dog Profiles", href: "/dashboard/dogs", icon: Dog },
    { name: "Vaccinations", href: "/dashboard/vaccinations", icon: Syringe },
    { name: "Pricing & Packages", href: "/dashboard/pricing", icon: Tags },
    { name: "Message Templates", href: "/dashboard/templates", icon: FileText },
    { name: "Staff & RBAC", href: "/dashboard/staff", icon: ShieldCheck },
    { name: "Audit Trail", href: "/dashboard/audit", icon: History },
  ];

  const carWashNavItems = [
    { name: "Washing Bays & Board", href: "/dashboard/car-wash", icon: Layers },
    { name: "Vehicle Directory", href: "/dashboard/car-wash/vehicles", icon: Car },
    { name: "Rates & Packages", href: "/dashboard/car-wash/pricing", icon: Tags },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    { name: "Message Templates", href: "/dashboard/templates", icon: FileText },
    { name: "Staff & RBAC", href: "/dashboard/staff", icon: ShieldCheck },
    { name: "Audit Trail", href: "/dashboard/audit", icon: History },
  ];

  const activeNavItems = selectedService === "CAR_WASH" ? carWashNavItems : dogNavItems;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <span className="font-extrabold text-white tracking-tight">Needin</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              selectedService === "CAR_WASH"
                ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {selectedService === "CAR_WASH" ? "Car Wash" : "Dog Day Care"}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Logo Branding */}
          <div className="space-y-3">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-slate-950 text-lg shadow-lg ${
                  selectedService === "CAR_WASH"
                    ? "bg-blue-500 shadow-blue-500/20"
                    : "bg-emerald-500 shadow-emerald-500/20"
                }`}
              >
                {selectedService === "CAR_WASH" ? "🚗" : "🐾"}
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white">Needin</span>
                <p className="text-[10px] text-slate-400 font-medium">Multi-Service Platform</p>
              </div>
            </Link>

            {/* SERVICE SWITCHER (Dog Day Care vs Car Wash) */}
            <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800/90 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedService("DOG_DAY_CARE");
                  router.push("/dashboard");
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition ${
                  selectedService === "DOG_DAY_CARE"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🐶</span>
                <span>Day Care</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedService("CAR_WASH");
                  router.push("/dashboard/car-wash");
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition ${
                  selectedService === "CAR_WASH"
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🚗</span>
                <span>Car Wash</span>
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {activeNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isAccentCar = selectedService === "CAR_WASH";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? isAccentCar
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? (isAccentCar ? "text-white" : "text-slate-950") : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Panel */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {/* Simulator Quick Launcher */}
          <Link
            href="/simulator"
            target="_blank"
            className="w-full py-2 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 text-blue-400 text-xs font-bold flex items-center justify-between transition group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>WhatsApp Simulator</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
          </Link>

          {/* User Profile Card */}
          {currentUser && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto min-h-screen bg-slate-950">
        {children}
      </main>
    </div>
  );
}
