import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth, parseISO } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2, Circle, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = (path: string) => `${BASE}/api${path}`;

export interface CalendarEvent {
  id: number;
  title: string;
  type: string;
  date: string;
  endDate: string | null;
  allDay: boolean;
  notes: string | null;
  projectId: number | null;
  projectName: string | null;
  completed: boolean;
  organizationId: number;
  createdBy: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  inspection:  { label: "Inspection",  color: "text-blue-700",   bg: "bg-blue-100",   dot: "bg-blue-500"   },
  payment:     { label: "Payment",     color: "text-emerald-700",bg: "bg-emerald-100",dot: "bg-emerald-500" },
  visit:       { label: "Site Visit",  color: "text-violet-700", bg: "bg-violet-100", dot: "bg-violet-500"  },
  phase:       { label: "Phase",       color: "text-amber-700",  bg: "bg-amber-100",  dot: "bg-amber-500"   },
  invoice_due: { label: "Invoice Due", color: "text-red-700",    bg: "bg-red-100",    dot: "bg-red-500"     },
  coi_expiry:  { label: "COI Expiry",  color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-500"  },
  other:       { label: "Other",       color: "text-slate-600",  bg: "bg-slate-100",  dot: "bg-slate-400"   },
};

const typeOf = (t: string) => TYPE_CONFIG[t] ?? TYPE_CONFIG.other;

const EVENT_TYPES = Object.entries(TYPE_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));

interface Props {
  projectId?: number;
  projectName?: string;
}

export default function CalendarView({ projectId, projectName }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({ title: "", type: "other", date: "", notes: "", allDay: true, projName: "" });
  const queryClient = useQueryClient();

  const month = currentMonth.getMonth() + 1;
  const year  = currentMonth.getFullYear();

  const qKey = projectId
    ? `/events?month=${month}&year=${year}&projectId=${projectId}`
    : `/events?month=${month}&year=${year}`;

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: [qKey],
    queryFn: async () => {
      const url = projectId
        ? API(`/events?month=${month}&year=${year}&projectId=${projectId}`)
        : API(`/events?month=${month}&year=${year}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load events");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(API("/events"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Event created");
      setAddModalOpen(false);
      setForm({ title: "", type: "other", date: "", notes: "", allDay: true, projName: "" });
      queryClient.invalidateQueries({ queryKey: [qKey] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: number; [k: string]: any }) => {
      const res = await fetch(API(`/events/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [qKey] });
      setEditEvent(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(API(`/events/${id}`), { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: [qKey] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [currentMonth]);

  const eventsOnDay = (day: Date) =>
    events.filter(e => isSameDay(parseISO(e.date), day));

  const selectedDayEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  const handleAddSubmit = () => {
    if (!form.title.trim() || !form.date) { toast.error("Title and date are required"); return; }
    createMutation.mutate({
      title:       form.title.trim(),
      type:        form.type,
      date:        form.date,
      notes:       form.notes || null,
      allDay:      form.allDay,
      projectId:   projectId ?? null,
      projectName: projectId ? (projectName ?? null) : (form.projName || null),
    });
  };

  const openAdd = (day?: Date) => {
    setForm({
      title: "", type: "other",
      date: day ? format(day, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      notes: "", allDay: true, projName: "",
    });
    setAddModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-foreground min-w-40 text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Button size="sm" className="gap-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => openAdd()}>
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dayEvents = eventsOnDay(day);
                const inMonth   = isSameMonth(day, currentMonth);
                const isToday   = isSameDay(day, new Date());
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[72px] p-1.5 text-left border-b border-r border-border transition-colors relative
                      ${!inMonth ? "bg-slate-50/50" : "bg-white hover:bg-slate-50"}
                      ${isSelected ? "ring-2 ring-inset ring-primary" : ""}
                    `}
                  >
                    <span className={`text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/40"}
                    `}>
                      {format(day, "d")}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => {
                        const cfg = typeOf(ev.type);
                        return (
                          <div
                            key={ev.id}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate font-medium ${cfg.bg} ${cfg.color} ${ev.completed ? "opacity-50 line-through" : ""}`}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 px-1">
            {EVENT_TYPES.map(({ value, label }) => {
              const cfg = typeOf(value);
              return (
                <div key={value} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel — selected day events */}
        <div className="lg:col-span-1">
          {selectedDay ? (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3 sticky top-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">{format(selectedDay, "EEE, MMM d")}</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="rounded-full gap-1.5 text-xs" onClick={() => openAdd(selectedDay)}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                  <button onClick={() => setSelectedDay(null)} className="p-1 hover:text-muted-foreground text-muted-foreground/40 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-25" />
                  <p className="text-sm">No events</p>
                  <button onClick={() => openAdd(selectedDay)} className="text-xs text-primary hover:underline mt-1">+ Add one</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(ev => {
                    const cfg = typeOf(ev.type);
                    return (
                      <div key={ev.id} className={`rounded-xl p-3 ${cfg.bg} relative group`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${cfg.color} ${ev.completed ? "line-through opacity-60" : ""} truncate`}>
                              {ev.title}
                            </p>
                            <p className={`text-xs mt-0.5 ${cfg.color} opacity-70`}>{cfg.label}</p>
                            {ev.projectName && !projectId && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.projectName}</p>
                            )}
                            {ev.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => updateMutation.mutate({ id: ev.id, completed: !ev.completed })}
                              className={`p-1 rounded-full hover:bg-white/60 transition-colors ${cfg.color}`}
                              title={ev.completed ? "Mark incomplete" : "Mark complete"}
                            >
                              {ev.completed
                                ? <CheckCircle2 className="w-3.5 h-3.5" />
                                : <Circle className="w-3.5 h-3.5" />
                              }
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(ev.id)}
                              className="p-1 rounded-full hover:bg-white/60 text-red-500 transition-colors"
                              title="Delete event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 text-center text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium">Select a day</p>
              <p className="text-xs mt-1">Click any day to see or add events</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="Event title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            {!projectId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Project (optional)</label>
                <Input
                  placeholder="Project name"
                  value={form.projName}
                  onChange={e => setForm(f => ({ ...f, projName: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                placeholder="Additional notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="allDay"
                type="checkbox"
                checked={form.allDay}
                onChange={e => setForm(f => ({ ...f, allDay: e.target.checked }))}
                className="w-4 h-4 rounded border-input"
              />
              <label htmlFor="allDay" className="text-sm">All day event</label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddModalOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-[#1B3A5C] hover:bg-[#152d4a] text-white"
                onClick={handleAddSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving…" : "Save Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
