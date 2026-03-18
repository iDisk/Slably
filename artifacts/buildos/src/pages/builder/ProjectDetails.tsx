import { useState } from "react";
import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, MapPin, User, Calendar, FileText, Image as ImageIcon, 
  Activity, DollarSign, Plus, CheckCircle, XCircle, FileSignature, Loader2
} from "lucide-react";

import { 
  useGetProject, useListContracts, useCreateContract, useUpdateContract,
  useListChangeOrders, useCreateChangeOrder, useApproveChangeOrder, useRejectChangeOrder,
  useListPhotos, useCreatePhoto, useListActivity,
  getGetProjectQueryKey, getListContractsQueryKey, getListChangeOrdersQueryKey, getListPhotosQueryKey,
  CreateContractBody, CreateChangeOrderBody, CreatePhotoBody
} from "@workspace/api-client-react";

import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export default function ProjectDetails() {
  const [, params] = useRoute("/projects/:id");
  const projectId = parseInt(params?.id || "0");
  const { data: project, isLoading } = useGetProject(projectId);
  const queryClient = useQueryClient();

  if (isLoading) return <BuilderLayout><div className="flex p-20 justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></BuilderLayout>;
  if (!project) return <BuilderLayout><div>Project not found</div></BuilderLayout>;

  return (
    <BuilderLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-display font-bold text-foreground">{project.name}</h1>
              <Badge variant={project.status as any} className="capitalize text-sm px-3 py-1">
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {project.address}</span>
              <span className="flex items-center"><User className="w-4 h-4 mr-1" /> {project.clientName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2 hidden sm:block">
              <p className="text-sm font-medium text-muted-foreground">Project Progress</p>
              <p className="font-bold text-xl text-primary">{project.progress}%</p>
            </div>
            <div className="w-32 h-3 bg-secondary rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-500" style={{ width: `${project.progress}%` }} />
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full mt-8">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto hide-scrollbar bg-transparent h-auto p-0 gap-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border rounded-full px-6 py-2.5">Overview</TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border rounded-full px-6 py-2.5">Contracts</TabsTrigger>
            <TabsTrigger value="change-orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border rounded-full px-6 py-2.5">Change Orders</TabsTrigger>
            <TabsTrigger value="photos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border rounded-full px-6 py-2.5">Photos</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border rounded-full px-6 py-2.5">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-6 border-none shadow-sm bg-white">
              <h3 className="text-xl font-bold font-display mb-4">Project Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client Name</p>
                    <p className="font-medium text-lg">{project.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client Email</p>
                    <p className="font-medium">{project.clientEmail || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium flex items-center"><Calendar className="w-4 h-4 mr-2 text-primary" /> {project.startDate ? format(new Date(project.startDate), 'PPP') : 'Not set'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <div className="bg-slate-50 p-4 rounded-xl text-sm leading-relaxed min-h-[120px] whitespace-pre-wrap border border-slate-100">
                    {project.notes || "No notes added yet."}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contracts"><ContractsTab projectId={projectId} /></TabsContent>
          <TabsContent value="change-orders"><ChangeOrdersTab projectId={projectId} /></TabsContent>
          <TabsContent value="photos"><PhotosTab projectId={projectId} /></TabsContent>
          <TabsContent value="activity"><ActivityTab projectId={projectId} /></TabsContent>
        </Tabs>

      </motion.div>
    </BuilderLayout>
  );
}

// Inner Tabs Components
const ContractsTab = ({ projectId }: { projectId: number }) => {
  const { data: contracts, isLoading } = useListContracts(projectId);
  const queryClient = useQueryClient();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const [open, setOpen] = useState(false);
  
  const { register, handleSubmit, reset } = useForm<CreateContractBody>({
    defaultValues: { status: 'draft' }
  });

  const onSubmit = (data: CreateContractBody) => {
    createContract.mutate({ projectId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(projectId) });
        toast.success("Contract added");
        setOpen(false);
        reset();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-bold font-display">Contracts & Documents</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Contract</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Contract</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2"><Label>Title</Label><Input {...register("title")} required /></div>
              <div className="space-y-2"><Label>File URL</Label><Input {...register("fileUrl")} placeholder="https://..." /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="signed">Signed</option>
                </Select>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createContract.isPending}>Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {contracts?.map(c => (
          <Card key={c.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><FileSignature className="w-5 h-5" /></div>
              <div>
                <p className="font-bold">{c.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(c.uploadedAt), 'PPP')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={c.status === 'signed' ? 'completed' : c.status === 'sent' ? 'active' : 'planning' as any} className="capitalize">
                {c.status}
              </Badge>
              {c.status !== 'signed' && (
                <Button variant="outline" size="sm" onClick={() => updateContract.mutate({ projectId, id: c.id, data: { status: 'signed' } }, {
                  onSuccess: () => queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(projectId) })
                })}>Mark Signed</Button>
              )}
            </div>
          </Card>
        ))}
        {contracts?.length === 0 && <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-xl">No contracts yet</div>}
      </div>
    </div>
  );
};

const ChangeOrdersTab = ({ projectId }: { projectId: number }) => {
  const { data: co, isLoading } = useListChangeOrders(projectId);
  const queryClient = useQueryClient();
  const createCO = useCreateChangeOrder();
  const [open, setOpen] = useState(false);
  
  const { register, handleSubmit, reset } = useForm<CreateChangeOrderBody>({ defaultValues: { status: 'pending', amount: 0 } });

  const onSubmit = (data: CreateChangeOrderBody) => {
    createCO.mutate({ projectId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChangeOrdersQueryKey(projectId) });
        toast.success("Change order added");
        setOpen(false);
        reset();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-bold font-display">Change Orders</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Change Order</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Change Order</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2"><Label>Title</Label><Input {...register("title")} required /></div>
              <div className="space-y-2"><Label>Amount ($)</Label><Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea {...register("description")} /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createCO.isPending}>Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {co?.map(item => (
          <Card key={item.id} className="overflow-hidden border-border/60 shadow-sm flex flex-col">
            <div className={`h-1 w-full ${item.status === 'approved' ? 'bg-emerald-500' : item.status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'}`} />
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-lg">{item.title}</h4>
                <Badge variant={item.status === 'approved' ? 'completed' : item.status === 'rejected' ? 'cancelled' : 'on_hold' as any} className="capitalize">
                  {item.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{item.description}</p>
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <span className="font-display font-bold text-xl text-foreground">{formatCurrency(item.amount)}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {co?.length === 0 && <div className="col-span-full text-center p-8 text-muted-foreground border-2 border-dashed rounded-xl">No change orders yet</div>}
      </div>
    </div>
  );
};

const PhotosTab = ({ projectId }: { projectId: number }) => {
  const { data: photos } = useListPhotos(projectId);
  const queryClient = useQueryClient();
  const createPhoto = useCreatePhoto();
  const [open, setOpen] = useState(false);
  const [b64, setB64] = useState("");
  
  const { register, handleSubmit, reset } = useForm<CreatePhotoBody>({ defaultValues: { visibleToClient: true } });

  const onFile = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setB64(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: CreatePhotoBody) => {
    if (!b64) return toast.error("Please select a photo");
    createPhoto.mutate({ projectId, data: { ...data, fileUrl: b64 } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(projectId) });
        toast.success("Photo uploaded");
        setOpen(false);
        reset();
        setB64("");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-bold font-display">Project Photos</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Upload Photo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Photo</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2"><Label>Image File</Label><Input type="file" accept="image/*" onChange={onFile} /></div>
              {b64 && <img src={b64} alt="Preview" className="h-32 rounded-lg object-cover" />}
              <div className="space-y-2"><Label>Caption</Label><Input {...register("caption")} /></div>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" {...register("visibleToClient")} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                Visible to Client
              </label>
              <Button type="submit" className="w-full mt-4" disabled={createPhoto.isPending}>Upload</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos?.map(p => (
          <div key={p.id} className="relative group rounded-xl overflow-hidden shadow-sm border border-border bg-white">
            <img src={p.fileUrl} alt={p.caption || "Project photo"} className="w-full h-48 object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <p className="text-white font-medium text-sm">{p.caption}</p>
              <Badge variant="outline" className="text-white/80 border-white/30 mt-1 w-max bg-black/20 text-[10px]">{p.visibleToClient ? 'Client Visible' : 'Internal Only'}</Badge>
            </div>
          </div>
        ))}
        {photos?.length === 0 && <div className="col-span-full text-center p-8 text-muted-foreground border-2 border-dashed rounded-xl">No photos yet</div>}
      </div>
    </div>
  );
};

const ActivityTab = ({ projectId }: { projectId: number }) => {
  const { data: activity } = useListActivity(projectId);
  return (
    <Card className="p-6 bg-white border-none shadow-sm">
      <h3 className="text-lg font-bold font-display mb-6">Activity Timeline</h3>
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {activity?.map(log => (
          <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <Activity className="w-3 h-3" />
            </div>
            <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-foreground capitalize">{log.type.replace('_', ' ')}</span>
                <span className="text-xs font-medium text-muted-foreground">{format(new Date(log.createdAt), 'MMM d, h:mm a')}</span>
              </div>
              <div className="text-sm text-muted-foreground">{log.description}</div>
            </div>
          </div>
        ))}
        {activity?.length === 0 && <div className="text-center p-4 text-muted-foreground">No activity recorded.</div>}
      </div>
    </Card>
  );
};
