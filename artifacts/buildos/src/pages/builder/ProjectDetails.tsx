import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, User, Mail, Calendar, FileText,
  Pencil, Trash2, Loader2, Building2, CheckCircle2,
  Clock, XCircle, AlertCircle, TrendingUp,
} from "lucide-react";

import {
  useGetProject,
  useUpdateProject,
  useDeleteProject,
  getListProjectsQueryKey,
  UpdateProjectBody,
} from "@workspace/api-client-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChangeOrdersTab } from "@/components/project/ChangeOrdersTab";
import { PhotosTab }       from "@/components/project/PhotosTab";
import { ActivityTab }     from "@/components/project/ActivityTab";
import { ExpensesTab }     from "@/components/project/ExpensesTab";
import { PhasesTab }       from "@/components/project/PhasesTab";
import { DocumentsTab }    from "@/components/project/DocumentsTab";
import { DailyLogTab }    from "@/components/project/DailyLogTab";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  planning:  { label: "Planning",  color: "bg-slate-100 text-slate-700 border-slate-200",       icon: Clock },
  active:    { label: "Active",    color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  on_hold:   { label: "On Hold",   color: "bg-amber-100 text-amber-700 border-amber-200",       icon: AlertCircle },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700 border-blue-200",          icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200",             icon: XCircle },
};

const editSchema = z.object({
  name:        z.string().min(1, "Project name is required"),
  clientName:  z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address:     z.string().min(1, "Address is required"),
  status:      z.enum(["planning", "active", "on_hold", "completed", "cancelled"]),
  startDate:   z.string().optional(),
  notes:       z.string().optional(),
  progress:    z.coerce.number().min(0).max(100),
});
type EditForm = z.infer<typeof editSchema>;

export default function ProjectDetails() {
  const [, params]  = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId   = parseInt(params?.id || "0");
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useGetProject(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  const openEdit = () => {
    if (!project) return;
    reset({
      name:        project.name,
      clientName:  project.clientName,
      clientEmail: project.clientEmail ?? "",
      address:     project.address,
      status:      project.status as EditForm["status"],
      startDate:   project.startDate ?? "",
      notes:       project.notes ?? "",
      progress:    project.progress,
    });
    setEditOpen(true);
  };

  const onSave = (data: EditForm) => {
    updateProject.mutate(
      { id: projectId, data: data as UpdateProjectBody },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast.success("Project updated");
          setEditOpen(false);
        },
        onError: () => toast.error("Failed to update project"),
      }
    );
  };

  const onDelete = () => {
    deleteProject.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast.success("Project deleted");
          setLocation("/dashboard");
        },
        onError: () => toast.error("Failed to delete project"),
      }
    );
  };

  if (isLoading) {
    return (
      <BuilderLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </BuilderLayout>
    );
  }

  if (!project) {
    return (
      <BuilderLayout>
        <div className="text-center py-20 text-muted-foreground">Project not found.</div>
      </BuilderLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.planning;
  const StatusIcon = statusCfg.icon;

  return (
    <BuilderLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl">

        {/* Back */}
        <button
          onClick={() => setLocation("/dashboard")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Header card */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary to-accent" />
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${statusCfg.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusCfg.label}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground leading-tight">
                  {project.name}
                </h1>
                <p className="mt-2 text-base text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {project.address}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={openEdit} className="gap-2">
                  <Pencil className="w-4 h-4" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" /> Project Progress
                </span>
                <span className="text-sm font-bold text-primary">{project.progress}%</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phases">Fases</TabsTrigger>
            <TabsTrigger value="daily-log">Daily Log</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Client Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                      <p className="text-sm font-semibold text-foreground">{project.clientName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {project.clientEmail ? (
                          <><Mail className="w-3.5 h-3.5 text-muted-foreground" />{project.clientEmail}</>
                        ) : (
                          <span className="text-muted-foreground italic">Not provided</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Project Info
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Start Date</p>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {project.startDate
                          ? format(new Date(project.startDate + "T00:00:00"), "MMMM d, yyyy")
                          : <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Created</p>
                      <p className="text-sm font-semibold text-foreground">
                        {format(new Date(project.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white md:col-span-2">
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Notes
                  </h2>
                  {project.notes ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">
                      {project.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No notes added yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fases */}
          <TabsContent value="phases">
            <div className="mt-2">
              <PhasesTab
                projectId={project.id}
                projectType={project.projectType ?? null}
              />
            </div>
          </TabsContent>

          {/* Daily Log */}
          <TabsContent value="daily-log">
            <div className="mt-2">
              <DailyLogTab projectId={project.id} />
            </div>
          </TabsContent>

          {/* Documentos */}
          <TabsContent value="documents">
            <div className="mt-2">
              <DocumentsTab
                projectId={project.id}
                project={project}
              />
            </div>
          </TabsContent>

          {/* Expenses */}
          <TabsContent value="expenses">
            <div className="mt-2">
              <ExpensesTab projectId={projectId} />
            </div>
          </TabsContent>

          {/* Change Orders */}
          <TabsContent value="change-orders">
            <div className="mt-2">
              <ChangeOrdersTab projectId={projectId} />
            </div>
          </TabsContent>

          {/* Photos */}
          <TabsContent value="photos">
            <div className="mt-2">
              <PhotosTab projectId={projectId} />
            </div>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            <div className="mt-2">
              <ActivityTab projectId={projectId} />
            </div>
          </TabsContent>
        </Tabs>

      </motion.div>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold">Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Name *</Label>
                <Input {...register("name")} placeholder="e.g. Casa Silva Residencia" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select {...register("status")}>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input {...register("clientName")} placeholder="Full name" />
                {errors.clientName && <p className="text-xs text-destructive">{errors.clientName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input {...register("clientEmail")} type="email" placeholder="client@example.com" />
                {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail.message}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address *</Label>
                <Input {...register("address")} placeholder="Full address" />
                {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input {...register("startDate")} type="date" />
              </div>
              <div className="space-y-2">
                <Label>Progress (%)</Label>
                <Input {...register("progress")} type="number" min={0} max={100} placeholder="0–100" />
                {errors.progress && <p className="text-xs text-destructive">{errors.progress.message}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea {...register("notes")} placeholder="Internal project notes..." rows={4} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{project.name}"</span>?
              This action cannot be undone. All project data will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={deleteProject.isPending}
                className="gap-2"
              >
                {deleteProject.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </BuilderLayout>
  );
}
