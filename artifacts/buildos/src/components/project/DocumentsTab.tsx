import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, FileText, ClipboardList, Loader2,
  ArrowLeft, ArrowRight, CheckCircle2, Pencil, X,
} from "lucide-react";
import { useForm, useWatch, type Control } from "react-hook-form";

import {
  useListDocuments,
  useGetTemplates,
  useGetTemplate,
  useCreateDocument,
  useSignDocument,
  listDocumentsUrl,
  type DocumentListItemType,
  type DocumentDetailType,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────
type DocType  = "construction" | "remodeling" | "change_order";
type Language = "en" | "es";

type ProjectInfo = {
  id: number;
  name: string;
  address: string;
  clientName: string;
  clientEmail: string | null;
};

type ContractFields = {
  owner_name: string;
  owner_address: string;
  project_description: string;
  contract_amount: string;
  start_date: string;
  end_date: string;
  effective_date: string;
  interest_rate: string;
  cure_days: string;
};

type ChangeOrderFields = {
  co_number: string;
  owner_name: string;
  change_description: string;
  original_amount: string;
  change_amount: string;
  new_total: string;
  additional_days: string;
  new_completion_date: string;
  effective_date: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DOC_STATUS: Record<string, { label: string; className: string }> = {
  draft:  { label: "Borrador", className: "bg-slate-100 text-slate-600 border-slate-200" },
  sent:   { label: "Enviado",  className: "bg-blue-100 text-blue-700 border-blue-200" },
  signed: { label: "Firmado",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

function replaceVars(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Signature Canvas ─────────────────────────────────────────────────────────
function SignatureCanvas({
  onSign,
  isPending,
  label,
}: {
  onSign: (dataUrl: string) => void;
  isPending: boolean;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = "touches" in e ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault();
    drawing.current = true;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.strokeStyle = "#1a1a1a";
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const stopDraw = useCallback(() => { drawing.current = false; }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.addEventListener("mousedown",  startDraw as EventListener);
    canvas.addEventListener("mousemove",  draw      as EventListener);
    canvas.addEventListener("mouseup",    stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw as EventListener, { passive: false });
    canvas.addEventListener("touchmove",  draw      as EventListener, { passive: false });
    canvas.addEventListener("touchend",   stopDraw);
    return () => {
      canvas.removeEventListener("mousedown",  startDraw as EventListener);
      canvas.removeEventListener("mousemove",  draw      as EventListener);
      canvas.removeEventListener("mouseup",    stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw as EventListener);
      canvas.removeEventListener("touchmove",  draw      as EventListener);
      canvas.removeEventListener("touchend",   stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isEmpty = (canvas: HTMLCanvasElement) => {
    const blank = document.createElement("canvas");
    blank.width  = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  };

  const submit = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    if (isEmpty(canvas)) {
      toast.warning("Por favor firme en el recuadro antes de continuar");
      return;
    }
    onSign(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 touch-none cursor-crosshair"
        style={{ maxHeight: 150 }}
      />
      <p className="text-xs text-muted-foreground text-center">Firme aquí con su dedo o mouse</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} className="gap-1.5">
          <X className="w-3.5 h-3.5" /> Limpiar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={isPending}
          className="flex-1 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
          {label}
        </Button>
      </div>
    </div>
  );
}

// ─── New Total Auto-Calculator ────────────────────────────────────────────────
function NewTotalWatcher({ control, setValue }: { control: Control<ChangeOrderFields>; setValue: (name: "new_total", v: string) => void }) {
  const [orig, change] = useWatch({ control, name: ["original_amount", "change_amount"] });
  useEffect(() => {
    const o = parseFloat(orig  ?? "");
    const c = parseFloat(change ?? "");
    if (!isNaN(o) && !isNaN(c)) setValue("new_total", (o + c).toFixed(2));
  }, [orig, change, setValue]);
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DocumentsTab({ projectId, project }: { projectId: number; project: ProjectInfo }) {
  const queryClient = useQueryClient();
  const { user }    = useAuth();

  // ── navigation state ──
  type View = "list" | "create" | "sign";
  const [view,       setView]       = useState<View>("list");
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);

  // ── selection state (step 1) ──
  const [selectedType, setSelectedType] = useState<DocType>("construction");
  const [selectedLang, setSelectedLang] = useState<Language>("es");

  // ── preview state (step 3) ──
  const [previewHtml, setPreviewHtml] = useState("");
  const [pendingFields, setPendingFields] = useState<Record<string, string>>({});

  // ── signing state ──
  const [signingDoc, setSigningDoc] = useState<DocumentDetailType | null>(null);

  // ── queries ──
  const { data: docs = [], isLoading } = useListDocuments(projectId);
  const { data: templates = [] }       = useGetTemplates({ type: selectedType, language: selectedLang });
  const templateId = templates[0]?.id;
  const { data: templateDetail } = useGetTemplate(templateId ?? 0);

  // ── mutations ──
  const createMutation = useCreateDocument(projectId);
  const signMutation   = useSignDocument(signingDoc?.projectId ?? projectId, signingDoc?.id ?? 0);

  const invalidateDocs = () =>
    queryClient.invalidateQueries({ queryKey: [listDocumentsUrl(projectId)] });

  // ── forms ──
  const contractForm = useForm<ContractFields>({
    defaultValues: {
      owner_name:          project.clientName ?? "",
      owner_address:       "",
      project_description: "",
      contract_amount:     "",
      start_date:          "",
      end_date:            "",
      effective_date:      today(),
      interest_rate:       "1.5",
      cure_days:           "10",
    },
  });

  const coForm = useForm<ChangeOrderFields>({
    defaultValues: {
      co_number:           "001",
      owner_name:          project.clientName ?? "",
      change_description:  "",
      original_amount:     "",
      change_amount:       "",
      new_total:           "",
      additional_days:     "0",
      new_completion_date: "",
      effective_date:      today(),
    },
  });

  const isChangeOrder = selectedType === "change_order";

  // ── step 2 → preview ──
  const handleGeneratePreview = (fields: Record<string, string>) => {
    if (!templateDetail) return;
    const vars: Record<string, string> = {
      ...fields,
      project_address: project.address,
      project_name:    project.name,
    };
    setPreviewHtml(replaceVars(templateDetail.content, vars));
    setPendingFields(fields);
    setCreateStep(3);
  };

  const onContractPreview = contractForm.handleSubmit((data) =>
    handleGeneratePreview({ ...data })
  );

  const onCoPreview = coForm.handleSubmit((data) =>
    handleGeneratePreview({ ...data })
  );

  // ── step 3 → save & sign ──
  const handleSaveAndSign = () => {
    if (!templateId) return;
    createMutation.mutate(
      {
        data: {
          template_id:  templateId,
          language:     selectedLang,
          title:        isChangeOrder
            ? `Orden de Cambio #${(pendingFields.co_number ?? "001")} — ${project.name}`
            : `${selectedType === "construction" ? "Contrato de Construcción" : "Contrato de Remodelación"} — ${project.name}`,
          field_values: pendingFields,
        },
      },
      {
        onSuccess: (doc) => {
          toast.success("Documento creado");
          invalidateDocs();
          setSigningDoc(doc);
          setView("sign");
        },
        onError: () => toast.error("Error al crear el documento"),
      }
    );
  };

  // ── sign handler ──
  const handleSign = (role: "contractor" | "client", dataUrl: string) => {
    if (!signingDoc) return;
    signMutation.mutate(
      { data: { role, signature: dataUrl } },
      {
        onSuccess: (updated) => {
          setSigningDoc(updated);
          invalidateDocs();
          toast.success(role === "contractor" ? "Firma del contratista guardada" : "Firma del cliente guardada");
        },
        onError: () => toast.error("Error al guardar la firma"),
      }
    );
  };

  const resetCreate = () => {
    setCreateStep(1);
    setSelectedType("construction");
    setSelectedLang("es");
    setPreviewHtml("");
    setPendingFields({});
    contractForm.reset({
      owner_name: project.clientName ?? "",
      owner_address: "",
      project_description: "",
      contract_amount: "",
      start_date: "",
      end_date: "",
      effective_date: today(),
      interest_rate: "1.5",
      cure_days: "10",
    });
    coForm.reset({
      co_number: "001",
      owner_name: project.clientName ?? "",
      change_description: "",
      original_amount: "",
      change_amount: "",
      new_total: "",
      additional_days: "0",
      new_completion_date: "",
      effective_date: today(),
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA 3 — FIRMA
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === "sign" && signingDoc) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setView("list"); setSigningDoc(null); }}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a documentos
          </Button>
          <h3 className="font-semibold text-foreground">{signingDoc.title}</h3>
        </div>

        {/* Documento renderizado */}
        <div
          className="border rounded-xl bg-white overflow-auto shadow-sm"
          style={{ maxHeight: 420 }}
          dangerouslySetInnerHTML={{ __html: signingDoc.content }}
        />

        {/* Estado */}
        {signingDoc.status === "signed" && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">
              Documento firmado por ambas partes el{" "}
              {signingDoc.signedAt ? format(new Date(signingDoc.signedAt), "PPP") : ""}
            </span>
          </div>
        )}

        {/* Secciones de firma */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CONTRATISTA */}
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-5 space-y-4">
              <h4 className="font-semibold text-sm text-foreground border-b pb-2">Firma del Contratista</h4>
              {signingDoc.contractorSignedAt ? (
                <div className="space-y-2">
                  {signingDoc.contractorSignature && (
                    <img
                      src={signingDoc.contractorSignature}
                      alt="Firma contratista"
                      className="border rounded bg-slate-50 w-full"
                      style={{ maxHeight: 100, objectFit: "contain" }}
                    />
                  )}
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Firmado el {format(new Date(signingDoc.contractorSignedAt), "PPp")}
                  </div>
                </div>
              ) : (
                <SignatureCanvas
                  onSign={(url) => handleSign("contractor", url)}
                  isPending={signMutation.isPending}
                  label="Firmar como Contratista"
                />
              )}
            </CardContent>
          </Card>

          {/* CLIENTE */}
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-5 space-y-4">
              <h4 className="font-semibold text-sm text-foreground border-b pb-2">Firma del Cliente</h4>
              {signingDoc.clientSignedAt ? (
                <div className="space-y-2">
                  {signingDoc.clientSignature && (
                    <img
                      src={signingDoc.clientSignature}
                      alt="Firma cliente"
                      className="border rounded bg-slate-50 w-full"
                      style={{ maxHeight: 100, objectFit: "contain" }}
                    />
                  )}
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Firmado el {format(new Date(signingDoc.clientSignedAt), "PPp")}
                  </div>
                </div>
              ) : (
                <SignatureCanvas
                  onSign={(url) => handleSign("client", url)}
                  isPending={signMutation.isPending}
                  label="Firmar como Cliente"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA 2 — CREAR DOCUMENTO
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (createStep === 1) { resetCreate(); setView("list"); }
              else if (createStep === 2) setCreateStep(1);
              else setCreateStep(2);
            }}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {createStep === 1 ? "Cancelar" : "Atrás"}
          </Button>
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  s <= createStep
                    ? "bg-orange-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* ─── PASO 1: Selector ─── */}
        {createStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg text-foreground">Seleccionar tipo de documento</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Elige el tipo de contrato que deseas generar</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  { type: "construction",  icon: FileText,      label: "Contrato Nueva Construcción" },
                  { type: "remodeling",    icon: FileText,      label: "Contrato Remodelación" },
                  { type: "change_order",  icon: ClipboardList, label: "Orden de Cambio" },
                ] as { type: DocType; icon: typeof FileText; label: string }[]
              ).map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    selectedType === type
                      ? "border-orange-500 bg-orange-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Icon className={`w-7 h-7 mb-3 ${selectedType === type ? "text-orange-500" : "text-slate-400"}`} />
                  <p className={`font-semibold text-sm ${selectedType === type ? "text-orange-700" : "text-foreground"}`}>
                    {label}
                  </p>
                </button>
              ))}
            </div>

            {/* Idioma */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Idioma del documento</p>
              <div className="flex gap-3">
                {(["es", "en"] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-5 py-2 rounded-lg border-2 font-bold text-sm transition-all ${
                      selectedLang === lang
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setCreateStep(2)}
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── PASO 2: Formulario ─── */}
        {createStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg text-foreground">
                {isChangeOrder ? "Datos de la Orden de Cambio" : "Datos del Contrato"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Completa los campos para generar el documento
              </p>
            </div>

            {isChangeOrder ? (
              <form onSubmit={onCoPreview} className="space-y-4">
                <NewTotalWatcher control={coForm.control} setValue={coForm.setValue} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de CO *</Label>
                    <Input {...coForm.register("co_number", { required: true })} placeholder="001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha efectiva *</Label>
                    <Input type="date" {...coForm.register("effective_date", { required: true })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre del cliente *</Label>
                  <Input {...coForm.register("owner_name", { required: true })} placeholder="Juan López" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción del cambio *</Label>
                  <Textarea {...coForm.register("change_description", { required: true })} rows={3} placeholder="Describe el alcance del cambio..." />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Monto original *</Label>
                    <Input {...coForm.register("original_amount", { required: true })} placeholder="50000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Monto del cambio *</Label>
                    <Input {...coForm.register("change_amount", { required: true })} placeholder="5000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nuevo total</Label>
                    <Input {...coForm.register("new_total")} placeholder="Auto" className="bg-muted/40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Días adicionales</Label>
                    <Input {...coForm.register("additional_days")} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva fecha de entrega *</Label>
                    <Input type="date" {...coForm.register("new_completion_date", { required: true })} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                    Generar documento <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={onContractPreview} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del cliente *</Label>
                  <Input {...contractForm.register("owner_name", { required: true })} placeholder="Juan López" />
                </div>
                <div className="space-y-2">
                  <Label>Dirección del cliente *</Label>
                  <Input {...contractForm.register("owner_address", { required: true })} placeholder="123 Calle Principal, Ciudad, TX" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción del trabajo *</Label>
                  <Textarea {...contractForm.register("project_description", { required: true })} rows={3} placeholder="Describe el alcance de la obra..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto del contrato *</Label>
                    <Input {...contractForm.register("contract_amount", { required: true })} placeholder="$50,000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha efectiva *</Label>
                    <Input type="date" {...contractForm.register("effective_date", { required: true })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de inicio *</Label>
                    <Input type="date" {...contractForm.register("start_date", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de entrega *</Label>
                    <Input type="date" {...contractForm.register("end_date", { required: true })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tasa de interés por mora (%)</Label>
                    <Input {...contractForm.register("interest_rate")} placeholder="1.5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Días para curar incumplimiento</Label>
                    <Input {...contractForm.register("cure_days")} placeholder="10" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                    Generar documento <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ─── PASO 3: Preview ─── */}
        {createStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg text-foreground">Vista previa del documento</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Revisa el documento antes de guardarlo y firmarlo</p>
            </div>

            <div
              className="border rounded-xl bg-white overflow-auto shadow-sm"
              style={{ maxHeight: 480 }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCreateStep(2)}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Editar campos
              </Button>
              <Button
                onClick={handleSaveAndSign}
                disabled={createMutation.isPending}
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {createMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Pencil className="w-4 h-4" />}
                Guardar y Firmar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA 1 — LISTA
  // ─────────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {docs.length} {docs.length === 1 ? "Documento" : "Documentos"}
        </h3>
        {user?.role === "builder" && (
          <Button
            size="sm"
            onClick={() => { resetCreate(); setView("create"); setCreateStep(1); }}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="w-4 h-4" /> Nuevo Documento
          </Button>
        )}
      </div>

      {/* Empty state */}
      {docs.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none bg-transparent">
          <CardContent className="p-10 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay documentos todavía</p>
            <p className="text-sm mt-1">Genera tu primer contrato o orden de cambio.</p>
            {user?.role === "builder" && (
              <Button
                size="sm"
                onClick={() => { resetCreate(); setView("create"); setCreateStep(1); }}
                className="mt-4 gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="w-4 h-4" /> Nuevo Documento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc: DocumentListItemType) => {
            const cfg  = DOC_STATUS[doc.status] ?? DOC_STATUS.draft;
            const Icon = doc.type === "change_order" ? ClipboardList : FileText;
            return (
              <Card key={doc.id} className="border-none shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 p-2 rounded-lg ${
                      doc.status === "signed" ? "bg-emerald-50" :
                      doc.status === "sent"   ? "bg-blue-50"    : "bg-slate-50"
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        doc.status === "signed" ? "text-emerald-600" :
                        doc.status === "sent"   ? "text-blue-600"    : "text-slate-400"
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{doc.title}</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                          {doc.language}
                        </span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Signature indicators */}
                      <div className="flex flex-wrap gap-3 mt-1.5">
                        <span className={`text-xs font-medium flex items-center gap-1 ${doc.contractorSignedAt ? "text-emerald-600" : "text-slate-400"}`}>
                          {doc.contractorSignedAt
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Contratista</>
                            : "○ Contratista"}
                        </span>
                        <span className={`text-xs font-medium flex items-center gap-1 ${doc.clientSignedAt ? "text-emerald-600" : "text-slate-400"}`}>
                          {doc.clientSignedAt
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Cliente</>
                            : "○ Cliente"}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1.5">
                        Creado {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem("buildos_token");
                          const res = await fetch(`/api/projects/${projectId}/documents/${doc.id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const full: DocumentDetailType = await res.json();
                          setSigningDoc(full);
                          setView("sign");
                        } catch {
                          toast.error("Error al cargar el documento");
                        }
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Ver y Firmar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
