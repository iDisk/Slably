import { useLocation } from "wouter";
import { Briefcase, Loader2, MapPin, ChevronRight, Building2 } from "lucide-react";
import { motion } from "framer-motion";

import { useGetMyWork, type MyWorkItem } from "@workspace/api-client-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: "In Progress", cls: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed",   cls: "bg-blue-100 text-blue-700" },
  planning:  { label: "Planning",    cls: "bg-slate-100 text-slate-600" },
  on_hold:   { label: "On Hold",     cls: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelled",   cls: "bg-red-100 text-red-700" },
};

const VENDOR_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", cls: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

function fmt(n: string | null | undefined) {
  const v = parseFloat(n ?? "0");
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(v);
}

// ─── Work Card ────────────────────────────────────────────────────────────────
function WorkCard({ item, index }: { item: MyWorkItem; index: number }) {
  const [, navigate] = useLocation();
  const ps      = PROJECT_STATUS[item.project.status] ?? PROJECT_STATUS.active;
  const vs      = VENDOR_STATUS[item.status]          ?? VENDOR_STATUS.active;
  const balance = parseFloat(item.balancePending);
  const paid    = parseFloat(item.paymentsMade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground font-display text-base truncate">
                {item.project.name}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ps.cls}`}>
                  {ps.label}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vs.cls}`}>
                  {vs.label}
                </span>
              </div>
            </div>
          </div>

          {/* Builder */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>{item.builder.name}</span>
            {item.builder.companyName && (
              <span className="text-muted-foreground/60">· {item.builder.companyName}</span>
            )}
          </div>

          {/* Address */}
          {item.project.address && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.project.address}</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{item.project.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${item.project.progress}%` }}
              />
            </div>
          </div>

          {/* Contract financials */}
          {item.contractAmount && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract</span>
                <span className="font-semibold">{fmt(item.contractAmount)}</span>
              </div>
              {paid > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-emerald-600">{fmt(item.paymentsMade)}</span>
                </div>
              )}
              {balance > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-amber-600">{fmt(item.balancePending)}</span>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => navigate(`/my-work/${item.vendorId}`)}
          >
            View details <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SubDashboard() {
  const [, navigate] = useLocation();
  const { data: items, isLoading } = useGetMyWork({ query: { queryKey: ["/api/my-work"] } });
  const activeCount = items?.filter(i => i.status === "active").length ?? 0;

  return (
    <BuilderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">My Work</h1>
            <p className="text-muted-foreground text-sm mt-1">Your active project assignments</p>
          </div>
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {activeCount}
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!items || items.length === 0) && (
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">No active work yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have any active assignments. Browse available jobs in Network.
                </p>
              </div>
              <Button onClick={() => navigate("/network")} className="gap-2">
                <Briefcase className="w-4 h-4" /> Go to Network
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Work grid */}
        {!isLoading && items && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, i) => (
              <WorkCard key={item.vendorId} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </BuilderLayout>
  );
}
