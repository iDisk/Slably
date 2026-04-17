import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X, Search as SearchIcon } from "lucide-react";
import { RealtorLayout } from "@/components/layout/RealtorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInitials } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TrustedPro {
  proId: number;
  name: string;
  category: string | null;
  serviceCity: string | null;
  profilePhoto: string | null;
  note: string | null;
  role: string;
}

interface SearchResult {
  id: number;
  name: string;
  category: string | null;
  serviceCity: string | null;
  profilePhoto: string | null;
  role: string;
}

export default function RealtorPros() {
  const [pros, setPros] = useState<TrustedPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  const loadPros = () => {
    fetch(`${API}/api/realtor/trusted-pros`)
      .then(r => r.json())
      .then((data: TrustedPro[]) => setPros(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPros(); }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/api/network?search=${encodeURIComponent(search)}&role=subcontractor`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (proId: number) => {
    setDeletingId(proId);
    try {
      await fetch(`${API}/api/realtor/trusted-pros/${proId}`, { method: "DELETE" });
      setPros(p => p.filter(x => x.proId !== proId));
      toast.success("Pro removed.");
    } catch { toast.error("Failed to remove."); }
    finally { setDeletingId(null); }
  };

  const handleAdd = async (pro: SearchResult) => {
    setAddingId(pro.id);
    try {
      const res = await fetch(`${API}/api/realtor/trusted-pros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: pro.id }),
      });
      if (res.status === 409) { toast("Already in your list."); return; }
      if (!res.ok) throw new Error();
      toast.success(`${pro.name} added to your list.`);
      loadPros();
      setShowModal(false);
      setSearch("");
    } catch { toast.error("Failed to add pro."); }
    finally { setAddingId(null); }
  };

  return (
    <RealtorLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">My Trusted Pros</h1>
            <p className="text-sm text-muted-foreground mt-1">Professionals you personally recommend to your clients.</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add a Pro
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : pros.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">No pros yet. Add your first trusted professional.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pros.map(pro => (
              <div key={pro.proId} className="bg-white rounded-2xl border border-border p-4 flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {pro.profilePhoto
                    ? <img src={pro.profilePhoto} className="w-12 h-12 rounded-full object-cover" alt={pro.name} />
                    : formatInitials(pro.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{pro.name}</p>
                  <p className="text-xs text-muted-foreground">{[pro.category, pro.serviceCity].filter(Boolean).join(" · ")}</p>
                  {pro.note && <p className="text-xs text-muted-foreground/70 mt-1 italic">"{pro.note}"</p>}
                </div>
                <button
                  onClick={() => handleDelete(pro.proId)}
                  disabled={deletingId === pro.proId}
                  className="flex-shrink-0 p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  {deletingId === pro.proId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Pro Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Add a Trusted Pro</h2>
              <button onClick={() => { setShowModal(false); setSearch(""); setResults([]); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5">
              <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or city..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {searching && (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              )}

              {!searching && results.length === 0 && search.trim() && (
                <p className="text-center text-muted-foreground text-sm py-4">No results found.</p>
              )}

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {results.map(r => {
                  const alreadyAdded = pros.some(p => p.proId === r.id);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {r.profilePhoto
                          ? <img src={r.profilePhoto} className="w-10 h-10 rounded-full object-cover" alt={r.name} />
                          : formatInitials(r.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{[r.category, r.serviceCity].filter(Boolean).join(" · ")}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyAdded ? "outline" : "default"}
                        disabled={alreadyAdded || addingId === r.id}
                        onClick={() => !alreadyAdded && handleAdd(r)}
                      >
                        {addingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : alreadyAdded ? "Added" : "+ Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </RealtorLayout>
  );
}
