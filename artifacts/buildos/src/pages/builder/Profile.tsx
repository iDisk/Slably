import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save, Building2, Phone, MapPin, BadgeCheck, User, Share2, Copy, Camera, Calculator, XCircle } from "lucide-react";

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
            Your account and company information
          </p>
        </div>

        {/* User info */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Account
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
                  Change photo
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
              <Building2 className="w-4 h-4 text-primary" /> Company
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
                  <Label>Company logo</Label>
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
                      <span className="text-xs text-muted-foreground">+ Company logo</span>
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
                    Company name
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Smith Construction"
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
                      License number
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
                      Phone
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
                    Operating state
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

        {/* Tax Pro Access */}
        <TaxProAccessSection />

        {/* Public profile link */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" /> Your public profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this link so others can see your profile and ratings
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
                  toast.success("Link copied to clipboard");
                }}
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </BuilderLayout>
  );
}

// ── Tax Pro Access Section ─────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function TaxProAccessSection() {
  const [inviteEmail, setInviteEmail] = useState("");
  const qc = useQueryClient();

  const { data: taxPro, isLoading } = useQuery({
    queryKey: ["my-tax-pro"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tax-pro/my-tax-pro`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`${BASE}/api/tax-pro/invite/${encodeURIComponent(email)}`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invitation sent to your tax pro!");
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["my-tax-pro"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (taxProId: number) => {
      const res = await fetch(`${BASE}/api/tax-pro/revoke/${taxProId}`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Access revoked");
      qc.invalidateQueries({ queryKey: ["my-tax-pro"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" /> Tax Pro Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Give your tax preparer or accountant read-only access to your financial data for tax preparation.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : taxPro ? (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {taxPro.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{taxPro.name}</p>
                <p className="text-xs text-muted-foreground">{taxPro.email}</p>
                {taxPro.status === "pending" && (
                  <span className="text-xs text-amber-600">Invitation pending</span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
              onClick={() => revokeMutation.mutate(taxPro.id)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Revoke Access
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="taxpro@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              className="bg-[#1B3A5C] hover:bg-[#152d4a] text-white gap-1.5 shrink-0"
              onClick={() => inviteMutation.mutate(inviteEmail)}
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
            >
              {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Invite Tax Pro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
