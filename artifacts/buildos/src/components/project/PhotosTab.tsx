import { useState, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Image as ImageIcon, Eye, EyeOff, Upload, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useListPhotos,
  useCreatePhoto,
  useUpdatePhoto,
  useDeletePhoto,
  getListPhotosQueryKey,
  type Photo,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";

function getToken(): string | null {
  return localStorage.getItem("buildos_token");
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
type AcceptedType = (typeof ACCEPTED_TYPES)[number];

const photoSchema = z.object({
  caption:         z.string().optional(),
  visibleToClient: z.boolean(),
});
type PhotoForm = z.infer<typeof photoSchema>;

async function requestPresignedUrl(
  projectId: number,
  file: File,
  token: string
): Promise<{ presignedUrl: string; publicUrl: string; key: string }> {
  const res = await fetch("/api/uploads/presigned-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName:    file.name,
      contentType: file.type,
      projectId,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to get upload URL");
  }
  return res.json();
}

async function uploadToR2(presignedUrl: string, file: File): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`R2 upload failed (${res.status})`);
  }
}

export function PhotosTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data: photos = [], isLoading } = useListPhotos(projectId);
  const createMutation = useCreatePhoto();
  const updateMutation = useUpdatePhoto();
  const deleteMutation = useDeletePhoto();

  const [addOpen,       setAddOpen]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Photo | null>(null);
  const [selectedFile,  setSelectedFile]  = useState<File | null>(null);
  const [preview,       setPreview]       = useState<string | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(projectId) });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PhotoForm>({
    resolver: zodResolver(photoSchema),
    defaultValues: { visibleToClient: false },
  });
  const visibleToClient = watch("visibleToClient");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
      toast.error("Only JPEG, PNG, WebP, and HEIC images are allowed");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeDialog = () => {
    clearFile();
    reset({ visibleToClient: false });
    setAddOpen(false);
  };

  const onAdd = async (data: PhotoForm) => {
    if (!selectedFile) {
      toast.error("Please select an image to upload");
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    setUploading(true);
    try {
      const { presignedUrl, publicUrl } = await requestPresignedUrl(projectId, selectedFile, token);

      await uploadToR2(presignedUrl, selectedFile);

      createMutation.mutate(
        {
          projectId,
          data: {
            fileUrl:         publicUrl,
            caption:         data.caption || null,
            visibleToClient: data.visibleToClient,
          },
        },
        {
          onSuccess: () => {
            toast.success("Photo uploaded successfully");
            invalidate();
            closeDialog();
          },
          onError: () => toast.error("Photo uploaded to storage but failed to save — please try again"),
        }
      );
    } catch (err: any) {
      const msg = err?.message ?? "Upload failed";
      if (msg.includes("R2") || msg.includes("CORS") || msg.includes("Failed to fetch")) {
        toast.error("Upload failed: storage not reachable. Check CORS settings in Cloudflare R2.");
      } else {
        toast.error(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  const toggleVisibility = (photo: Photo) => {
    updateMutation.mutate(
      { projectId, id: photo.id, data: { visibleToClient: !photo.visibleToClient } },
      {
        onSuccess: () => {
          toast.success(photo.visibleToClient ? "Hidden from client" : "Now visible to client");
          invalidate();
        },
        onError: () => toast.error("Failed to update visibility"),
      }
    );
  };

  const onDeleteConfirmed = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(
      { projectId, id: confirmDelete.id },
      {
        onSuccess: () => { toast.success("Photo deleted"); invalidate(); setConfirmDelete(null); },
        onError:   () => { toast.error("Failed to delete photo"); setConfirmDelete(null); },
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

  const isPending = uploading || createMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {photos.length} {photos.length === 1 ? "Photo" : "Photos"}
          </h3>
          {photos.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {photos.filter(p => p.visibleToClient).length} visible to client
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Photo
        </Button>
      </div>

      {photos.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none bg-transparent">
          <CardContent className="p-10 text-center text-muted-foreground">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No photos yet</p>
            <p className="text-sm mt-1">Upload progress photos and evidence for this project.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map(p => (
            <div key={p.id} className="group relative rounded-xl overflow-hidden border border-border shadow-sm bg-white">
              <div className="relative">
                <img
                  src={p.fileUrl}
                  alt={p.caption || "Project photo"}
                  className="w-full h-48 object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23f1f5f9' width='400' height='200'/%3E%3Ctext fill='%2394a3b8' font-size='14' font-family='sans-serif' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage not available%3C/text%3E%3C/svg%3E";
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleVisibility(p)}
                    className={`p-1.5 rounded-lg text-white shadow-lg transition-colors ${
                      p.visibleToClient
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-slate-500 hover:bg-slate-600"
                    }`}
                    title={p.visibleToClient ? "Click to hide from client" : "Click to show to client"}
                  >
                    {p.visibleToClient ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(p)}
                    className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow ${
                    p.visibleToClient
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    {p.visibleToClient
                      ? <><Eye className="w-3 h-3" /> Visible to client</>
                      : <><EyeOff className="w-3 h-3" /> Internal</>}
                  </span>
                </div>
              </div>
              <div className="p-3">
                {p.caption
                  ? <p className="text-sm font-medium text-foreground leading-snug">{p.caption}</p>
                  : <p className="text-sm text-muted-foreground italic">No caption</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(p.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add photo dialog */}
      <Dialog open={addOpen} onOpenChange={v => { if (!v) closeDialog(); else setAddOpen(true); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl">Add Photo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAdd)} className="space-y-4 mt-2">

            {/* File picker */}
            <div className="space-y-2">
              <Label>Image *</Label>
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
                    title="Remove selected image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
                    {selectedFile?.name}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-36 rounded-xl border-2 border-dashed border-border bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                >
                  <Upload className="w-8 h-8 opacity-40" />
                  <span className="text-sm font-medium">Click to select image</span>
                  <span className="text-xs opacity-60">JPEG, PNG, WebP, HEIC</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                {...register("caption")}
                placeholder="e.g. Foundation complete – Week 3"
                rows={2}
              />
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-slate-50">
              <button
                type="button"
                onClick={() => setValue("visibleToClient", !visibleToClient)}
                className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none ${
                  visibleToClient ? "bg-primary" : "bg-slate-300"
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  visibleToClient ? "translate-x-4" : ""
                }`} />
              </button>
              <div>
                <p className="text-sm font-medium text-foreground">Visible to client</p>
                <p className="text-xs text-muted-foreground">
                  {visibleToClient
                    ? "Client will see this photo in their portal"
                    : "Only builders can see this photo"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedFile} className="min-w-[120px]">
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploading ? "Uploading…" : "Saving…"}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Photo
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this photo
            {confirmDelete?.caption ? <> ("<span className="font-semibold text-foreground">{confirmDelete.caption}</span>")</> : ""}?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
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
