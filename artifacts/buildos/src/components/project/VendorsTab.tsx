import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Building2, Loader2, Plus, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

import {
  useGetVendors,
  useCreateVendor,
  usePatchVendor,
  useGetVendorPayments,
  useCreateVendorPayment,
  useGetVendorChangeOrders,
  useCreateVendorChangeOrder,
  useGetVendorLedger,
  useGetVendorAlerts,
  useGetFrequentVendors,
  getVendorsQueryKey,
  getFrequentVendorsQueryKey,
  getVendorPaymentsQueryKey,
  getVendorChangeOrdersQueryKey,
  getVendorLedgerQueryKey,
  getVendorAlertsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | string) {
  const v = parseFloat(String(n));
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function isCoiExpiringSoon(dt: string | null) {
  if (!dt) return false;
  const diff = (new Date(dt).getTime() - Date.now()) / 86_400_000;
  return diff >= 0 && diff <= 30;
}

const TYPE_BADGE = {
  subcontractor: "bg-blue-100 text-blue-700 border-blue-200",
  supplier:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  other:         "bg-slate-100 text-slate-600 border-slate-200",
} as const;
const TYPE_LABEL: Record<string, string> = { subcontractor: "Subcontractor", supplier: "Supplier", other: "Other" };

const VENDOR_STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  paused:    "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};
const VENDOR_STATUS_LABEL: Record<string, string> = {
  active: "Activo", completed: "Completado", paused: "Pausado", cancelled: "Cancelado",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 border-amber-200",
  paid:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  overdue:   "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", paid: "Pagado", overdue: "Vencido", cancelled: "Cancelado",
};

const CO_STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};
const CO_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado",
};

const ALERT_ICON: Record<string, string> = {
  overdue_payment:      "🔴",
  pending_change_order: "🟡",
  coi_expiring:         "🟠",
  no_activity:          "⚪",
};

const TIMELINE_ICON: Record<string, string> = {
  contract:     "📋",
  change_order: "🔄",
  payment:      "💰",
};

// ─── form types ───────────────────────────────────────────────────────────────

interface VendorForm {
  name: string; type: string; company: string; specialty: string;
  email: string; phone: string; contract_amount: string; contract_notes: string;
  linked_user_id?: number;
}
interface PaymentForm {
  description: string; amount: string; payment_type: string;
  status: string; due_date: string; payment_method: string; notes: string;
}
interface COForm { title: string; amount: string; description: string; }

const emptyVendorForm  = (): VendorForm  =>
  ({ name: "", type: "", company: "", specialty: "", email: "", phone: "", contract_amount: "", contract_notes: "" });
const emptyPaymentForm = (): PaymentForm =>
  ({ description: "", amount: "", payment_type: "", status: "pending", due_date: "", payment_method: "", notes: "" });
const emptyCOForm      = (): COForm      => ({ title: "", amount: "", description: "" });

// ─── main component ───────────────────────────────────────────────────────────

