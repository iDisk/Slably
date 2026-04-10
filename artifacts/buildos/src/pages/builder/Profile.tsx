import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Building2, Phone, MapPin, BadgeCheck, User, Share2, Copy, Camera } from "lucide-react";

import { useGetMyOrg, useUpdateMyOrg, getGetMyOrgQueryKey, useUploadProfilePhoto, useUploadCompanyLogo } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const profileSchema = z.object({
  companyName:   z.string().optional(),
  licenseNumber: z.string().optional(),
  state:         z.string().optional(),
  phone:         z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const profileUrl = user?.role === "subcontractor"
    ? `${window.location.origin}${base}/sub/${user.id}`
    : `${window.location.origin}${base}/builder/${user?.id}`;
  const queryClient = useQueryClient();
  const { data: org, isLoading } = useGetMyOrg();
  const updateMutation = useUpdateMyOrg();

  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef  = useRef<HTMLInputElement>(null);
  const photoMutation = useUploadProfilePhoto();
  const logoMutation  = useUploadCompanyLogo();

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join("")
    : "?";

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("photo", file);
    photoMutation.mutate({ data: fd }, {
      onSuccess: () => {
        toast.success("Foto actualizada");
        queryClient.invalidateQueries({ queryKey: getGetMyOrgQueryKey() });
      },
      onError: () => toast.error("Error al subir la foto"),
    });
    e.target.value = "";
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("logo", file);
    logoMutation.mutate({ data: fd }, {
      onSuccess: () => {
        toast.success("Logo actualizado");
        queryClient.invalidateQueries({ queryKey: getGetMyOrgQueryKey() });
      },
      onError: () => toast.error("Error al subir el logo"),
    });
    e.target.value = "";
  };

  const { register, handleSubmit, reset, formState: { errors, isDirty } } =
    useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (org) {
      reset({
        companyName:   org.companyName   ?? "",
        licenseNumber: org.licenseNumber ?? "",
        state:         org.state         ?? "",
        phone:         org.phone         ?? "",
      });
    }
  }, [org, reset]);

  const onSubmit = (data: ProfileForm) => {
    updateMutation.mutate(
      {
        data: {
          companyName:   data.companyName   || undefined,
          licenseNumber: data.licenseNumber || undefined,
          state:         data.state         || undefined,
          phone:         data.phone         || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          queryClient.invalidateQueries({ queryKey: getGetMyOrgQueryKey() });
        },
        onError: () => toast.error("Error al guardar"),
      }
    );
  };

  return (
    <BuilderLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Información de tu cuenta y empresa
          </p>
        </div>

        {/* User info */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="group relative w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-transparent ring-offset-2 hover:ring-primary transition-all cursor-pointer"
              >
                {org?.profilePhoto ? (
                  <img src={org.profilePhoto} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-primary select-none">{initials}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {photoMutation.isPending
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />}
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name ?? ""}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email ?? ""}</p>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="text-xs text-primary hover:underline mt-0.5"
                >
                  Cambiar foto
                </button>
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </CardContent>
        </Card>

        {/* Org info (editable) */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Company logo */}
                <div className="space-y-2">
                  <Label>Logo de empresa</Label>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center justify-center w-[120px] h-[60px] border-2 border-dashed border-border rounded-lg hover:border-primary/60 hover:bg-muted/30 transition-colors overflow-hidden"
                  >
                    {logoMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : org?.companyLogo ? (
                      <img src={org.companyLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-xs text-muted-foreground">+ Logo de empresa</span>
                    )}
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Nombre de la empresa
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="López Construction"
                    {...register("companyName")}
                  />
                  {errors.companyName && (
                    <p className="text-xs text-destructive">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber" className="flex items-center gap-1.5">
                      <BadgeCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      Número de licencia
                    </Label>
                    <Input
                      id="licenseNumber"
                      placeholder="TX-123456"
                      {...register("licenseNumber")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      Teléfono
                    </Label>
                    <Input
                      id="phone"
                      placeholder="(555) 123-4567"
                      {...register("phone")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    Estado de operación
                  </Label>
                  <Select id="state" {...register("state")}>
                    <option value="">Select...</option>
                    <option value="TX">Texas (TX)</option>
                    <option value="FL">Florida (FL)</option>
                    <option value="CA">California (CA)</option>
                    <option value="NY">New York (NY)</option>
                    <option value="AZ">Arizona (AZ)</option>
                    <option value="NV">Nevada (NV)</option>
                    <option value="CO">Colorado (CO)</option>
                    <option value="other">Otro</option>
                  </Select>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !isDirty}
                    className="gap-2"
                  >
                    {updateMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Save className="w-4 h-4" />}
                    Save changes
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Public profile link */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" /> Tu perfil público
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Comparte este link para que otros vean tu perfil y calificaciones
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground font-mono truncate">
                {profileUrl}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(profileUrl);
                  toast.success("Link copiado al portapapeles");
                }}
              >
                <Copy className="w-3.5 h-3.5" /> Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </BuilderLayout>
  );
}
