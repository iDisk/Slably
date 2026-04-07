import { useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Loader2, Search } from "lucide-react";
import { useFind } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TRADE_LABELS: Record<string, string> = {
  plumber: "Plomería", electrician: "Electricidad", carpenter: "Carpintería",
  painter: "Pintura", hvac: "HVAC / Clima", roofer: "Techado",
  mason: "Albañilería", landscaper: "Jardinería", ironworker: "Herrería",
  glazier: "Vidriería", concrete: "Concreto", flooring: "Pisos",
  drywall: "Tablaroca", insulation: "Aislamiento", waterproofing: "Impermeabilización",
  demolition: "Demolición", excavation: "Excavación", other: "Otro",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Find() {
  const [, navigate] = useLocation();
  const [role, setRole]           = useState<"builder" | "subcontractor" | "">("");
  const [city, setCity]           = useState("");
  const [specialty, setSpecialty] = useState("");

  const { data, isLoading } = useFind(
    {
      role:      role || undefined,
      city:      city || undefined,
      specialty: specialty || undefined,
    },
    { query: { queryKey: ["/api/find", role, city, specialty] } },
  );

  const items = data?.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-[hsl(222,47%,11%)] px-6 py-4">
        <img src="/slably-logo.png" alt="Slably" className="h-8" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        {/* Heading */}
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Encuentra profesionales de construcción
          </h1>
          <p className="text-sm text-muted-foreground">
            Conecta con constructores y subcontratistas verificados.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Role toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden w-fit">
            {(
              [
                { value: "",              label: "Todos" },
                { value: "builder",       label: "Constructores" },
                { value: "subcontractor", label: "Subcontratistas" },
              ] as const
            ).map(opt => (
              <button
                key={opt.value}
                onClick={() => { setRole(opt.value); setSpecialty(""); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  role === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* City + specialty */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-xs">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ciudad o estado..."
                value={city}
                onChange={e => setCity(e.target.value)}
                className="pl-9"
              />
            </div>
            {role !== "builder" && (
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas las especialidades</option>
                {Object.entries(TRADE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm text-center">
              No encontramos profesionales con esos filtros.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground px-1">
              {data?.total} profesional{data?.total !== 1 ? "es" : ""} encontrado{data?.total !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {items.map(item => (
                <Card key={item.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    {/* Avatar */}
                    <div className="flex items-center gap-3">
                      {item.profilePhoto ? (
                        <img
                          src={item.profilePhoto}
                          alt={item.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : item.companyLogo ? (
                        <div className="w-10 h-10 rounded-lg border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={item.companyLogo} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-sm font-display">{initials(item.name)}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight truncate">
                          {item.companyName ?? item.name}
                        </p>
                        {item.companyName && (
                          <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                        )}
                      </div>
                    </div>

                    {/* Specialty (sub) o State (builder) */}
                    {item.role === "subcontractor" && item.category && (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {TRADE_LABELS[item.category] ?? item.category}
                      </span>
                    )}
                    {item.role === "builder" && item.state && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />{item.state}
                      </p>
                    )}
                    {item.role === "subcontractor" && item.serviceCity && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />{item.serviceCity}
                      </p>
                    )}

                    {/* Rating */}
                    {item.stats.totalRatings > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ★{" "}
                        <span className="font-semibold text-foreground">
                          {item.stats.averageRating.toFixed(1)}
                        </span>
                        {" "}({item.stats.totalRatings} reseña{item.stats.totalRatings !== 1 ? "s" : ""})
                      </p>
                    )}

                    {/* Badges */}
                    {item.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.badges.includes("verified") && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">✓ Verificado</span>
                        )}
                        {item.badges.includes("top_rated") && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">★ Top</span>
                        )}
                        {item.badges.includes("experienced") && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">🏆 Exp.</span>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-8"
                      onClick={() => navigate(item.role === "builder" ? `/builder/${item.id}` : `/sub/${item.id}`)}
                    >
                      Ver perfil
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Powered by Slably · Gestión de construcción
        </p>
      </div>
    </div>
  );
}
