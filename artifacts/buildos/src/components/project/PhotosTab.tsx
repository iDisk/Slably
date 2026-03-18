import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
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
import { Input, Label, Textarea } from "@/components/ui/input";

const photoSchema = z.object({
  fileUrl:         z.string().url("Enter a valid image URL (https://...)"),
  caption:         z.string().optional(),
  visibleToClient: z.boolean(),
});
type PhotoForm = z.infer<typeof photoSchema>;

export function PhotosTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data: photos = [], isLoading } = useListPhotos(projectId);
  const createMutation = useCreatePhoto();
  const updateMutation = useUpdatePhoto();
  const deleteMutation = useDeletePhoto();

  const [addOpen,       setAddOpen]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Photo | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(projectId) });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PhotoForm>({
    resolver: zodResolver(photoSchema),
    defaultValues: { visibleToClient: false },
  });

  const visibleToClient = watch("visibleToClient");

  const onAdd = (data: PhotoForm) => {
    createMutation.mutate(
      {
        projectId,
        data: {
          fileUrl:         data.fileUrl,
          caption:         data.caption || null,
          visibleToClient: data.visibleToClient,
        },
      },
      {
        onSuccess: () => {
          toast.success("Photo added");
          invalidate();
          setAddOpen(false);
          reset({ visibleToClient: false });
        },
        onError: () => toast.error("Failed to add photo"),
      }
    );
  };

  const toggleVisibility = (photo: Photo) => {
    updateMutation.mutate(
      {
        projectId,
        id: photo.id,
        data: { visibleToClient: !photo.visibleToClient },
      },
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
        onError:   () => { toast.error("Failed to delete"); setConfirmDelete(null); },
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
            <p className="text-sm mt-1">Add progress photos and evidence to this project.</p>
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
                    {p.visibleToClient
                      ? <Eye className="w-3.5 h-3.5" />
                      : <EyeOff className="w-3.5 h-3.5" />}
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
      <Dialog open={addOpen} onOpenChange={v => { if (!v) reset({ visibleToClient: false }); setAddOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl">Add Photo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAdd)} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Image URL *</Label>
              <Input
                {...register("fileUrl")}
                type="url"
                placeholder="https://example.com/photo.jpg"
              />
              {errors.fileUrl && <p className="text-xs text-destructive">{errors.fileUrl.message}</p>}
              <p className="text-xs text-muted-foreground">
                Paste a direct image URL (JPG, PNG, WebP). Works with Google Drive, Imgur, S3, etc.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                {...register("caption")}
                placeholder="e.g. Foundation complete – Week 3"
                rows={2}
              />
            </div>
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
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Photo
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
