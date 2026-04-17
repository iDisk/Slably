import { useState, useEffect, useRef } from "react";
import SEO from "@/components/SEO";
import { useParams, useLocation } from "wouter";
import { Loader2, Phone, Mail, MessageCircle, Search, FileText, Star, ChevronDown } from "lucide-react";
import { formatInitials } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface RealtorProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  brokerage: string | null;
  licenseNumber: string | null;
  profilePhoto: string | null;
  serviceCity: string | null;
}

interface TrustedPro {
  proId: number;
  name: string;
  category: string | null;
  serviceCity: string | null;
  profilePhoto: string | null;
  note: string | null;
  role: string;
}

export default function RealtorPublicCard() {
  const params = useParams<{ realtorId: string }>();
  const [, setLocation] = useLocation();
  const prosRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<RealtorProfile | null>(null);
  const [pros, setPros]       = useState<TrustedPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.realtorId) return;
    fetch(`${API}/api/realtor/public/${params.realtorId}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setProfile(data.profile);
        setPros(Array.isArray(data.pros) ? data.pros : []);
      })
      .finally(() => setLoading(false));
  }, [params.realtorId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${profile?.name} - Realtor`, text: "Check out my professional card", url }); return; }
      catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(url);
  };

  const handleSaveContact = () => {
    if (!profile) return;
    const vcard = [
      "BEGIN:VCARD", "VERSION:3.0",
      `FN:${profile.name}`,
      profile.brokerage    ? `ORG:${profile.brokerage}` : "",
      profile.phone        ? `TEL:${profile.phone}`      : "",
      `EMAIL:${profile.email}`,
      `URL:slably.app/realtor/${profile.id}`,
      "END:VCARD",
    ].filter(Boolean).join("\n");
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${profile.name.replace(/\s+/g, "_")}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const proProfilePath = (pro: TrustedPro) =>
    pro.role === "builder" ? `/builder/${pro.proId}` : `/sub/${pro.proId}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF8" }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#1B3A5C" }} />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ background: "#FAFAF8" }}>
        <p className="text-2xl font-bold" style={{ color: "#1B3A5C" }}>Realtor not found</p>
        <p className="mt-2 text-sm" style={{ color: "#64748B" }}>This profile doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0" style={{ background: "#FAFAF8" }}>
      <SEO
        title={`${profile.name} - Licensed Realtor${profile.serviceCity ? ` in ${profile.serviceCity}` : ""} | Slably`}
        description={`${profile.name}${profile.brokerage ? ` at ${profile.brokerage}` : ""}. Connects buyers with trusted contractors and specialists.`}
        canonical={`https://slably.app/realtor/${profile.id}`}
        ogImage={profile.profilePhoto ?? undefined}
        schema={{
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          "name": profile.name,
          "url": `https://slably.app/realtor/${profile.id}`,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": profile.serviceCity ?? "",
            "addressCountry": "US",
          },
        }}
      />

      {/* ── HERO ── */}
      <div
        className="px-6 py-16 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1B2B3D 0%, #1B3A5C 100%)" }}
      >
        {/* Subtle gold accent ring behind avatar */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <div className="w-72 h-72 rounded-full border-[40px]" style={{ borderColor: "#C9A84C" }} />
        </div>

        {profile.profilePhoto ? (
          <img src={profile.profilePhoto} alt={profile.name}
            className="w-36 h-36 rounded-full object-cover mx-auto relative z-10"
            style={{ border: "4px solid #C9A84C" }} />
        ) : (
          <div className="w-36 h-36 rounded-full mx-auto relative z-10 flex items-center justify-center"
            style={{ border: "4px solid #C9A84C", background: "rgba(255,255,255,0.12)", fontSize: "2.5rem", fontWeight: 700, color: "#fff" }}>
            {formatInitials(profile.name)}
          </div>
        )}

        <h1 className="mt-5 text-3xl font-light text-white tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
          {profile.name}
        </h1>

        {profile.brokerage && (
          <p className="mt-1 text-sm font-semibold tracking-widest uppercase" style={{ color: "#C9A84C" }}>
            {profile.brokerage}
          </p>
        )}

        <p className="mt-1 text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.15em" }}>
          Licensed Real Estate Agent
        </p>

        {profile.serviceCity && (
          <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{profile.serviceCity}</p>
        )}

        {/* Contact buttons */}
        <div className="flex justify-center gap-3 mt-7 flex-wrap">
          {profile.phone && (
            <a href={`tel:${profile.phone}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
              style={{ border: "1px solid rgba(201,168,76,0.5)", color: "#C9A84C", background: "rgba(201,168,76,0.08)" }}>
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
          <a href={`mailto:${profile.email}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.07)" }}>
            <Mail className="h-4 w-4" /> Email
          </a>
          {profile.phone && (
            <a href={`sms:${profile.phone}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.07)" }}>
              <MessageCircle className="h-4 w-4" /> Text
            </a>
          )}
        </div>
      </div>

      {/* ── VALUE PROP ── */}
      <div className="px-6 py-14 text-center" style={{ background: "#fff", borderBottom: "1px solid #E8E4DC" }}>
        <p className="text-xl md:text-2xl font-light leading-relaxed" style={{ color: "#1B3A5C", fontFamily: "Georgia, serif" }}>
          I help my clients beyond<br className="hidden sm:block" /> the closing table
        </p>
        <div className="w-12 h-0.5 mx-auto my-4" style={{ background: "#C9A84C" }} />
        <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: "#64748B" }}>
          Connect with trusted professionals to make your property vision a reality.
        </p>
      </div>

      {/* ── ACTION CARDS ── */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Find Contractor */}
          <div className="rounded-2xl p-7 flex flex-col gap-4"
            style={{ background: "#1B3A5C" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.15)" }}>
              <Search className="h-6 w-6" style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Find a Contractor</h3>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                Browse verified builders and specialists in your area
              </p>
            </div>
            <button onClick={() => setLocation("/find")}
              className="mt-auto text-sm font-semibold hover:opacity-80 transition-opacity text-left"
              style={{ color: "#C9A84C" }}>
              Browse Professionals →
            </button>
          </div>

          {/* Free Estimate */}
          <div className="rounded-2xl p-7 flex flex-col gap-4"
            style={{ background: "#F97316" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Get a Free Estimate</h3>
              <p className="text-sm mt-1 text-white/70">
                Describe your project and get an instant AI-powered estimate
              </p>
            </div>
            <button onClick={() => setLocation("/register")}
              className="mt-auto text-sm font-semibold text-white hover:text-white/80 transition-opacity text-left">
              Start Free Estimate →
            </button>
          </div>

          {/* My Pros */}
          <div className="rounded-2xl p-7 flex flex-col gap-4"
            style={{ background: "#EDEAE3", border: "1px solid #DDD8CE" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.15)" }}>
              <Star className="h-6 w-6" style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "#1B3A5C" }}>My Trusted Pros</h3>
              <p className="text-sm mt-1" style={{ color: "#64748B" }}>
                Hand-picked professionals I personally recommend
              </p>
            </div>
            <button
              onClick={() => prosRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="mt-auto flex items-center gap-1 text-sm font-semibold hover:opacity-70 transition-opacity text-left"
              style={{ color: "#1B3A5C" }}>
              See My Pros <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── TRUSTED PROS ── */}
      <div ref={prosRef} className="max-w-4xl mx-auto px-4 pb-16">
        <div className="mb-7">
          <h2 className="text-2xl font-light" style={{ color: "#1B3A5C", fontFamily: "Georgia, serif" }}>
            Professionals I Recommend
          </h2>
          <div className="w-10 h-0.5 mt-2" style={{ background: "#C9A84C" }} />
          <p className="text-sm mt-2" style={{ color: "#64748B" }}>Hand-picked by {profile.name}</p>
        </div>

        {pros.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: "#fff", border: "1px solid #E8E4DC" }}>
            <p className="text-sm italic" style={{ color: "#64748B" }}>
              Coming soon — {profile.name} is curating a list of trusted professionals for their clients.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pros.map(pro => (
              <div key={pro.proId} className="rounded-2xl p-5 flex items-start gap-4"
                style={{ background: "#fff", border: "1px solid #E8E4DC" }}>
                <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm"
                  style={{ background: "#EDF2F7", color: "#1B3A5C" }}>
                  {pro.profilePhoto
                    ? <img src={pro.profilePhoto} className="w-14 h-14 object-cover" alt={pro.name} />
                    : formatInitials(pro.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: "#1B3A5C" }}>{pro.name}</p>
                  {pro.category    && <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{pro.category}</p>}
                  {pro.serviceCity && <p className="text-xs" style={{ color: "#64748B" }}>{pro.serviceCity}</p>}
                  {pro.note && (
                    <p className="text-xs mt-1.5 italic leading-relaxed" style={{ color: "#94A3B8" }}>
                      "{pro.note}"
                    </p>
                  )}
                  <button onClick={() => setLocation(proProfilePath(pro))}
                    className="mt-2 text-xs font-semibold hover:underline" style={{ color: "#C9A84C" }}>
                    View Profile →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="px-6 py-8 text-center" style={{ background: "#fff", borderTop: "1px solid #E8E4DC" }}>
        <p className="text-xs" style={{ color: "#94A3B8" }}>
          Powered by{" "}
          <span className="font-semibold" style={{ color: "#1B3A5C" }}>Slably</span>
        </p>
        <div className="flex justify-center gap-5 mt-1.5">
          <a href="/terms" className="text-xs hover:opacity-70" style={{ color: "#94A3B8" }}>Terms</a>
          <a href="/privacy" className="text-xs hover:opacity-70" style={{ color: "#94A3B8" }}>Privacy</a>
        </div>
      </div>

      {/* ── STICKY MOBILE BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 p-3 flex gap-2 md:hidden z-50"
        style={{ background: "#fff", borderTop: "1px solid #E8E4DC" }}>
        <button onClick={handleSaveContact}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#1B3A5C" }}>
          💾 Save Contact
        </button>
        <button onClick={handleShare}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#F97316" }}>
          📤 Share
        </button>
      </div>
    </div>
  );
}
