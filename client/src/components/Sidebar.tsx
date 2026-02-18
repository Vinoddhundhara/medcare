import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Calendar, 
  User, 
  LogOut, 
  Stethoscope, 
  FileText, 
  Settings 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["patient", "doctor", "admin"] },
    { href: "/appointments", label: "Appointments", icon: Calendar, roles: ["patient", "doctor"] },
    { href: "/doctors", label: "Find Doctors", icon: Stethoscope, roles: ["patient"] },
    { href: "/prescriptions", label: "Prescriptions", icon: FileText, roles: ["patient", "doctor"] },
    { href: "/profile", label: "Profile", icon: User, roles: ["patient", "doctor", "admin"] },
  ];

  const filteredLinks = links.filter(link => link.roles.includes(user.role));

  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-64 fixed left-0 top-0 bottom-0 z-50">
      <div className="p-6">
        <h1 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
          <Stethoscope className="w-8 h-8" />
          MedCare
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {filteredLinks.map((link) => {
          const isActive = location === link.href || location.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer font-medium text-sm",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
