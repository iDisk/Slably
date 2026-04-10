import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
import {
  useGetInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice,
  getInvoicesQueryKey, useGetVendors, useGetProject,
  type Invoice,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

type View = "list" | "create" | "detail";
interface LineItem { description: string; quantity: number; unit_price: number }

const STATUS: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",      className: "bg-gray-100 text-gray-600 border-gray-200" },
  sent:      { label: "Sent",       className: "bg-blue-100 text-blue-700 border-blue-200" },
  paid:      { label: "Paid ✓",     className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  overdue:   { label: "Overdue",    className: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled",  className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const fmt = (n: string | number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

export function InvoicesTab({ projectId }: { projectId: number }) {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const canCreate   = user?.role === "builder" || user?.role === "subcontractor";

  const [view,            setView]            = useState<View>("list");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [recipientId, setRecipientId] = useState<number | "">("");
  const [title,       setTitle]       = useState("");
  const [dueDate,     setDueDate]     = useState("");
  const [notes,       setNotes]       = useState("");
  const [lineItems,   setLineItems]   = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  const { data: invoices = [], isLoading } = useGetInvoices(projectId);
  const { data: vendors  = [] }            = useGetVendors(projectId);
  const { data: project }                  = useGetProject(projectId);

  const billingTargets: { id: number; name: string }[] = [
    ...vendors.filter(v => v.linkedUserId != null).map(v => ({ id: v.linkedUserId!, name: v.name })),
    ...(project?.clientId ? [{ id: project.clientId, name: project.clientName }] : []),
  ];

  const iid = selectedInvoice?.id ?? 0;

  const createMutation = useCreateInvoice(projectId, {
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getInvoicesQueryKey(projectId) });
        resetForm();
        setView("list");
        toast.success("Invoice created");
      },
      onError: () => toast.error("Failed to create invoice"),
    },
  });

  const updateMutation = useUpdateInvoice(projectId, iid, {
    mutation: {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: getInvoicesQueryKey(projectId) });
        setSelectedInvoice(updated);
        toast.success("Invoice updated");
      },
      onError: () => toast.error("Failed to update invoice"),
    },
  });

  const deleteMutation = useDeleteInvoice(projectId, iid, {
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getInvoicesQueryKey(projectId) });
        setSelectedInvoice(null);
        setView("list");
        toast.success("Invoice deleted");
      },
      onError: () => toast.error("Failed to delete invoice"),
    },
  });

  const lineTotal = lineItems.reduce((s, it) => s + it.quantity * it.unit_price, 0);

  function resetForm() {
    setRecipientId(""); setTitle(""); setDueDate(""); setNotes("");
    setLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function handleCreate() {
    if (!recipientId || !title || lineItems.some(it => !it.description)) {
      toast.error("Please fill in all required fields"); return;
    }
    createMutation.mutate({
      data: {
        recipient_id: recipientId as number,
        title,
        notes:    notes    || undefined,
        due_date: dueDate  || undefined,
        items: lineItems.map(it => ({
          description: it.description,
          quantity:    it.quantity,
          unit_price:  it.unit_price,
        })),
      },
    });
  }

  // ── LIST ─────────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Invoices</h2>
        {canCreate && (
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1"
            onClick={() => { resetForm(); setView("create"); }}>
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : invoices.length === 0 ? (
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const isSender  = inv.senderId === user?.id;
            const statusCfg = STATUS[inv.status] ?? STATUS.draft;
            return (
              <Card key={inv.id}
                className="border-none shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedInvoice(inv); setView("detail"); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{inv.invoiceNumber}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{inv.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.senderName} → {inv.recipientName}
                      </p>
                      {inv.dueDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">Due: {inv.dueDate}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">{fmt(inv.total)}</p>
                      <div className="flex gap-1 mt-2 justify-end" onClick={e => e.stopPropagation()}>
                        {isSender && inv.status === "draft" && (
                          <>
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs border-blue-300 text-blue-700"
                              onClick={() => { setSelectedInvoice(inv); updateMutation.mutate({ data: { status: "sent" } }); }}>
                              Send
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs border-red-300 text-red-600"
                              onClick={() => { setSelectedInvoice(inv); deleteMutation.mutate(); }}>
                              Delete
                            </Button>
                          </>
                        )}
                        {isSender && inv.status === "sent" && (
                          <Button size="sm" variant="outline"
                            className="h-7 text-xs border-emerald-300 text-emerald-700"
                            onClick={() => { setSelectedInvoice(inv); updateMutation.mutate({ data: { status: "paid" } }); }}>
                            Mark as Paid
                          </Button>
                        )}
                        {!isSender && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { setSelectedInvoice(inv); setView("detail"); }}>
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── CREATE ───────────────────────────────────────────────────────────────────
  if (view === "create") return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground"
          onClick={() => setView("list")}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h2 className="text-base font-semibold">New Invoice</h2>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-6 space-y-5">

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bill to *</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={recipientId}
              onChange={e => setRecipientId(Number(e.target.value))}>
              <option value="">Select recipient…</option>
              {billingTargets.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</Label>
            <Input placeholder="e.g. Plumbing work — Phase 1"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</Label>
            <Textarea placeholder="Optional notes…"
              value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Line Items</Label>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-1/2">Description</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-16">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((it, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-2 py-1.5">
                        <Input className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-1"
                          placeholder="Description"
                          value={it.description}
                          onChange={e => updateLineItem(idx, "description", e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 text-right px-1"
                          type="number" min="0.01" step="0.01"
                          value={it.quantity}
                          onChange={e => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 text-right px-1"
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={it.unit_price || ""}
                          onChange={e => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-3 py-1.5 text-right text-sm font-medium">
                        {fmt(it.quantity * it.unit_price)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {lineItems.length > 1 && (
                          <button className="text-muted-foreground hover:text-red-500 transition-colors"
                            onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/20 border-t border-border">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold">TOTAL</td>
                    <td className="px-3 py-2 text-right text-base font-bold text-foreground">{fmt(lineTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Button variant="outline" size="sm" className="gap-1 w-full border-dashed"
              onClick={() => setLineItems(prev => [...prev, { description: "", quantity: 1, unit_price: 0 }])}>
              <Plus className="w-3.5 h-3.5" /> Add Item
            </Button>
          </div>

          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleCreate}
            disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create Invoice"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ── DETAIL ───────────────────────────────────────────────────────────────────
  if (view === "detail" && selectedInvoice) {
    const inv       = selectedInvoice;
    const isSender  = inv.senderId === user?.id;
    const statusCfg = STATUS[inv.status] ?? STATUS.draft;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground"
            onClick={() => { setSelectedInvoice(null); setView("list"); }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6 space-y-6">

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold text-[#1B3A5C]">SLAB</span>
                  <span className="text-xl font-bold text-orange-500">LY</span>
                </div>
                <p className="text-xs text-muted-foreground">Construction Management</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{inv.invoiceNumber}</p>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">From</p>
                <p className="text-sm font-semibold">{inv.senderName}</p>
                <p className="text-xs text-muted-foreground">{inv.senderEmail}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">To</p>
                <p className="text-sm font-semibold">{inv.recipientName}</p>
                <p className="text-xs text-muted-foreground">{inv.recipientEmail}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invoice #</p>
                <p className="text-sm font-mono font-medium">{inv.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm font-medium">
                  {new Date(inv.createdAt).toLocaleDateString("en-US")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                <p className="text-sm font-medium">{inv.dueDate ?? "—"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#1B3A5C] text-white">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">Description</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">Unit Price</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                      <td className="px-4 py-2.5">{item.description}</td>
                      <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right">{fmt(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/20 border-t-2 border-border">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold">TOTAL</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-foreground">
                      {fmt(inv.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {inv.notes && (
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-foreground">{inv.notes}</p>
              </div>
            )}

            {isSender && (
              <div className="flex gap-3 pt-2">
                {inv.status === "draft" && (
                  <>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ data: { status: "sent" } })}>
                      Send Invoice
                    </Button>
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate()}>
                      Delete
                    </Button>
                  </>
                )}
                {inv.status === "sent" && (
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ data: { status: "paid" } })}>
                    Mark as Paid
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
