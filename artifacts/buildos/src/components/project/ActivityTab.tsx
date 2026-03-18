import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Activity, FileText, FileCheck, DollarSign, Image, CheckCircle2, XCircle, FolderOpen, AlertCircle } from "lucide-react";
import { useListActivity } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  project_created:          { icon: FolderOpen,   color: "text-primary",      bg: "bg-primary/10" },
  contract_uploaded:        { icon: FileText,      color: "text-blue-600",     bg: "bg-blue-50" },
  contract_signed:          { icon: FileCheck,     color: "text-emerald-600",  bg: "bg-emerald-50" },
  contract_status_changed:  { icon: FileText,      color: "text-blue-600",     bg: "bg-blue-50" },
  change_order_created:     { icon: DollarSign,    color: "text-amber-600",    bg: "bg-amber-50" },
  change_order_approved:    { icon: CheckCircle2,  color: "text-emerald-600",  bg: "bg-emerald-50" },
  change_order_rejected:    { icon: XCircle,       color: "text-red-500",      bg: "bg-red-50" },
  photo_uploaded:           { icon: Image,         color: "text-violet-600",   bg: "bg-violet-50" },
};

function getEventCfg(type: string) {
  return EVENT_CONFIG[type] ?? { icon: Activity, color: "text-muted-foreground", bg: "bg-slate-100" };
}

export function ActivityTab({ projectId }: { projectId: number }) {
  const { data: logs = [], isLoading } = useListActivity(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="border-dashed border-2 shadow-none bg-transparent">
        <CardContent className="p-10 text-center text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No activity yet</p>
          <p className="text-sm mt-1">Events will appear here as the project progresses.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        {logs.length} {logs.length === 1 ? "event" : "events"}
      </p>
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-1">
          {logs.map((log, i) => {
            const cfg  = getEventCfg(log.type);
            const Icon = cfg.icon;
            const isLast = i === logs.length - 1;
            return (
              <div key={log.id} className={`relative flex gap-4 ${isLast ? "" : "pb-1"}`}>
                <div className={`relative z-10 mt-1 shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0 bg-white rounded-xl border border-border px-4 py-3 shadow-sm">
                  <p className="text-sm text-foreground leading-snug">{log.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span
                      className="text-xs text-muted-foreground"
                      title={format(new Date(log.createdAt), "PPpp")}
                    >
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
