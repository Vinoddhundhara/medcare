import {
  useHospitalNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-hospital-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Calendar, CreditCard, UserX, Info } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  new_appointment:       { icon: Calendar,  color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/30"   },
  cancelled_appointment: { icon: UserX,     color: "text-red-600",    bg: "bg-red-100 dark:bg-red-900/30"     },
  payment_success:       { icon: CreditCard,color: "text-green-600",  bg: "bg-green-100 dark:bg-green-900/30" },
  doctor_leave:          { icon: UserX,     color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30"},
  general:               { icon: Info,      color: "text-gray-600",   bg: "bg-gray-100 dark:bg-gray-900/30"   },
};

export default function HospitalNotifications() {
  const { data: notifications, isLoading } = useHospitalNotifications();
  const markRead    = useMarkNotificationRead();
  const markAll     = useMarkAllNotificationsRead();

  const unreadCount = (notifications || []).filter((n: any) => !n.isRead).length;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !notifications?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold">No notifications</h3>
            <p className="text-muted-foreground text-sm">You'll see hospital notifications here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(notifications || []).map((notif: any) => {
            const conf = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
            const Icon = conf.icon;
            return (
              <Card
                key={notif.id}
                className={`transition-all ${!notif.isRead ? "border-blue-200 dark:border-blue-800" : ""}`}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${conf.bg}`}>
                      <Icon className={`w-4.5 h-4.5 ${conf.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${!notif.isRead ? "" : "text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {!notif.isRead && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : ""}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    </div>
                    {!notif.isRead && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => markRead.mutate(notif.id)}
                        className="h-7 text-xs shrink-0 text-blue-600"
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
