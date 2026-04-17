import { useParams } from "wouter";
import { MapPin, Loader2, Phone } from "lucide-react";
import { useFind } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { Link } from "wouter";

export default function CityPage() {
  const params = useParams<{ cityState: string }>();
  const cityState = params.cityState ?? "";

  const parts = cityState.split("-");
  const state = parts.pop()?.toUpperCase() ?? "";
  const city = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

  const { data, isLoading } = useFind(
    { city, role: undefined, specialty: undefined },
    { query: { queryKey: ["/api/find", city, state] } },
  );

  const items = data?.data ?? [];

  function initials(name: string) {
    return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={`Contractors in ${city}, ${state} | Slably`}
        description={`Find verified contractors, builders and specialists in ${city}, ${state}. Browse real ratings and contact pros directly on Slably.`}
        canonical={`https://slably.app/contractors/${cityState}`}
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": `Contractors in ${city}, ${state}`,
          "description": `Find verified contractors in ${city}, ${state} on Slably`,
        }}
      />

      {/* Header */}
      <header className="bg-[hsl(222,47%,11%)] px-6 py-4">
        <Link href="/">
          <img src="/slably-logo.png" alt="Slably" className="h-8 cursor-pointer" />
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Contractors in {city}, {state}
          </h1>
          <p className="text-muted-foreground mt-1">
            Verified professionals available in your area
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-semibold text-foreground">
              No contractors listed yet in {city}
            </p>
            <p className="text-muted-foreground text-sm mb-6">Be the first!</p>
            <Link href="/register">
              <Button className="bg-[#F97316] hover:bg-orange-600 text-white rounded-full">
                Join as a Pro
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item: any) => (
              <Link
                key={item.id}
                href={item.role === "builder" ? `/builder/${item.id}` : `/sub/${item.id}`}
              >
                <Card className="border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{initials(item.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      {item.category && (
                        <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                      )}
                      {item.serviceCity && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />{item.serviceCity}
                        </p>
                      )}
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-blue-600 mt-1"
                        >
                          <Phone className="w-3 h-3" />{item.phone}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-muted-foreground py-8 border-t">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/terms" className="hover:underline">Terms of Service</a>
          <span>·</span>
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <span>·</span>
          <span>© 2026 Slably, Inc.</span>
        </div>
      </footer>
    </div>
  );
}
