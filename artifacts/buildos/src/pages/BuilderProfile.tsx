import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Loader2, ArrowRight, AlertCircle, Image as ImageIcon } from "lucide-react";
import { useGetBuilderProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DirectoryLayout } from "@/components/layout/DirectoryLayout";
import { BackButton } from "@/components/BackButton";
import SEO from "@/components/SEO";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function cityFromAddress(address: string): string {
  return address.split(",")[0]?.trim() ?? address;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  new:  "New Construction",
  remo: "Remodeling",
};

function BadgePill({ type }: { type: string }) {
  if (type === "verified")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        ✓ Verificado
      </span>
    );
  if (type === "top_rated")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        ★ Top Rated
      </span>
    );
  if (type === "experienced")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
        🏆 Experimentado
      </span>
    );
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BuilderProfile() {
  const params = useParams<{ builderId: string }>();
  const [, navigate] = useLocation();
  const builderId = Number(params.builderId);

  const { data: builder, isLoading, isError } = useGetBuilderProfile(builderId, {
    query: { enabled: !!builderId && !isNaN(builderId), queryKey: [`/api/builders/${builderId}`] },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !builder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-display font-bold text-foreground">Constructor no encontrado</h1>
        <p className="text-muted-foreground text-sm text-center">
          This profile does not exist or is not available.
        </p>
        <Button variant="outline" onClick={() => navigate("/network")}>Ir a Network</Button>
      </div>
    );
  }

  return (
    <DirectoryLayout>
      <SEO
        title={`${builder.companyName ?? builder.name} - Contractor${builder.state ? ` in ${builder.state}` : ""} | Slably`}
        description={`${builder.companyName ?? builder.name} is a verified contractor${builder.state ? ` in ${builder.state}` : ""}. View portfolio, ratings and contact information on Slably.`}
        canonical={`https://slably.app/builder/${builderId}`}
        ogImage={builder.companyLogo ?? undefined}
        schema={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": builder.companyName ?? builder.name,
          "description": "Verified contractor on Slably",
          "url": `https://slably.app/builder/${builderId}`,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": builder.state ?? "",
            "addressCountry": "US",
          },
          ...(builder.stats.averageRating > 0 ? {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": builder.stats.averageRating,
              "reviewCount": builder.stats.totalRatings || 1,
            },
          } : {}),
        }}
      />
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <BackButton />
        {/* ── Profile header card ── */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-5">
              {/* Company logo or initials */}
              {builder.companyLogo ? (
                <div className="w-16 h-16 rounded-xl border border-border overflow-hidden shrink-0 bg-white flex items-center justify-center">
                  <img
                    src={builder.companyLogo}
                    alt={builder.companyName ?? builder.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xl font-display">{initials(builder.name)}</span>
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Company name as main title */}
                <h1 className="text-2xl font-display font-bold text-foreground leading-tight">
                  {builder.companyName ?? builder.name}
                </h1>
                {/* Builder name below if company name exists */}
                {builder.companyName && (
                  <p className="text-sm text-muted-foreground">{builder.name}</p>
                )}
                {/* State */}
                {builder.state && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {builder.state}
                  </p>
                )}
                {/* Member since */}
                <p className="text-xs text-muted-foreground">
                  Miembro desde {format(new Date(builder.createdAt), "MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>

            {/* Badges */}
            {builder.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {builder.badges.map(b => <BadgePill key={b} type={b} />)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Stats pills ── */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-display font-bold text-foreground tabular-nums">
                {builder.stats.totalProjects}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">Completed projects</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-display font-bold text-foreground tabular-nums">
                {builder.stats.averageRating > 0 ? builder.stats.averageRating.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">★ Rating</p>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-display font-bold text-foreground tabular-nums">
                {builder.stats.totalRatings}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">Reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Portfolio ── */}
        <div className="space-y-3">
          <h2 className="text-base font-display font-semibold text-foreground px-1">Portafolio</h2>
          {builder.portfolio.length === 0 ? (
            <Card className="border border-border shadow-sm">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No projects in the portfolio yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {builder.portfolio.map(project => (
                <Card key={project.id} className="border border-border shadow-sm overflow-hidden">
                  {/* Photo or placeholder */}
                  <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                    {project.photos[0] ? (
                      <img
                        src={project.photos[0].fileUrl}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                      {project.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {project.projectType && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {PROJECT_TYPE_LABELS[project.projectType] ?? project.projectType}
                        </span>
                      )}
                      {project.address && (
                        <span className="text-xs text-muted-foreground">
                          {cityFromAddress(project.address)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        <Button
          className="w-full gap-2 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-semibold h-12 text-base"
          onClick={() => navigate("/network")}
        >
          Publicar solicitud de trabajo <ArrowRight className="w-5 h-5" />
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
