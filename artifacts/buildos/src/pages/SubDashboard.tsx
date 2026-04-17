import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Briefcase, Loader2, MapPin, ChevronRight, Building2, Camera, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useGetMyWork,
  useUploadUserPhoto,
  useGetUserPhotos,
  useShareUserPhoto,
  getUserPhotosQueryKey,
  type MyWorkItem,
  type UserPhotoItem,
} from "@workspace/api-client-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: "In Progress", cls: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed",   cls: "bg-blue-100 text-blue-700" },
  planning:  { label: "Planning",    cls: "bg-slate-100 text-slate-600" },
  on_hold:   { label: "On Hold",     cls: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelled",   cls: "bg-red-100 text-red-700" },
};

const VENDOR_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", cls: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

function fmt(n: string | null | undefined) {
  const v = parseFloat(n ?? "0");
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(v);
}

// ─── Work Card ────────────────────────────────────────────────────────────────
function WorkCard({ item, index }: { item: MyWorkItem; index: number }) {
  const [, navigate] = useLocation();
  const ps      = PROJECT_STATUS[item.project.status] ?? PROJECT_STATUS.active;
  const vs      = VENDOR_STATUS[item.status]          ?? VENDOR_STATUS.active;
  const balance = parseFloat(item.balancePending);
  const paid    = parseFloat(item.paymentsMade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground font-display text-base truncate">
                {item.project.name}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ps.cls}`}>
                  {ps.label}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vs.cls}`}>
                  {vs.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>{item.builder.name}</span>
            {item.builder.companyName && (
              <span className="text-muted-foreground/60">· {item.builder.companyName}</span>
            )}
          </div>

          {item.project.address && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.project.address}</span>
            </div>
          )}
          {item.project.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(item.project.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#1B3A5C] hover:text-orange-500 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Get Directions
            </a>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{item.project.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${item.project.progress}%` }}
              />
            </div>
          </div>

          {item.contractAmount && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract</span>
                <span className="font-semibold">{fmt(item.contractAmount)}</span>
              </div>
              {paid > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-emerald-600">{fmt(item.paymentsMade)}</span>
                </div>
              )}
              {balance > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-amber-600">{fmt(item.balancePending)}</span>
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => navigate(`/my-work/${item.vendorId}`)}
          >
            View details <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Photo Card ───────────────────────────────────────────────────────────────
function PhotoCard({
  photo, projects, isSharingOpen, selectedProjectId,
  onOpenShare, onCloseShare, onSelectProject, onConfirmShare, isSharing,
}: {
  photo: UserPhotoItem;
  projects: MyWorkItem[];
  isSharingOpen: boolean;
  selectedProjectId: string;
  onOpenShare: () => void;
  onCloseShare: () => void;
  onSelectProject: (id: string) => void;
  onConfirmShare: () => void;
  isSharing: boolean;
}) {
  const canShare = !photo.sharedWithBuilder || photo.approvalStatus === "rejected";

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-white">
      <img
        src={photo.fileUrl}
        alt={photo.caption || "Photo"}
        className="w-full aspect-video object-cover"
        onError={e => {
          (e.target as HTMLImageElement).src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23f1f5f9' width='400' height='225'/%3E%3C/svg%3E";
        }}
      />
      <div className="p-2.5 space-y-2">
        {photo.caption && (
          <p className="text-xs text-foreground leading-snug">{photo.caption}</p>
        )}

        {photo.sharedWithBuilder && photo.approvalStatus === "pending" && (
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            ⏳ Pending approval
          </span>
        )}
        {photo.approvalStatus === "approved" && (
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            ✓ Approved
          </span>
        )}
        {photo.approvalStatus === "rejected" && (
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            ✗ Rejected
          </span>
        )}

        {canShare && !isSharingOpen && (
          <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={onOpenShare}>
            {photo.approvalStatus === "rejected" ? "Share again" : "Share →"}
          </Button>
        )}

        {canShare && isSharingOpen && (
          <div className="space-y-1.5">
            <select
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
              value={selectedProjectId}
              onChange={e => onSelectProject(e.target.value)}
            >
              <option value="">Select project…</option>
              {projects.map(p => (
                <option key={p.vendorId} value={String(p.project.id)}>
                  {p.project.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <Button
                size="sm" className="flex-1 text-xs h-7"
                disabled={!selectedProjectId || isSharing}
                onClick={onConfirmShare}
              >
                {isSharing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send"}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={onCloseShare}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── My Photos Section ────────────────────────────────────────────────────────
export function MyPhotosSection({ projects, projectId }: { projects: MyWorkItem[]; projectId?: number }) {
  const queryClient  = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sharingId,  setSharingId]  = useState<number | null>(null);
  const [selectedPid, setSelectedPid] = useState<string>("");

  const { data: photos = [], isLoading } = useGetUserPhotos({
    query: { queryKey: getUserPhotosQueryKey() },
  });

  const uploadMutation = useUploadUserPhoto({
    onSuccess: () => {
      toast.success("Photo uploaded");
      queryClient.invalidateQueries({ queryKey: getUserPhotosQueryKey() });
    },
    onError: () => toast.error("Upload failed"),
  });

  const shareMutation = useShareUserPhoto({
    onSuccess: () => {
      toast.success("Shared with builder. Pending approval.");
      queryClient.invalidateQueries({ queryKey: getUserPhotosQueryKey() });
      setSharingId(null);
      setSelectedPid("");
    },
    onError: () => toast.error("Share failed"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("photo", file);
    uploadMutation.mutate(fd);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-foreground">My Photos</h2>
        <Button
          size="sm"
          className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Camera className="w-4 h-4" />}
          Add Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && photos.length === 0 && (
        <Card className="border-dashed border-2 shadow-none bg-transparent">
          <CardContent className="p-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <ImageIcon className="w-8 h-8 opacity-30" />
            <p className="text-sm">No photos yet. Add your first photo.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {photos.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              projects={projects}
              isSharingOpen={sharingId === photo.id}
              selectedProjectId={sharingId === photo.id ? selectedPid : ""}
              onOpenShare={() => { setSharingId(photo.id); setSelectedPid(projectId ? String(projectId) : ""); }}
              onCloseShare={() => setSharingId(null)}
              onSelectProject={setSelectedPid}
              onConfirmShare={() => {
                const pid = parseInt(selectedPid, 10);
                if (!pid) return;
                shareMutation.mutate({ photoId: photo.id, body: { project_id: pid } });
              }}
              isSharing={shareMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SubDashboard() {
  const [, navigate] = useLocation();
  const { data: items, isLoading } = useGetMyWork({ query: { queryKey: ["/api/my-work"] } });
  const activeCount = items?.filter(i => i.status === "active").length ?? 0;

  return (
    <BuilderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">My Work</h1>
            <p className="text-muted-foreground text-sm mt-1">Your active project assignments</p>
          </div>
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {activeCount}
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!items || items.length === 0) && (
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">No active work yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have any active assignments. Browse available jobs in Network.
                </p>
              </div>
              <Button onClick={() => navigate("/network")} className="gap-2">
                <Briefcase className="w-4 h-4" /> Go to Network
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Work grid */}
        {!isLoading && items && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, i) => (
              <WorkCard key={item.vendorId} item={item} index={i} />
            ))}
          </div>
        )}

        {/* My Photos */}
        {!isLoading && (
          <div className="pt-2 border-t border-border">
            <MyPhotosSection projects={items ?? []} />
          </div>
        )}
      </div>
    </BuilderLayout>
  );
}
