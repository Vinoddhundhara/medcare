import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";

const SIDEBAR_W = 256; // must match Sidebar.tsx

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

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
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
      <Sidebar />
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
    </div>
  );
}
