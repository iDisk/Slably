import { useParams, useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { useGetSubProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DirectoryLayout } from "@/components/layout/DirectoryLayout";
import { BackButton } from "@/components/BackButton";
import SEO from "@/components/SEO";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TRADE_LABELS: Record<string, string> = {
  plumber: "Plumbing", electrician: "Electrical", carpenter: "Carpentry",
  painter: "Pintura", hvac: "HVAC / Clima", roofer: "Techado",
  mason: "Masonry", landscaper: "Landscaping", ironworker: "Ironwork",
  glazier: "Glazing", concrete: "Concrete", flooring: "Flooring",
  drywall: "Drywall", insulation: "Insulation", waterproofing: "Waterproofing",
  demolition: "Demolition", excavation: "Excavation", other: "Other",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function DisplayStars({ value, large = false }: { value: number; large?: boolean }) {
  const filled = Math.round(value);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`leading-none ${large ? "text-3xl" : "text-base"} ${n <= filled ? "text-amber-400" : "text-gray-200"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-amber-400 h-2 rounded-full transition-all"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-sm font-semibold w-8 text-right tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SubProfile() {
  const params = useParams<{ subId: string }>();
  const [, navigate] = useLocation();
  const subId = Number(params.subId);

  const { data: sub, isLoading, isError } = useGetSubProfile(subId, {
    query: { enabled: !!subId && !isNaN(subId), queryKey: [`/api/subs/${subId}`] },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !sub) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-display font-bold text-foreground">Subcontratista no encontrado</h1>
        <p className="text-muted-foreground text-sm text-center">
          This profile does not exist or is not available.
        </p>
        <Button variant="outline" onClick={() => navigate("/network")}>Ir a Network</Button>
      </div>
    );
  }

  const reviewOverall = (r: (typeof sub.ratings)[0]) =>
    (r.quality + r.punctuality + r.communication) / 3;

  return (
    <DirectoryLayout>
      <SEO
        title={`${sub.name} - ${sub.category ? (TRADE_LABELS[sub.category] ?? sub.category) : "Specialist"}${sub.serviceCity ? ` in ${sub.serviceCity}` : ""} | Slably`}
        description={`${sub.name} offers ${sub.category ? (TRADE_LABELS[sub.category] ?? sub.category) : "construction"} services${sub.serviceCity ? ` in ${sub.serviceCity}` : ""}. Verified on Slably with real ratings.`}
        canonical={`https://slably.app/sub/${subId}`}
        schema={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": sub.name,
          "description": `${sub.category ? (TRADE_LABELS[sub.category] ?? sub.category) : "Specialist"} verified on Slably`,
          "url": `https://slably.app/sub/${subId}`,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": sub.serviceCity ?? "",
            "addressCountry": "US",
          },
        }}
      />
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <BackButton />
        {/* ── Profile header card ── */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xl font-display">{initials(sub.name)}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <h1 className="text-2xl font-display font-bold text-foreground leading-tight">{sub.name}</h1>
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {TRADE_LABELS[sub.category ?? ""] ?? sub.category ?? "Sin especialidad"}
                </span>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {sub.serviceCity}
                  {sub.serviceRadius ? ` · Radio: ${sub.serviceRadius} millas` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Miembro desde {format(new Date(sub.createdAt), "MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Rating overview ── */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-6">
            {sub.averages.total === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  This subcontractor has no ratings yet.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-display font-bold text-foreground tabular-nums">
                      {sub.averages.overall.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-sm">/ 5</span>
                  </div>
                  <div className="space-y-1">
                    <DisplayStars value={sub.averages.overall} large />
                    <p className="text-xs text-muted-foreground">
                      based on {sub.averages.total} {sub.averages.total === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
                    Desglose
                  </p>
                  <RatingBar label="⭐ Calidad"       value={sub.averages.quality} />
                  <RatingBar label="⭐ Puntualidad"   value={sub.averages.punctuality} />
                  <RatingBar label="⭐ Communication"  value={sub.averages.communication} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Reviews ── */}
        {sub.ratings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-display font-semibold text-foreground px-1">Reviews</h2>
            {sub.ratings.map((r, i) => (
              <Card key={i} className="border border-border shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <DisplayStars value={reviewOverall(r)} />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-foreground italic">"{r.comment}"</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── CTA ── */}
        <Button
          className="w-full gap-2 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-semibold h-12 text-base"
          onClick={() => navigate("/network")}
        >
          Request quote <ArrowRight className="w-5 h-5" />
        </Button>

        <footer className="text-center text-xs text-muted-foreground py-8 border-t mt-12">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="/terms" className="hover:underline">Terms of Service</a>
            <span>·</span>
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <span>·</span>
            <span>© 2026 Slably · Slably, Inc.</span>
          </div>
        </footer>
      </div>
    </DirectoryLayout>
  );
}
