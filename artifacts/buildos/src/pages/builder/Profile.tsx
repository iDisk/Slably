import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Building2, Phone, MapPin, BadgeCheck, User } from "lucide-react";

import { useGetMyOrg, useUpdateMyOrg, getGetMyOrgQueryKey } from "@workspace/api-client-react";
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
  const queryClient = useQueryClient();
  const { data: org, isLoading } = useGetMyOrg();
  const updateMutation = useUpdateMyOrg();

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
          toast.success("Perfil actualizado");
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
          <h1 className="text-2xl font-display font-bold text-foreground">Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Información de tu cuenta y empresa
          </p>
        </div>

        {/* User info (read-only) */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={user?.name ?? ""} readOnly className="bg-muted/50 cursor-default" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly className="bg-muted/50 cursor-default" />
            </div>
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
                    <option value="">Seleccionar...</option>
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
                    Guardar cambios
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </BuilderLayout>
  );
}
