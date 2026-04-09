import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, MapPin, Calendar, DollarSign, ChevronDown, ChevronUp,
  Loader2, Users, Send, CheckCircle, XCircle, Briefcase, Wrench, Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import {
  useGetNetworkRfqs, useCreateRfq, useUpdateRfqStatus,
  useGetRfqQuotes, useCreateRfqQuote, useUpdateRfqQuoteStatus,
  useCompleteRfq, useCreateRating, useGetRfqRatings,
  useListProjects,
  getNetworkRfqsQueryKey, getRfqQuotesQueryKey,
  type Rfq, type RfqQuote,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

// ─── Trade colours ────────────────────────────────────────────────────────────
const TRADE_COLORS: Record<string, string> = {
  plumber:       "bg-cyan-100 text-cyan-800",
  electrician:   "bg-amber-100 text-amber-800",
  carpenter:     "bg-orange-100 text-orange-800",
  painter:       "bg-purple-100 text-purple-800",
  hvac:          "bg-blue-100 text-blue-800",
  roofer:        "bg-red-100 text-red-800",
  mason:         "bg-stone-100 text-stone-800",
  landscaper:    "bg-green-100 text-green-800",
  ironworker:    "bg-zinc-100 text-zinc-800",
  glazier:       "bg-sky-100 text-sky-800",
  concrete:      "bg-slate-100 text-slate-800",
  flooring:      "bg-yellow-100 text-yellow-800",
  drywall:       "bg-rose-100 text-rose-800",
  insulation:    "bg-lime-100 text-lime-800",
  waterproofing: "bg-teal-100 text-teal-800",
  demolition:    "bg-red-200 text-red-900",
  excavation:    "bg-amber-200 text-amber-900",
  other:         "bg-gray-100 text-gray-700",
};

const TRADE_LABELS: Record<string, string> = {
  plumber: "Plomería", electrician: "Electricidad", carpenter: "Carpintería",
  painter: "Pintura", hvac: "HVAC / Clima", roofer: "Techado",
  mason: "Albañilería", landscaper: "Jardinería", ironworker: "Herrería",
  glazier: "Vidriería", concrete: "Concreto", flooring: "Pisos",
  drywall: "Tablaroca", insulation: "Aislamiento", waterproofing: "Impermeabilización",
  demolition: "Demolición", excavation: "Excavación", other: "Otro",
};

const RFQ_STATUS: Record<string, { label: string; cls: string }> = {
  open:      { label: "Abierto",    cls: "bg-emerald-100 text-emerald-800" },
  closed:    { label: "Cerrado",    cls: "bg-gray-100 text-gray-600" },
  awarded:   { label: "Adjudicado", cls: "bg-blue-100 text-blue-800" },
  cancelled: { label: "Cancelado",  cls: "bg-red-100 text-red-700" },
};

const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pendiente",  cls: "bg-amber-100 text-amber-800" },
  accepted: { label: "Aceptada",   cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rechazada",  cls: "bg-red-100 text-red-700" },
};

// ─── Zod schemas ──────────────────────────────────────────────────────────────
const rfqSchema = z.object({
  title:       z.string().min(1, "El título es requerido"),
  specialty:   z.string().min(1, "Selecciona una especialidad"),
  description: z.string().min(1, "La descripción es requerida"),
  city:        z.string().min(1, "La ciudad es requerida"),
  budget_min:  z.coerce.number().optional(),
  budget_max:  z.coerce.number().optional(),
  start_date:  z.string().optional(),
  project_id:  z.preprocess(v => (v === "" || v == null) ? undefined : Number(v), z.number().int().positive().optional()),
});

const quoteSchema = z.object({
  amount:  z.coerce.number().min(1, "El monto es requerido"),
  message: z.string().optional(),
});

type RfqForm   = z.infer<typeof rfqSchema>;
type QuoteForm = z.infer<typeof quoteSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: string | null | undefined) {
  if (!n) return null;
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ─── StarRating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl leading-none transition-colors ${n <= value ? "text-amber-400" : "text-gray-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── QuoteRow (builder view — inline) ────────────────────────────────────────
function QuoteRow({ quote, rfqId, onAction }: { quote: RfqQuote; rfqId: number; onAction: () => void }) {
  const qc = useQueryClient();
  const patchQuote = useUpdateRfqQuoteStatus(rfqId, quote.id);
  const patchRfq   = useUpdateRfqStatus(rfqId);

  const accept = () => {
    patchQuote.mutate({ data: { status: "accepted" } }, {
      onSuccess: () => {
        patchRfq.mutate({ data: { status: "awarded" } }, {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getNetworkRfqsQueryKey() });
            qc.invalidateQueries({ queryKey: getRfqQuotesQueryKey(rfqId) });
            toast.success("Cotización aceptada y RFQ adjudicado");
            onAction();
          },
        });
      },
      onError: (e: any) => toast.error(e.message || "Error al aceptar"),
    });
  };

  const reject = () => {
    patchQuote.mutate({ data: { status: "rejected" } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getRfqQuotesQueryKey(rfqId) });
        toast.success("Cotización rechazada");
      },
      onError: (e: any) => toast.error(e.message || "Error al rechazar"),
    });
  };

  const busy = patchQuote.isPending || patchRfq.isPending;
  const st   = QUOTE_STATUS[quote.status] ?? QUOTE_STATUS.pending;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-secondary/40 rounded-xl border border-border">
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{quote.subName ?? "Subcontratista"}</p>
        <p className="text-xs text-muted-foreground capitalize">{TRADE_LABELS[quote.subCategory ?? ""] ?? quote.subCategory}</p>
        <p className="text-sm font-bold text-primary">{fmt(quote.amount)}</p>
        {quote.message && <p className="text-xs text-muted-foreground italic">"{quote.message}"</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
        {quote.status === "pending" && (
          <>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={accept} disabled={busy}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Aceptar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={reject} disabled={busy}>
              <XCircle className="w-3 h-3" />
              Rechazar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── BuilderRfqCard ───────────────────────────────────────────────────────────
function BuilderRfqCard({ rfq }: { rfq: Rfq }) {
  const [expanded,      setExpanded]      = useState(false);
  const [ratingOpen,    setRatingOpen]    = useState(false);
  const [quality,       setQuality]       = useState(0);
  const [punctuality,   setPunctuality]   = useState(0);
  const [communication, setCommunication] = useState(0);
  const [comment,       setComment]       = useState("");

  const qc = useQueryClient();

  const { data: quotes, isLoading: quotesLoading } = useGetRfqQuotes(rfq.id, {
    query: { enabled: expanded, queryKey: getRfqQuotesQueryKey(rfq.id) },
  });
  const { data: ratings } = useGetRfqRatings(rfq.id, {
    query: { enabled: !!rfq.completedAt, queryKey: [`/api/network/rfqs/${rfq.id}/ratings`] },
  });

  const completeRfqMut = useCompleteRfq(rfq.id);
  const createRatingMut = useCreateRating(rfq.id);

  const hasRated = ratings?.some(r => r.role === "builder_rating_sub");
  const acceptedSub = quotes?.find(q => q.status === "accepted");

  const handleComplete = () => {
    completeRfqMut.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getNetworkRfqsQueryKey() });
        toast.success("Trabajo marcado como completado");
      },
      onError: (e: any) => toast.error(e.message || "Error al completar"),
    });
  };

  const handleRate = () => {
    if (!quality || !punctuality || !communication) {
      toast.error("Completa todas las calificaciones");
      return;
    }
    createRatingMut.mutate(
      { data: { quality, punctuality, communication, comment: comment || undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [`/api/network/rfqs/${rfq.id}/ratings`] });
          toast.success("Calificación enviada");
          setRatingOpen(false);
        },
        onError: (e: any) => toast.error(e.message || "Error al enviar calificación"),
      },
    );
  };

  const st       = RFQ_STATUS[rfq.status] ?? RFQ_STATUS.open;
  const tradeCls = TRADE_COLORS[rfq.specialty] ?? TRADE_COLORS.other;

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-all border border-border">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground font-display text-base line-clamp-1">{rfq.title}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tradeCls}`}>
                {TRADE_LABELS[rfq.specialty] ?? rfq.specialty}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
              {rfq.completedAt && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  ✓ Completado
                </span>
              )}
              {rfq.projectName && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                  📋 {rfq.projectName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{rfq.city}</p>
          {(rfq.budgetMin || rfq.budgetMax) && (
            <p className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              {rfq.budgetMin && rfq.budgetMax
                ? `${fmt(rfq.budgetMin)} – ${fmt(rfq.budgetMax)}`
                : rfq.budgetMin ? `Desde ${fmt(rfq.budgetMin)}` : `Hasta ${fmt(rfq.budgetMax)}`}
            </p>
          )}
          {rfq.startDate && (
            <p className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {format(new Date(rfq.startDate + "T00:00:00"), "MMM d, yyyy")}
            </p>
          )}
        </div>

        {/* Complete / Rate actions */}
        {rfq.status === "awarded" && !rfq.completedAt && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={handleComplete}
            disabled={completeRfqMut.isPending}
          >
            {completeRfqMut.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trophy className="w-3.5 h-3.5" />}
            Marcar completado
          </Button>
        )}

        {rfq.completedAt && !hasRated && (
          <Dialog open={ratingOpen} onOpenChange={open => {
            setRatingOpen(open);
            if (!open) { setQuality(0); setPunctuality(0); setCommunication(0); setComment(""); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                ★ Calificar subcontratista
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display font-bold text-xl">Califica el trabajo</DialogTitle>
              </DialogHeader>
              {acceptedSub && (
                <p className="text-sm text-muted-foreground -mt-1">{acceptedSub.subName ?? "Subcontratista"}</p>
              )}
              <div className="space-y-4 mt-2">
                {([
                  { label: "⭐ Calidad del trabajo", val: quality,       set: setQuality },
                  { label: "⭐ Puntualidad",          val: punctuality,   set: setPunctuality },
                  { label: "⭐ Comunicación",         val: communication, set: setCommunication },
                ] as const).map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <StarRating value={val} onChange={set as (n: number) => void} />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label>Comentario (opcional)</Label>
                  <Textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Describe tu experiencia con el trabajo..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setRatingOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={handleRate}
                    disabled={createRatingMut.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                  >
                    {createRatingMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enviar calificación
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {rfq.completedAt && hasRated && (
          <p className="text-xs text-center text-emerald-600 font-medium py-1">✓ Ya calificaste este trabajo</p>
        )}

        {/* Expand quotes */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? "Ocultar cotizaciones" : `Ver cotizaciones${quotes ? ` (${quotes.length})` : ""}`}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-1">
                {quotesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : quotes?.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3 italic">
                    Aún no hay cotizaciones para esta solicitud.
                  </p>
                ) : (
                  quotes?.map(q => (
                    <QuoteRow key={q.id} quote={q} rfqId={rfq.id} onAction={() => setExpanded(false)} />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── SubRatingSection ─────────────────────────────────────────────────────────
function SubRatingSection({ rfqId, userId, rfq }: { rfqId: number; userId: number; rfq: Rfq }) {
  const [open,          setOpen]          = useState(false);
  const [quality,       setQuality]       = useState(0);
  const [punctuality,   setPunctuality]   = useState(0);
  const [communication, setCommunication] = useState(0);
  const [comment,       setComment]       = useState("");
  const qc = useQueryClient();

  const { data: ratings } = useGetRfqRatings(rfqId, {
    query: { enabled: !!rfq.completedAt, queryKey: [`/api/network/rfqs/${rfqId}/ratings`] },
  });
  const createRatingMut = useCreateRating(rfqId);

  const hasRated = ratings?.some(r => r.raterId === userId && r.role === "sub_rating_builder");

  if (!rfq.completedAt) return null;

  const handleRate = () => {
    if (!quality || !punctuality || !communication) {
      toast.error("Completa todas las calificaciones");
      return;
    }
    createRatingMut.mutate(
      { data: { quality, punctuality, communication, comment: comment || undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [`/api/network/rfqs/${rfqId}/ratings`] });
          toast.success("Calificación enviada");
          setOpen(false);
        },
        onError: (e: any) => toast.error(e.message || "Error al enviar calificación"),
      },
    );
  };

  if (hasRated) {
    return <p className="text-xs text-center text-emerald-600 font-medium py-1">✓ Ya calificaste al builder</p>;
  }

  return (
    <Dialog open={open} onOpenChange={o => {
      setOpen(o);
      if (!o) { setQuality(0); setPunctuality(0); setCommunication(0); setComment(""); }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white">
          ★ Calificar al builder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl">Califica al contratista</DialogTitle>
        </DialogHeader>
        {rfq.createdByName && (
          <p className="text-sm text-muted-foreground -mt-1">{rfq.createdByName}</p>
        )}
        <div className="space-y-4 mt-2">
          {([
            { label: "⭐ Claridad del trabajo", val: quality,       set: setQuality },
            { label: "⭐ Pago a tiempo",         val: punctuality,   set: setPunctuality },
            { label: "⭐ Comunicación",          val: communication, set: setCommunication },
          ] as const).map(({ label, val, set }) => (
            <div key={label} className="space-y-1">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <StarRating value={val} onChange={set as (n: number) => void} />
            </div>
          ))}
          <div className="space-y-1">
            <Label>Comentario (opcional)</Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Describe tu experiencia trabajando con este contratista..."
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleRate}
              disabled={createRatingMut.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              {createRatingMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar calificación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SubRfqCard (subcontractor view) ─────────────────────────────────────────
function SubRfqCard({ rfq, userId }: { rfq: Rfq; userId: number }) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const qc = useQueryClient();
  const { data: myQuotes } = useGetRfqQuotes(rfq.id);
  const createQuote = useCreateRfqQuote(rfq.id);

  const myQuote = myQuotes?.find(q => q.subcontractorId === userId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema),
  });

  const onSubmit = (data: QuoteForm) => {
    createQuote.mutate({ data }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getRfqQuotesQueryKey(rfq.id) });
        toast.success("Cotización enviada correctamente");
        setQuoteOpen(false);
        reset();
      },
      onError: (e: any) => toast.error(e.message || "Error al enviar cotización"),
    });
  };

  const tradeCls = TRADE_COLORS[rfq.specialty] ?? TRADE_COLORS.other;

  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-all border border-border">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground font-display text-base line-clamp-1">{rfq.title}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${tradeCls}`}>
                {TRADE_LABELS[rfq.specialty] ?? rfq.specialty}
              </span>
              {rfq.completedAt && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  ✓ Completado
                </span>
              )}
            </div>
          </div>
          {myQuote && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${QUOTE_STATUS[myQuote.status]?.cls ?? ""}`}>
              {QUOTE_STATUS[myQuote.status]?.label ?? "Ya cotizaste"}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{rfq.city}</p>
          {rfq.createdByName && (
            <p className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 shrink-0" />{rfq.createdByName}</p>
          )}
          {(rfq.budgetMin || rfq.budgetMax) && (
            <p className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              {rfq.budgetMin && rfq.budgetMax
                ? `${fmt(rfq.budgetMin)} – ${fmt(rfq.budgetMax)}`
                : rfq.budgetMin ? `Desde ${fmt(rfq.budgetMin)}` : `Hasta ${fmt(rfq.budgetMax)}`}
            </p>
          )}
          {rfq.startDate && (
            <p className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {format(new Date(rfq.startDate + "T00:00:00"), "MMM d, yyyy")}
            </p>
          )}
        </div>

        {rfq.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{rfq.description}</p>
        )}

        {/* My quote or Cotizar button */}
        {myQuote ? (
          <div className="p-3 bg-secondary/40 rounded-xl border border-border space-y-1">
            <p className="text-xs font-semibold text-foreground">Tu cotización</p>
            <p className="text-sm font-bold text-primary">{fmt(myQuote.amount)}</p>
            {myQuote.message && <p className="text-xs text-muted-foreground italic">"{myQuote.message}"</p>}
          </div>
        ) : rfq.status === "open" ? (
          <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2" size="sm">
                <Send className="w-4 h-4" /> Cotizar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display font-bold text-xl">Enviar cotización</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground -mt-1">{rfq.title}</p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Monto *</Label>
                  <Input
                    {...register("amount")}
                    type="number"
                    min={1}
                    placeholder="Ej. 12500"
                  />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Mensaje al contratista</Label>
                  <Textarea
                    {...register("message")}
                    placeholder="Describe brevemente tu propuesta, experiencia o condiciones..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setQuoteOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createQuote.isPending} className="gap-2">
                    {createQuote.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enviar cotización
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}

        {/* Rating section for completed RFQs */}
        <SubRatingSection rfqId={rfq.id} userId={userId} rfq={rfq} />
      </CardContent>
    </Card>
  );
}

// ─── Builder view ─────────────────────────────────────────────────────────────
function BuilderNetwork({ rfqs, isLoading }: { rfqs: Rfq[] | undefined; isLoading: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();
  const createRfq = useCreateRfq();
  const { data: projects } = useListProjects({ query: { queryKey: ["/api/projects"] } });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RfqForm>({
    resolver: zodResolver(rfqSchema),
  });

  const onSubmit = (data: RfqForm) => {
    createRfq.mutate({ data }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getNetworkRfqsQueryKey() });
        toast.success("Solicitud publicada exitosamente");
        setCreateOpen(false);
        reset();
      },
      onError: (e: any) => toast.error(e.message || "Error al publicar solicitud"),
    });
  };

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Network</h1>
          <p className="text-muted-foreground mt-1 text-sm">Publica solicitudes y gestiona cotizaciones de subcontratistas.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2">
              <Plus className="w-4 h-4" /> Nueva Solicitud
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold">Nueva Solicitud de Subcontrato</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Título *</Label>
                  <Input {...register("title")} placeholder="Ej. Plomería para residencia nueva" />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Especialidad *</Label>
                  <Select {...register("specialty")}>
                    <option value="">Selecciona...</option>
                    <optgroup label="Instalaciones">
                      <option value="plumber">Plomería</option>
                      <option value="electrician">Electricidad</option>
                      <option value="hvac">HVAC / Clima</option>
                    </optgroup>
                    <optgroup label="Estructura y Acabados">
                      <option value="carpenter">Carpintería</option>
                      <option value="painter">Pintura</option>
                      <option value="roofer">Techado</option>
                      <option value="mason">Albañilería</option>
                      <option value="drywall">Tablaroca</option>
                      <option value="flooring">Pisos</option>
                      <option value="insulation">Aislamiento</option>
                    </optgroup>
                    <optgroup label="Especializado">
                      <option value="ironworker">Herrería</option>
                      <option value="glazier">Vidriería</option>
                      <option value="waterproofing">Impermeabilización</option>
                      <option value="concrete">Concreto</option>
                    </optgroup>
                    <optgroup label="Obras preliminares">
                      <option value="demolition">Demolición</option>
                      <option value="excavation">Excavación</option>
                      <option value="landscaper">Jardinería</option>
                    </optgroup>
                    <option value="other">Otro</option>
                  </Select>
                  {errors.specialty && <p className="text-xs text-destructive">{errors.specialty.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Ciudad *</Label>
                  <Input {...register("city")} placeholder="Ej. Houston, TX" />
                  {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descripción *</Label>
                  <Textarea {...register("description")} placeholder="Describe el trabajo requerido, especificaciones, condiciones de acceso..." rows={3} />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Presupuesto mínimo (opcional)</Label>
                  <Input {...register("budget_min")} type="number" min={0} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Presupuesto máximo (opcional)</Label>
                  <Input {...register("budget_max")} type="number" min={0} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de inicio (opcional)</Label>
                  <Input {...register("start_date")} type="date" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Proyecto (opcional)</Label>
                  <select
                    {...register("project_id")}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Sin proyecto específico</option>
                    {projects?.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createRfq.isPending} className="gap-2">
                  {createRfq.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publicar Solicitud
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : rfqs?.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-2xl border-2 border-dashed border-border">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No has publicado solicitudes aún</h3>
          <p className="text-muted-foreground mt-1 mb-5 text-sm">
            Publica tu primera solicitud para encontrar subcontratistas calificados.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Solicitud
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rfqs?.map((rfq, i) => (
            <motion.div
              key={rfq.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <BuilderRfqCard rfq={rfq} />
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Subcontractor view ───────────────────────────────────────────────────────
function SubNetwork({ rfqs, isLoading, userId }: { rfqs: Rfq[] | undefined; isLoading: boolean; userId: number }) {
  return (
    <>
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Solicitudes disponibles</h1>
        <p className="text-muted-foreground mt-1 text-sm">Solicitudes abiertas que coinciden con tu especialidad y ciudad.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : rfqs?.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-2xl border-2 border-dashed border-border">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No hay solicitudes disponibles en tu área</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Te notificaremos por correo cuando llegue una solicitud que coincida con tu perfil.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rfqs?.map((rfq, i) => (
            <motion.div
              key={rfq.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <SubRfqCard rfq={rfq} userId={userId} />
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Network() {
  const { user } = useAuth();
  const { data: rfqs, isLoading } = useGetNetworkRfqs();

  return (
    <BuilderLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        {user?.role === "builder" ? (
          <BuilderNetwork rfqs={rfqs} isLoading={isLoading} />
        ) : (
          <SubNetwork rfqs={rfqs} isLoading={isLoading} userId={user?.id ?? 0} />
        )}
      </motion.div>
    </BuilderLayout>
  );
}
