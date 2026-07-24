import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { useHospitalNotifications } from "@/hooks/use-hospital-data";
import {
  LayoutDashboard, Users, Stethoscope, Calendar, CreditCard,
  BarChart2, Building2, Settings, Bell, LogOut, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/hospital/dashboard",    label: "Dashboard",        icon: LayoutDashboard },
  { href: "/hospital/doctors",      label: "Doctors",          icon: Stethoscope     },
  { href: "/hospital/patients",     label: "Patients",         icon: Users           },
  { href: "/hospital/appointments", label: "Appointments",     icon: Calendar        },
  { href: "/hospital/payments",     label: "Payments",         icon: CreditCard      },
  { href: "/hospital/analytics",    label: "Analytics",        icon: BarChart2       },
  { href: "/hospital/profile",      label: "Hospital Profile", icon: Building2    },
  { href: "/hospital/settings",     label: "Settings",         icon: Settings        },
];

export function HospitalLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { hospital, logout } = useHospitalAuth();
  const { data: notifications } = useHospitalNotifications();

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: any) => !n.isRead).length
    : 0;

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };
    window.addEventListener("resize", update);
    update();
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const SIDEBAR_W = 260;

  const SidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 shrink-0 border-b border-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{hospital?.name || "Hospital"}</p>
            <p className="text-xs text-slate-400 truncate">{hospital?.city}</p>
          </div>
        </div>
        {!isDesktop && (
          <button onClick={closeMobile} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all duration-150",
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
              )}>
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate">{label}</span>
                {href === "/hospital/appointments" && unreadCount > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0 h-5">{unreadCount}</Badge>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700 shrink-0">
        <Link href="/hospital/notifications">
          <a className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all",
            location === "/hospital/notifications"
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
          )}>
            <Bell className="w-4.5 h-4.5 shrink-0" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0 h-5">{unreadCount}</Badge>
            )}
          </a>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-900/40 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      {isDesktop && (
        <aside className="shrink-0 h-full" style={{ width: SIDEBAR_W }}>
          {SidebarContent}
        </aside>
      )}

      {/* Mobile drawer */}
      {!isDesktop && mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
            onClick={closeMobile}
          />
          <aside
            className="fixed left-0 top-0 h-full z-40 shadow-2xl"
            style={{ width: SIDEBAR_W }}
          >
            {SidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        {!isDesktop && (
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-sm">{hospital?.name || "Hospital Admin"}</span>
            </div>
            <Link href="/hospital/notifications">
              <a className="relative p-2 rounded-lg hover:bg-muted">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </a>
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
