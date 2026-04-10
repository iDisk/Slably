import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Mic, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListDailyLogs,
  useGetDailyLog,
  useCreateDailyLog,
  useCreateDailyLogFromAudio,
  usePatchDailyLog,
  getListDailyLogsQueryKey,
  getDailyLogQueryKey,
  type DailyLog,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0]!;
}

function fmtDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: es });
  } catch {
    return dateStr;
  }
}

function fmtElapsed(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── types ────────────────────────────────────────────────────────────────────

type View = "list" | "create" | "audio" | "form" | "detail";
type RecordingState = "idle" | "recording" | "processing" | "done";

interface FormState {
  log_date:      string;
  weather:       string;
  temperature:   string;
  workers_count: string;
  activities:    string;
  materials:     string;
  problems:      string;
  notes:         string;
}

function emptyForm(): FormState {
  return {
    log_date: todayStr(), weather: "", temperature: "",
    workers_count: "", activities: "", materials: "", problems: "", notes: "",
  };
}

// ─── main component ───────────────────────────────────────────────────────────

export function DailyLogTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { user }    = useAuth();

  const [view,          setView]          = useState<View>("list");
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [createdLogId,  setCreatedLogId]  = useState<number | null>(null);

  // ── queries ──
  const { data: logs = [], isLoading } = useListDailyLogs(projectId);
  const { data: detail } = useGetDailyLog(
    projectId,
    selectedLogId ?? 0,
    {
      query: {
        enabled: !!selectedLogId,
        queryKey: getDailyLogQueryKey(projectId, selectedLogId ?? 0),
      },
    }
  );

  // ── mutations ──
  const createMutation = useCreateDailyLog(projectId);
  const audioMutation  = useCreateDailyLogFromAudio(projectId);
  const patchMutation  = usePatchDailyLog(projectId, selectedLogId ?? 0);

  // ── audio state ──
  const [recState,  setRecState]  = useState<RecordingState>("idle");
  const [elapsed,   setElapsed]   = useState(0);
  const mrRef     = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (recState === "recording") {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e >= 179) {
            stopRecording();
            return 180;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recState]);

  // ── manual form state ──
  const [form, setForm] = useState<FormState>(emptyForm());

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getListDailyLogsQueryKey(projectId) });

  const stopRecording = () => {
    mrRef.current?.stop();
    mrRef.current = null;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // VISTA 1 — LISTA
  // ────────────────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Daily Log
          </h3>
          {(user?.role === "builder" || user?.role === "subcontractor" || user?.role === "supplier") && (
            <Button
              size="sm"
              className="bg-[#F97316] hover:bg-[#ea6c0a] text-white gap-1.5"
              onClick={() => setView("create")}
            >
              + Nuevo Log
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="border-dashed border-2 shadow-none bg-transparent">
            <CardContent className="p-10 text-center text-muted-foreground">
              <Mic className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No logs yet</p>
              <p className="text-sm mt-1">
                Record the first daily log for this project.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(logs as DailyLog[]).map((log) => (
              <Card key={log.id} className="border border-border shadow-sm bg-white">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground capitalize">
                        {fmtDate(log.logDate)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          log.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {log.status === "confirmed" ? "Confirmado" : "Borrador"}
                        </span>
                        {log.aiProcessed && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                            IA
                          </span>
                        )}
                        {log.shareWithClient && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-200">
                            👁️ Visible to client
                          </span>
                        )}
                        {log.createdByName && log.createdBy !== user?.id && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                            👷 {log.createdByName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {log.activities && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {log.activities}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {log.weather && (
                      <span className="text-xs bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                        ☀️ {log.weather}
                      </span>
                    )}
                    {log.workersCount != null && (
                      <span className="text-xs bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                        👷 {log.workersCount} trabajadores
                      </span>
                    )}
                    {log.problems && (
                      <span className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-full px-2 py-0.5">
                        ⚠️ Problemas reportados
                      </span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setSelectedLogId(log.id); setView("detail"); }}
                  >
                    View detail
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VISTA 2 — CREAR (elegir tipo)
  // ────────────────────────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="space-y-4 py-2">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <p className="text-sm font-semibold text-foreground">¿Cómo quieres registrar el log?</p>

        <div className="grid grid-cols-1 gap-4">
          <Card className="cursor-pointer border-2 border-transparent hover:border-[#F97316] transition-all shadow-sm">
            <CardContent className="p-5 flex items-start gap-4">
              <span className="text-3xl">🎤</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Grabar audio</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Habla 30–60 segundos describiendo el día de trabajo. La IA lo estructurará automáticamente.
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-[#F97316] hover:bg-[#ea6c0a] text-white"
                  onClick={() => { setRecState("idle"); setElapsed(0); setView("audio"); }}
                >
                  Grabar audio
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer border-2 border-transparent hover:border-slate-300 transition-all shadow-sm">
            <CardContent className="p-5 flex items-start gap-4">
              <span className="text-3xl">✏️</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Escribir manualmente</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Llena los campos del log manualmente.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => { setForm(emptyForm()); setView("form"); }}
                >
                  Llenar formulario
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VISTA 3 — DETALLE
  // ────────────────────────────────────────────────────────────────────────────
  if (view === "detail") {
    const log = detail as DailyLog | undefined;
    return (
      <div className="space-y-4 py-2">
        <button
          onClick={() => { setSelectedLogId(null); setView("list"); }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a lista
        </button>

        {!log ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground capitalize">{fmtDate(log.logDate)}</p>
              <div className="flex gap-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  log.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {log.status === "confirmed" ? "Confirmado" : "Borrador"}
                </span>
                {log.aiProcessed && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                    IA
                  </span>
                )}
              </div>
            </div>

            {log.audioUrl && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Audio</p>
                <audio controls src={log.audioUrl} className="w-full" />
              </div>
            )}

            <Card className="border border-border shadow-sm bg-white">
              <CardContent className="p-4 space-y-3">
                {log.weather != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">🌤️ Clima</p>
                    <p className="text-sm text-foreground">
                      {log.weather}{log.temperature != null ? ` · ${log.temperature}°F` : ""}
                    </p>
                  </div>
                )}
                {log.workersCount != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">👷 Trabajadores</p>
                    <p className="text-sm text-foreground">{log.workersCount}</p>
                  </div>
                )}
                {log.activities && (
                  <div>
                    <p className="text-xs text-muted-foreground">✅ Activities</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.activities}</p>
                  </div>
                )}
                {log.materials && (
                  <div>
                    <p className="text-xs text-muted-foreground">📦 Materiales</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.materials}</p>
                  </div>
                )}
                {log.problems && (
                  <div>
                    <p className="text-xs text-muted-foreground">⚠️ Problemas</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.problems}</p>
                  </div>
                )}
                {log.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">📝 Notas</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {log.status === "draft" && (user?.role === "builder" || user?.role === "subcontractor" || user?.role === "supplier") && (
              <Button
                className="w-full bg-[#F97316] hover:bg-[#ea6c0a] text-white gap-2"
                disabled={patchMutation.isPending}
                onClick={() => {
                  patchMutation.mutate(
                    { data: { status: "confirmed" } },
                    {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: getDailyLogQueryKey(projectId, log.id) });
                        invalidateList();
                        toast.success("Log confirmado");
                      },
                      onError: () => toast.error("Error al confirmar el log"),
                    }
                  );
                }}
              >
                {patchMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Confirmando…</>
                  : <><CheckCircle2 className="w-4 h-4" />Confirmar log</>}
              </Button>
            )}

            {log.status === "confirmed" && user?.role === "builder" && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-foreground">Share with client</p>
                  <p className="text-xs text-muted-foreground">
                    This update will be visible in the client portal
                  </p>
                </div>
                <button
                  onClick={() => {
                    patchMutation.mutate(
                      { data: { share_with_client: !log.shareWithClient } },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: getDailyLogQueryKey(projectId, log.id) });
                          invalidateList();
                          toast.success(
                            log.shareWithClient
                              ? "Removed from client portal"
                              : "Shared with client"
                          );
                        },
                      }
                    );
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    log.shareWithClient ? "bg-[#F97316]" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      log.shareWithClient ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VISTA 4 — GRABAR AUDIO
  // ────────────────────────────────────────────────────────────────────────────
  if (view === "audio") {
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
        const mr = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
        chunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
          setRecState("processing");
          const fd = new FormData();
          fd.append("audio", blob, `recording.${ext}`);
          fd.append("log_date", todayStr());
          fd.append("language", "es");
          audioMutation.mutate(
            { data: fd },
            {
              onSuccess: (log) => {
                invalidateList();
                setCreatedLogId(log.id);
                setRecState("done");
              },
              onError: (err: unknown) => {
                const status = (err as { response?: { status?: number } })?.response?.status;
                if (status === 409) {
                  invalidateList();
                  toast("Ya existe un log para hoy. Ve a la lista para verlo.");
                } else {
                  toast.error("Error al procesar el audio. Intenta de nuevo.");
                }
                setRecState("idle");
              },
            }
          );
        };
        mr.start();
        mrRef.current = mr;
        setElapsed(0);
        setRecState("recording");
      } catch {
        toast.error("No se pudo acceder al micrófono");
      }
    };

    const btnConfig = {
      idle:       { bg: "bg-slate-200 hover:bg-slate-300",  label: "Toca para grabar",            pulse: false },
      recording:  { bg: "bg-red-500 hover:bg-red-600",      label: "Grabando… toca para detener", pulse: true  },
      processing: { bg: "bg-[#F97316]",                     label: "Procesando con IA…",           pulse: false },
      done:       { bg: "bg-emerald-500",                   label: "¡Listo!",                      pulse: false },
    }[recState];

    return (
      <div className="space-y-6 py-4">
        <button
          onClick={() => { stopRecording(); setView("create"); }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>

        <div className="flex flex-col items-center gap-6 py-6">
          <button
            disabled={recState === "processing" || recState === "done"}
            onClick={recState === "recording" ? stopRecording : startRecording}
            className={[
              "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
              btnConfig.bg,
              btnConfig.pulse ? "animate-pulse" : "",
              recState === "processing" || recState === "done" ? "cursor-default" : "cursor-pointer",
            ].join(" ")}
          >
            {recState === "processing"
              ? <Loader2 className="w-8 h-8 text-white animate-spin" />
              : recState === "done"
                ? <CheckCircle2 className="w-8 h-8 text-white" />
                : <Mic className={`w-8 h-8 ${recState === "recording" ? "text-white" : "text-slate-700"}`} />}
          </button>

          <p className="text-sm font-medium text-foreground">{btnConfig.label}</p>

          {recState === "recording" && (
            <p className="text-2xl font-mono font-bold text-red-500">
              {fmtElapsed(elapsed)}
              <span className="text-sm text-muted-foreground ml-2">/ 3:00</span>
            </p>
          )}

          {recState === "done" && createdLogId != null && (
            <Button
              className="bg-[#F97316] hover:bg-[#ea6c0a] text-white"
              onClick={() => { setSelectedLogId(createdLogId); setView("detail"); }}
            >
              View generated log
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VISTA 5 — FORMULARIO MANUAL
  // ────────────────────────────────────────────────────────────────────────────
  if (view === "form") {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.activities.trim()) {
        toast.error("Las actividades son requeridas");
        return;
      }
      createMutation.mutate(
        {
          data: {
            log_date:      form.log_date,
            activities:    form.activities,
            weather:       form.weather       || undefined,
            temperature:   form.temperature   ? Number(form.temperature)   : undefined,
            workers_count: form.workers_count ? Number(form.workers_count) : undefined,
            materials:     form.materials     || undefined,
            problems:      form.problems      || undefined,
            notes:         form.notes         || undefined,
          },
        },
        {
          onSuccess: (log) => {
            invalidateList();
            toast.success("Daily log guardado");
            setSelectedLogId(log.id);
            setView("detail");
          },
          onError: (err: unknown) => {
            const msg = (err as { data?: { error?: string } })?.data?.error;
            toast.error(msg ?? "Error al guardar el log");
          },
        }
      );
    };

    return (
      <div className="space-y-4 py-2">
        <button
          onClick={() => setView("create")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.log_date}
                onChange={(e) => setForm((f) => ({ ...f, log_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Clima</Label>
              <Input
                placeholder="Soleado, nublado…"
                value={form.weather}
                onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Temperatura °F</Label>
              <Input
                type="number"
                placeholder="75"
                value={form.temperature}
                onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Número de trabajadores</Label>
              <Input
                type="number"
                placeholder="8"
                value={form.workers_count}
                onChange={(e) => setForm((f) => ({ ...f, workers_count: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Activities *</Label>
            <Textarea
              rows={3}
              placeholder="Describe las actividades del día…"
              value={form.activities}
              onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Materiales recibidos</Label>
            <Textarea
              rows={2}
              placeholder="Ej. 20 bolsas de cemento, varilla #4…"
              value={form.materials}
              onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Problemas o issues</Label>
            <Textarea
              rows={2}
              placeholder="Ej. Retraso en entrega de materiales…"
              value={form.problems}
              onChange={(e) => setForm((f) => ({ ...f, problems: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Notas adicionales</Label>
            <Textarea
              rows={2}
              placeholder="Cualquier nota adicional…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setView("create")}
            >
              Volver
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-[#F97316] hover:bg-[#ea6c0a] text-white"
            >
              {createMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Guardando…</>
                : "Save log"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return null;
}
