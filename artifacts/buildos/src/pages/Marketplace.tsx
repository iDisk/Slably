import { useLocation } from "wouter";
import { BuilderLayout } from "@/components/layout/BuilderLayout";

interface MarketCard {
  emoji: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  buttonLabel: string;
  href: string;
  accent: string;
  iconBg: string;
}

const CARDS: MarketCard[] = [
  {
    emoji: "🧾",
    title: "Tax Pros",
    description: "Find certified accountants and tax preparers who specialize in construction businesses.",
    badge: "Available Now",
    badgeColor: "bg-emerald-100 text-emerald-700",
    buttonLabel: "Browse Tax Pros",
    href: "/find?role=accountant",
    accent: "border-t-4 border-[#1B3A5C]",
    iconBg: "bg-[#1B3A5C]/10 text-[#1B3A5C]",
  },
  {
    emoji: "🏪",
    title: "Suppliers",
    description: "Connect with material suppliers, lumber yards and hardware stores near you.",
    badge: "Available Now",
    badgeColor: "bg-emerald-100 text-emerald-700",
    buttonLabel: "Browse Suppliers",
    href: "/find?role=supplier",
    accent: "border-t-4 border-orange-500",
    iconBg: "bg-orange-100 text-orange-600",
  },
  {
    emoji: "🛡️",
    title: "Insurance",
    description: "Get competitive quotes for contractor liability, workers' comp and builder's risk insurance.",
    badge: "Coming Soon",
    badgeColor: "bg-slate-100 text-slate-500",
    buttonLabel: "Get Notified",
    href: "#",
    accent: "border-t-4 border-emerald-500",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    emoji: "🚧",
    title: "Equipment Rental",
    description: "Rent tools, heavy machinery and scaffolding from verified local equipment providers.",
    badge: "Coming Soon",
    badgeColor: "bg-slate-100 text-slate-500",
    buttonLabel: "Get Notified",
    href: "#",
    accent: "border-t-4 border-amber-500",
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    emoji: "⚖️",
    title: "Legal & Contracts",
    description: "Access attorney-reviewed contract templates and connect with construction law specialists.",
    badge: "Coming Soon",
    badgeColor: "bg-slate-100 text-slate-500",
    buttonLabel: "Get Notified",
    href: "#",
    accent: "border-t-4 border-violet-500",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    emoji: "🎓",
    title: "Training & Certs",
    description: "OSHA certifications, project management courses and license prep for your team.",
    badge: "Coming Soon",
    badgeColor: "bg-slate-100 text-slate-500",
    buttonLabel: "Get Notified",
    href: "#",
    accent: "border-t-4 border-teal-500",
    iconBg: "bg-teal-100 text-teal-600",
  },
];

export default function Marketplace() {
  const [, navigate] = useLocation();

  const handleCard = (href: string) => {
    if (href === "#") return;
    navigate(href);
  };

  return (
    <BuilderLayout>
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1B3A5C] to-[#2d5a8e] py-8 px-8 mb-8 flex items-center gap-6">
        <img src="/slably-logo-dark.png" alt="Slably" style={{ height: 44 }} />
        <div>
          <h1 className="text-white text-2xl font-display font-bold leading-tight">Marketplace</h1>
          <p className="text-white/70 text-sm mt-0.5">Everything your business needs in one place</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.map((card) => (
          <div
            key={card.title}
            className={`bg-white rounded-2xl shadow-sm border border-border ${card.accent} flex flex-col overflow-hidden`}
          >
            <div className="p-6 flex-1 space-y-3">
              {/* Icon + badge row */}
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${card.iconBg}`}>
                  {card.emoji}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-display font-bold text-foreground">{card.title}</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => handleCard(card.href)}
                disabled={card.href === "#"}
                className={`w-full py-2.5 rounded-full text-sm font-semibold transition-colors
                  ${card.href === "#"
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-[#1B3A5C] hover:bg-[#152d4a] text-white"
                  }`}
              >
                {card.buttonLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </BuilderLayout>
  );
}
