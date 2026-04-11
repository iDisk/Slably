import { useState, useMemo, useEffect } from "react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { Loader2, LogOut, Users, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "builder" | "client" | "subcontractor" | "supplier";
  category: string | null;
  serviceCity: string | null;
  isActive: boolean;
  createdAt: string;
  organizationId: number | null;
  companyName: string | null;
  lastActiveAt: string | null;
}

type RoleFilter = "all" | "builder" | "subcontractor" | "supplier" | "client";

// ─── Styles ───────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  builder:       "bg-blue-100 text-blue-700 border border-blue-200",
  subcontractor: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  supplier:      "bg-amber-100 text-amber-700 border border-amber-200",
  client:        "bg-slate-100 text-slate-600 border border-slate-200",
};

// ─── Last active formatter ─────────────────────────────────────────────────────

function formatLastActive(val: string | null): React.ReactNode {
  if (!val) return <span className="text-muted-foreground">Never</span>;
  const d = new Date(val);
  const mins = differenceInMinutes(new Date(), d);
  if (mins < 5)  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Online</span>;
  if (mins < 60) return <span className="text-muted-foreground text-xs">{mins}m ago</span>;
  if (isToday(d))     return <span className="text-muted-foreground text-xs">Today, {format(d, "HH:mm")}</span>;
  if (isYesterday(d)) return <span className="text-muted-foreground text-xs">Yesterday</span>;
  return <span className="text-muted-foreground text-xs">{format(d, "MMM d")}</span>;
}

// ─── Fetch helper (bypasses app's patched window.fetch to avoid 401 redirect) ─

function adminFetch(secret: string, path: string, method = "GET"): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `/api${path}`);
    xhr.setRequestHeader("x-admin-secret", secret);
    xhr.responseType = "text";
    xhr.onload = () =>
      resolve(
        new Response(xhr.responseText || null, {
          status: xhr.status,
          headers: { "content-type": "application/json" },
        })
      );
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send();
  });
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function AdminLogin({ onSuccess }: { onSuccess: (secret: string, users: AdminUser[]) => void }) {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    try {
      const res = await adminFetch(secret.trim(), "/admin/users");
      if (res.ok) {
        const data: AdminUser[] = await res.json();
        onSuccess(secret.trim(), data);
      } else if (res.status === 401) {
        toast.error("Invalid admin secret");
      } else {
        toast.error("Server error. Try again.");
      }
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm border-none shadow-lg">
        <div className="bg-[#1B3A5C] px-8 py-6 flex items-center gap-3 rounded-t-xl">
          <Shield className="w-5 h-5 text-white/70" />
          <img src="/slably-logo-dark.png" alt="Slably" className="h-7" />
        </div>
        <CardContent className="p-8">
          <h1 className="text-xl font-bold text-foreground mb-6">Admin Panel</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Admin secret"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              autoFocus
            />
            <Button
              type="submit"
              className="w-full bg-[#1B3A5C] hover:bg-[#152d4a] text-white"
              disabled={loading}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying…</> : "Enter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

function AdminPanelView({ secret, initialUsers }: { secret: string; initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await adminFetch(secret, "/admin/users");
        if (res.ok) setUsers(await res.json());
      } catch { /* silencioso */ }
    }, 30_000);
    return () => clearInterval(id);
  }, [secret]);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter(u => u.role === roleFilter);
    if (showInactive)        list = list.filter(u => !u.isActive);
    return list;
  }, [users, roleFilter, showInactive]);

  async function setActive(id: number, active: boolean) {
    setLoadingId(id);
    try {
      const path = active ? `/admin/users/${id}/activate` : `/admin/users/${id}/deactivate`;
      const res = await adminFetch(secret, path, "PATCH");
      if (res.ok) {
        const updated: AdminUser = await res.json();
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: updated.isActive } : u));
        toast.success(active ? "User activated" : "User deactivated");
      } else {
        toast.error("Action failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteUser(id: number, name: string) {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setLoadingId(id);
    try {
      const res = await adminFetch(secret, `/admin/users/${id}`, "DELETE");
      if (res.ok || res.status === 204) {
        setUsers(prev => prev.filter(u => u.id !== id));
        toast.success("User deleted");
      } else {
        toast.error("Delete failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingId(null);
    }
  }

  const ROLE_TABS: { label: string; value: RoleFilter }[] = [
    { label: "All",       value: "all" },
    { label: "Builders",  value: "builder" },
    { label: "Subs",      value: "subcontractor" },
    { label: "Suppliers", value: "supplier" },
    { label: "Clients",   value: "client" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1B3A5C] px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/slably-logo-dark.png" alt="Slably" className="h-7" />
          <span className="text-white/60 text-sm font-medium">Admin</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-1">
            <Users className="w-3 h-3" />{users.length} users
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="p-6 space-y-4 max-w-7xl mx-auto">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {ROLE_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setRoleFilter(tab.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  roleFilter === tab.value
                    ? "bg-[#1B3A5C] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowInactive(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              showInactive
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showInactive ? "bg-red-500" : "bg-slate-300"}`} />
            Inactive only
          </button>

          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["ID", "Name / Email", "Role", "Company", "City", "Status", "Last Active", "Registered", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-muted-foreground text-sm italic">
                      No users found.
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50/60 transition-colors ${!u.isActive ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[u.role] ?? ""}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.companyName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.serviceCity ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.isActive
                        ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>
                        : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Inactive</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatLastActive(u.lastActiveAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {u.isActive ? (
                          <button
                            onClick={() => setActive(u.id, false)}
                            disabled={loadingId === u.id}
                            className="text-xs px-2.5 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {loadingId === u.id ? "…" : "Deactivate"}
                          </button>
                        ) : (
                          <button
                            onClick={() => setActive(u.id, true)}
                            disabled={loadingId === u.id}
                            className="text-xs px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {loadingId === u.id ? "…" : "Activate"}
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(u.id, u.name)}
                          disabled={loadingId === u.id}
                          className="text-xs px-2.5 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 font-medium disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [secret, setSecret] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  if (!secret) {
    return (
      <AdminLogin
        onSuccess={(s, u) => {
          setSecret(s);
          setUsers(u);
        }}
      />
    );
  }

  return <AdminPanelView secret={secret} initialUsers={users} />;
}
