import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { RealtorLayout } from "@/components/layout/RealtorLayout";
import { toast } from "sonner";
import {
  Users, Home, TrendingUp, CheckCircle2, Circle,
  Share2, ExternalLink, Plus, X, DollarSign, MapPin,
  FileText, Clock
} from "lucide-react";
import { formatInitials } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface RealtorProfile {
  id: number;
  name: string;
  brokerage: string | null;
  serviceCity: string | null;
  profilePhoto: string | null;
}

interface RealtorClient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  clientType: string;
  budget: string | null;
  city: string | null;
  propertiesShown: number;
  notes: string | null;
  lastNoteAt: string | null;
  createdAt: string;
}

const CLIENT_TYPE_COLORS: Record<string, string> = {
  buyer:    "bg-blue-100 text-blue-700",
  seller:   "bg-amber-100 text-amber-700",
  investor: "bg-purple-100 text-purple-700",
};

function daysSince(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / 86_400_000);
}

export default function RealtorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile]     = useState<RealtorProfile | null>(null);
  const [clients, setClients]     = useState<RealtorClient[]>([]);
  const [prosCount, setProsCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", clientType: "buyer", budget: "", city: "",
  });

  const loadAll = () => {
    fetch(`${API}/api/realtor/profile`).then(r => r.json()).then(setProfile).catch(() => {});
    fetch(`${API}/api/realtor/clients`).then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/realtor/trusted-pros`).then(r => r.json()).then((d: any[]) => setProsCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  const shareUrl = `${window.location.origin}/realtor/${user?.id}`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied! Share it with your clients.");
    } catch { toast.error("Could not copy link."); }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/realtor/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(`${form.name} added!`);
      setForm({ name: "", email: "", phone: "", clientType: "buyer", budget: "", city: "" });
      setShowModal(false);
      loadAll();
    } catch { toast.error("Failed to add client."); }
    finally { setSaving(false); }
  };

  const totalPropertiesShown = clients.reduce((s, c) => s + (c.propertiesShown ?? 0), 0);

  const checklist = [
    { label: "Account created",   done: true },
    { label: "Add profile photo", done: !!profile?.profilePhoto },
    { label: "Add your brokerage",done: !!profile?.brokerage },
    { label: "Add a client",      done: clients.length > 0 },
    { label: "Add trusted pros",  done: prosCount > 0 },
  ];
  const allDone = checklist.every(c => c.done);

  return (
    <RealtorLayout>
      <div className="space-y-8 max-w-5xl">

        {/* ── SECCIÓN 1: Hero ── */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1B3A5C] to-[#2d5a8e] p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            {profile?.profilePhoto ? (
              <img src={profile.profilePhoto} alt={profile.name}
                className="w-24 h-24 rounded-full border-4 border-[#C9A84C] object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-[#C9A84C] bg-white/20 flex items-center justify-center text-white text-3xl font-bold">
                {formatInitials(user?.name || "R")}
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white">{profile?.name || user?.name}</h1>
            {profile?.brokerage  && <p className="text-[#C9A84C] font-medium mt-0.5">{profile.brokerage}</p>}
            {profile?.serviceCity && <p className="text-white/70 text-sm mt-0.5">{profile.serviceCity}</p>}
            <div className="flex flex-wrap gap-3 mt-4 justify-center sm:justify-start">
              <button onClick={handleShare}
                className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors">
                <Share2 className="h-4 w-4" /> Share My Card
              </button>
              <button onClick={() => setLocation("/realtor/card")}
                className="flex items-center gap-2 border border-white/40 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-white/10 transition-colors">
                <ExternalLink className="h-4 w-4" /> Preview Card
              </button>
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 2: Active Clients ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Active Clients</h2>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors">
              <Plus className="h-4 w-4" /> Add Client
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-blue-400" />
              </div>
              <p className="font-semibold text-foreground mb-1">No active clients yet</p>
              <p className="text-sm text-muted-foreground mb-5">Add your first client to start organizing your business.</p>
              <button onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-[#F97316] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors">
                <Plus className="h-4 w-4" /> Add Your First Client
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map(client => (
                <div key={client.id}
                  onClick={() => setLocation(`/realtor/clients/${client.id}`)}
                  className="bg-white rounded-2xl border border-border p-5 cursor-pointer hover:shadow-md hover:border-[#1B3A5C]/30 transition-all group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#1B3A5C]/10 flex items-center justify-center text-[#1B3A5C] font-bold text-sm flex-shrink-0">
                      {formatInitials(client.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{client.name}</p>
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 capitalize ${CLIENT_TYPE_COLORS[client.clientType] ?? "bg-gray-100 text-gray-600"}`}>
                        {client.clientType}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {client.budget && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Budget: {client.budget}</span>
                      </div>
                    )}
                    {client.city && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{client.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{client.propertiesShown} properties shown</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      {client.lastNoteAt
                        ? <span>Last note: {daysSince(client.lastNoteAt)}d ago</span>
                        : <span className="italic">No notes yet</span>
                      }
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-xs font-semibold text-[#1B3A5C] group-hover:underline">View Client →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECCIÓN 3: Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div onClick={() => setLocation("/realtor")}
            className="cursor-pointer bg-white rounded-2xl border border-border p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clients.length}</p>
              <p className="text-xs text-muted-foreground">My Clients</p>
            </div>
          </div>

          <div onClick={() => setLocation("/realtor/pros")}
            className="cursor-pointer bg-white rounded-2xl border border-border p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{prosCount}</p>
              <p className="text-xs text-muted-foreground">My Trusted Pros</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
              <Home className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalPropertiesShown}</p>
              <p className="text-xs text-muted-foreground">Properties Shown</p>
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 4: Getting Started ── */}
        {!allDone && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Getting Started</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {checklist.map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                  }
                  <span className={`text-xs ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Add Client ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Add a Client</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Full Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@email.com"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 000-0000"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Client Type</label>
                <div className="flex gap-2">
                  {["buyer","seller","investor"].map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, clientType: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${form.clientType === t ? "bg-[#1B3A5C] text-white border-[#1B3A5C]" : "border-border text-muted-foreground hover:border-[#1B3A5C]/40"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Budget</label>
                  <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    placeholder="$450,000"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Houston, TX"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20" />
                </div>
              </div>

              <button type="submit" disabled={saving || !form.name.trim()}
                className="w-full bg-[#1B3A5C] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2d5a8e] transition-colors disabled:opacity-60">
                {saving ? "Adding…" : "Add Client"}
              </button>
            </form>
          </div>
        </div>
      )}
    </RealtorLayout>
  );
}