export function VendorsTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [view, setView]                         = useState<"list" | "detail">("list");
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [alertsOpen, setAlertsOpen]             = useState(false);
  const [createVendorOpen, setCreateVendorOpen] = useState(false);
  const [editVendorOpen, setEditVendorOpen]     = useState(false);
  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const [createCOOpen, setCreateCOOpen]         = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [vendorForm, setVendorForm]             = useState<VendorForm>(emptyVendorForm());
  const [editVendorForm, setEditVendorForm]     = useState<VendorForm>(emptyVendorForm());
  const [paymentForm, setPaymentForm]           = useState<PaymentForm>(emptyPaymentForm());
  const [coForm, setCOForm]                     = useState<COForm>(emptyCOForm());
  const [subSearch, setSubSearch]               = useState("");
  const [subResults, setSubResults]             = useState<any[]>([]);
  const [subSearchLoading, setSubSearchLoading] = useState(false);
  const [subSearchOpen, setSubSearchOpen]       = useState(false);
  const [autoCompleteOpen, setAutoCompleteOpen] = useState(false);

  useEffect(() => {
    if (subSearch.length < 3 || vendorForm.type !== "subcontractor") {
      setSubResults([]);
      setSubSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSubSearchLoading(true);
      try {
        const res = await fetch(
          `/api/find?role=subcontractor&city=${encodeURIComponent(subSearch)}`
        );
        const data = await res.json();
        setSubResults(data.data ?? []);
        setSubSearchOpen(true);
      } catch {
        setSubResults([]);
      } finally {
        setSubSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [subSearch, vendorForm.type]);

  const vid      = selectedVendorId ?? 0;
  const isDetail = view === "detail" && !!selectedVendorId;

  const { data: vendors = [], isLoading: vendorsLoading } = useGetVendors(projectId);
  const { data: alerts  = [] }                            = useGetVendorAlerts(projectId);
  const { data: frequentVendors = [] }                    = useGetFrequentVendors(projectId, {
    query: { enabled: createVendorOpen, queryKey: getFrequentVendorsQueryKey(projectId) },
  });

  const { data: payments = [] } = useGetVendorPayments(projectId, vid, {
    query: { enabled: isDetail, queryKey: getVendorPaymentsQueryKey(projectId, vid) },
  });
  const { data: cos = [] } = useGetVendorChangeOrders(projectId, vid, {
    query: { enabled: isDetail, queryKey: getVendorChangeOrdersQueryKey(projectId, vid) },
  });
  const { data: ledger } = useGetVendorLedger(projectId, vid, {
    query: { enabled: isDetail, queryKey: getVendorLedgerQueryKey(projectId, vid) },
  });

  const createVendorMutation  = useCreateVendor(projectId);
  const patchVendorMutation   = usePatchVendor(projectId, vid);
  const createPaymentMutation = useCreateVendorPayment(projectId, vid);
  const createCOMutation      = useCreateVendorChangeOrder(projectId, vid);

  const invVendors  = () => queryClient.invalidateQueries({ queryKey: getVendorsQueryKey(projectId) });
  const invPayments = () => queryClient.invalidateQueries({ queryKey: getVendorPaymentsQueryKey(projectId, vid) });
  const invCOs      = () => queryClient.invalidateQueries({ queryKey: getVendorChangeOrdersQueryKey(projectId, vid) });
  const invLedger   = () => queryClient.invalidateQueries({ queryKey: getVendorLedgerQueryKey(projectId, vid) });
  const invAlerts   = () => queryClient.invalidateQueries({ queryKey: getVendorAlertsQueryKey(projectId) });
  const invAll      = () => { invVendors(); invPayments(); invCOs(); invLedger(); invAlerts(); };

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  const openDetail = (id: number) => { setSelectedVendorId(id); setView("detail"); };
  const goBack     = () => { setSelectedVendorId(null); setView("list"); };

  const markPaymentPaid = async (paymentId: number) => {
    try {
      await fetch(`/api/projects/${projectId}/vendors/${vid}/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      invPayments(); invLedger(); invVendors(); invAlerts();
      toast.success("Pago marcado como pagado");
    } catch {
      toast.error("Error al actualizar pago");
    }
  };

  const approveRejectCO = async (coId: number, status: "approved" | "rejected") => {
    try {
      await fetch(`/api/projects/${projectId}/vendors/${vid}/change-orders/${coId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      invCOs(); invLedger(); invVendors(); invAlerts();
      toast.success(status === "approved" ? "Change order aprobado" : "Change order rechazado");
    } catch {
      toast.error("Error al actualizar change order");
    }
  };

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim() || !vendorForm.type) { toast.error("Nombre y tipo son requeridos"); return; }
    createVendorMutation.mutate({
      data: {
        name:            vendorForm.name,
        type:            vendorForm.type as "subcontractor" | "supplier" | "other",
        company:         vendorForm.company         || undefined,
        specialty:       vendorForm.specialty       || undefined,
        email:           vendorForm.email           || undefined,
        phone:           vendorForm.phone           || undefined,
        contract_amount: vendorForm.contract_amount ? parseFloat(vendorForm.contract_amount) : undefined,
        contract_notes:  vendorForm.contract_notes  || undefined,
        linked_user_id:  vendorForm.linked_user_id  ?? undefined,
      },
    }, {
      onSuccess: () => {
        toast.success("Vendor added"); invAll();
        setCreateVendorOpen(false);
        setVendorForm(emptyVendorForm());
        setSubSearch(""); setSubResults([]); setSubSearchOpen(false);
      },
      onError:   () => toast.error("Error al crear proveedor"),
    });
  };

  const handleEditVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendorForm.name.trim()) { toast.error("El nombre es requerido"); return; }
    patchVendorMutation.mutate({
      data: {
        name:            editVendorForm.name            || undefined,
        type:            (editVendorForm.type as "subcontractor" | "supplier" | "other") || undefined,
        company:         editVendorForm.company         || undefined,
        specialty:       editVendorForm.specialty       || undefined,
        email:           editVendorForm.email           || undefined,
        phone:           editVendorForm.phone           || undefined,
        contract_amount: editVendorForm.contract_amount ? parseFloat(editVendorForm.contract_amount) : undefined,
        contract_notes:  editVendorForm.contract_notes  || undefined,
      },
    }, {
      onSuccess: () => { toast.success("Vendor updated"); invAll(); setEditVendorOpen(false); },
      onError:   () => toast.error("Error al actualizar proveedor"),
    });
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.description.trim() || !paymentForm.amount || !paymentForm.payment_type) {
      toast.error("Description, amount and type are required"); return;
    }
    createPaymentMutation.mutate({
      data: {
        description:    paymentForm.description,
        amount:         parseFloat(paymentForm.amount),
        payment_type:   paymentForm.payment_type   as "draw" | "deposit" | "final" | "other",
        status:         (paymentForm.status        as "pending" | "paid") || "pending",
        due_date:       paymentForm.due_date       || undefined,
        payment_method: (paymentForm.payment_method as "check" | "zelle" | "cash" | "transfer") || undefined,
        notes:          paymentForm.notes          || undefined,
      },
    }, {
      onSuccess: () => {
        toast.success("Pago agregado"); invAll();
        setCreatePaymentOpen(false); setPaymentForm(emptyPaymentForm());
      },
      onError: () => toast.error("Error al crear pago"),
    });
  };

  const handleCreateCO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coForm.title.trim() || !coForm.amount) { toast.error("Title and amount are required"); return; }
    createCOMutation.mutate({
      data: {
        title:       coForm.title,
        amount:      parseFloat(coForm.amount),
        description: coForm.description || undefined,
      },
    }, {
      onSuccess: () => {
        toast.success("Change order agregado"); invAll();
        setCreateCOOpen(false); setCOForm(emptyCOForm());
      },
      onError: () => toast.error("Error al crear change order"),
    });
  };

  const handleCancelVendor = () => {
    patchVendorMutation.mutate({ data: { status: "cancelled" } }, {
      onSuccess: () => { toast.success("Vendor cancelled"); invAll(); setCancelConfirmOpen(false); goBack(); },
      onError:   () => toast.error("Error al cancelar proveedor"),
    });
  };

  const openEdit = () => {
    if (!selectedVendor) return;
    setEditVendorForm({
      name:            selectedVendor.name           ?? "",
      type:            selectedVendor.type           ?? "",
      company:         selectedVendor.company        ?? "",
      specialty:       selectedVendor.specialty      ?? "",
      email:           selectedVendor.email          ?? "",
      phone:           selectedVendor.phone          ?? "",
      contract_amount: selectedVendor.contractAmount ? String(parseFloat(selectedVendor.contractAmount)) : "",
      contract_notes:  selectedVendor.contractNotes  ?? "",
    });
    setEditVendorOpen(true);
  };

  const hasHighAlerts = alerts.some(a => a.severity === "high");
  const hasAlerts     = alerts.length > 0;

  // ── VISTA LISTA ───────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Vendors
          </h3>
          <Button
            size="sm"
            className="bg-[#F97316] hover:bg-[#ea6c0a] text-white gap-1.5"
            onClick={() => { setVendorForm(emptyVendorForm()); setCreateVendorOpen(true); }}
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        </div>

        {hasAlerts && (
          <div className={`rounded-xl border p-4 ${hasHighAlerts ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
            <button
              onClick={() => setAlertsOpen(o => !o)}
              className="flex items-center justify-between w-full"
            >
              <span className={`font-semibold text-sm ${hasHighAlerts ? "text-red-700" : "text-orange-700"}`}>
                ⚠️ {alerts.length} alert{alerts.length !== 1 ? "s" : ""} require attention
              </span>
              {alertsOpen
                ? <ChevronUp className={`w-4 h-4 ${hasHighAlerts ? "text-red-500" : "text-orange-500"}`} />
                : <ChevronDown className={`w-4 h-4 ${hasHighAlerts ? "text-red-500" : "text-orange-500"}`} />}
            </button>
            {alertsOpen && (
              <div className="mt-3 space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{ALERT_ICON[a.type] ?? "⚪"}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{a.vendor_name}</p>
                        <p className="text-xs text-muted-foreground">{a.message}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-7 text-xs px-2"
                      onClick={() => openDetail(a.vendor_id)}
                    >
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vendorsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : vendors.length === 0 ? (
          <Card className="border-dashed border-2 shadow-none bg-transparent">
            <CardContent className="p-10 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No vendors in this project</p>
              <p className="text-sm mt-1">
                Agrega subcontratistas y proveedores para hacer seguimiento financiero.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {vendors.map(v => (
              <Card key={v.id} className="border border-border shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-foreground">{v.name}</span>
                        {v.company && <span className="text-sm text-muted-foreground">· {v.company}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_BADGE[v.type] ?? TYPE_BADGE.other}`}>
                          {TYPE_LABEL[v.type] ?? v.type}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${VENDOR_STATUS_BADGE[v.status] ?? VENDOR_STATUS_BADGE["active"]}`}>
                          {VENDOR_STATUS_LABEL[v.status] ?? v.status}
                        </span>
                        {v.specialty && (
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-600">
                            {v.specialty}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                          Contrato: {v.contractAmount ? fmt(v.contractAmount) : "—"}
                        </span>
                        <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-1">
                          Pagado: {fmt(v.payments_made)}
                        </span>
                        <span className={`text-xs rounded-full px-2.5 py-1 border ${
                          v.balance_pending > 0
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        }`}>
                          Pendiente: {fmt(v.balance_pending)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {v.linkedUserId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => setLocation(`/sub/${v.linkedUserId}`)}
                        >
                          View profile
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => openDetail(v.id)}
                      >
                        View details →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createVendorOpen} onOpenChange={v => {
          if (!v) { setVendorForm(emptyVendorForm()); setSubSearch(""); setSubResults([]); setSubSearchOpen(false); }
          setCreateVendorOpen(v);
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display font-bold text-xl">Add Vendor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateVendor} className="space-y-4 mt-2">
              {frequentVendors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Usados anteriormente
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {frequentVendors.slice(0, 6).map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-slate-50 hover:bg-primary hover:text-white hover:border-primary transition-colors"
                        onClick={() => setVendorForm(f => ({
                          ...f,
                          name:           v.name,
                          type:           v.type,
                          company:        v.company ?? "",
                          specialty:      v.specialty ?? "",
                          email:          v.email ?? "",
                          phone:          v.phone ?? "",
                          contract_notes: v.contract_notes ?? "",
                          linked_user_id: v.linked_user_id ?? undefined,
                        }))}
                      >
                        {v.name}{v.specialty ? ` · ${v.specialty}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Nombre *</Label>
                  <div className="relative">
                    <Input
                      value={vendorForm.name}
                      onChange={e => {
                        setVendorForm(f => ({ ...f, name: e.target.value }));
                        setAutoCompleteOpen(true);
                      }}
                      onBlur={() => setTimeout(() => setAutoCompleteOpen(false), 150)}
                      placeholder="e.g. John Smith"
                    />
                    {autoCompleteOpen && vendorForm.name.length > 0 &&
                      frequentVendors.filter(v => v.name.toLowerCase().includes(vendorForm.name.toLowerCase())).length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 border border-border rounded-lg overflow-hidden bg-white shadow-md">
                        {frequentVendors
                          .filter(v => v.name.toLowerCase().includes(vendorForm.name.toLowerCase()))
                          .slice(0, 4)
                          .map((v, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => {
                                setVendorForm(f => ({
                                  ...f,
                                  name:           v.name,
                                  type:           v.type,
                                  company:        v.company ?? "",
                                  specialty:      v.specialty ?? "",
                                  email:          v.email ?? "",
                                  phone:          v.phone ?? "",
                                  contract_notes: v.contract_notes ?? "",
                                  linked_user_id: v.linked_user_id ?? undefined,
                                }));
                                setAutoCompleteOpen(false);
                              }}
                            >
                              <span className="text-sm font-medium">{v.name}</span>
                              {v.specialty && <span className="text-xs text-muted-foreground">{v.specialty}</span>}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={vendorForm.type} onChange={e => setVendorForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="">Select…</option>
                    <option value="subcontractor">Subcontractor</option>
                    <option value="supplier">Supplier</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input value={vendorForm.company} onChange={e => setVendorForm(f => ({ ...f, company: e.target.value }))} placeholder="Nombre de empresa" />
                </div>
                {vendorForm.type === "subcontractor" && (
                  <div className="space-y-2 col-span-2">
                    <Label>Buscar en red de Slably (opcional)</Label>
                    <div className="relative">
                      <Input
                        placeholder="Search by city or name (min. 3 characters)..."
                        value={subSearch}
                        onChange={e => setSubSearch(e.target.value)}
                      />
                      {subSearchLoading && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                    </div>
                    {subSearchOpen && subResults.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden bg-white shadow-md">
                        {subResults.slice(0, 5).map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                            onClick={() => {
                              setVendorForm(f => ({
                                ...f,
                                name:           sub.name,
                                specialty:      sub.category ?? f.specialty,
                                linked_user_id: sub.id,
                              }));
                              setSubSearch(sub.name);
                              setSubSearchOpen(false);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-bold">
                                {sub.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{sub.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {sub.category ?? ""}{sub.serviceCity ? ` · ${sub.serviceCity}` : ""}
                                {sub.stats?.averageRating > 0 ? ` · ★ ${sub.stats.averageRating.toFixed(1)}` : ""}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {subSearchOpen && subResults.length === 0 && !subSearchLoading && (
                      <p className="text-xs text-muted-foreground px-1">
                        No encontramos subs con ese filtro en Slably.
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2 col-span-2">
                  <Label>Especialidad</Label>
                  <Input value={vendorForm.specialty} onChange={e => setVendorForm(f => ({ ...f, specialty: e.target.value }))} placeholder="e.g. Plumbing, Electrical" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={vendorForm.email} onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))} placeholder="email@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={vendorForm.phone} onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Monto del contrato</Label>
                  <Input type="number" min="0" step="0.01" value={vendorForm.contract_amount} onChange={e => setVendorForm(f => ({ ...f, contract_amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Notas del contrato</Label>
                  <Textarea value={vendorForm.contract_notes} onChange={e => setVendorForm(f => ({ ...f, contract_notes: e.target.value }))} rows={2} placeholder="Condiciones, términos, etc." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateVendorOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createVendorMutation.isPending} className="bg-[#F97316] hover:bg-[#ea6c0a] text-white">
                  {createVendorMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── VISTA DETALLE ─────────────────────────────────────────────────────────────
  if (!selectedVendor) {
    return (
      <div className="space-y-4 py-2">
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const balancePending = selectedVendor.balance_pending;

  return (
    <div className="space-y-5 py-2">
      <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-lg text-foreground">{selectedVendor.name}</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${VENDOR_STATUS_BADGE[selectedVendor.status] ?? VENDOR_STATUS_BADGE["active"]}`}>
            {VENDOR_STATUS_LABEL[selectedVendor.status] ?? selectedVendor.status}
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={openEdit}>Edit</Button>
          {selectedVendor.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setCancelConfirmOpen(true)}
            >
              Cancel vendor
            </Button>
          )}
        </div>
      </div>

      {/* Ledger card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Contrato original:</span>
          <span className="font-semibold">{selectedVendor.contractAmount ? fmt(selectedVendor.contractAmount) : "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">+ Change Orders:</span>
          <span className="font-semibold">
            {selectedVendor.change_orders_total >= 0 ? "+" : ""}{fmt(selectedVendor.change_orders_total)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">= Contrato ajustado:</span>
          <span className="font-semibold">
            {ledger
              ? fmt(ledger.adjusted_contract)
              : fmt((selectedVendor.contractAmount ? parseFloat(selectedVendor.contractAmount) : 0) + selectedVendor.change_orders_total)}
          </span>
        </div>
        <div className="border-t border-blue-200 my-1" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Pagado:</span>
          <span className="font-semibold text-emerald-700">({fmt(selectedVendor.payments_made)})</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Balance pendiente:</span>
          <span className={balancePending > 0 ? "text-red-600" : "text-emerald-600"}>
            {fmt(balancePending)}
          </span>
        </div>
      </div>

      {/* Performance */}
      {selectedVendor.contractAmount && parseFloat(selectedVendor.contractAmount) > 0 && (
        <Card className="border border-border shadow-sm bg-white">
          <CardContent className="p-5 space-y-5">
            <h4 className="font-semibold text-foreground">Performance</h4>

            {!ledger ? (
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4 mt-4" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
              </div>
            ) : (() => {
              const origAmt   = parseFloat(selectedVendor.contractAmount!);
              const adjAmt    = ledger.adjusted_contract;
              const paidAmt   = ledger.payments_made;
              const variacion = adjAmt - origAmt;
              const varPct    = origAmt > 0 ? variacion / origAmt : 0;
              const barBudget = Math.min((adjAmt / origAmt) * 100, 100);
              const barPaid   = adjAmt > 0 ? Math.min((paidAmt / adjAmt) * 100, 100) : 0;
              const fullyPaid = paidAmt >= adjAmt && adjAmt > 0;

              const budgetColor =
                variacion === 0 ? "bg-emerald-500"
                : varPct <= 0.10 ? "bg-amber-400"
                : "bg-red-500";

              const budgetBadge =
                variacion === 0
                  ? <span className="text-xs font-semibold text-emerald-700">✓ Dentro del presupuesto</span>
                  : varPct <= 0.10
                  ? <span className="text-xs font-semibold text-amber-600">⚠️ +{(varPct * 100).toFixed(1)}% sobre presupuesto</span>
                  : <span className="text-xs font-semibold text-red-600">⚠️ +{(varPct * 100).toFixed(1)}% sobre presupuesto</span>;

              return (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Presupuesto</span>
                      {budgetBadge}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all ${budgetColor}`}
                        style={{ width: `${barBudget}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contrato original: {fmt(origAmt)} → Ajustado: {fmt(adjAmt)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Pagos realizados</span>
                      {fullyPaid && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                          ✓ Pagado en su totalidad
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${barPaid}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {paidAmt === 0
                        ? "Sin pagos realizados"
                        : `${barPaid.toFixed(1)}% del contrato pagado`}
                    </p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Pagos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Pagos</h4>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => { setPaymentForm(emptyPaymentForm()); setCreatePaymentOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Agregar Pago
          </Button>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <Card key={p.id} className="border border-border shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground">{p.description}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PAYMENT_STATUS_BADGE[p.status] ?? PAYMENT_STATUS_BADGE["pending"]}`}>
                          {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </div>
                      <p className="text-base font-bold text-foreground">{fmt(p.amount)}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {p.paymentMethod && (
                          <span className="text-xs text-muted-foreground capitalize">{p.paymentMethod}</span>
                        )}
                        {p.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Vence: {format(new Date(p.dueDate + "T00:00:00"), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    {(p.status === "pending" || p.status === "overdue") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => markPaymentPaid(p.id)}
                      >
                        Marcar pagado
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Change Orders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Change Orders</h4>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => { setCOForm(emptyCOForm()); setCreateCOOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> CO
          </Button>
        </div>
        {cos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Sin change orders</p>
        ) : (
          <div className="space-y-2">
            {cos.map(co => {
              const amount = parseFloat(co.amount);
              return (
                <Card key={co.id} className="border border-border shadow-sm bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">#{co.number}</span>
                          <span className="font-semibold text-sm text-foreground">{co.title}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CO_STATUS_BADGE[co.status] ?? CO_STATUS_BADGE["pending"]}`}>
                            {CO_STATUS_LABEL[co.status] ?? co.status}
                          </span>
                        </div>
                        <p className={`text-base font-bold ${amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {amount >= 0 ? "+" : ""}{fmt(amount)}
                        </p>
                        {co.description && (
                          <p className="text-xs text-muted-foreground mt-1">{co.description}</p>
                        )}
                      </div>
                      {co.status === "pending" && (
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => approveRejectCO(co.id, "approved")}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => approveRejectCO(co.id, "rejected")}
                          >
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Información */}
      <Card className="border border-border shadow-sm bg-white">
        <CardContent className="p-5 space-y-4">
          <h4 className="font-semibold text-foreground">Información</h4>
          <div className="grid grid-cols-2 gap-4">
            {selectedVendor.email && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
                <p className="text-sm font-medium">{selectedVendor.email}</p>
              </div>
            )}
            {selectedVendor.phone && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Phone</p>
                <p className="text-sm font-medium">{selectedVendor.phone}</p>
              </div>
            )}
            {selectedVendor.specialty && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Especialidad</p>
                <p className="text-sm font-medium">{selectedVendor.specialty}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Tipo</p>
              <p className="text-sm font-medium">{TYPE_LABEL[selectedVendor.type] ?? selectedVendor.type}</p>
            </div>
          </div>
          {selectedVendor.contractNotes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notas del contrato</p>
              <p className="text-sm text-foreground whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
                {selectedVendor.contractNotes}
              </p>
            </div>
          )}
          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Documentos</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-10">W-9:</span>
                {selectedVendor.w9Url
                  ? <a href={selectedVendor.w9Url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View document
                    </a>
                  : <span className="text-muted-foreground italic">Not uploaded</span>}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-10">COI:</span>
                {selectedVendor.coiUrl
                  ? <span className="flex items-center gap-2 flex-wrap">
                      <a href={selectedVendor.coiUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> View document
                      </a>
                      {selectedVendor.coiExpiresAt && (
                        <span className="text-xs text-muted-foreground">· Vence {selectedVendor.coiExpiresAt}</span>
                      )}
                      {isCoiExpiringSoon(selectedVendor.coiExpiresAt) && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">
                          ⚠️ Por vencer
                        </span>
                      )}
                    </span>
                  : <span className="text-muted-foreground italic">No cargado</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline financiero */}
      {ledger && ledger.transactions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Timeline financiero</h4>
          <div className="space-y-2">
            {ledger.transactions.map((tx, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white border border-border rounded-xl">
                <span className="text-lg shrink-0">{TIMELINE_ICON[tx.type] ?? "·"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${tx.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {tx.amount >= 0 ? "+" : ""}{fmt(Math.abs(tx.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">Balance: {fmt(tx.running_balance)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear pago */}
      <Dialog open={createPaymentOpen} onOpenChange={v => { if (!v) setPaymentForm(emptyPaymentForm()); setCreatePaymentOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl">Agregar Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePayment} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Description *</Label>
                <Input value={paymentForm.description} onChange={e => setPaymentForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej. Anticipo Fase 1" />
              </div>
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de pago *</Label>
                <Select value={paymentForm.payment_type} onChange={e => setPaymentForm(f => ({ ...f, payment_type: e.target.value }))}>
                  <option value="">Seleccionar…</option>
                  <option value="draw">Draw</option>
                  <option value="deposit">Deposit</option>
                  <option value="final">Final</option>
                  <option value="other">Otro</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={paymentForm.status} onChange={e => setPaymentForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={paymentForm.due_date} onChange={e => setPaymentForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Payment method</Label>
                <Select value={paymentForm.payment_method} onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="">Ninguno</option>
                  <option value="check">Check</option>
                  <option value="zelle">Zelle</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notas</Label>
                <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notas adicionales…" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreatePaymentOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPaymentMutation.isPending} className="bg-[#F97316] hover:bg-[#ea6c0a] text-white">
                {createPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal crear CO */}
      <Dialog open={createCOOpen} onOpenChange={v => { if (!v) setCOForm(emptyCOForm()); setCreateCOOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl">Agregar Change Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCO} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={coForm.title} onChange={e => setCOForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Additional kitchen work" />
            </div>
            <div className="space-y-2">
              <Label>Amount * (negative = credit)</Label>
              <Input type="number" step="0.01" value={coForm.amount} onChange={e => setCOForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={coForm.description} onChange={e => setCOForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Change details…" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateCOOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCOMutation.isPending} className="bg-[#F97316] hover:bg-[#ea6c0a] text-white">
                {createCOMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal editar vendor */}
      <Dialog open={editVendorOpen} onOpenChange={setEditVendorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl">Edit Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditVendor} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Nombre *</Label>
                <Input value={editVendorForm.name} onChange={e => setEditVendorForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={editVendorForm.type} onChange={e => setEditVendorForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="">Select…</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="supplier">Supplier</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={editVendorForm.company} onChange={e => setEditVendorForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Especialidad</Label>
                <Input value={editVendorForm.specialty} onChange={e => setEditVendorForm(f => ({ ...f, specialty: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editVendorForm.email} onChange={e => setEditVendorForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editVendorForm.phone} onChange={e => setEditVendorForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Monto del contrato</Label>
                <Input type="number" min="0" step="0.01" value={editVendorForm.contract_amount} onChange={e => setEditVendorForm(f => ({ ...f, contract_amount: e.target.value }))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notas del contrato</Label>
                <Textarea value={editVendorForm.contract_notes} onChange={e => setEditVendorForm(f => ({ ...f, contract_notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditVendorOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={patchVendorMutation.isPending}>
                {patchVendorMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm cancelar vendor */}
      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg text-destructive">Cancel vendor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cancel <span className="font-semibold text-foreground">{selectedVendor.name}</span>?
            The record will be kept but marked as cancelled.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCancelConfirmOpen(false)}>Keep</Button>
            <Button variant="destructive" onClick={handleCancelVendor} disabled={patchVendorMutation.isPending}>
              {patchVendorMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Yes, cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
