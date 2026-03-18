import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { 
  useListProjects, useListChangeOrders, useListPhotos, useListContracts, 
  useApproveChangeOrder, useRejectChangeOrder, getListChangeOrdersQueryKey 
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, FileSignature, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ClientDashboard() {
  const { data: projects, isLoading } = useListProjects();
  const project = projects?.[0]; // Assume first project for simplicity in client portal
  
  if (isLoading) return <ClientLayout><div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></ClientLayout>;
  
  if (!project) return (
    <ClientLayout>
      <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-border">
        <h2 className="text-2xl font-bold font-display text-foreground">Welcome to BuildOS!</h2>
        <p className="text-muted-foreground mt-2">You don't have any active projects assigned to your account yet.</p>
      </div>
    </ClientLayout>
  );

  return (
    <ClientLayout>
      <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Badge variant="outline" className="mb-2 uppercase tracking-widest text-[10px] text-primary border-primary">Active Project</Badge>
            <h1 className="text-3xl font-display font-extrabold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground mt-1">{project.address}</p>
          </div>
          <div className="w-full md:w-64">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-foreground">Progress</span>
              <span className="text-primary">{project.progress}%</span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-1000 ease-out" style={{ width: `${project.progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="updates" className="w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto hide-scrollbar bg-transparent h-auto p-0 gap-2">
          <TabsTrigger value="updates" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border data-[state=inactive]:bg-white rounded-full px-6 py-2.5">Updates & Photos</TabsTrigger>
          <TabsTrigger value="change-orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border data-[state=inactive]:bg-white rounded-full px-6 py-2.5">Change Orders</TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-transparent data-[state=inactive]:border-border data-[state=inactive]:bg-white rounded-full px-6 py-2.5">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="updates"><ClientPhotos projectId={project.id} /></TabsContent>
        <TabsContent value="change-orders"><ClientChangeOrders projectId={project.id} /></TabsContent>
        <TabsContent value="contracts"><ClientContracts projectId={project.id} /></TabsContent>
      </Tabs>
    </ClientLayout>
  );
}

const ClientPhotos = ({ projectId }: { projectId: number }) => {
  const { data: photos } = useListPhotos(projectId);
  // Filter for client visible only
  const visiblePhotos = photos?.filter(p => p.visibleToClient) || [];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {visiblePhotos.map(p => (
        <div key={p.id} className="rounded-xl overflow-hidden shadow-md border border-border bg-white">
          <img src={p.fileUrl} alt={p.caption || "Update"} className="w-full h-64 object-cover" />
          {p.caption && (
            <div className="p-4 bg-white border-t border-border">
              <p className="font-medium text-foreground">{p.caption}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.createdAt), 'MMMM d, yyyy')}</p>
            </div>
          )}
        </div>
      ))}
      {visiblePhotos.length === 0 && <div className="col-span-full p-8 text-center text-muted-foreground bg-white rounded-xl border border-border">No updates available yet.</div>}
    </div>
  );
}

const ClientChangeOrders = ({ projectId }: { projectId: number }) => {
  const { data: co } = useListChangeOrders(projectId);
  const queryClient = useQueryClient();
  const approve = useApproveChangeOrder();
  const reject = useRejectChangeOrder();

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    const mutation = action === 'approve' ? approve : reject;
    mutation.mutate({ projectId, id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChangeOrdersQueryKey(projectId) });
        toast.success(`Change order ${action}d successfully`);
      }
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {co?.map(item => (
        <Card key={item.id} className="overflow-hidden border-border shadow-sm flex flex-col bg-white">
          <div className={`h-1.5 w-full ${item.status === 'approved' ? 'bg-emerald-500' : item.status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'}`} />
          <CardContent className="p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-bold font-display text-xl">{item.title}</h4>
              <Badge variant={item.status === 'approved' ? 'completed' : item.status === 'rejected' ? 'cancelled' : 'on_hold' as any} className="capitalize px-3">
                {item.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">{item.description}</p>
            
            <div className="flex flex-col gap-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                <span className="font-display font-extrabold text-2xl text-foreground">{formatCurrency(item.amount)}</span>
              </div>
              
              {item.status === 'pending' && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleAction(item.id, 'reject')} disabled={reject.isPending}>
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(item.id, 'approve')} disabled={approve.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {co?.length === 0 && <div className="col-span-full p-8 text-center text-muted-foreground bg-white rounded-xl border border-border">No change orders found.</div>}
    </div>
  );
}

const ClientContracts = ({ projectId }: { projectId: number }) => {
  const { data: contracts } = useListContracts(projectId);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {contracts?.map(c => (
        <Card key={c.id} className="p-5 flex items-center justify-between bg-white border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><FileSignature className="w-6 h-6" /></div>
            <div>
              <p className="font-bold text-lg">{c.title}</p>
              <p className="text-sm text-muted-foreground">Updated {format(new Date(c.uploadedAt), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <Badge variant={c.status === 'signed' ? 'completed' : 'active' as any} className="capitalize">{c.status}</Badge>
        </Card>
      ))}
      {contracts?.length === 0 && <div className="col-span-full p-8 text-center text-muted-foreground bg-white rounded-xl border border-border">No documents uploaded.</div>}
    </div>
  );
}
