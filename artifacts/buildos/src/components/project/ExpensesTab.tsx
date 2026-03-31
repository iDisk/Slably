import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Loader2,
  Receipt, CheckCircle2, ExternalLink,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useListExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  getListExpensesQueryKey,
  type Expense,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const CATEGORY_CONFIG = {
  materials:  { label: "Materials",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  labor:      { label: "Labor",      color: "bg-purple-100 text-purple-700 border-purple-200" },
  equipment:  { label: "Equipment",  color: "bg-orange-100 text-orange-700 border-orange-200" },
  permits:    { label: "Permits",    color: "bg-amber-100 text-amber-700 border-amber-200" },
  other:      { label: "Other",      color: "bg-slate-100 text-slate-600 border-slate-200" },
} as const;

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", transfer: "Transfer", check: "Check",
};

const expenseSchema = z.object({
  amount:         z.coerce.number().min(0.01, "Amount must be greater than 0"),
  vendor:         z.string().min(1, "Vendor is required"),
  category:       z.enum(["materials", "labor", "equipment", "permits", "other"]),
  expense_date:   z.string().min(1, "Date is required"),
  description:    z.string().optional(),
  receipt_url:    z.string().url("Enter a valid URL").optional().or(z.literal("")),
  payment_method: z.enum(["cash", "card", "transfer", "check"]).optional().or(z.literal("")).transform(v => v || undefined),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

function fmt(amount: string | number) {
  return `$${parseFloat(String(amount)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function ExpenseDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  isPending,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onSubmit: (data: ExpenseForm) => void;
  isPending: boolean;
  defaultValues: Partial<ExpenseForm>;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    values: defaultValues as ExpenseForm,
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (USD) *</Label>
              <Input {...register("amount")} type="number" min="0.01" step="0.01" placeholder="0.00" />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input {...register("expense_date")} type="date" />
              {errors.expense_date && <p className="text-xs text-destructive">{errors.expense_date.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vendor *</Label>
            <Input {...register("vendor")} placeholder="e.g. Home Depot, ABC Contractors" />
            {errors.vendor && <p className="text-xs text-destructive">{errors.vendor.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select {...register("category")}>
                <option value="">Select…</option>
                <option value="materials">Materials</option>
                <option value="labor">Labor</option>
                <option value="equipment">Equipment</option>
                <option value="permits">Permits</option>
                <option value="other">Other</option>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select {...register("payment_method")}>
                <option value="">None</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
                <option value="check">Check</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description")} placeholder="Notes about this expense..." rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Receipt URL</Label>
            <Input {...register("receipt_url")} type="url" placeholder="https://..." />
            {errors.receipt_url && <p className="text-xs text-destructive">{errors.receipt_url.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpensesTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListExpenses(projectId);
  const expenses = data?.expenses ?? [];
  const total = data?.total ?? 0;

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [createOpen,    setCreateOpen]    = useState(false);
  const [editItem,      setEditItem]      = useState<Expense | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(projectId) });

  const onCreate = (data: ExpenseForm) => {
    createMutation.mutate(
      {
        projectId,
        data: {
          amount:         data.amount,
          vendor:         data.vendor,
          category:       data.category,
          expense_date:   data.expense_date,
          description:    data.description || undefined,
          receipt_url:    data.receipt_url || undefined,
          payment_method: data.payment_method || undefined,
        },
      },
      {
        onSuccess: () => { toast.success("Expense added"); invalidate(); setCreateOpen(false); },
        onError:   () => toast.error("Failed to add expense"),
      }
    );
  };

  const onEdit = (data: ExpenseForm) => {
    if (!editItem) return;
    updateMutation.mutate(
      {
        projectId,
        eid: editItem.id,
        data: {
          amount:         data.amount,
          vendor:         data.vendor,
          category:       data.category,
          expense_date:   data.expense_date,
          description:    data.description || undefined,
          receipt_url:    data.receipt_url || undefined,
          payment_method: data.payment_method || undefined,
        },
      },
      {
        onSuccess: () => { toast.success("Expense updated"); invalidate(); setEditItem(null); },
        onError:   () => toast.error("Failed to update expense"),
      }
    );
  };

  const onDeleteConfirmed = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(
      { projectId, eid: confirmDelete.id },
      {
        onSuccess: () => { toast.success("Expense deleted"); invalidate(); setConfirmDelete(null); },
        onError:   () => { toast.error("Failed to delete expense"); setConfirmDelete(null); },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {expenses.length} {expenses.length === 1 ? "Expense" : "Expenses"}
          </h3>
          {total > 0 && (
            <p className="text-lg font-bold text-foreground mt-0.5">
              Total: <span className="text-emerald-600">{fmt(total)}</span>
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {/* Empty state */}
      {expenses.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none bg-transparent">
          <CardContent className="p-10 text-center text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No expenses yet</p>
            <p className="text-sm mt-1">Track materials, labor, and other project costs here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {expenses.map(e => {
            const cat = CATEGORY_CONFIG[e.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.other;
            return (
              <Card key={e.id} className="border-none shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Receipt thumbnail or icon */}
                    <div className="shrink-0">
                      {e.receiptUrl ? (
                        <a
                          href={e.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-lg overflow-hidden border border-border flex items-center justify-center bg-slate-50 hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={e.receiptUrl}
                            alt="Receipt"
                            className="w-full h-full object-cover"
                            onError={ev => {
                              (ev.currentTarget as HTMLImageElement).style.display = "none";
                              (ev.currentTarget.nextSibling as HTMLElement).style.display = "flex";
                            }}
                          />
                          <span className="hidden items-center justify-center w-full h-full">
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </span>
                        </a>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-border flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xl font-bold text-foreground">{fmt(e.amount)}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cat.color}`}>
                          {cat.label}
                        </span>
                        {e.approved && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-foreground">{e.vendor}</p>

                      {e.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(e.expenseDate + "T00:00:00"), "MMM d, yyyy")}
                        </span>
                        {e.paymentMethod && (
                          <span className="text-xs text-muted-foreground">
                            · {PAYMENT_LABEL[e.paymentMethod] ?? e.paymentMethod}
                          </span>
                        )}
                        {e.receiptUrl && (
                          <a
                            href={e.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Receipt
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => setEditItem(e)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmDelete(e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <ExpenseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Expense"
        onSubmit={onCreate}
        isPending={createMutation.isPending}
        defaultValues={{ category: "materials", expense_date: new Date().toISOString().split("T")[0] }}
      />

      {/* Edit dialog */}
      <ExpenseDialog
        open={!!editItem}
        onOpenChange={v => !v && setEditItem(null)}
        title="Edit Expense"
        onSubmit={onEdit}
        isPending={updateMutation.isPending}
        defaultValues={
          (editItem
            ? {
                amount:         parseFloat(editItem.amount),
                vendor:         editItem.vendor,
                category:       editItem.category as ExpenseForm["category"],
                expense_date:   editItem.expenseDate,
                description:    editItem.description ?? "",
                receipt_url:    editItem.receiptUrl ?? "",
                payment_method: (editItem.paymentMethod as ExpenseForm["payment_method"]) ?? "",
              }
            : {}) as Partial<ExpenseForm>
        }
      />

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Expense
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete the{" "}
            <span className="font-semibold text-foreground">{fmt(confirmDelete?.amount ?? 0)}</span>
            {" "}expense from{" "}
            <span className="font-semibold text-foreground">{confirmDelete?.vendor}</span>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={onDeleteConfirmed}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
