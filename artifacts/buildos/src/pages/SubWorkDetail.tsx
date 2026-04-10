import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Loader2, MapPin, Building2, Mic, CheckCircle2, Inbox,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import {
  useGetMyWork,
  useListDailyLogs,
  useGetDailyLog,
  useCreateDailyLog,
  useCreateDailyLogFromAudio,
  usePatchDailyLog,
  getListDailyLogsQueryKey,
  getDailyLogQueryKey,
  type DailyLog,
} from "@workspace/api-client-react";
import { MyPhotosSection } from "@/pages/SubDashboard";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: "In Progress", cls: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed",   cls: "bg-blue-100 text-blue-700" },
  planning:  { label: "Planning",    cls: "bg-slate-100 text-slate-600" },
  on_hold:   { label: "On Hold",     cls: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelled",   cls: "bg-red-100 text-red-700" },
};

function todayStr() { return new Date().toISOString().split("T")[0]!; }

function fmtDate(d: string) {
  try { return format(parseISO(d), "EEEE, d 'de' MMMM", { locale: es }); }
  catch { return d; }
}

function fmtElapsed(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmt(n: string | null | undefined) {
  const v = parseFloat(n ?? "0");
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(v);
}

// ─── Types ────────────────────────────────────────────────────────────────────
type LogView = "list" | "create" | "audio" | "form" | "detail";
type RecState = "idle" | "recording" | "processing" | "done";

interface FormState {
  log_date: string; weather: string; temperature: string;
  workers_count: string; activities: string;
  materials: string; problems: string; notes: string;
}
function emptyForm(): FormState {
  return {
    log_date: todayStr(), weather: "", temperature: "",
    workers_count: "", activities: "", materials: "", problems: "", notes: "",
  };
}

// ─── Sub Logs Tab ─────────────────────────────────────────────────────────────
function SubLogsTab({ projectId, userId }: { projectId: number; userId: number }) {
  const queryClient = useQueryClient();
  const [view,          setView]          = useState<LogView>("list");
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const { data: allLogs = [], isLoading } = useListDailyLogs(projectId);
  const logs = (allLogs as DailyLog[]).filter(l => l.createdBy === userId);

  const { data: detail } = useGetDailyLog(
    projectId, selectedLogId ?? 0,
    { query: { enabled: !!selectedLogId, queryKey: getDailyLogQueryKey(projectId, selectedLogId ?? 0) } }
  );

  const createMutation = useCreateDailyLog(projectId);
  const audioMutation  = useCreateDailyLogFromAudio(projectId);
  const patchMutation  = usePatchDailyLog(projectId, selectedLogId ?? 0);

  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed,  setElapsed]  = useState(0);
  const mrRef     = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (recState === "recording") {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= 179) { stopRecording(); return 180; }
          return e + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recState]);

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getListDailyLogsQueryKey(projectId) });

  const stopRecording = () => { mrRef.current?.stop(); mrRef.current = null; };

  // ── LIST ──────────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            My Logs
          </h3>
          <Button
            size="sm"
            className="bg-[#F97316] hover:bg-[#ea6c0a] text-white gap-1.5"
            onClick={() => setView("create")}
          >
            + New Log
          </Button>
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
              <p className="text-sm mt-1">Record your first daily log for this project.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
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
                          {log.status === "confirmed" ? "✓ Shared" : "Draft"}
                        </span>
                        {log.aiProcessed && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {log.activities && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{log.activities}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {log.weather && (
                      <span className="text-xs bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                        ☀️ {log.weather}
                      </span>
                    )}
                    {log.workersCount != null && (
                      <span className="text-xs bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                        👷 {log.workersCount}
                      </span>
                    )}
                    {log.problems && (
                      <span className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-full px-2 py-0.5">
                        ⚠️ Issues reported
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline" size="sm" className="text-xs h-7"
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

  // ── CREATE ────────────────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="space-y-4 py-2">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-sm font-semibold text-foreground">How do you want to log today?</p>
        <div className="grid grid-cols-1 gap-4">
          <Card className="cursor-pointer border-2 border-transparent hover:border-[#F97316] transition-all shadow-sm">
            <CardContent className="p-5 flex items-start gap-4">
              <span className="text-3xl">🎤</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Record audio</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Talk 30–60 seconds about your workday. AI will structure it automatically.
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-[#F97316] hover:bg-[#ea6c0a] text-white"
                  onClick={() => { setRecState("idle"); setElapsed(0); setView("audio"); }}
                >
                  Record audio
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer border-2 border-transparent hover:border-slate-300 transition-all shadow-sm">
            <CardContent className="p-5 flex items-start gap-4">
              <span className="text-3xl">✏️</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Write manually</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fill in the log fields manually.
                </p>
                <Button
                  variant="outline" size="sm" className="mt-3"
                  onClick={() => { setForm(emptyForm()); setView("form"); }}
                >
                  Fill form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── DETAIL ────────────────────────────────────────────────────────────────────
  if (view === "detail") {
    const log = detail as DailyLog | undefined;
    return (
      <div className="space-y-4 py-2">
        <button
          onClick={() => { setSelectedLogId(null); setView("list"); }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to list
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
                  {log.status === "confirmed" ? "✓ Shared" : "Draft"}
                </span>
                {log.aiProcessed && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                    AI
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
                    <p className="text-xs text-muted-foreground">🌤️ Weather</p>
                    <p className="text-sm text-foreground">
                      {log.weather}{log.temperature != null ? ` · ${log.temperature}°F` : ""}
                    </p>
                  </div>
                )}
                {log.workersCount != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">👷 Workers</p>
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
                    <p className="text-xs text-muted-foreground">📦 Materials</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.materials}</p>
                  </div>
                )}
                {log.problems && (
                  <div>
                    <p className="text-xs text-muted-foreground">⚠️ Issues</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.problems}</p>
                  </div>
                )}
                {log.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">📝 Notes</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{log.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Share with builder toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-foreground">Share with builder</p>
                <p className="text-xs text-muted-foreground">
                  {log.status === "confirmed"
                    ? "Builder can see this log in the project"
                    : "Only you can see this log"}
                </p>
              </div>
              <button
                disabled={patchMutation.isPending}
                onClick={() => {
                  const newStatus = log.status === "draft" ? "confirmed" : "draft";
                  patchMutation.mutate(
                    { data: { status: newStatus } },
                    {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: getDailyLogQueryKey(projectId, log.id) });
                        invalidateList();
                        toast.success(newStatus === "confirmed" ? "Shared with builder" : "Removed from builder");
                      },
                      onError: () => toast.error("Failed to update"),
                    }
                  );
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  log.status === "confirmed" ? "bg-[#F97316]" : "bg-slate-200"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  log.status === "confirmed" ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── AUDIO ─────────────────────────────────────────────────────────────────────
  if (view === "audio") {
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
        const mr = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        const ext = mimeType.includes("mp4") ? "m4a" : "webm";
        chunksRef.current = [];
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
          setRecState("processing");
          const fd = new FormData();
          fd.append("audio", blob, `recording.${ext}`);
          fd.append("log_date", todayStr());
          fd.append("language", "es");
          audioMutation.mutate(
            { data: fd },
            {
              onSuccess: () => { invalidateList(); setRecState("done"); },
              onError: (err: unknown) => {
                const status = (err as { response?: { status?: number } })?.response?.status;
                if (status === 409) {
                  invalidateList();
                  toast("A log already exists for today.");
                } else {
                  toast.error("Audio processing failed. Try again.");
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
        toast.error("Could not access microphone");
      }
    };

    const btnConfig = {
      idle:       { bg: "bg-slate-200 hover:bg-slate-300", label: "Tap to record",         pulse: false },
      recording:  { bg: "bg-red-500 hover:bg-red-600",     label: "Recording… tap to stop", pulse: true  },
      processing: { bg: "bg-[#F97316]",                    label: "Processing with AI…",    pulse: false },
      done:       { bg: "bg-emerald-500",                  label: "Done!",                  pulse: false },
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
            <p className="text-2xl font-mono font-bold text-red-500">{fmtElapsed(elapsed)}</p>
          )}
          {recState === "done" && (
            <Button onClick={() => setView("list")}>Back to list</Button>
          )}
        </div>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────────────
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.activities.trim()) { toast.error("Activities field is required"); return; }
    const payload: Parameters<typeof createMutation.mutate>[0]["data"] = {
      log_date:      form.log_date,
      activities:    form.activities,
      weather:       form.weather || undefined,
      temperature:   form.temperature ? parseFloat(form.temperature) : undefined,
      workers_count: form.workers_count ? parseInt(form.workers_count, 10) : undefined,
      materials:     form.materials || undefined,
      problems:      form.problems || undefined,
      notes:         form.notes || undefined,
    };
    createMutation.mutate(
      { data: payload },
      {
        onSuccess: () => { invalidateList(); toast.success("Log saved"); setView("list"); },
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 409) { invalidateList(); toast("A log already exists for today."); setView("list"); }
          else toast.error("Failed to save log");
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
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Date *</Label>
            <Input
              type="date" value={form.log_date}
              onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Weather</Label>
            <Input
              placeholder="Sunny, Cloudy…" value={form.weather}
              onChange={e => setForm(f => ({ ...f, weather: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Workers</Label>
            <Input
              type="number" placeholder="0" value={form.workers_count}
              onChange={e => setForm(f => ({ ...f, workers_count: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Activities *</Label>
          <Textarea
            rows={3} placeholder="What was done today?" value={form.activities}
            onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Materials</Label>
          <Textarea
            rows={2} placeholder="Materials used…" value={form.materials}
            onChange={e => setForm(f => ({ ...f, materials: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Issues</Label>
          <Textarea
            rows={2} placeholder="Any problems encountered…" value={form.problems}
            onChange={e => setForm(f => ({ ...f, problems: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea
            rows={2} placeholder="Additional notes…" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setView("create")} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} className="flex-1">
            {createMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
              : "Save log"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "overview" | "logs" | "photos" | "builder";

export default function SubWorkDetail() {
  const { vendorId: vidStr } = useParams<{ vendorId: string }>();
  const [, navigate]         = useLocation();
  const { user }             = useAuth();
  const vendorId             = parseInt(vidStr ?? "0", 10);
  const [tab, setTab]        = useState<Tab>("overview");

  const { data: items, isLoading } = useGetMyWork({ query: { queryKey: ["/api/my-work"] } });
  const item = items?.find(i => i.vendorId === vendorId);
  const ps   = PROJECT_STATUS[item?.project.status ?? ""] ?? PROJECT_STATUS.active;

  if (isLoading) {
    return (
      <BuilderLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </BuilderLayout>
    );
  }

  if (!item) {
    return (
      <BuilderLayout>
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-semibold">Work assignment not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/sub-dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Work
          </Button>
        </div>
      </BuilderLayout>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview"     },
    { key: "logs",     label: "My Logs"      },
    { key: "photos",   label: "My Photos"    },
    { key: "builder",  label: "From Builder" },
  ];

  return (
    <BuilderLayout>
      <div className="space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate("/sub-dashboard")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> My Work
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-foreground">{item.project.name}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ps.cls}`}>
              {ps.label}
            </span>
          </div>
          {item.project.address && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{item.project.address}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{item.project.progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${item.project.progress}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div className="space-y-4">
            {item.contractAmount && (
              <Card className="border border-border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    My Contract
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract</span>
                      <span className="font-semibold">{fmt(item.contractAmount)}</span>
                    </div>
                    {parseFloat(item.paymentsMade) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-semibold text-emerald-600">{fmt(item.paymentsMade)}</span>
                      </div>
                    )}
                    {parseFloat(item.balancePending) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-semibold text-red-600">{fmt(item.balancePending)}</span>
                      </div>
                    )}
                  </div>
                  {item.contractNotes && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-2">
                      {item.contractNotes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Builder</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.builder.name}</p>
                    {item.builder.companyName && (
                      <p className="text-xs text-muted-foreground">{item.builder.companyName}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "logs" && user && (
          <SubLogsTab projectId={item.project.id} userId={user.id} />
        )}

        {tab === "photos" && (
          <MyPhotosSection projects={items ?? []} projectId={item.project.id} />
        )}

        {tab === "builder" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Inbox className="w-12 h-12 opacity-25" />
            <div className="text-center">
              <p className="font-medium text-foreground">Nothing yet</p>
              <p className="text-sm mt-1">
                Documents and updates shared by {item.builder.name} will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </BuilderLayout>
  );
}
