import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/layout/ClientLayout";
import {
  useListProjects, useListChangeOrders, useListPhotos, useListContracts,
  useApproveChangeOrder, useRejectChangeOrder, getListChangeOrdersQueryKey,
  useListDocuments, useSignDocument, listDocumentsUrl,
  type DocumentListItemType, type DocumentDetailType,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileSignature, CheckCircle2, XCircle, Image as ImageIcon, DollarSign, FileText, ClipboardList, X, Pencil, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ClientDashboard() {
  const { data: projects, isLoading } = useListProjects();
  const project = projects?.[0];
  const tabFromUrl = new URLSearchParams(window.location.search).get("tab") ?? "updates";

  if (isLoading) return <ClientLayout><div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></ClientLayout>;

  if (!project) return (
    <ClientLayout>
      <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-border">
        <h2 className="text-2xl font-bold font-display text-foreground">Welcome to Slably!</h2>
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

      <Tabs defaultValue={tabFromUrl} className="w-full">
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
  const { data: photos, isLoading } = useListPhotos(projectId);
  const visiblePhotos = photos?.filter(p => p.visibleToClient) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (visiblePhotos.length === 0) {
    return (
      <Card className="border-dashed border-2 shadow-none bg-transparent">
        <CardContent className="p-10 text-center text-muted-foreground">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No updates yet</p>
          <p className="text-sm mt-1">Your builder will share progress photos here as work advances.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {visiblePhotos.map(p => (
        <div key={p.id} className="rounded-xl overflow-hidden shadow-md border border-border bg-white">
          <img
            src={p.fileUrl}
            alt={p.caption || "Project update"}
            className="w-full h-64 object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='256' viewBox='0 0 400 256'%3E%3Crect fill='%23f1f5f9' width='400' height='256'/%3E%3Ctext fill='%2394a3b8' font-size='14' font-family='sans-serif' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage not available%3C/text%3E%3C/svg%3E";
            }}
          />
          {p.caption && (
            <div className="p-4 bg-white border-t border-border">
              <p className="font-medium text-foreground">{p.caption}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.createdAt), 'MMMM d, yyyy')}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ClientChangeOrders = ({ projectId }: { projectId: number }) => {
  const { data: co, isLoading } = useListChangeOrders(projectId);
  const queryClient = useQueryClient();
  const approve = useApproveChangeOrder();
  const reject = useRejectChangeOrder();

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    const mutation = action === 'approve' ? approve : reject;
    mutation.mutate({ projectId, id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChangeOrdersQueryKey(projectId) });
        toast.success(`Change order ${action}d successfully`);
      },
      onError: () => {
        toast.error(`Failed to ${action} change order. Please try again.`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!co || co.length === 0) {
    return (
      <Card className="border-dashed border-2 shadow-none bg-transparent">
        <CardContent className="p-10 text-center text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No change orders yet</p>
          <p className="text-sm mt-1">Any changes to the original scope will appear here for your review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {co.map(item => (
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
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleAction(item.id, 'reject')}
                    disabled={reject.isPending || approve.isPending}
                  >
                    {reject.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleAction(item.id, 'approve')}
                    disabled={approve.isPending || reject.isPending}
                  >
                    {approve.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

function ClientSignatureCanvas({ onSign, isPending }: { onSign: (url: string) => void; isPending: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e as MouseEvent;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const c = canvasRef.current; if (!c) return;
    e.preventDefault(); drawing.current = true;
    const ctx = c.getContext("2d")!;
    const { x, y } = getPos(e, c); ctx.beginPath(); ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawing.current) return;
    const c = canvasRef.current; if (!c) return;
    e.preventDefault();
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#1a1a1a";
    const { x, y } = getPos(e, c); ctx.lineTo(x, y); ctx.stroke();
  }, []);

  const stopDraw = useCallback(() => { drawing.current = false; }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.addEventListener("mousedown", startDraw as EventListener);
    c.addEventListener("mousemove", draw as EventListener);
    c.addEventListener("mouseup", stopDraw);
    c.addEventListener("mouseleave", stopDraw);
    c.addEventListener("touchstart", startDraw as EventListener, { passive: false });
    c.addEventListener("touchmove", draw as EventListener, { passive: false });
    c.addEventListener("touchend", stopDraw);
    return () => {
      c.removeEventListener("mousedown", startDraw as EventListener);
      c.removeEventListener("mousemove", draw as EventListener);
      c.removeEventListener("mouseup", stopDraw);
      c.removeEventListener("mouseleave", stopDraw);
      c.removeEventListener("touchstart", startDraw as EventListener);
      c.removeEventListener("touchmove", draw as EventListener);
      c.removeEventListener("touchend", stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  const clear = () => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };

  const submit = () => {
    const c = canvasRef.current; if (!c) return;
    const blank = document.createElement("canvas");
    blank.width = c.width; blank.height = c.height;
    if (c.toDataURL() === blank.toDataURL()) {
      toast.warning("Por favor firme en el recuadro antes de continuar");
      return;
    }
    onSign(c.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 touch-none cursor-crosshair"
        style={{ maxHeight: 150 }}
      />
      <p className="text-xs text-muted-foreground text-center">Firme aquí con su dedo o mouse</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} className="gap-1.5">
          <X className="w-3.5 h-3.5" /> Limpiar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={isPending}
          className="flex-1 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
          Firmar documento
        </Button>
      </div>
    </div>
  );
}

const ClientContracts = ({ projectId }: { projectId: number }) => {
  const queryClient = useQueryClient();
  const [signingDoc, setSigningDoc] = useState<DocumentDetailType | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);

  const { data: docs = [], isLoading: docsLoading } = useListDocuments(projectId);
  const { data: contracts = [], isLoading: contractsLoading } = useListContracts(projectId);
  const signMutation = useSignDocument(projectId, signingDoc?.id ?? 0);

  const openDoc = async (doc: DocumentListItemType) => {
    setLoadingModal(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${doc.id}`);
      if (!res.ok) throw new Error("Error al cargar el documento");
      setSigningDoc(await res.json());
    } catch {
      toast.error("Error al cargar el documento");
    } finally {
      setLoadingModal(false);
    }
  };

  const handleSign = (dataUrl: string) => {
    if (!signingDoc) return;
    signMutation.mutate(
      { data: { role: "client", signature: dataUrl } },
      {
        onSuccess: (updated) => {
          setSigningDoc(updated);
          queryClient.invalidateQueries({ queryKey: [listDocumentsUrl(projectId)] });
          toast.success("¡Documento firmado exitosamente!");
        },
        onError: () => toast.error("Error al guardar la firma"),
      }
    );
  };

  if (docsLoading || contractsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (docs.length === 0 && contracts.length === 0) {
    return (
      <Card className="border-dashed border-2 shadow-none bg-transparent">
        <CardContent className="p-10 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents available yet</p>
          <p className="text-sm mt-1">Los contratos y documentos de firma aparecerán aquí cuando tu contratista los genere.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── SECCIÓN 1: Documentos para firmar ── */}
      {docs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documentos para firmar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.map((doc: DocumentListItemType) => {
              const Icon = doc.type === "change_order" ? ClipboardList : FileText;
              const isSigned = !!doc.clientSignedAt;
              return (
                <Card key={doc.id} className="p-5 bg-white border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-xl shrink-0 ${isSigned ? "bg-emerald-50" : "bg-orange-50"}`}>
                      <Icon className={`w-6 h-6 ${isSigned ? "text-emerald-600" : "text-orange-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-bold text-foreground">{doc.title}</p>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                          {doc.language}
                        </span>
                        {doc.status === "signed"
                          ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-100 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Firmado ✓
                            </span>
                          : <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                              Borrador
                            </span>
                        }
                      </div>
                      {isSigned
                        ? <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Firmaste el {format(new Date(doc.clientSignedAt!), "MMM d, yyyy")}
                          </p>
                        : <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                            Pendiente tu firma
                          </span>
                      }
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4 gap-2"
                    onClick={() => openDoc(doc)}
                    disabled={loadingModal}
                  >
                    {loadingModal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                    View and Sign
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECCIÓN 2: Contratos externos ── */}
      {contracts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileSignature className="w-4 h-4" /> Contratos externos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contracts.map(c => (
              <Card key={c.id} className="p-5 flex items-center justify-between bg-white border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <FileSignature className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{c.title}</p>
                    <p className="text-sm text-muted-foreground">Actualizado {format(new Date(c.uploadedAt), "MMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={c.status === "signed" ? "completed" : "active" as any} className="capitalize">{c.status}</Badge>
                  {c.fileUrl && (
                    <Button size="sm" variant="outline" asChild className="gap-1.5">
                      <a href={c.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal de firma ── */}
      <Dialog open={!!signingDoc} onOpenChange={v => !v && setSigningDoc(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl">{signingDoc?.title}</DialogTitle>
          </DialogHeader>
          {signingDoc && (
            <div className="space-y-6 mt-2">
              <div
                className="border rounded-xl bg-white overflow-auto shadow-sm p-4"
                style={{ maxHeight: "60vh" }}
                dangerouslySetInnerHTML={{ __html: signingDoc.content }}
              />
              {signingDoc.clientSignedAt ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-medium text-sm">
                      Ya firmaste este documento el {format(new Date(signingDoc.clientSignedAt), "PPp")}
                    </span>
                  </div>
                  {signingDoc.clientSignature && (
                    <img
                      src={signingDoc.clientSignature}
                      alt="Tu firma"
                      className="border rounded bg-slate-50 max-h-24 object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm border-b pb-2">Tu firma</h4>
                  <ClientSignatureCanvas onSign={handleSign} isPending={signMutation.isPending} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
