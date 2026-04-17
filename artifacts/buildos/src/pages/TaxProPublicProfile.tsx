import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import SEO from "@/components/SEO";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TaxProPublic {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  serviceCity: string | null;
  profilePhoto: string | null;
  firmName: string | null;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export default function TaxProPublicProfile() {
  const params = useParams<{ taxProId: string }>();
  const [, navigate] = useLocation();
  const [taxPro, setTaxPro] = useState<TaxProPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.taxProId) return;
    fetch(`${API}/api/tax-pro/public-profile/${params.taxProId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setTaxPro(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.taxProId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !taxPro) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-xl font-bold text-foreground">Tax Professional not found</p>
        <p className="text-muted-foreground text-sm">This profile does not exist or is not available.</p>
        <Link href="/find">
          <Button variant="outline">Browse directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={`${taxPro.name} - Tax Pro for Contractors${taxPro.serviceCity ? ` in ${taxPro.serviceCity}` : ""} | Slably`}
        description={`${taxPro.name} specializes in tax preparation for contractors and construction businesses${taxPro.serviceCity ? ` in ${taxPro.serviceCity}` : ""}. Connect on Slably.`}
        canonical={`https://slably.app/tax-pro/${taxPro.id}`}
        schema={{
          "@context": "https://schema.org",
          "@type": "AccountingService",
          "name": taxPro.name,
          "description": "Tax preparation for contractors",
          "url": `https://slably.app/tax-pro/${taxPro.id}`,
        }}
      />

      {/* Header */}
      <header className="bg-[hsl(222,47%,11%)] px-6 py-4">
        <Link href="/">
          <img src="/slably-logo.png" alt="Slably" className="h-8 cursor-pointer" />
        </Link>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-8">
            {/* Avatar + Name */}
            <div className="flex flex-col items-center text-center mb-6">
              {taxPro.profilePhoto ? (
                <img
                  src={taxPro.profilePhoto}
                  alt={taxPro.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 mb-4"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-2xl">{initials(taxPro.name)}</span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-foreground">{taxPro.name}</h1>
              {taxPro.firmName && (
                <p className="text-muted-foreground text-sm mt-1">{taxPro.firmName}</p>
              )}
              <span className="mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                Tax Preparation for Contractors
              </span>
              {taxPro.serviceCity && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {taxPro.serviceCity}
                </p>
              )}
            </div>

            {/* Contact buttons */}
            <div className="flex gap-3 justify-center mb-8">
              {taxPro.email && (
                <a
                  href={`mailto:${taxPro.email}`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              )}
              {taxPro.phone && (
                <a
                  href={`tel:${taxPro.phone}`}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
            </div>

            {/* CTA */}
            <Button
              className="w-full bg-[#1B3A5C] hover:bg-[#152e4a] text-white"
              onClick={() => navigate("/register")}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Connect with {taxPro.name} on Slably
            </Button>
          </CardContent>
        </Card>
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
