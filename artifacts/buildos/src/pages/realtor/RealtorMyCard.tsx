import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { RealtorLayout } from "@/components/layout/RealtorLayout";
import { toast } from "sonner";
import { Share2, Phone, Mail, MessageCircle, Search, FileText, Star, ChevronDown, Info } from "lucide-react";
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

export default function RealtorMyCard() {
  const { user }   = useAuth();
  const [, setLocation] = useLocation();
  const prosRef    = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<RealtorProfile | null>(null);
  const [pros, setPros]       = useState<TrustedPro[]>([]);

  useEffect(() => {
    fetch(`${API}/api/realtor/profile`).then(r => r.json()).then(setProfile).catch(() => {});
    fetch(`${API}/api/realtor/trusted-pros`).then(r => r.json()).then(d => setPros(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const shareUrl = `${window.location.origin}/realtor/${user?.id}`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied! Share it with your clients.");
    } catch { toast.error("Could not copy link."); }
  };

  const proProfilePath = (pro: TrustedPro) =>
    pro.role === "builder" ? `/builder/${pro.proId}` : `/sub/${pro.proId}`;

  return (
    <RealtorLayout>
      <div className="max-w-3xl space-y-6">

        {/* ── Banner ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl px-5 py-4"
          style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}>
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#4F46E5" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1E1B4B" }}>This is how your card looks to your clients</p>
              <p className="text-xs mt-0.5" style={{ color: "#6366F1" }}>
                Share this link: <span className="font-mono">{shareUrl}</span>
              </p>
            </div>
          </div>
          <button onClick={handleShare}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: "#F97316" }}>
            <Share2 className="h-4 w-4" /> Share My Card
          </button>
        </div>

        {/* ── Card Preview ── */}
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: "1px solid #E8E4DC" }}>

          {/* Hero */}
          <div className="px-6 py-12 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #1B2B3D 0%, #1B3A5C 100%)" }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
              <div className="w-64 h-64 rounded-full border-[36px]" style={{ borderColor: "#C9A84C" }} />
            </div>

            {profile?.profilePhoto ? (
              <img src={profile.profilePhoto} alt={profile.name}
                className="w-32 h-32 rounded-full object-cover mx-auto relative z-10"
                style={{ border: "4px solid #C9A84C" }} />
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto relative z-10 flex items-center justify-center"
                style={{ border: "4px solid #C9A84C", background: "rgba(255,255,255,0.12)", fontSize: "2.2rem", fontWeight: 700, color: "#fff" }}>
                {formatInitials(profile?.name || user?.name || "R")}
              </div>
            )}

            <h1 className="mt-5 text-3xl font-light text-white tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
              {profile?.name || user?.name}
            </h1>
            {profile?.brokerage && (
              <p className="mt-1 text-sm font-semibold tracking-widest uppercase" style={{ color: "#C9A84C" }}>
                {profile.brokerage}
              </p>
            )}
            <p className="mt-1 text-xs font-medium tracking-widest" style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.15em" }}>
              LICENSED REAL ESTATE AGENT
            </p>
            {profile?.serviceCity && (
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{profile.serviceCity}</p>
            )}

            <div className="flex justify-center gap-3 mt-6 flex-wrap">
              {profile?.phone && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                  style={{ border: "1px solid rgba(201,168,76,0.5)", color: "#C9A84C", background: "rgba(201,168,76,0.08)" }}>
                  <Phone className="h-3.5 w-3.5" /> Call
                </span>
              )}
              <span className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.07)" }}>
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              {profile?.phone && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.07)" }}>
                  <MessageCircle className="h-3.5 w-3.5" /> Text
                </span>
              )}
            </div>
          </div>

          {/* Value Prop */}
          <div className="px-6 py-10 text-center" style={{ background: "#fff", borderBottom: "1px solid #E8E4DC" }}>
            <p className="text-xl font-light leading-relaxed" style={{ color: "#1B3A5C", fontFamily: "Georgia, serif" }}>
              I help my clients beyond the closing table
            </p>
            <div className="w-10 h-0.5 mx-auto my-4" style={{ background: "#C9A84C" }} />
            <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: "#64748B" }}>
              Connect with trusted professionals to make your property vision a reality.
            </p>
          </div>

          {/* Action Cards */}
          <div className="px-5 py-8" style={{ background: "#FAFAF8" }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "#1B3A5C" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)" }}>
                  <Search className="h-5 w-5" style={{ color: "#C9A84C" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Find a Contractor</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Browse verified builders in your area</p>
                </div>
                <span className="text-xs font-semibold" style={{ color: "#C9A84C" }}>Browse Professionals →</span>
              </div>

              <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "#F97316" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Get a Free Estimate</p>
                  <p className="text-xs mt-0.5 text-white/70">Instant AI-powered estimate</p>
                </div>
                <span className="text-xs font-semibold text-white">Start Free Estimate →</span>
              </div>

              <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "#EDEAE3", border: "1px solid #DDD8CE" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)" }}>
                  <Star className="h-5 w-5" style={{ color: "#C9A84C" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#1B3A5C" }}>My Trusted Pros</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Hand-picked professionals</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#1B3A5C" }}>
                  See My Pros <ChevronDown className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Trusted Pros */}
          <div ref={prosRef} className="px-5 pb-8" style={{ background: "#FAFAF8" }}>
            <div className="mb-5">
              <h2 className="text-xl font-light" style={{ color: "#1B3A5C", fontFamily: "Georgia, serif" }}>
                Professionals I Recommend
              </h2>
              <div className="w-8 h-0.5 mt-1.5" style={{ background: "#C9A84C" }} />
              <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>Hand-picked by {profile?.name || user?.name}</p>
            </div>

            {pros.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: "#fff", border: "1px solid #E8E4DC" }}>
                <p className="text-sm italic" style={{ color: "#94A3B8" }}>
                  No trusted pros yet.{" "}
                  <button onClick={() => setLocation("/realtor/pros")} className="underline" style={{ color: "#C9A84C" }}>
                    Add your first pro →
                  </button>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pros.map(pro => (
                  <div key={pro.proId} className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: "#fff", border: "1px solid #E8E4DC" }}>
                    <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs"
                      style={{ background: "#EDF2F7", color: "#1B3A5C" }}>
                      {pro.profilePhoto
                        ? <img src={pro.profilePhoto} className="w-12 h-12 object-cover" alt={pro.name} />
                        : formatInitials(pro.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "#1B3A5C" }}>{pro.name}</p>
                      {pro.category    && <p className="text-xs" style={{ color: "#64748B" }}>{pro.category}</p>}
                      {pro.serviceCity && <p className="text-xs" style={{ color: "#64748B" }}>{pro.serviceCity}</p>}
                      {pro.note && <p className="text-xs mt-1 italic" style={{ color: "#94A3B8" }}>"{pro.note}"</p>}
                      <button onClick={() => setLocation(proProfilePath(pro))}
                        className="mt-1.5 text-xs font-semibold" style={{ color: "#C9A84C" }}>
                        View Profile →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-5 text-center" style={{ background: "#fff", borderTop: "1px solid #E8E4DC" }}>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Powered by <span className="font-semibold" style={{ color: "#1B3A5C" }}>Slably</span>
            </p>
          </div>
        </div>
      </div>
    </RealtorLayout>
  );
}
