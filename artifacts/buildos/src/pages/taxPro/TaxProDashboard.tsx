import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Users, TrendingUp, DollarSign, FileText, AlertTriangle,
  Plus, ChevronRight, Loader2, ArrowLeft, Search, Download,
  CheckCircle2, Clock, XCircle, Building2, Shield, Copy, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = (path: string) => `${BASE}/api${path}`;

function useFetch<T>(url: string, deps: any[] = []) {
  return useQuery<T>({
    queryKey: [url, ...deps],
    queryFn: async () => {
      const res = await fetch(API(url));
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    },
  });
}

// ── Types ──────────────────────────────────────────────────────────────────
interface ClientRow {
  id: number; name: string; email: string; companyName: string | null;
  status: string; connectionId: number;
  projectCount: number; totalInvoiced: number; totalCollected: number;
  totalExpenses: number; pendingW9Count: number;
}

interface Summary {
  totalInvoiced: number; totalCollected: number; totalExpenses: number;
  estimatedProfit: number; marginPercent: number;
  expensesByCategory: { materials: number; labor: number; equipment: number; permits: number; other: number };
  projectCount: number; invoiceCount: number; expenseCount: number;
}

interface ExpenseRow {
  id: number; amount: number; vendor: string; category: string;
  date: string; description: string | null; receiptUrl: string | null;
  projectId: number; projectName: string | null;
}

interface InvoiceRow {
  id: number; invoiceNumber: string; title: string; total: number;
  status: string; paidAt: string | null; createdAt: string;
  projectId: number; projectName: string | null;
}

interface VendorRow {
  id: number; name: string; company: string | null; email: string | null;
  totalPaid: number; w9Status: "on_file" | "missing";
  w9Url: string | null; needs1099: boolean;
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TaxProDashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [selectedBuilder, setSelectedBuilder] = useState<ClientRow | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useFetch<ClientRow[]>("/tax-pro/clients");

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const taxProLink = `slably.app/tax-pro/${user?.id ?? ""}`;

