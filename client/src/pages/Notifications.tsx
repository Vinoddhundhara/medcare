import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useAppointments } from "@/hooks/use-appointments";
import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Calendar, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";

const TYPE_BADGE_COLORS: Record<string, string> = {
  upcoming:  "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  rejected:  "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  pending:   "bg-amber-100 text-amber-800",
  cancelled: "bg-gray-100 text-gray-800",
  medicine:  "bg-purple-100 text-purple-800",
};

export default function Notifications() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();
  const { notifications, count, markOneSeen, getSeenIds, clearAll } = useNotifications();
  const { t } = useLanguage();
  const nt = t.notifications;

  const [openId, setOpenId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setOpenId(prev => {
      const next = prev === id ? null : id;
      // Mark as seen when opening
      if (next === id) markOneSeen(id);
      return next;
    });
  }, [markOneSeen]);

  if (!user) return null;

  const seenIds = getSeenIds();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{nt.title}</h2>
          <p className="text-muted-foreground mt-1">
            {nt.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-sm px-3 py-1">
              {count} {nt.newBadge}
            </Badge>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
              onClick={clearAll}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {nt.clearAll}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
          <Bell className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{nt.allCaughtUp}</h3>
          <p className="text-muted-foreground mt-1">{nt.noNotifications}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = n.icon;
            const isOpen = openId === n.id;
            const isSeen = seenIds.has(n.id);

            return (
              <Card
                key={n.id}
                className={cn(
                  "border shadow-sm transition-all duration-200 cursor-pointer",
                  n.bg,
                  isOpen ? "shadow-md" : "hover:shadow-md",
                  !isSeen && "ring-2 ring-red-400/40"
                )}
                onClick={() => handleToggle(n.id)}
              >
                <CardContent className="p-4">
                  {/* Header row — always visible */}
                  <div className="flex items-start gap-4">
                    {/* Icon + unseen dot */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="p-2 rounded-full bg-white shadow-sm">
                        <Icon className={`w-5 h-5 ${n.color}`} />
                      </div>
                      {!isSeen && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{n.title}</p>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${TYPE_BADGE_COLORS[n.type]}`}
                        >
                          {nt.typeLabels[n.type as keyof typeof nt.typeLabels] || n.type}
                        </Badge>
                        {!isSeen && (
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">
                            {nt.new}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {n.time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {n.time}
                        </div>
                      )}
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-black/5">
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {nt.typeDetails[n.type as keyof typeof nt.typeDetails] ?? ""}
                      </p>
                      {n.type === "medicine" && (
                        <Button size="sm" variant="outline" className="mt-3" asChild>
                          <Link href="/ai-assistant">{nt.manageReminders}</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
