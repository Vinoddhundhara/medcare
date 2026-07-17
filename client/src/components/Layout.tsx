import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";
import { FloatingAIAssistant } from "./FloatingAIAssistant";

const SIDEBAR_W = 256; // must match Sidebar.tsx

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", fn);
    fn();
    return () => window.removeEventListener("resize", fn);
  }, []);

  if (!user) {
    return <div style={{ minHeight: "100vh" }}>{children}</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))", position: "relative" }}>
      <Sidebar />

      {/* Floating Glassmorphism Language Selector widget */}
      <div 
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 49,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          borderRadius: 9999,
          padding: "4px 8px 4px 12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        }}
      >
        <Globe style={{ width: 14, height: 14 }} className="text-primary animate-pulse" />
        <span style={{ fontSize: 11, fontWeight: 600 }} className="text-muted-foreground mr-1 hidden sm:inline">
          {t.common.language}:
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          <button
            onClick={() => setLanguage("en")}
            style={{
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: "none",
              background: language === "en" ? "hsl(var(--primary))" : "transparent",
              color: language === "en" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("hi")}
            style={{
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: "none",
              background: language === "hi" ? "hsl(var(--primary))" : "transparent",
              color: language === "hi" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            हिन्दी
          </button>
        </div>
      </div>

      <main
        style={{
          // On desktop: push right of sidebar. On mobile: full width + top padding for hamburger.
          marginLeft: isDesktop ? SIDEBAR_W : 0,
          paddingTop: isDesktop ? 32 : 60,  // mobile: 60px clears the hamburger button
          paddingLeft: isDesktop ? 32 : 16,
          paddingRight: isDesktop ? 32 : 16,
          paddingBottom: 32,
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {children}
        </div>
      </main>
      <FloatingAIAssistant />
    </div>
  );
}
