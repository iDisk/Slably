import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, ExternalLink, Trash2, Loader2, FileCheck, FileClock, FileText, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useListContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  getListContractsQueryKey,
  type Contract,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";

const CONTRACT_STATUS = {
  draft:  { label: "Draft",  color: "bg-slate-100 text-slate-700 border-slate-200",        icon: FileClock },
  sent:   { label: "Sent",   color: "bg-blue-100 text-blue-700 border-blue-200",           icon: FileText },
  signed: { label: "Signed", color: "bg-emerald-100 text-emerald-700 border-emerald-200",  icon: FileCheck },
} as const;

const contractSchema = z.object({
  title:   z.string().min(1, "Title is required"),
  fileUrl: z.string().url("Enter a valid URL (https://...)").optional().or(z.literal("")),
  version: z.string().optional(),
  status:  z.enum(["draft", "sent", "signed"]),
});
type ContractForm = z.infer<typeof contractSchema>;

function ContractDialog({
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
  onSubmit: (data: ContractForm) => void;
  isPending: boolean;
  defaultValues: Partial<ContractForm>;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    values: defaultValues as ContractForm,
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
            <Input {...register("title")} placeholder="e.g. Construction Agreement v1" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Version</Label>
              <Input {...register("version")} placeholder="1.0" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select {...register("status")}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="signed">Signed</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>PDF URL</Label>
            <Input {...register("fileUrl")} type="url" placeholder="https://..." />
            {errors.fileUrl && <p className="text-xs text-destructive">{errors.fileUrl.message}</p>}
            <p className="text-xs text-muted-foreground">
              Paste a link to the PDF (Google Drive, Dropbox, S3, etc.)
            </p>
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

export function ContractsTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data: contracts = [], isLoading } = useListContracts(projectId);
  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract();
  const deleteMutation = useDeleteContract();

  const [createOpen,    setCreateOpen]    = useState(false);
  const [editItem,      setEditItem]      = useState<Contract | null>(null);
  const [signingId,     setSigningId]     = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Contract | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(projectId) });

  const onCreate = (data: ContractForm) => {
    createMutation.mutate(
      {
        projectId,
        data: {
          title:   data.title,
          fileUrl: data.fileUrl || null,
          version: data.version || null,
          status:  data.status,
        },
      },
      {
        onSuccess: () => { toast.success("Contract added"); invalidate(); setCreateOpen(false); },
        onError:   () => toast.error("Failed to add contract"),
      }
    );
  };

  const onEdit = (data: ContractForm) => {
    if (!editItem) return;
    updateMutation.mutate(
      {
        projectId,
        id: editItem.id,
        data: {
          title:   data.title,
          fileUrl: data.fileUrl || null,
          version: data.version || null,
          status:  data.status,
        },
      },
      {
        onSuccess: () => { toast.success("Contract updated"); invalidate(); setEditItem(null); },
        onError:   () => toast.error("Failed to update contract"),
      }
    );
  };

  const markSigned = (id: number) => {
    setSigningId(id);
    updateMutation.mutate(
      { projectId, id, data: { status: "signed" } },
      {
        onSuccess: () => { toast.success("Contract marked as signed"); invalidate(); setSigningId(null); },
        onError:   () => { toast.error("Failed to update contract");   setSigningId(null); },
      }
    );
  };

  const onDeleteConfirmed = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(
      { projectId, id: confirmDelete.id },
      {
        onSuccess: () => { toast.success("Contract deleted"); invalidate(); setConfirmDelete(null); },
        onError:   () => { toast.error("Failed to delete"); setConfirmDelete(null); },
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
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {contracts.length} {contracts.length === 1 ? "Contract" : "Contracts"}
        </h3>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Add Contract
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none bg-transparent">
          <CardContent className="p-10 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No contracts yet</p>
            <p className="text-sm mt-1">Add the first contract to this project.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => {
            const cfg  = CONTRACT_STATUS[c.status as keyof typeof CONTRACT_STATUS] ?? CONTRACT_STATUS.draft;
            const Icon = cfg.icon;
            return (
              <Card key={c.id} className="border-none shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 p-2 rounded-lg ${
                      c.status === "signed" ? "bg-emerald-50" :
                      c.status === "sent"   ? "bg-blue-50"    : "bg-slate-50"
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        c.status === "signed" ? "text-emerald-600" :
                        c.status === "sent"   ? "text-blue-600"    : "text-slate-500"
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{c.title}</span>
                        {c.version && (
                          <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                            v{c.version}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Added {format(new Date(c.uploadedAt), "MMM d, yyyy")}
                      </p>
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="w-3 h-3" /> View PDF
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {c.status !== "signed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                          onClick={() => markSigned(c.id)}
                          disabled={signingId === c.id}
                        >
                          {signingId === c.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileCheck className="w-3.5 h-3.5" />}
                          Sign
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => setEditItem(c)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmDelete(c)}
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

      <ContractDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Contract"
        onSubmit={onCreate}
        isPending={createMutation.isPending}
        defaultValues={{ status: "draft" }}
      />

      <ContractDialog
        open={!!editItem}
        onOpenChange={v => !v && setEditItem(null)}
        title="Edit Contract"
        onSubmit={onEdit}
        isPending={updateMutation.isPending}
        defaultValues={
          editItem
            ? {
                title:   editItem.title,
                version: editItem.version ?? "",
                fileUrl: editItem.fileUrl ?? "",
                status:  editItem.status as ContractForm["status"],
              }
            : { status: "draft" }
        }
      />

      <Dialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Contract
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
