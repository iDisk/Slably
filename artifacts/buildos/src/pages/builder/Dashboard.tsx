import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Briefcase, Clock, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import { useListProjects, useCreateProject, getListProjectsQueryKey, ProjectStatus, CreateProjectBody } from "@workspace/api-client-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const projectSchema = z.object({
  name: z.string().min(1, "Required"),
  clientName: z.string().min(1, "Required"),
  clientEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().min(1, "Required"),
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]),
  progress: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional()
});

export default function BuilderDashboard() {
  const { data: projects, isLoading } = useListProjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const createProject = useCreateProject();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateProjectBody>({
    resolver: zodResolver(projectSchema),
    defaultValues: { status: 'planning', progress: 0 }
  });

  const onSubmit = (data: CreateProjectBody) => {
    createProject.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast.success("Project created successfully");
        setIsDialogOpen(false);
        reset();
      },
      onError: (err: any) => toast.error(err.message || "Failed to create project")
    });
  };

  const activeProjects = projects?.filter(p => p.status === 'active')?.length || 0;
  const planningProjects = projects?.filter(p => p.status === 'planning')?.length || 0;
  const completedProjects = projects?.filter(p => p.status === 'completed')?.length || 0;

  return (
    <BuilderLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Projects Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage all your construction projects in one place.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0"><Plus className="w-5 h-5 mr-2" /> New Project</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input {...register("name")} placeholder="e.g. 123 Main St Reno" />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input {...register("address")} placeholder="Full address" />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input {...register("clientName")} placeholder="Client name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Email</Label>
                    <Input {...register("clientEmail")} placeholder="Client email (optional)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select {...register("status")}>
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Progress (%)</Label>
                    <Input type="number" {...register("progress")} min={0} max={100} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea {...register("notes")} placeholder="Internal notes..." />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={createProject.isPending}>
                    {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Project
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 font-medium">Active Projects</p>
                <h3 className="text-4xl font-display font-bold mt-1">{activeProjects}</h3>
              </div>
              <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground font-medium">In Planning</p>
                <h3 className="text-4xl font-display font-bold mt-1 text-foreground">{planningProjects}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground font-medium">Completed</p>
                <h3 className="text-4xl font-display font-bold mt-1 text-foreground">{completedProjects}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-foreground">All Projects</h2>
          
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : projects?.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-border">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
              <p className="text-muted-foreground mt-1 mb-4">Create your first project to get started.</p>
              <Button onClick={() => setIsDialogOpen(true)}>Create Project</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects?.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant={project.status as any} className="capitalize">
                          {project.status.replace('_', ' ')}
                        </Badge>
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold font-display line-clamp-1">{project.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{project.address}</p>
                      
                      <div className="mt-auto pt-6 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Client: <span className="font-medium text-foreground">{project.clientName}</span></span>
                          <span className="font-semibold text-primary">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-500 ease-out"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

      </motion.div>
    </BuilderLayout>
  );
}
