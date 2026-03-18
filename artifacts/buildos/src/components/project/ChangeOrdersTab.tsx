import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Loader2,
  DollarSign, CheckCircle2, Clock, XCircle, AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useListChangeOrders,
  useCreateChangeOrder,
  useUpdateChangeOrder,
  useDeleteChangeOrder,
  getListChangeOrdersQueryKey,
  type ChangeOrder,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const CO_STATUS = {
  draft:    { label: "Draft",    color: "bg-slate-100 text-slate-700 border-slate-200",       icon: Clock },
  pending:  { label: "Pending",  color: "bg-amber-100 text-amber-700 border-amber-200",       icon: AlertCircle },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200",             icon: XCircle },
} as const;

const coSchema = z.object({
  title:       z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount:      z.coerce.number().min(0, "Must be 0 or greater"),
  status:      z.enum(["draft", "pending", "approved", "rejected"]),
});
type CoForm = z.infer<typeof coSchema>;

function CoDialog({
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
  onSubmit: (data: CoForm) => void;
  isPending: boolean;
  defaultValues: Partial<CoForm>;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CoForm>({
    resolver: zodResolver(coSchema),
    values: defaultValues as CoForm,
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input {...register("title")} placeholder="e.g. Additional foundation work" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (USD) *</Label>
              <Input {...register("amount")} type="number" min="0" step="0.01" placeholder="0.00" />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select {...register("status")}>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description")} placeholder="Describe the scope change..." rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
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

export function ChangeOrdersTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useListChangeOrders(projectId);
  const createMutation = useCreateChangeOrder();
  const updateMutation = useUpdateChangeOrder();
  const deleteMutation = useDeleteChangeOrder();

  const [createOpen,    setCreateOpen]    = useState(false);
  const [editItem,      setEditItem]      = useState<ChangeOrder | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChangeOrder | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListChangeOrdersQueryKey(projectId) });

  const onCreate = (data: CoForm) => {
    createMutation.mutate(
      {
        projectId,
        data: {
          title:       data.title,
          description: data.description || null,
          amount:      data.amount,
          status:      data.status,
        },
      },
      {
        onSuccess: () => { toast.success("Change order created"); invalidate(); setCreateOpen(false); },
        onError:   () => toast.error("Failed to create change order"),
      }
    );
  };

  const onEdit = (data: CoForm) => {
    if (!editItem) return;
    updateMutation.mutate(
      {
        projectId,
        id: editItem.id,
        data: {
          title:       data.title,
          description: data.description || null,
          amount:      data.amount,
          status:      data.status,
        },
      },
      {
        onSuccess: () => { toast.success("Change order updated"); invalidate(); setEditItem(null); },
        onError:   () => toast.error("Failed to update change order"),
      }
    );
  };

  const onDeleteConfirmed = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(
      { projectId, id: confirmDelete.id },
      {
        onSuccess: () => { toast.success("Deleted"); invalidate(); setConfirmDelete(null); },
        onError:   () => { toast.error("Failed to delete"); setConfirmDelete(null); },
      }
    );
  };

  const totalApproved = orders
    .filter(o => o.status === "approved")
    .reduce((sum, o) => sum + o.amount, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {orders.length} {orders.length === 1 ? "Change Order" : "Change Orders"}
          </h3>
          {totalApproved > 0 && (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              ${totalApproved.toLocaleString("en-US", { minimumFractionDigits: 2 })} approved
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> New Change Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none bg-transparent">
          <CardContent className="p-10 text-center text-muted-foreground">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No change orders yet</p>
            <p className="text-sm mt-1">Track scope changes and extra costs here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const cfg  = CO_STATUS[o.status as keyof typeof CO_STATUS] ?? CO_STATUS.draft;
            const Icon = cfg.icon;
            return (
              <Card key={o.id} className="border-none shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 p-2 rounded-lg ${
                      o.status === "approved" ? "bg-emerald-50" :
                      o.status === "pending"  ? "bg-amber-50"   :
                      o.status === "rejected" ? "bg-red-50"     : "bg-slate-50"
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        o.status === "approved" ? "text-emerald-600" :
                        o.status === "pending"  ? "text-amber-600"   :
                        o.status === "rejected" ? "text-red-500"     : "text-slate-500"
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{o.title}</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </div>
                      {o.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{o.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="text-base font-bold text-foreground">
                          ${o.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Created {format(new Date(o.createdAt), "MMM d, yyyy")}
                        </span>
                        {o.approvedAt && (
                          <span className="text-xs text-emerald-600 font-medium">
                            Approved {format(new Date(o.approvedAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => setEditItem(o)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmDelete(o)}
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

      <CoDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Change Order"
        onSubmit={onCreate}
        isPending={createMutation.isPending}
        defaultValues={{ status: "draft", amount: 0 }}
      />

      <CoDialog
        open={!!editItem}
        onOpenChange={v => !v && setEditItem(null)}
        title="Edit Change Order"
        onSubmit={onEdit}
        isPending={updateMutation.isPending}
        defaultValues={
          editItem
            ? {
                title:       editItem.title,
                description: editItem.description ?? "",
                amount:      editItem.amount,
                status:      editItem.status as CoForm["status"],
              }
            : { status: "draft", amount: 0 }
        }
      />

      <Dialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Change Order
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">"{confirmDelete?.title}"</span>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
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
