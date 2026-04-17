import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, ChevronRight, ChevronLeft, Plus, X, Check, Mic, MicOff, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Trade = "demo"|"framing"|"drywall"|"tile"|"flooring"|"plumbing"|"electrical"|"hvac"|"painting"|"cabinetry"|"countertops"|"roofing"|"windows"|"doors"|"insulation"|"concrete"|"landscaping"|"cleanup"|"permits"|"general";

type AITask = {
  name: string;
  trade: Trade;
  unit: string | null;
  quantity: number | null;
  laborCost: number;
  materialCost: number;
  marketLaborMin: number | null;
  marketLaborMax: number | null;
  marketMaterialMin: number | null;
  marketMaterialMax: number | null;
  marketNote: string | null;
  isAiDetected: boolean;
  isAiSuggested: boolean;
  suggestionReason: string | null;
  isIncluded: boolean;
};

type AIArea = {
  name: string;
  scopeSummary: string;
  tasks: AITask[];
};

type AIResult = {
  projectType: string;
  city: string;
  state: string;
  scopeSummary: string;
  areas: AIArea[];
};

const TRADE_COLORS: Record<string, string> = {
  demo:"bg-red-100 text-red-700", framing:"bg-orange-100 text-orange-700",
  drywall:"bg-yellow-100 text-yellow-700", tile:"bg-cyan-100 text-cyan-700",
  flooring:"bg-teal-100 text-teal-700", plumbing:"bg-blue-100 text-blue-700",
  electrical:"bg-yellow-100 text-yellow-800", hvac:"bg-sky-100 text-sky-700",
  painting:"bg-purple-100 text-purple-700", cabinetry:"bg-amber-100 text-amber-700",
  countertops:"bg-stone-100 text-stone-700", cleanup:"bg-gray-100 text-gray-700",
  permits:"bg-indigo-100 text-indigo-700", general:"bg-slate-100 text-slate-700",
};

const PROJECT_TYPES = [
  { value: "new_construction", label: "New Construction", icon: "🏠" },
  { value: "full_remodel",     label: "Full Remodel",     icon: "🔨" },
  { value: "bathroom_remodel", label: "Bathroom Remodel", icon: "🚿" },
  { value: "kitchen_remodel",  label: "Kitchen Remodel",  icon: "🍳" },
  { value: "painting",         label: "Interior Painting", icon: "🎨" },
  { value: "addition",         label: "Addition",          icon: "🏗️" },
  { value: "windows_doors",    label: "Windows & Doors",   icon: "🪟" },
  { value: "other",            label: "Other",             icon: "📋" },
];

