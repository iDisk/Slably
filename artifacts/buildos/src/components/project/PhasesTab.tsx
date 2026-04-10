import { useState, useEffect } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListPhases,
  useBulkCreatePhases,
  useUpdatePhase,
  getListPhasesQueryKey,
  type Phase,
} from "@workspace/api-client-react";
import { ACTIVITY_CATALOG, type ProjectType } from "@/data/activityCatalog";
import { Card, CardContent } from "@/components/ui/card";
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

interface PendingActivity {
  phase_title:   string;
  activity_text: string;
  activity_type: string | null;
  sort_order:    number;
  included:      boolean;
}

interface PendingGroup {
  title:    string;
  icon:     string;
  items:    PendingActivity[];
  startIdx: number;
}

interface PhaseGroup {
  title: string;
  icon:  string;
  items: Phase[];
}

type ViewState = "selector" | "customizer" | "execution";

function groupPending(activities: PendingActivity[]): PendingGroup[] {
  const map = new Map<string, PendingActivity[]>();
  for (const a of activities) {
    if (!map.has(a.phase_title)) map.set(a.phase_title, []);
    map.get(a.phase_title)!.push(a);
  }
  let startIdx = 0;
  return Array.from(map.entries()).map(([title, items]) => {
    const group: PendingGroup = { title, icon: PHASE_ICON_MAP[title] ?? "📋", items, startIdx };
    startIdx += items.length;
    return group;
  });
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

function buildFromCatalog(type: ProjectType): PendingActivity[] {
  const catalog = ACTIVITY_CATALOG[type];
  let sortOrder = 0;
  return catalog.phases.flatMap((phase) =>
    phase.activities.map((act) => ({
      phase_title:   phase.title,
      activity_text: act.text,
      activity_type: (act.type && act.type !== "default") ? act.type : null,
      sort_order:    sortOrder++,
      included:      true,
    }))
  );
}

function buildFromPhases(phases: Phase[]): PendingActivity[] {
  return phases.map((p) => ({
    phase_title:   p.phaseTitle,
    activity_text: p.activityText,
    activity_type: p.activityType ?? null,
    sort_order:    p.sortOrder,
    included:      p.included,
  }));
}

export function PhasesTab({ projectId, projectType }: PhasesTabProps) {
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewState>(
    projectType === null ? "selector" : "execution"
  );
  const [localType, setLocalType] = useState<string | null>(projectType);
  const [pendingType, setPendingType] = useState<ProjectType | null>(null);
  const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([]);
  const [localPhases, setLocalPhases] = useState<Phase[]>([]);

  useEffect(() => {
    setLocalType(projectType);
    if (projectType !== null && view === "selector") setView("execution");
  }, [projectType]);

  const { data: fetchedPhases, isLoading: phasesLoading } = useListPhases(projectId, {
    query: { enabled: view === "execution", queryKey: getListPhasesQueryKey(projectId) },
  });

  useEffect(() => {
    if (fetchedPhases) setLocalPhases(fetchedPhases as Phase[]);
  }, [fetchedPhases]);

  const bulkMutation  = useBulkCreatePhases();
  const updateMutation = useUpdatePhase();

  function handleSelectType(type: ProjectType) {
    setPendingType(type);
    setPendingActivities(buildFromCatalog(type));
    setView("customizer");
  }

  function handleEditPlan() {
    if (!localType) return;
    setPendingType(localType as ProjectType);
    setPendingActivities(buildFromPhases(localPhases));
    setView("customizer");
  }

  function handleBackToSelector() {
    const hasExistingPlan = localPhases.length > 0;
    if (hasExistingPlan) {
      const ok = window.confirm("Esto borrará las actividades actuales. ¿Continuar?");
      if (!ok) return;
      setLocalPhases([]);
      setLocalType(null);
    }
    setView("selector");
  }

  function toggleActivity(sortOrder: number) {
    setPendingActivities((prev) =>
      prev.map((a) => a.sort_order === sortOrder ? { ...a, included: !a.included } : a)
    );
  }

  function handleConfirm() {
    if (!pendingType) return;
    const includedCount = pendingActivities.filter((a) => a.included).length;
    bulkMutation.mutate(
      { id: projectId, data: { project_type: pendingType, phases: pendingActivities } },
      {
        onSuccess: (created) => {
          setLocalType(pendingType);
          setLocalPhases(created as Phase[]);
          setView("execution");
          queryClient.invalidateQueries({ queryKey: getListPhasesQueryKey(projectId) });
          toast.success(`Plan guardado — ${includedCount} actividades incluidas`);
        },
        onError: () => {
          toast.error("Error al guardar el plan");
        },
      }
    );
  }

  function handleToggleCompleted(phase: Phase) {
    const newCompleted = !phase.completed;
    setLocalPhases((prev) =>
      prev.map((p) => (p.id === phase.id ? { ...p, completed: newCompleted } : p))
    );
    updateMutation.mutate(
      { id: projectId, phaseId: phase.id, data: { completed: newCompleted } },
      {
        onError: () => {
          setLocalPhases((prev) =>
            prev.map((p) => (p.id === phase.id ? { ...p, completed: !newCompleted } : p))
          );
          toast.error("Error al actualizar la actividad");
        },
      }
    );
  }

  // ── ESTADO 1: Selector ────────────────────────────────────────────────────
  if (view === "selector") {
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
            const catalog  = ACTIVITY_CATALOG[key];
            const totalActs = catalog.phases.reduce((s, p) => s + p.activities.length, 0);
            return (
              <button
                key={key}
                onClick={() => handleSelectType(key)}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-2xl"
              >
                <Card className="cursor-pointer transition-all duration-200 shadow-sm border-2 border-transparent hover:border-slate-200 hover:shadow-orange-50">
                  <CardContent className="p-5 flex items-center gap-4">
                    <span className="text-3xl" role="img" aria-label={label}>{emoji}</span>
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

  // ── ESTADO 2: Personalización ─────────────────────────────────────────────
  if (view === "customizer") {
    const selectedCount = pendingActivities.filter((a) => a.included).length;
    const totalCount    = pendingActivities.length;
    const groups        = groupPending(pendingActivities);

    return (
      <div className="space-y-4 py-2 pb-24">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Personaliza el plan del proyecto
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Desmarca las actividades que no aplican a este proyecto
            </p>
          </div>
          <button
            onClick={handleBackToSelector}
            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            ← Cambiar tipo
          </button>
        </div>

        {/* Counter */}
        <p className="text-sm font-semibold text-[#F97316]">
          {selectedCount} de {totalCount} actividades seleccionadas
        </p>

        {/* Accordion — open all by default */}
        <Accordion
          type="multiple"
          defaultValue={groups.map((_, i) => `cg-${i}`)}
          className="space-y-2"
        >
          {groups.map((group, gIdx) => {
            const groupSelected = group.items.filter((a) => a.included).length;
            return (
              <AccordionItem
                key={gIdx}
                value={`cg-${gIdx}`}
                className="border border-border rounded-xl overflow-hidden bg-card shadow-sm px-0"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#1B3A5C] text-white text-xs font-bold flex items-center justify-center">
                      {gIdx + 1}
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{group.icon}</span>
                        <span className="font-semibold text-sm text-foreground truncate">
                          {group.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {groupSelected}/{group.items.length} seleccionadas
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground font-medium mr-2">
                      {group.items.length} act.
                    </span>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-0 pb-0">
                  <div className="border-t border-border/60">
                    {group.items.map((item, itemIdx) => {
                      const dotClass  = TYPE_DOT[item.activity_type ?? "default"] ?? TYPE_DOT.default;
                      const badge     = item.activity_type ? TYPE_BADGE[item.activity_type] : undefined;
                      const globalIdx = group.startIdx + itemIdx + 1;
                      return (
                        <label
                          key={item.sort_order}
                          className={[
                            "flex items-start gap-3 px-4 py-2.5 text-sm border-b border-border/30 last:border-b-0 transition-colors cursor-pointer",
                            item.included ? "hover:bg-slate-50/50" : "hover:bg-slate-50/30",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={() => toggleActivity(item.sort_order)}
                            className="mt-0.5 shrink-0 accent-[#F97316] w-4 h-4 cursor-pointer"
                          />
                          <span className="shrink-0 w-6 text-right text-xs text-muted-foreground/70 font-mono pt-0.5">
                            {globalIdx}
                          </span>
                          <span className={[
                            "shrink-0 w-2 h-2 rounded-full mt-1.5",
                            dotClass,
                            item.included ? "" : "opacity-40",
                          ].join(" ")} />
                          <span className={[
                            "flex-1 leading-snug",
                            item.included
                              ? "text-foreground"
                              : "line-through text-muted-foreground/50",
                          ].join(" ")}>
                            {item.activity_text}
                          </span>
                          {badge && item.included && (
                            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
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

        {/* Sticky confirm button */}
        <div className="fixed bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <Button
            className="w-full bg-[#F97316] hover:bg-[#ea6c0a] text-white font-semibold"
            onClick={handleConfirm}
            disabled={bulkMutation.isPending || selectedCount === 0}
          >
            {bulkMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando…</>
            ) : (
              `Confirmar plan (${selectedCount} actividades) →`
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phasesLoading && localPhases.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando actividades…</span>
      </div>
    );
  }

  // ── ESTADO 3: Ejecución ───────────────────────────────────────────────────
  const includedPhases = localPhases.filter((p) => p.included);
  const completedCount = includedPhases.filter((p) => p.completed).length;
  const totalCount     = includedPhases.length;
  const progressPct    = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const typeLabel      = localType === "new" ? "Nueva Construcción" : "Remodelación";
  const groups         = groupPhases(includedPhases);

  return (
    <div className="space-y-4 py-2">

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {completedCount} de {totalCount} actividades completadas
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#F97316]">{progressPct}%</span>
            <button
              onClick={handleEditPlan}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit plan
            </button>
          </div>
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
                    const badge    = item.activityType ? TYPE_BADGE[item.activityType] : undefined;
                    return (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 px-4 py-2.5 text-sm border-b border-border/30 last:border-b-0 hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleCompleted(item)}
                          className="mt-0.5 shrink-0 accent-[#F97316] w-4 h-4 cursor-pointer"
                        />
                        <span className="shrink-0 w-6 text-right text-xs text-muted-foreground/70 font-mono pt-0.5">
                          {item.sortOrder + 1}
                        </span>
                        <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${dotClass}`} />
                        <span className={[
                          "flex-1 leading-snug",
                          item.completed ? "line-through text-muted-foreground" : "text-foreground",
                        ].join(" ")}>
                          {item.activityText}
                        </span>
                        {badge && (
                          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
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
    </div>
  );
}
