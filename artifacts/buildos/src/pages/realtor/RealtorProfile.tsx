import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import { RealtorLayout } from "@/components/layout/RealtorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface RealtorProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  brokerage: string | null;
  licenseNumber: string | null;
  serviceCity: string | null;
  profilePhoto: string | null;
}

export default function RealtorProfile() {
  const [profile, setProfile] = useState<RealtorProfile | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", brokerage: "", licenseNumber: "", serviceCity: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/realtor/profile`)
      .then(r => r.json())
      .then((data: RealtorProfile) => {
        setProfile(data);
        setForm({
          name:          data.name          ?? "",
          phone:         data.phone         ?? "",
          brokerage:     data.brokerage     ?? "",
          licenseNumber: data.licenseNumber ?? "",
          serviceCity:   data.serviceCity   ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/realtor/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RealtorLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RealtorLayout>
    );
  }

  return (
    <RealtorLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">This information appears on your public card.</p>
        </div>

        {/* Profile Photo */}
        <div className="flex items-center gap-5">
          <div className="relative">
            {profile?.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
                alt="Profile"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted border-2 border-border flex items-center justify-center text-muted-foreground">
                <Camera className="h-7 w-7" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Profile Photo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Use /api/user-photos to upload</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email <span className="text-muted-foreground text-xs">(read-only)</span></Label>
            <Input id="email" value={profile?.email ?? ""} disabled className="opacity-60" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brokerage">Brokerage / Agency</Label>
            <Input id="brokerage" value={form.brokerage} onChange={e => setForm(f => ({ ...f, brokerage: e.target.value }))} placeholder="Keller Williams, RE/MAX..." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="licenseNumber">License #</Label>
            <Input id="licenseNumber" value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="TX-12345678" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="serviceCity">City</Label>
            <Input id="serviceCity" value={form.serviceCity} onChange={e => setForm(f => ({ ...f, serviceCity: e.target.value }))} placeholder="Houston, TX" />
          </div>

          <Button type="submit" className="w-full h-11" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </form>
      </div>
    </RealtorLayout>
  );
}
