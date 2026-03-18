import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus, Briefcase, Clock, CheckCircle2, ChevronRight,
  Loader2, MapPin, User, Calendar, Trash2, MoreVertical
} from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListProjects, useCreateProject, useDeleteProject,
  getListProjectsQueryKey, CreateProjectBody
} from "@workspace/api-client-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const projectSchema = z.object({
  name:        z.string().min(1, "Project name is required"),
  clientName:  z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address:     z.string().min(1, "Address is required"),
  status:      z.enum(["planning", "active", "on_hold", "completed", "cancelled"]),
  startDate:   z.string().optional(),
  progress:    z.coerce.number().min(0).max(100).default(0),
  notes:       z.string().optional(),
});

export default function BuilderDashboard() {
  const { data: projects, isLoading } = useListProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateProjectBody>({
    resolver: zodResolver(projectSchema),
    defaultValues: { status: "planning", progress: 0 },
  });

  const onSubmit = (data: CreateProjectBody) => {
    createProject.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast.success("Project created successfully");
        setCreateOpen(false);
        reset();
      },
      onError: (err: any) => toast.error(err.message || "Failed to create project"),
    });
  };

  const confirmDelete = (id: number) => {
    deleteProject.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast.success("Project deleted");
        setDeleteId(null);
      },
      onError: () => toast.error("Failed to delete project"),
    });
  };

  const active    = projects?.filter(p => p.status === "active").length    ?? 0;
  const planning  = projects?.filter(p => p.status === "planning").length  ?? 0;
  const completed = projects?.filter(p => p.status === "completed").length ?? 0;

  return (
    <BuilderLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage all your construction projects in one place.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="w-4 h-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-display font-bold">Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
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
                    <Input {...register("clientName")} placeholder="Full client name" />
                    {errors.clientName && <p className="text-xs text-destructive">{errors.clientName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Client Email</Label>
                    <Input {...register("clientEmail")} type="email" placeholder="client@example.com" />
                    {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail.message}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address *</Label>
                    <Input {...register("address")} placeholder="Full project address" />
                    {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input {...register("startDate")} type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Progress (%)</Label>
                    <Input {...register("progress")} type="number" min={0} max={100} placeholder="0" />
                    {errors.progress && <p className="text-xs text-destructive">{errors.progress.message}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea {...register("notes")} placeholder="Internal project notes..." rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createProject.isPending}>
                    {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Project
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/75 text-sm font-medium">Active</p>
                <h3 className="text-4xl font-display font-bold mt-0.5">{active}</h3>
              </div>
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Planning</p>
                <h3 className="text-4xl font-display font-bold mt-0.5 text-foreground">{planning}</h3>
              </div>
              <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Completed</p>
                <h3 className="text-4xl font-display font-bold mt-0.5 text-foreground">{completed}</h3>
              </div>
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects grid */}
        <div>
          <h2 className="text-xl font-display font-bold text-foreground mb-5">
            All Projects
            {projects && projects.length > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">({projects.length})</span>
            )}
          </h2>

          {isLoading ? (
            <div className="flex justify-center p-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : projects?.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-2xl border-2 border-dashed border-border">
              <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
              <p className="text-muted-foreground mt-1 mb-5 text-sm">Create your first project to get started.</p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {projects?.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="hover:border-primary/40 hover:shadow-md transition-all group h-full flex flex-col bg-white">
                    <CardContent className="p-5 flex-1 flex flex-col">

                      {/* Header row */}
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant={project.status as any} className="capitalize text-xs">
                          {STATUS_LABELS[project.status] ?? project.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.preventDefault()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${project.id}`} className="w-full cursor-pointer">
                                  View & Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDeleteId(project.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Link href={`/projects/${project.id}`}>
                            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </Link>
                        </div>
                      </div>

                      {/* Project name */}
                      <Link href={`/projects/${project.id}`} className="block">
                        <h3 className="text-lg font-bold font-display text-foreground line-clamp-1 hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                      </Link>

                      {/* Meta info */}
                      <div className="mt-2 space-y-1.5 flex-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{project.clientName}</span>
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{project.address}</span>
                        </p>
                        {project.startDate && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{format(new Date(project.startDate + "T00:00:00"), "MMM d, yyyy")}</span>
                          </p>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="pt-4 mt-4 border-t border-border">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-medium text-muted-foreground">Progress</span>
                          <span className="text-xs font-bold text-primary">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </motion.div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this project?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteId !== null && confirmDelete(deleteId)}
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