  const copyLink = () => {
    navigator.clipboard.writeText(taxProLink).then(() => toast.success("Link copied to clipboard!"));
  };

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(API(`/tax-pro/invite/${encodeURIComponent(email)}`), { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invitation sent!");
      setInviteModalOpen(false);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["/tax-pro/clients"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (selectedBuilder) {
    return <BuilderDetail builder={selectedBuilder} onBack={() => setSelectedBuilder(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B3A5C] to-[#2d5a8e] px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="cursor-pointer">
            <img src="/slably-logo-dark.png" alt="Slably" style={{ height: 32 }} />
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Tax Pro Dashboard</h1>
            <p className="text-white/70 text-xs mt-0.5">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <Button
            size="sm"
            className="bg-white text-[#1B3A5C] hover:bg-white/90 gap-1.5"
            onClick={() => setInviteModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : clients.length === 0 ? (
          <div className="bg-gradient-to-b from-slate-50 to-white space-y-6">

            {/* Hero Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-[#1B3A5C] to-[#2d5a8e] py-8 px-8 text-center">
              <Link href="/dashboard" className="cursor-pointer inline-block">
                <img src="/slably-logo-dark.png" alt="Slably" className="mx-auto mb-4" style={{ height: 44 }} />
              </Link>
              <h2 className="text-white text-2xl font-bold">Welcome, {firstName}!</h2>
              <p className="text-white/70 text-sm mt-1">Your financial hub for contractor clients</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-border shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">0 Clients</p>
                    <p className="text-xs text-muted-foreground">Connected contractors</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">Tax Season Ready</p>
                    <p className="text-xs text-muted-foreground">Organized financials</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">Secure Access</p>
                    <p className="text-xs text-muted-foreground">Read-only client data</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Getting Started */}
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Get Started in 2 Steps</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Step 1 */}
                <Card className="border-border shadow-sm">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1B3A5C] flex items-center justify-center text-white font-bold text-sm shrink-0">1</div>
                      <p className="font-bold text-foreground">Invite your contractor clients</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send an invitation to your clients who use Slably. They'll grant you read-only access to their financial data.
                    </p>
                    <Button
                      className="rounded-full bg-orange-500 hover:bg-orange-600 text-white gap-2"
                      onClick={() => setInviteModalOpen(true)}
                    >
                      <Plus className="w-4 h-4" /> Add Your First Client
                    </Button>
                  </CardContent>
                </Card>

                {/* Step 2 */}
                <Card className="border-border shadow-sm">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">2</div>
                      <p className="font-bold text-foreground">Share your Tax Pro link</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share this link with your clients so they can find and connect with you directly on Slably.
                    </p>
                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                      <span className="text-xs text-muted-foreground truncate flex-1">{taxProLink}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 rounded-full gap-1.5 text-[#1B3A5C] hover:text-orange-500"
                        onClick={copyLink}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Features Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { emoji: "📊", title: "Financial Summary", desc: "See P&L, expenses and income for each client in one place" },
                { emoji: "🧾", title: "1099 Reports", desc: "Track W-9 status and identify contractors who need a 1099" },
                { emoji: "📁", title: "Export Ready", desc: "Download expense and income reports as CSV for tax prep" },
              ].map(({ emoji, title, desc }) => (
                <Card key={title} className="border-border shadow-sm text-center">
                  <CardContent className="p-5 space-y-2">
                    <p className="text-2xl">{emoji}</p>
                    <p className="font-bold text-foreground text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> My Clients
            </h2>
          <div className="space-y-4">
            {clients.map((c) => {
              const profit = c.totalInvoiced - c.totalExpenses;
              const margin = c.totalInvoiced > 0 ? Math.round((profit / c.totalInvoiced) * 100) : 0;
              return (
                <Card key={c.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{c.name}</p>
                          {c.companyName && <p className="text-sm text-muted-foreground">{c.companyName}</p>}
                          {c.status === "pending" && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                              <Clock className="w-3 h-3" /> Pending acceptance
                            </span>
                          )}
                        </div>
                      </div>
                      {c.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={() => setSelectedBuilder(c)}
                        >
                          View Details <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    {c.status === "active" && (
                      <>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="font-bold text-foreground">{formatCurrency(c.totalInvoiced)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Expenses</p>
                            <p className="font-bold text-foreground">{formatCurrency(c.totalExpenses)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Profit</p>
                            <p className="font-bold text-emerald-600">{formatCurrency(profit)}</p>
                            <p className="text-xs text-emerald-600">{margin}% ✅</p>
                          </div>
                        </div>

                        {c.pendingW9Count > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm bg-amber-50 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {c.pendingW9Count} W-9{c.pendingW9Count > 1 ? "s" : ""} missing
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Add Client Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client email address</label>
              <Input
                type="email"
                placeholder="contractor@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-[#1B3A5C] hover:bg-[#152d4a] text-white"
              onClick={() => inviteMutation.mutate(inviteEmail)}
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
            >
              {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Builder Detail View ────────────────────────────────────────────────────
function BuilderDetail({ builder, onBack }: { builder: ClientRow; onBack: () => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const queryClient = useQueryClient();

  const { data: summary, isLoading: sumLoading } = useFetch<Summary>(
    `/tax-pro/clients/${builder.id}/summary?year=${year}`,
    [year]
  );
  const { data: expenses = [], isLoading: expLoading } = useFetch<ExpenseRow[]>(
    `/tax-pro/clients/${builder.id}/expenses?year=${year}`,
    [year]
  );
  const { data: invoices = [], isLoading: invLoading } = useFetch<InvoiceRow[]>(
    `/tax-pro/clients/${builder.id}/invoices?year=${year}`,
    [year]
  );
  const { data: vendors = [], isLoading: venLoading } = useFetch<VendorRow[]>(
    `/tax-pro/clients/${builder.id}/vendors`,
    []
  );

  const requestW9 = useMutation({
    mutationFn: async (vendorId: number) => {
      const res = await fetch(`${BASE}/api/tax-pro/vendors/${vendorId}/request-w9`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(data.message ?? "W-9 request sent");
      queryClient.invalidateQueries({ queryKey: [`/tax-pro/clients/${builder.id}/vendors`] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B3A5C] to-[#2d5a8e] px-6 py-5">
        <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to clients
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">{builder.name}</h1>
            {builder.companyName && <p className="text-white/70 text-sm">{builder.companyName}</p>}
          </div>
          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y} className="text-foreground">{y}</option>)}
          </select>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="summary">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto hide-scrollbar bg-transparent h-auto p-0 gap-2">
            {["summary","expenses","income","1099","documents"].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border data-[state=inactive]:bg-white rounded-full px-5 py-2 capitalize"
              >
                {tab === "1099" ? "1099 Report" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tab: Summary ── */}
          <TabsContent value="summary">
            {sumLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : summary ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Invoiced"  value={formatCurrency(summary.totalInvoiced)}  color="text-foreground" />
                  <StatCard label="Collected" value={formatCurrency(summary.totalCollected)} color="text-emerald-600" />
                  <StatCard label="Expenses"  value={formatCurrency(summary.totalExpenses)}  color="text-red-500" />
                  <StatCard label="Est. Profit" value={`${formatCurrency(summary.estimatedProfit)} (${summary.marginPercent}%)`} color="text-primary" />
                </div>

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Expenses by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(summary.expensesByCategory).map(([cat, amount]) => {
                      const pct = summary.totalExpenses > 0 ? (amount / summary.totalExpenses) * 100 : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-muted-foreground">{cat}</span>
                            <span className="font-medium">{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-border shadow-sm text-center">
                    <CardContent className="py-4">
                      <p className="text-2xl font-bold text-primary">{summary.projectCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Projects</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border shadow-sm text-center">
                    <CardContent className="py-4">
                      <p className="text-2xl font-bold text-primary">{summary.invoiceCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Invoices</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border shadow-sm text-center">
                    <CardContent className="py-4">
                      <p className="text-2xl font-bold text-primary">{summary.expenseCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Expenses</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* ── Tab: Expenses ── */}
          <TabsContent value="expenses">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">{expenses.length} records</p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(expenses, `expenses-${builder.name}-${year}.csv`)}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
            {expLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : expenses.length === 0 ? (
              <Card className="border-dashed border-2 shadow-none"><CardContent className="p-10 text-center text-muted-foreground">No expenses for {year}</CardContent></Card>
            ) : (
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-border">
                      <tr>
                        {["Date", "Project", "Vendor", "Category", "Amount", "Receipt"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">{e.date}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.projectName ?? "—"}</td>
                          <td className="px-4 py-3">{e.vendor}</td>
                          <td className="px-4 py-3"><span className="capitalize">{e.category}</span></td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(e.amount)}</td>
                          <td className="px-4 py-3">
                            {e.receiptUrl ? (
                              <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">View</a>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: Income ── */}
          <TabsContent value="income">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(invoices, `invoices-${builder.name}-${year}.csv`)}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
            {invLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : invoices.length === 0 ? (
              <Card className="border-dashed border-2 shadow-none"><CardContent className="p-10 text-center text-muted-foreground">No invoices for {year}</CardContent></Card>
            ) : (
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-border">
                      <tr>
                        {["Invoice #", "Project", "Amount", "Status", "Date"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map(inv => (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-muted-foreground">{inv.projectName ?? "—"}</td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(inv.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              inv.status === "paid" ? "bg-emerald-100 text-emerald-700"
                              : inv.status === "sent" ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {format(new Date(inv.createdAt), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: 1099 Report ── */}
          <TabsContent value="1099">
            {venLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : vendors.length === 0 ? (
              <Card className="border-dashed border-2 shadow-none"><CardContent className="p-10 text-center text-muted-foreground">No vendors found</CardContent></Card>
            ) : (
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-border">
                      <tr>
                        {["Vendor / Sub", "Total Paid", "W-9 Status", "Needs 1099", "Action"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {vendors.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium">{v.name}</p>
                            {v.company && <p className="text-xs text-muted-foreground">{v.company}</p>}
                          </td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(v.totalPaid)}</td>
                          <td className="px-4 py-3">
                            {v.w9Status === "on_file" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" /> On File
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3" /> Missing
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {v.needs1099 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                <AlertTriangle className="w-3 h-3" /> Yes
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">No</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {v.w9Status === "on_file" && v.w9Url ? (
                              <a href={v.w9Url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
                                  <Download className="w-3 h-3" /> Download W-9
                                </Button>
                              </a>
                            ) : v.email ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-7 border-orange-300 text-orange-700 hover:bg-orange-50"
                                onClick={() => requestW9.mutate(v.id)}
                                disabled={requestW9.isPending}
                              >
                                {requestW9.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Request W-9
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">No email</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: Documents ── */}
          <TabsContent value="documents">
            <Card className="border-dashed border-2 shadow-none">
              <CardContent className="p-10 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Documents (read-only)</p>
                <p className="text-sm mt-1">Signed contracts and approved change orders will appear here once available.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invoice detail modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={(v) => !v && setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-3 mt-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium">{selectedInvoice.title}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span>{selectedInvoice.projectName ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-lg">{formatCurrency(selectedInvoice.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{selectedInvoice.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{format(new Date(selectedInvoice.createdAt), "MMM d, yyyy")}</span></div>
              {selectedInvoice.paidAt && <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-emerald-600 font-medium">{format(new Date(selectedInvoice.paidAt), "MMM d, yyyy")}</span></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
