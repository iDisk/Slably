import { useState, useEffect } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListPhases,
  useBulkCreatePhases,
  useUpdatePhase,
  getListPhasesQueryKey,
  type Phase,
} from "@workspace/api-client-react";
import { ACTIVITY_CATALOG, type ProjectType, type ActivityType } from "@/data/activityCatalog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TYPE_DOT: Record<string, string> = {
  inspection: "bg-[#F97316]",
  draw:       "bg-green-600",
  contract:   "bg-blue-600",
  milestone:  "bg-[#1B3A5C]",
  default:    "bg-slate-300",
};

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  inspection: { label: "Insp.",  className: "bg-orange-100 text-orange-700 border-orange-200" },
  draw:       { label: "Draw",   className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  contract:   { label: "Firma",  className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const PROJECT_OPTIONS: { key: ProjectType; emoji: string; label: string }[] = [
  { key: "new",  emoji: "🏗️", label: "Nueva Construcción" },
  { key: "remo", emoji: "🔨", label: "Remodelación" },
];

// Build a map from phaseTitle → icon from both catalogs
const PHASE_ICON_MAP: Record<string, string> = {};
for (const catalog of Object.values(ACTIVITY_CATALOG)) {
  for (const phase of catalog.phases) {
    PHASE_ICON_MAP[phase.title] = phase.icon;
  }
}

interface PhasesTabProps {
  projectId: number;
  projectType: string | null;
}

interface PhaseGroup {
  title: string;
  icon: string;
  items: Phase[];
}

function groupPhases(phases: Phase[]): PhaseGroup[] {
  const map = new Map<string, Phase[]>();
  for (const p of phases) {
    if (!map.has(p.phaseTitle)) map.set(p.phaseTitle, []);
    map.get(p.phaseTitle)!.push(p);
  }
  return Array.from(map.entries()).map(([title, items]) => ({
    title,
    icon: PHASE_ICON_MAP[title] ?? "📋",
    items,
  }));
}

export function PhasesTab({ projectId, projectType }: PhasesTabProps) {
  const queryClient = useQueryClient();

  // localType: tracks what type is active (from prop or just selected)
  const [localType, setLocalType] = useState<string | null>(projectType);
  // showSelector: force back to selection screen
  const [showSelector, setShowSelector] = useState<boolean>(projectType === null);
  // localPhases: optimistic copy for checkbox updates
  const [localPhases, setLocalPhases] = useState<Phase[]>([]);

  // Keep localType in sync if parent prop changes
  useEffect(() => {
    setLocalType(projectType);
    if (projectType !== null) setShowSelector(false);
  }, [projectType]);

  const inSelector = showSelector || localType === null;

  const { data: fetchedPhases, isLoading: phasesLoading } = useListPhases(projectId, {
    query: { enabled: !inSelector },
  });

  // Sync fetched phases into localPhases
  useEffect(() => {
    if (fetchedPhases) setLocalPhases(fetchedPhases as Phase[]);
  }, [fetchedPhases]);

  const bulkMutation = useBulkCreatePhases();
  const updateMutation = useUpdatePhase();

  function handleSelectType(type: ProjectType) {
    const catalog = ACTIVITY_CATALOG[type];
    let sortOrder = 0;
    const phases = catalog.phases.flatMap((phase) =>
      phase.activities.map((act) => ({
        phase_title:   phase.title,
        activity_text: act.text,
        activity_type: (act.type && act.type !== "default") ? act.type : null,
        sort_order:    sortOrder++,
      }))
    );

    bulkMutation.mutate(
      { id: projectId, data: { project_type: type, phases } },
      {
        onSuccess: (created) => {
          setLocalType(type);
          setLocalPhases(created as Phase[]);
          setShowSelector(false);
          queryClient.invalidateQueries({ queryKey: getListPhasesQueryKey(projectId) });
          toast.success(`Plan de ${catalog.label} cargado — ${created.length} actividades`);
        },
        onError: () => {
          toast.error("Error al cargar el plan de actividades");
        },
      }
    );
  }

  function handleToggleCompleted(phase: Phase) {
    const newCompleted = !phase.completed;
    // Optimistic update
    setLocalPhases((prev) =>
      prev.map((p) => (p.id === phase.id ? { ...p, completed: newCompleted } : p))
    );
    updateMutation.mutate(
      { id: projectId, phaseId: phase.id, data: { completed: newCompleted } },
      {
        onError: () => {
          // Revert on error
          setLocalPhases((prev) =>
            prev.map((p) => (p.id === phase.id ? { ...p, completed: !newCompleted } : p))
          );
          toast.error("Error al actualizar la actividad");
        },
      }
    );
  }

  function handleChangeType() {
    const ok = window.confirm(
      "Esto borrará las actividades actuales. ¿Continuar?"
    );
    if (!ok) return;
    setLocalType(null);
    setLocalPhases([]);
    setShowSelector(true);
  }

  const completedCount = localPhases.filter((p) => p.completed).length;
  const totalCount = localPhases.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── ESTADO 1: Selector ────────────────────────────────────────────────────
  if (inSelector) {
    return (
      <div className="space-y-6 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            Selecciona el tipo de proyecto para cargar el plan de actividades
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Se creará un checklist con todas las fases y actividades estándar
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {PROJECT_OPTIONS.map(({ key, emoji, label }) => {
            const catalog = ACTIVITY_CATALOG[key];
            const totalActs = catalog.phases.reduce((s, p) => s + p.activities.length, 0);
            const isLoading = bulkMutation.isPending && localType === null;

            return (
              <button
                key={key}
                disabled={bulkMutation.isPending}
                onClick={() => handleSelectType(key)}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Card className="cursor-pointer transition-all duration-200 shadow-sm border-2 border-transparent hover:border-slate-200 hover:shadow-orange-50">
                  <CardContent className="p-5 flex items-center gap-4">
                    {isLoading ? (
                      <Loader2 className="w-8 h-8 text-[#F97316] animate-spin shrink-0" />
                    ) : (
                      <span className="text-3xl" role="img" aria-label={label}>{emoji}</span>
                    )}
                    <div>
                      <p className="font-semibold text-foreground leading-tight">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {catalog.phases.length} fases · {totalActs} actividades
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── ESTADO 2: Lista con acordeón ──────────────────────────────────────────
  if (phasesLoading && localPhases.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando actividades…</span>
      </div>
    );
  }

  const groups = groupPhases(localPhases);
  const typeLabel = localType === "new" ? "Nueva Construcción" : "Remodelación";

  return (
    <div className="space-y-4 py-2">

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {completedCount} de {totalCount} actividades completadas
          </span>
          <span className="text-xs font-semibold text-[#F97316]">{progressPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#F97316] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Tipo: <span className="font-medium text-foreground">{typeLabel}</span>
          {" · "}
          {groups.length} fases
        </p>
      </div>

      {/* Accordion */}
      <Accordion type="multiple" className="space-y-2">
        {groups.map((group, groupIdx) => {
          const groupCompleted = group.items.filter((i) => i.completed).length;
          return (
            <AccordionItem
              key={groupIdx}
              value={`group-${groupIdx}`}
              className="border border-border rounded-xl overflow-hidden bg-card shadow-sm px-0"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#1B3A5C] text-white text-xs font-bold flex items-center justify-center">
                    {groupIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{group.icon}</span>
                      <span className="font-semibold text-sm text-foreground truncate">
                        {group.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {groupCompleted}/{group.items.length} completadas
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground font-medium mr-2">
                    {group.items.length} act.
                  </span>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-0 pb-0">
                <div className="border-t border-border/60">
                  {group.items.map((item) => {
                    const dotClass = TYPE_DOT[item.activityType ?? "default"] ?? TYPE_DOT.default;
                    const badge = item.activityType ? TYPE_BADGE[item.activityType] : undefined;

                    return (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 px-4 py-2.5 text-sm border-b border-border/30 last:border-b-0 hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleCompleted(item)}
                          className="mt-0.5 shrink-0 accent-[#F97316] w-4 h-4 cursor-pointer"
                        />

                        {/* Global number */}
                        <span className="shrink-0 w-6 text-right text-xs text-muted-foreground/70 font-mono pt-0.5">
                          {item.sortOrder + 1}
                        </span>

                        {/* Type dot */}
                        <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${dotClass}`} />

                        {/* Text */}
                        <span
                          className={[
                            "flex-1 leading-snug",
                            item.completed
                              ? "line-through text-muted-foreground"
                              : "text-foreground",
                          ].join(" ")}
                        >
                          {item.activityText}
                        </span>

                        {/* Badge */}
                        {badge && (
                          <span
                            className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Change type button */}
      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleChangeType}
          className="text-muted-foreground hover:text-foreground gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Cambiar tipo de proyecto
        </Button>
      </div>
    </div>
  );
}
