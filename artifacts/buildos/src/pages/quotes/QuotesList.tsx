import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { FileText, Plus, ChevronRight } from "lucide-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type QuoteSummary = {
  id: number;
  title: string;
  clientName: string | null;
  clientPrice: string | null;
  status: "draft" | "sent" | "approved" | "rejected" | "expired" | "converted";
  city: string | null;
  state: string | null;
  createdAt: string;
  projectId: number | null;
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-700" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700" },
  approved:  { label: "Approved",  className: "bg-green-100 text-green-700" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700" },
  expired:   { label: "Expired",   className: "bg-orange-100 text-orange-700" },
  converted: { label: "Converted", className: "bg-[#1B3A5C]/10 text-[#1B3A5C]" },
};

function fmt(n: string | null) {
  if (!n) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(parseFloat(n));
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function QuotesList() {
  const [, navigate] = useLocation();

  const { data: quotes = [], isLoading } = useQuery<QuoteSummary[]>({
    queryKey: ["quotes"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/quotes`);
      if (!r.ok) throw new Error("Failed to load quotes");
      return r.json();
    },
  });

  return (
    <BuilderLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">My Quotes</h1>
            <p className="text-muted-foreground mt-1 text-sm">AI-powered quotes for your construction projects.</p>
          </div>
          <Button
            className="gap-2 bg-[#F97316] hover:bg-[#ea6c0e] text-white shrink-0"
            onClick={() => navigate("/quotes/new")}
          >
            <Plus className="w-4 h-4" /> Get a Quote
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A5C]" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-bold text-xl mb-2">No quotes yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first quote to get started. AI will break down the job into areas and tasks with market prices.
            </p>
            <Button
              className="gap-2 bg-[#F97316] hover:bg-[#ea6c0e] text-white"
              onClick={() => navigate("/quotes/new")}
            >
              <Plus className="w-4 h-4" /> Get a Quote
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => {
              const cfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft;
              return (
                <Link key={q.id} href={`/quotes/${q.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-foreground truncate">{q.title}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{q.clientName ?? <em>No client yet</em>}</span>
                            {q.city && <span>·</span>}
                            {q.city && <span>{q.city}{q.state ? `, ${q.state}` : ""}</span>}
                            <span>·</span>
                            <span>{fmtDate(q.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-lg font-bold text-[#1B3A5C]">{fmt(q.clientPrice)}</span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </BuilderLayout>
  );
}
