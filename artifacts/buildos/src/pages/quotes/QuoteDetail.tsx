import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ChevronRight, ExternalLink } from "lucide-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type QuoteTask = {
  id: number; name: string; trade: string; unit: string | null;
  quantity: string | null; laborCost: string; materialCost: string;
  totalCost: string; marketNote: string | null;
  isIncluded: boolean; isAiDetected: boolean; isAiSuggested: boolean;
  suggestionReason: string | null;
};

type QuoteArea = {
  id: number; name: string; scopeSummary: string | null;
  totalCost: string; clientPrice: string;
  tasks: QuoteTask[];
};

type Quote = {
  id: number; title: string; clientName: string | null; clientEmail: string | null;
  city: string | null; state: string | null;
  totalLaborCost: string; totalMaterialCost: string; totalCost: string;
  markupPercent: string; clientPrice: string; estimatedMarginPercent: string | null;
  status: "draft" | "sent" | "approved" | "rejected" | "expired" | "converted";
  projectId: number | null; createdAt: string; scopeSummary: string | null;
  areas: QuoteArea[];
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-700" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  approved:  { label: "Approved",  className: "bg-green-100 text-green-700" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700" },
  expired:   { label: "Expired",   className: "bg-orange-100 text-orange-700" },
  converted: { label: "Converted", className: "bg-[#1B3A5C]/10 text-[#1B3A5C]" },
};

function fmt(n: string | number | null) {
  if (n === null || n === undefined) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    typeof n === "string" ? parseFloat(n) : n
  );
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient  = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ["quotes", id],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/quotes/${id}`);
      if (!r.ok) throw new Error("Quote not found");
      return r.json();
    },
  });

  async function updateStatus(status: string) {
    setLoading(status);
    try {
      const r = await fetch(`${BASE}/api/quotes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote updated.");
    } catch {
      toast.error("Failed to update quote.");
    } finally {
      setLoading(null);
    }
  }

  async function convertToProject() {
    setLoading("convert");
    try {
      const r = await fetch(`${BASE}/api/quotes/${id}/convert`, { method: "POST" });
      if (!r.ok) throw new Error();
      const { project } = await r.json();
      toast.success("Project created!");
      navigate(`/projects/${project.id}`);
    } catch {
      toast.error("Failed to create project.");
    } finally {
      setLoading(null);
    }
  }

  if (isLoading) {
    return (
      <BuilderLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B3A5C]" />
        </div>
      </BuilderLayout>
    );
  }

  if (!quote) {
    return (
      <BuilderLayout>
        <div className="p-6 text-center text-muted-foreground">Quote not found.</div>
      </BuilderLayout>
    );
  }

  const cfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft;

  return (
    <BuilderLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-display font-bold">{quote.title}</h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${cfg.className}`}>
                {cfg.label}
              </span>
            </div>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
              {quote.clientName && <span>{quote.clientName}</span>}
              {quote.clientEmail && <><span>·</span><span>{quote.clientEmail}</span></>}
              {quote.city && <><span>·</span><span>{quote.city}{quote.state ? `, ${quote.state}` : ""}</span></>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {quote.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus("sent")}
                  disabled={!!loading}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {loading === "sent" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send to Client"}
                </Button>
                <Button
                  size="sm"
                  className="bg-[#F97316] hover:bg-[#ea6c0e] text-white"
                  onClick={convertToProject}
                  disabled={!!loading}
                >
                  {loading === "convert" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert to Project"}
                </Button>
              </>
            )}
            {quote.status === "sent" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus("approved")}
                  disabled={!!loading}
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  {loading === "approved" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark as Approved"}
                </Button>
                <Button
                  size="sm"
                  className="bg-[#F97316] hover:bg-[#ea6c0e] text-white"
                  onClick={convertToProject}
                  disabled={!!loading}
                >
                  Convert to Project
                </Button>
              </>
            )}
            {(quote.status === "approved") && !quote.projectId && (
              <Button
                size="sm"
                className="bg-[#F97316] hover:bg-[#ea6c0e] text-white"
                onClick={convertToProject}
                disabled={!!loading}
              >
                {loading === "convert" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert to Project"}
              </Button>
            )}
            {quote.projectId && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => navigate(`/projects/${quote.projectId}`)}
              >
                View Project <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary card */}
        <Card className="mb-6 bg-[#1B3A5C] text-white">
          <CardContent className="p-6">
            {quote.scopeSummary && (
              <p className="text-white/80 text-sm mb-4">{quote.scopeSummary}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Labor</p>
                <p className="text-xl font-bold">{fmt(quote.totalLaborCost)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Material</p>
                <p className="text-xl font-bold">{fmt(quote.totalMaterialCost)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Your Cost</p>
                <p className="text-xl font-bold">{fmt(quote.totalCost)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Client Price</p>
                <p className="text-2xl font-bold text-[#F97316]">{fmt(quote.clientPrice)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex gap-4 text-sm text-white/70">
              <span>Markup: {parseFloat(quote.markupPercent ?? "25")}%</span>
              {quote.estimatedMarginPercent && (
                <span>Margin: {parseFloat(quote.estimatedMarginPercent)}%</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Areas + tasks */}
        <div className="space-y-4">
          {quote.areas.map((area) => (
            <Card key={area.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1B3A5C]">{area.name}</h3>
                  <span className="font-semibold">{fmt(area.clientPrice)}</span>
                </div>
                {area.scopeSummary && (
                  <p className="text-sm text-muted-foreground mb-3">{area.scopeSummary}</p>
                )}
                <div className="space-y-2">
                  {area.tasks.filter(t => t.isIncluded).map((task) => (
                    <div key={task.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <div>
                        <span className="font-medium">{task.name}</span>
                        {task.trade && (
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase font-medium">
                            {task.trade}
                          </span>
                        )}
                        {task.marketNote && (
                          <p className="text-xs text-blue-600 mt-0.5">{task.marketNote}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-medium">{fmt(task.totalCost)}</p>
                        <p className="text-xs text-muted-foreground">
                          L: {fmt(task.laborCost)} · M: {fmt(task.materialCost)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </BuilderLayout>
  );
}
