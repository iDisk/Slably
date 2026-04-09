import { useParams } from "wouter";
import { format, parseISO } from "date-fns";
import {
  MapPin, Loader2, AlertCircle, Building2,
  Image as ImageIcon, FileText, ClipboardList, CalendarDays,
} from "lucide-react";
import {
  useGetProject,
  useListPhotos,
  useGetBuilderProfile,
  useGetClientDocuments,
  useGetClientChangeOrders,
  useListDailyLogs,
  type DailyLog,
  type DocumentListItemType,
  type ChangeOrder,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";

// ─── Project status helpers ───────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active:    "In Progress",
  completed: "Completed",
  planning:  "In Planning",
  on_hold:   "On Hold",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  planning:  "bg-slate-100 text-slate-700 border-slate-200",
  on_hold:   "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

// ─── Section: Documents ───────────────────────────────────────────────────────

function ClientDocumentsSection({ projectId }: { projectId: number }) {
  const { data: docs = [], isLoading } = useGetClientDocuments(projectId);

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Documents
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No documents shared yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {(docs as DocumentListItemType[]).map(doc => (
              <div key={doc.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(doc.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.status === "signed" ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Signed ✓
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Pending signature
                    </span>
                  )}
                  {doc.status === "sent" && (
                    <button className="text-xs border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-slate-50 transition-colors font-medium">
                      Sign document
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Project Updates (daily logs) ────────────────────────────────────

function ClientUpdatesSection({ projectId }: { projectId: number }) {
  const { data: logs = [], isLoading } = useListDailyLogs(projectId);

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> Project Updates
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No updates shared yet. Your contractor will post updates here.
          </p>
        ) : (
          <div className="space-y-4">
            {(logs as DailyLog[]).map(log => (
              <div key={log.id} className="border border-slate-100 rounded-xl p-4 space-y-2.5 bg-slate-50/50">
                <p className="text-sm font-semibold text-foreground capitalize">
                  {format(parseISO(log.logDate), "EEEE, MMMM d")}
                </p>

                {(log.weather || log.workersCount != null) && (
                  <div className="flex flex-wrap gap-1.5">
                    {log.weather && (
                      <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5">
                        ☀️ {log.weather}{log.temperature != null ? ` · ${log.temperature}°F` : ""}
                      </span>
                    )}
                    {log.workersCount != null && (
                      <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5">
                        👷 {log.workersCount} workers
                      </span>
                    )}
                  </div>
                )}

                {log.activities && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Activities</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.activities}</p>
                  </div>
                )}
                {log.materials && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Materials</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.materials}</p>
                  </div>
                )}
                {log.problems && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-base leading-tight">⚠️</span>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Issues reported</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{log.problems}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Change Orders ───────────────────────────────────────────────────

function ClientChangeOrdersSection({ projectId }: { projectId: number }) {
  const { data: cos = [], isLoading } = useGetClientChangeOrders(projectId);

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Change Orders
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : cos.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No change orders yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {(cos as ChangeOrder[]).map((co, i) => (
              <div key={co.id} className="py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      #{i + 1} · {co.title}
                    </p>
                    {co.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{co.description}</p>
                    )}
                  </div>
                  <p className={`text-sm font-bold tabular-nums shrink-0 ${co.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {co.amount >= 0 ? "+" : ""}${Math.abs(co.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  {(co.status as string) === "sent" && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Pending your approval
                    </span>
                  )}
                  {(co.status as string) === "approved" && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Approved
                    </span>
                  )}
                  {(co.status as string) === "rejected" && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientProjectView() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const { data: project, isLoading, isError } = useGetProject(projectId);
  const { data: photos = [] } = useListPhotos(projectId);

  const { data: builder } = useGetBuilderProfile(project?.builderId ?? 0, {
    query: {
      queryKey: [`/api/builders/${project?.builderId ?? 0}`],
      enabled: !!project?.builderId,
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <p className="font-semibold text-foreground text-lg">Project not found</p>
        <p className="text-sm text-muted-foreground">You may not have access to this project.</p>
      </div>
    );
  }

  const visiblePhotos = photos.filter(p => p.visibleToClient).slice(0, 6);
  const progress = project.progress ?? 0;
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;
  const statusColor = STATUS_COLORS[project.status] ?? STATUS_COLORS.planning;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1B3A5C] px-6 py-4">
        <img src="/slably-logo.png" alt="Slably" className="h-8" />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-5">

        {/* ── Hero ── */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-foreground leading-tight">{project.name}</h1>
              <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Progress</span>
                <span className="font-bold text-foreground">{progress}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-orange-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {project.address && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                {project.address}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Builder ── */}
        {builder && (
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Your Contractor
              </h2>
              <div className="flex items-center gap-3">
                {builder.companyLogo ? (
                  <img
                    src={builder.companyLogo}
                    alt={builder.companyName ?? builder.name}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {(builder.companyName ?? builder.name).slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{builder.companyName ?? builder.name}</p>
                  {builder.companyName && (
                    <p className="text-sm text-muted-foreground">{builder.name}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Photos ── */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Recent Photos
            </h2>
            {visiblePhotos.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No photos available yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visiblePhotos.map(photo => (
                  <div key={photo.id} className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={photo.fileUrl}
                      alt={photo.caption ?? "Project photo"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Documents ── */}
        <ClientDocumentsSection projectId={projectId} />

        {/* ── Project Updates ── */}
        <ClientUpdatesSection projectId={projectId} />

        {/* ── Change Orders ── */}
        <ClientChangeOrdersSection projectId={projectId} />

      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground">Powered by Slably</p>
      </div>
    </div>
  );
}
