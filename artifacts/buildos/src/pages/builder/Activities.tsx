import { useState } from "react";
import { Layers, ListChecks, Flag } from "lucide-react";

import {
  ACTIVITY_CATALOG,
  type ProjectType,
  type ActivityType,
} from "@/data/activityCatalog";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TYPE_DOT: Record<ActivityType, string> = {
  inspection: "bg-orange-400",
  draw:       "bg-emerald-500",
  contract:   "bg-blue-500",
  milestone:  "bg-[#1B3A5C]",
  default:    "bg-slate-300",
};

const TYPE_BADGE: Partial<Record<ActivityType, { label: string; className: string }>> = {
  inspection: { label: "Insp.",  className: "bg-orange-100 text-orange-700 border-orange-200" },
  draw:       { label: "Draw",   className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  contract:   { label: "Firma",  className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const PROJECT_OPTIONS: { key: ProjectType; emoji: string; label: string }[] = [
  { key: "new",  emoji: "🏗️", label: "New Construction" },
  { key: "remo", emoji: "🔨", label: "Remodeling" },
];

export default function Activities() {
  const [selected, setSelected] = useState<ProjectType | null>(null);

  const catalog = selected ? ACTIVITY_CATALOG[selected] : null;

  const totalPhases      = catalog?.phases.length ?? 0;
  const totalActivities  = catalog?.phases.reduce((s, p) => s + p.activities.length, 0) ?? 0;
  const totalMilestones  = catalog?.phases.reduce(
    (s, p) => s + p.activities.filter(a => a.type === "milestone").length,
    0,
  ) ?? 0;

  let globalCounter = 0;

  return (
    <BuilderLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Activities</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Selecciona el tipo de proyecto
          </p>
        </div>

        {/* Type selector cards */}
        <div className="grid grid-cols-2 gap-4">
          {PROJECT_OPTIONS.map(({ key, emoji, label }) => {
            const isSelected = selected === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-2xl"
              >
                <Card
                  className={[
                    "cursor-pointer transition-all duration-200 shadow-sm",
                    isSelected
                      ? "border-2 border-[#F97316] bg-orange-50/50 shadow-orange-100"
                      : "border-2 border-transparent hover:border-slate-200",
                  ].join(" ")}
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <span className="text-3xl" role="img" aria-label={label}>{emoji}</span>
                    <div>
                      <p className="font-semibold text-foreground leading-tight">{label}</p>
                      {catalog && isSelected && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {catalog.phases.length} fases
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="ml-auto w-3 h-3 rounded-full bg-[#F97316] shrink-0" />
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Stats bar */}
        {catalog && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <Layers className="w-5 h-5 text-[#1B3A5C] mx-auto mb-1" />
              <p className="text-2xl font-bold font-display text-foreground">{totalPhases}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Phases</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <ListChecks className="w-5 h-5 text-[#1B3A5C] mx-auto mb-1" />
              <p className="text-2xl font-bold font-display text-foreground">{totalActivities}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Activities</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <Flag className="w-5 h-5 text-[#1B3A5C] mx-auto mb-1" />
              <p className="text-2xl font-bold font-display text-foreground">{totalMilestones}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Hitos clave</p>
            </div>
          </div>
        )}

        {/* Phases accordion */}
        {catalog && (
          <Accordion
            key={selected}
            type="multiple"
            className="space-y-2"
          >
            {catalog.phases.map((phase, phaseIdx) => {
              const phaseStartIdx = globalCounter;
              globalCounter += phase.activities.length;

              return (
                <AccordionItem
                  key={phaseIdx}
                  value={`phase-${phaseIdx}`}
                  className="border border-border rounded-xl overflow-hidden bg-card shadow-sm px-0"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Phase number */}
                      <span className="shrink-0 w-7 h-7 rounded-full bg-[#1B3A5C] text-white text-xs font-bold flex items-center justify-center">
                        {phaseIdx + 1}
                      </span>

                      {/* Icon + title + subtitle */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{phase.icon}</span>
                          <span className="font-semibold text-sm text-foreground truncate">
                            {phase.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {phase.sub}
                        </p>
                      </div>

                      {/* Activity count */}
                      <span className="shrink-0 text-xs text-muted-foreground font-medium mr-2">
                        {phase.activities.length} act.
                      </span>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-0 pb-0">
                    <div className="border-t border-border/60">
                      {phase.activities.map((activity, actIdx) => {
                        const globalIdx = phaseStartIdx + actIdx + 1;
                        const dot = TYPE_DOT[activity.type ?? "default"];
                        const badge = activity.type ? TYPE_BADGE[activity.type] : undefined;

                        return (
                          <div
                            key={actIdx}
                            className="flex items-start gap-3 px-4 py-2.5 text-sm border-b border-border/30 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                          >
                            {/* Global number */}
                            <span className="shrink-0 w-6 text-right text-xs text-muted-foreground/70 font-mono pt-0.5">
                              {globalIdx}
                            </span>

                            {/* Type dot */}
                            <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${dot}`} />

                            {/* Text */}
                            <span className="flex-1 text-foreground leading-snug">
                              {activity.text}
                            </span>

                            {/* Badge */}
                            {badge && (
                              <span
                                className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Empty state */}
        {!catalog && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm">Selecciona un tipo de proyecto para ver las actividades</p>
          </div>
        )}
      </div>
    </BuilderLayout>
  );
}