const STEP_LABELS = [
  "Job Location", "Client Info", "Project Type",
  "Describe Work", "Review Scope", "Set Prices", "Quote Ready",
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function areaTotals(area: AIArea) {
  const included = area.tasks.filter(t => t.isIncluded);
  const labor    = included.reduce((s, t) => s + t.laborCost, 0);
  const material = included.reduce((s, t) => s + t.materialCost, 0);
  return { labor, material, total: labor + material };
}

function quoteTotals(areas: AIArea[], markup: number) {
  let labor = 0; let material = 0;
  areas.forEach(a => { const t = areaTotals(a); labor += t.labor; material += t.material; });
  const cost   = labor + material;
  const price  = cost * (1 + markup / 100);
  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
  return { labor, material, cost, price, margin };
}

export default function NewQuote() {
  const [, navigate]  = useLocation();
  const { user }       = useAuth();
  const [step, setStep] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Step 0 — Job Location
  const [address, setAddress] = useState("");
  const [city, setCity]       = useState("");
  const [state, setState]     = useState("TX");

  // Step 1 — Client Info
  const [clientName, setClientName]   = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Step 2 — Project Type
  const [projectType, setProjectType] = useState("");

  // Step 3 — Describe Work
  const [rawInput, setRawInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);

  // AI result + editable data
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [areas, setAreas]       = useState<AIArea[]>([]);
  const [markup, setMarkup]     = useState(25);

  // Step 6 — Quote title (auto-filled after analyze)
  const [title, setTitle] = useState("");

  // ── Mic recording ────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const r = await fetch(`${BASE}/api/quotes/transcribe`, { method: "POST", body: form });
          if (!r.ok) throw new Error();
          const { text } = await r.json();
          setRawInput(prev => prev ? `${prev} ${text}` : text);
        } catch {
          toast.error("Transcription failed. Please try again.");
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  // ── Analyze ──────────────────────────────────────────────────────────────
  async function analyze() {
    if (!rawInput.trim()) { toast.error("Please describe the work first."); return; }
    setAnalyzing(true);
    try {
      const r = await fetch(`${BASE}/api/quotes/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput, city, state, address, clientName, projectType }),
      });
      if (!r.ok) throw new Error();
      const data: AIResult = await r.json();

      const enriched: AIArea[] = data.areas.map(a => ({
        ...a,
        tasks: a.tasks.map(t => ({ ...t, isIncluded: t.isAiDetected })),
      }));

      setAiResult(data);
      setAreas(enriched);
      const ptLabel = PROJECT_TYPES.find(p => p.value === projectType)?.label ?? projectType;
      setTitle(`${ptLabel || data.projectType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} — ${address || city || new Date().toLocaleDateString()}`);
      setStep(4);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Area / task helpers ──────────────────────────────────────────────────
  const toggleTask = useCallback((aIdx: number, tIdx: number) => {
    setAreas(prev => prev.map((a, ai) => ai !== aIdx ? a : {
      ...a,
      tasks: a.tasks.map((t, ti) => ti !== tIdx ? t : { ...t, isIncluded: !t.isIncluded }),
    }));
  }, []);

  const deleteTask = useCallback((aIdx: number, tIdx: number) => {
    setAreas(prev => prev.map((a, ai) => ai !== aIdx ? a : {
      ...a,
      tasks: a.tasks.filter((_, ti) => ti !== tIdx),
    }));
  }, []);

  const renameTask = useCallback((aIdx: number, tIdx: number, name: string) => {
    setAreas(prev => prev.map((a, ai) => ai !== aIdx ? a : {
      ...a,
      tasks: a.tasks.map((t, ti) => ti !== tIdx ? t : { ...t, name }),
    }));
  }, []);

  const renameArea = useCallback((aIdx: number, name: string) => {
    setAreas(prev => prev.map((a, ai) => ai !== aIdx ? a : { ...a, name }));
  }, []);

  const addSuggestedTask = useCallback((aIdx: number, tIdx: number) => {
    setAreas(prev => prev.map((a, ai) => ai !== aIdx ? a : {
      ...a,
      tasks: a.tasks.map((t, ti) => ti !== tIdx ? t : { ...t, isIncluded: true }),
    }));
  }, []);

  const addCustomTask = useCallback((aIdx: number, name: string, trade: Trade) => {
    if (!name.trim()) return;
    setAreas(prev => prev.map((a, ai) => ai !== aIdx ? a : {
      ...a,
      tasks: [...a.tasks, {
        name, trade, unit: null, quantity: null,
        laborCost: 0, materialCost: 0,
        marketLaborMin: null, marketLaborMax: null,
        marketMaterialMin: null, marketMaterialMax: null,
        marketNote: null,
        isAiDetected: false, isAiSuggested: false,
        suggestionReason: null, isIncluded: true,
      }],
    }));
  }, []);

  const addNewArea = useCallback((name: string) => {
    if (!name.trim()) return;
    setAreas(prev => [...prev, { name, scopeSummary: "", tasks: [] }]);
  }, []);

  const updateTaskCost = useCallback((aIdx: number, tIdx: number, field: "laborCost" | "materialCost", val: string) => {
    const num = parseFloat(val) || 0;
    setAreas(prev => prev.map((a, ai) => ai !== aIdx ? a : {
      ...a,
      tasks: a.tasks.map((t, ti) => ti !== tIdx ? t : { ...t, [field]: num }),
    }));
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  async function save(createProject: boolean) {
    if (!title.trim()) { toast.error("Quote title is required."); return; }
    setSaving(true);
    try {
      const body = {
        title, clientName, clientEmail, clientPhone, address, city, state,
        rawInput, projectType: aiResult?.projectType ?? projectType,
        scopeSummary: aiResult?.scopeSummary,
        markupPercent: markup,
        areas: areas.map((a, ai) => ({
          name: a.name, scopeSummary: a.scopeSummary, sortOrder: ai,
          tasks: a.tasks.map((t, ti) => ({
            name: t.name, trade: t.trade, unit: t.unit,
            quantity: t.quantity, laborCost: t.laborCost,
            materialCost: t.materialCost,
            marketLaborMin: t.marketLaborMin, marketLaborMax: t.marketLaborMax,
            marketMaterialMin: t.marketMaterialMin, marketMaterialMax: t.marketMaterialMax,
            marketNote: t.marketNote, isIncluded: t.isIncluded,
            isAiDetected: t.isAiDetected, isAiSuggested: t.isAiSuggested,
            suggestionReason: t.suggestionReason, sortOrder: ti,
          })),
        })),
      };

      const r = await fetch(`${BASE}/api/quotes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      const quote = await r.json();

      if (createProject) {
        const r2 = await fetch(`${BASE}/api/quotes/${quote.id}/convert`, { method: "POST" });
        if (!r2.ok) throw new Error();
        const { project } = await r2.json();
        toast.success("Quote saved and project created!");
        navigate(`/projects/${project.id}`);
      } else {
        toast.success("Quote saved!");
        navigate(`/quotes/${quote.id}`);
      }
    } catch {
      toast.error("Failed to save quote. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const totals = quoteTotals(areas, markup);

  return (
    <BuilderLayout>
      <div className="p-6 max-w-3xl mx-auto">

        {/* Step indicator */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0 ${
                  i < step ? "bg-[#1B3A5C] text-white" : i === step ? "bg-[#F97316] text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline whitespace-nowrap ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && <div className="w-4 h-px bg-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 0: Job Location ─────────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Where is the job?</h1>
            <p className="text-muted-foreground mb-6">Enter the job site address so we can price accurately.</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Street address <span className="text-red-500">*</span></Label>
                <Input
                  id="address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="123 Main St"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Houston" className="mt-1" />
                </div>
                <div className="w-28">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="mt-1 w-full h-10 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/30"
                  >
                    {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                className="w-full gap-2 bg-[#1B3A5C] hover:bg-[#1B3A5C]/90 text-white h-12 text-base mt-2"
                onClick={() => {
                  if (!address.trim()) { toast.error("Street address is required."); return; }
                  if (!city.trim()) { toast.error("City is required."); return; }
                  setStep(1);
                }}
              >
                Next: Client Info <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Client Info ──────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Who is the client?</h1>
            <p className="text-muted-foreground mb-6">Client info helps personalize the quote.</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client name <span className="text-red-500">*</span></Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="John Smith"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="john@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clientPhone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  className="flex-1 gap-1 bg-[#1B3A5C] hover:bg-[#1B3A5C]/90 text-white h-11"
                  onClick={() => {
                    if (!clientName.trim()) { toast.error("Client name is required."); return; }
                    setStep(2);
                  }}
                >
                  Next: Project Type <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Project Type ─────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">What type of project?</h1>
            <p className="text-muted-foreground mb-6">Select the category that best describes this job.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {PROJECT_TYPES.map(pt => (
                <button
                  key={pt.value}
                  onClick={() => setProjectType(pt.value)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    projectType === pt.value
                      ? "border-[#F97316] bg-[#F97316]/8 ring-2 ring-[#F97316]/20"
                      : "border-gray-200 hover:border-[#F97316]/40 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-2xl">{pt.icon}</span>
                  <span className={`text-xs font-medium leading-tight ${projectType === pt.value ? "text-[#F97316]" : "text-foreground"}`}>
                    {pt.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-1 bg-[#1B3A5C] hover:bg-[#1B3A5C]/90 text-white h-11"
                onClick={() => {
                  if (!projectType) { toast.error("Please select a project type."); return; }
                  setStep(3);
                }}
              >
                Next: Describe Work <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Describe Work ────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Describe the work</h1>
            <p className="text-muted-foreground mb-6">
              Type or use the mic to describe the job. Include all areas and details.
            </p>

            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  rows={7}
                  placeholder="Describe the work in detail. Two bathrooms, first full remodel replacing tub with shower, new tile, plumbing, electrical. Second bathroom new flooring only."
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  className="mt-1 resize-none pr-12"
                />
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={transcribing}
                  title={recording ? "Stop recording" : "Start recording"}
                  className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                    recording
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-[#1B3A5C] hover:bg-[#1B3A5C]/90 text-white"
                  }`}
                >
                  {transcribing
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : recording
                    ? <MicOff className="w-4 h-4" />
                    : <Mic className="w-4 h-4" />}
                </button>
              </div>
              {recording && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Recording... tap the mic again to stop and transcribe.
                </p>
              )}
              {transcribing && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Transcribing audio...
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  className="flex-1 gap-2 bg-[#F97316] hover:bg-[#ea6c0e] text-white h-12 text-base font-semibold"
                  onClick={analyze}
                  disabled={analyzing || recording || transcribing}
                >
                  {analyzing
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> AI is analyzing...</>
                    : <>Analyze with AI <ChevronRight className="w-5 h-5" /></>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Edit Scope ──────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">Review & Edit Scope</h1>
            <p className="text-muted-foreground mb-6">AI broke down your job by area. Customize before pricing.</p>

            {aiResult?.scopeSummary && (
              <Card className="mb-6 bg-[#1B3A5C]/5 border-[#1B3A5C]/20">
                <CardContent className="p-4 text-sm text-[#1B3A5C]">{aiResult.scopeSummary}</CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {areas.map((area, ai) => (
                <AreaReviewCard
                  key={ai} area={area} aIdx={ai}
                  onToggleTask={toggleTask}
                  onDeleteTask={deleteTask}
                  onRenameTask={renameTask}
                  onRenameArea={renameArea}
                  onAddSuggested={addSuggestedTask}
                  onAddCustomTask={addCustomTask}
                />
              ))}
            </div>

            <AddAreaRow onAdd={addNewArea} />

            <div className="mt-4 p-4 bg-secondary rounded-xl text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {areas.reduce((s, a) => s + a.tasks.filter(t => t.isIncluded).length, 0)} tasks included
              </span>{" "}
              across {areas.length} areas
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-1 bg-[#1B3A5C] hover:bg-[#1B3A5C]/90 text-white"
                onClick={() => setStep(5)}
              >
                Continue to Pricing <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Set Prices ───────────────────────────────────────────── */}
        {step === 5 && (
          <div className="pb-48">
            <h1 className="text-2xl font-display font-bold mb-1">Set your prices</h1>
            <p className="text-muted-foreground mb-6">AI suggested market rates. Adjust to match your numbers.</p>

            <div className="space-y-6">
              {areas.map((area, ai) => (
                <div key={ai}>
                  <h3 className="font-semibold text-[#1B3A5C] mb-3 flex items-center gap-2">
                    {area.name}
                    <span className="text-sm text-muted-foreground font-normal">
                      — {fmt(areaTotals(area).total)}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {area.tasks.filter(t => t.isIncluded).map((task) => {
                      const realTi = area.tasks.indexOf(task);
                      return (
                        <PricingTaskCard
                          key={realTi} task={task} aIdx={ai} tIdx={realTi}
                          onUpdate={updateTaskCost}
                        />
                      );
                    })}
                    {area.tasks.filter(t => t.isIncluded).length === 0 && (
                      <p className="text-sm text-muted-foreground italic pl-1">No tasks included in this area.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky summary bar */}
            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t shadow-lg p-4 z-50">
              <div className="max-w-3xl mx-auto">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm mb-2">
                  <span>Labor: <strong>{fmt(totals.labor)}</strong></span>
                  <span>Material: <strong>{fmt(totals.material)}</strong></span>
                  <span>Your cost: <strong>{fmt(totals.cost)}</strong></span>
                  <div className="flex items-center gap-1">
                    <span>Markup:</span>
                    <input
                      type="number" min={0} max={200}
                      value={markup}
                      onChange={e => setMarkup(parseFloat(e.target.value) || 0)}
                      className="w-14 border rounded px-1 py-0.5 text-center font-semibold"
                    />%
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-[#1B3A5C]">CLIENT PRICE: {fmt(totals.price)}</span>
                    <span className="text-sm text-muted-foreground ml-3">Margin: {totals.margin}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(4)} className="gap-1">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-[#1B3A5C] hover:bg-[#1B3A5C]/90 text-white"
                      onClick={() => setStep(6)}
                    >
                      Continue to Summary <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 6: Quote Ready ──────────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <h1 className="text-2xl font-display font-bold mb-6">Your quote is ready</h1>

            <Card className="mb-6">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Quote title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Client name</Label>
                    <Input value={clientName} onChange={e => setClientName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Client email</Label>
                    <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Optional" className="mt-1" />
                  </div>
                  <div>
                    <Label>Client phone</Label>
                    <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Optional" className="mt-1" />
                  </div>
                  <div>
                    <Label>Job address</Label>
                    <Input value={`${address}${address && (city || state) ? ", " : ""}${city}${state ? `, ${state}` : ""}`} disabled className="mt-1 bg-muted" />
                  </div>
                </div>

                <hr />

                <div className="space-y-2">
                  {areas.map((area, ai) => {
                    const t = areaTotals(area);
                    return (
                      <div key={ai} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{area.name}</span>
                        <span className="font-medium">{fmt(t.total * (1 + markup / 100))}</span>
                      </div>
                    );
                  })}
                  <hr />
                  <div className="flex justify-between font-bold text-base">
                    <span>CLIENT TOTAL</span>
                    <span className="text-[#1B3A5C]">{fmt(totals.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Your estimated margin</span>
                    <span>{totals.margin}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button
                className="w-full h-12 bg-[#F97316] hover:bg-[#ea6c0e] text-white font-semibold"
                onClick={() => save(true)}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save & Create Project"}
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 border-[#1B3A5C] text-[#1B3A5C]"
                onClick={() => save(false)}
                disabled={saving}
              >
                Save Draft
              </Button>
              <Button variant="ghost" onClick={() => setStep(5)} className="text-sm text-muted-foreground">
                ← Back to Prices
              </Button>
            </div>
          </div>
        )}
      </div>
    </BuilderLayout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AreaReviewCard({
  area, aIdx,
  onToggleTask, onDeleteTask, onRenameTask, onRenameArea, onAddSuggested, onAddCustomTask,
}: {
  area: AIArea; aIdx: number;
  onToggleTask: (ai: number, ti: number) => void;
  onDeleteTask: (ai: number, ti: number) => void;
  onRenameTask: (ai: number, ti: number, name: string) => void;
  onRenameArea: (ai: number, name: string) => void;
  onAddSuggested: (ai: number, ti: number) => void;
  onAddCustomTask: (ai: number, name: string, trade: Trade) => void;
}) {
  const [editingAreaName, setEditingAreaName] = useState(false);
  const [areaNameDraft, setAreaNameDraft]     = useState(area.name);
  const [showForm, setShowForm]   = useState(false);
  const [customName, setCustomName] = useState("");
  const [customTrade, setCustomTrade] = useState<Trade>("general");
  const totals = areaTotals(area);

  const included  = area.tasks.filter(t => !t.isAiSuggested);
  const suggested = area.tasks.filter(t => t.isAiSuggested && !t.isIncluded);

  function commitAreaName() {
    if (areaNameDraft.trim()) onRenameArea(aIdx, areaNameDraft.trim());
    setEditingAreaName(false);
  }

  function submitCustom() {
    onAddCustomTask(aIdx, customName, customTrade);
    setCustomName("");
    setCustomTrade("general");
    setShowForm(false);
  }

  return (
    <Card>
      <CardContent className="p-5">
        {/* Area header */}
        <div className="flex items-center justify-between mb-4">
          {editingAreaName ? (
            <Input
              value={areaNameDraft}
              onChange={e => setAreaNameDraft(e.target.value)}
              onBlur={commitAreaName}
              onKeyDown={e => { if (e.key === "Enter") commitAreaName(); if (e.key === "Escape") setEditingAreaName(false); }}
              className="h-8 text-sm font-semibold flex-1 mr-2"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setAreaNameDraft(area.name); setEditingAreaName(true); }}
              className="font-semibold text-foreground flex items-center gap-1 hover:text-[#1B3A5C] group"
              title="Click to rename area"
            >
              {area.name}
              <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <span className="text-sm font-medium text-[#1B3A5C] flex-shrink-0">{fmt(totals.total)}</span>
        </div>

        {/* Included tasks */}
        {included.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Included tasks
            </p>
            <div className="space-y-1">
              {included.map((task) => {
                const ti = area.tasks.indexOf(task);
                return (
                  <EditableTaskRow
                    key={ti} task={task}
                    onToggle={() => onToggleTask(aIdx, ti)}
                    onDelete={() => onDeleteTask(aIdx, ti)}
                    onRename={(name) => onRenameTask(aIdx, ti, name)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {suggested.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
              💡 Did you forget?
            </p>
            <div className="space-y-1">
              {suggested.map((task) => {
                const ti = area.tasks.indexOf(task);
                return (
                  <div key={ti} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.name}</p>
                      {task.suggestionReason && (
                        <p className="text-xs text-muted-foreground mt-0.5">"{task.suggestionReason}"</p>
                      )}
                    </div>
                    <button
                      onClick={() => onAddSuggested(aIdx, ti)}
                      className="text-xs font-semibold text-[#F97316] border border-[#F97316] rounded px-2 py-0.5 hover:bg-[#F97316] hover:text-white transition-colors flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add custom task */}
        {showForm ? (
          <div className="mt-3 p-3 bg-secondary rounded-lg space-y-2">
            <Input
              placeholder="Task name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={e => { if (e.key === "Enter") submitCustom(); if (e.key === "Escape") setShowForm(false); }}
              autoFocus
            />
            <div className="flex gap-2">
              <select
                value={customTrade}
                onChange={e => setCustomTrade(e.target.value as Trade)}
                className="flex-1 h-8 text-sm border rounded px-2 bg-white"
              >
                {["demo","framing","drywall","tile","flooring","plumbing","electrical","hvac","painting",
                  "cabinetry","countertops","cleanup","permits","general"].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <Button size="sm" onClick={submitCustom} className="h-8 bg-[#1B3A5C] text-white px-3">Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-8 px-2">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm text-[#1B3A5C] hover:underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add custom task
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function EditableTaskRow({
  task, onToggle, onDelete, onRename,
}: {
  task: AITask;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(task.name);
  const tradeColor = TRADE_COLORS[task.trade] ?? TRADE_COLORS.general;

  function commit() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg group ${task.isIncluded ? "" : "opacity-50"}`}>
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
          task.isIncluded ? "bg-[#1B3A5C] border-[#1B3A5C] text-white" : "border-gray-300 bg-white"
        }`}
      >
        {task.isIncluded && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            className="h-7 text-sm py-0"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setDraft(task.name); setEditing(true); }}
              className="text-sm font-medium hover:text-[#1B3A5C] text-left"
              title="Click to rename"
            >
              {task.name}
            </button>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tradeColor}`}>{task.trade}</span>
          </div>
        )}
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 flex-shrink-0 p-0.5"
        title="Remove task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AddAreaRow({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen]   = useState(false);
  const [name, setName]   = useState("");

  function submit() {
    if (name.trim()) { onAdd(name.trim()); setName(""); setOpen(false); }
  }

  return (
    <div className="mt-4">
      {open ? (
        <div className="flex gap-2 items-center p-3 bg-secondary rounded-lg">
          <Input
            placeholder="New area name (e.g. Master Bath)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-8 text-sm flex-1"
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
            autoFocus
          />
          <Button size="sm" onClick={submit} className="h-8 bg-[#1B3A5C] text-white px-3">Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 px-2">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-3 text-sm text-muted-foreground hover:border-[#1B3A5C]/40 hover:text-[#1B3A5C] transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add new area
        </button>
      )}
    </div>
  );
}

function PricingTaskCard({
  task, aIdx, tIdx, onUpdate,
}: {
  task: AITask; aIdx: number; tIdx: number;
  onUpdate: (ai: number, ti: number, field: "laborCost" | "materialCost", val: string) => void;
}) {
  const tradeColor = TRADE_COLORS[task.trade] ?? TRADE_COLORS.general;
  const total = task.laborCost + task.materialCost;

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{task.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${tradeColor}`}>{task.trade}</span>
          </div>
        </div>
        {task.quantity && task.unit && (
          <p className="text-xs text-muted-foreground mb-2">
            {task.quantity} {task.unit}
            {task.marketNote && <> · <span className="text-blue-600">{task.marketNote}</span></>}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Labor ($)</Label>
            <input
              type="number" min={0}
              value={task.laborCost}
              onChange={e => onUpdate(aIdx, tIdx, "laborCost", e.target.value)}
              className="w-full mt-1 border rounded px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/30"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Material ($)</Label>
            <input
              type="number" min={0}
              value={task.materialCost}
              onChange={e => onUpdate(aIdx, tIdx, "materialCost", e.target.value)}
              className="w-full mt-1 border rounded px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/30"
            />
          </div>
        </div>
        <div className="flex justify-between mt-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Task total</span>
          <span className="text-sm font-semibold">{fmt(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
