import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import {
  LayoutDashboard, Calendar, User, LogOut, Stethoscope,
  FileText, BarChart2, Bell, Brain, MapPin, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";


const SIDEBAR_W = 256; // px — must match Layout.tsx offset

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { count: notifCount } = useNotifications();
  const { t } = useLanguage();

  // true = desktop-wide viewport
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };
    window.addEventListener("resize", update);
    update();
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (!user) return null;

  // Build nav links using translated labels
  const NAV_LINKS_TRANSLATED = [
    { href: "/dashboard",        label: t.nav.overview,         icon: LayoutDashboard, roles: ["patient", "doctor", "admin"] },
    { href: "/appointments",     label: t.nav.appointments,     icon: Calendar,        roles: ["patient", "doctor"] },
    { href: "/doctors",          label: t.nav.findDoctors,      icon: Stethoscope,     roles: ["patient"] },
    { href: "/nearby-hospitals", label: t.nav.nearbyHospitals,  icon: MapPin,          roles: ["patient"] },
    { href: "/ai-assistant",     label: t.nav.aiAssistant,      icon: Brain,           roles: ["patient"] },
    { href: "/prescriptions",    label: t.nav.prescriptions,    icon: FileText,        roles: ["patient", "doctor"] },
    { href: "/analytics",        label: t.nav.analytics,        icon: BarChart2,       roles: ["doctor", "admin"] },
    { href: "/notifications",    label: t.nav.notifications,    icon: Bell,            roles: ["patient", "doctor"], badge: true },
    { href: "/profile",          label: t.nav.profile,          icon: User,            roles: ["patient", "doctor", "admin"] },
  ];

  const links = NAV_LINKS_TRANSLATED.filter((l) => l.roles.includes(user.role));

  // ── Inner content of the sidebar panel ────────────────────────────────────
  const inner = (
    <div className="flex flex-col h-full bg-card border-r border-border overflow-hidden">
      {/* Logo row */}
      <div className="flex items-center justify-between px-5 py-5 shrink-0">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Stethoscope className="w-6 h-6 shrink-0" />
          MedCare
        </h1>
        {/* Close button — only on mobile drawer */}
        {!isDesktop && (
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav links — scrollable so it never clips on small screens */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-2" style={{ overscrollBehavior: "contain" }}>
        {links.map((link) => {
          const active = location === link.href || location.startsWith(link.href + "/");
          const badgeCount = link.badge ? notifCount : 0;
          return (
            <Link key={link.href} href={link.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer font-medium text-sm transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <div className="relative shrink-0">
                  <link.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className="flex-1 truncate">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="shrink-0 border-t border-border px-3 py-3">

        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
          onClick={() => logout()}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />{t.nav.signOut}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP: always visible fixed panel ── */}
      {isDesktop && (
        <div
          style={{ width: SIDEBAR_W, position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 50 }}
        >
          {inner}
        </div>
      )}

      {/* ── MOBILE: hamburger button ── */}
      {!isDesktop && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 60,
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 10, padding: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
          aria-label="Open menu"
        >
          <Menu style={{ width: 20, height: 20 }} />
        </button>
      )}

      {/* ── MOBILE: backdrop ── */}
      {!isDesktop && mobileOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: "fixed", inset: 0, zIndex: 55,
            background: "rgba(0,0,0,0.5)",
          }}
        />
      )}

      {/* ── MOBILE: slide-in drawer ── */}
      {!isDesktop && (
        <div
          style={{
            position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 56,
            width: SIDEBAR_W,
            transform: mobileOpen ? "translateX(0)" : `translateX(-${SIDEBAR_W}px)`,
            transition: "transform 0.28s ease",
            boxShadow: mobileOpen ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
          }}
        >
          {inner}
        </div>
      )}
    </>
  );
}
