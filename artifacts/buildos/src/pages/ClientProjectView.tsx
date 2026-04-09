import { useParams } from "wouter";
import { MapPin, Loader2, AlertCircle, Building2, Image as ImageIcon } from "lucide-react";
import {
  useGetProject,
  useListPhotos,
  useGetBuilderProfile,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";

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

            {/* Progress */}
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

            {/* Address */}
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

        {/* ── Documents placeholder ── */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Documents
            </h2>
            <p className="text-sm text-muted-foreground">
              Your contractor will share documents here for your review.
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground">Powered by Slably</p>
      </div>
    </div>
  );
}
