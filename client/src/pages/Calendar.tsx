import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageShell";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const TYPE_COLORS: Record<string, string> = {
  move_in: "bg-success/15 text-success",
  move_out: "bg-warning/15 text-warning",
  lease_expiration: "bg-danger/15 text-danger",
  inspection: "bg-brand/15 text-brand",
  task: "bg-purple-500/15 text-purple-600",
  showing: "bg-cyan-500/15 text-cyan-600",
  other: "bg-muted text-muted-foreground",
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function EventModal({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate?: string }) {
  const utils = trpc.useUtils();
  const { data: properties } = trpc.properties.list.useQuery();
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: { type: "other", date: defaultDate ?? new Date().toISOString().split("T")[0] } });
  useEffect(() => { if (defaultDate) setValue("date", defaultDate); }, [defaultDate, setValue]);
  const create = trpc.calendar.create.useMutation({
    onSuccess: () => { utils.calendar.events.invalidate(); toast.success("Event added"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const onSubmit = (d: any) => create.mutate({ ...d, propertyId: d.propertyId ? Number(d.propertyId) : undefined });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Title *</Label><Input {...register("title", { required: true })} placeholder="e.g. Unit 4B move-in" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date *</Label><Input type="date" {...register("date", { required: true })} /></div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select defaultValue="other" onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["move_in", "move_out", "lease_expiration", "inspection", "task", "showing", "other"].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Property (optional)</Label>
            <Select onValueChange={(v) => setValue("propertyId", v)}>
              <SelectTrigger><SelectValue placeholder="None…" /></SelectTrigger>
              <SelectContent>{(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} {...register("notes")} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Add Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarPage() {
  const [location] = useLocation();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [modal, setModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const { data: events } = trpc.calendar.events.useQuery();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("new") === "event") { setModal(true); window.history.replaceState({}, "", "/calendar"); }
  }, [location]);

  const eventsByDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    (events ?? []).forEach((e: any) => {
      const key = new Date(e.date).toDateString();
      (m[key] ??= []).push(e);
    });
    return m;
  }, [events]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleString("default", { month: "long", year: "numeric" });
  const todayStr = new Date().toDateString();

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader title="Calendar" subtitle="Move-ins, lease expirations, inspections & tasks" icon={<CalIcon className="w-6 h-6" />}
        actions={<Button onClick={() => { setSelectedDate(undefined); setModal(true); }} className="gap-2 bg-brand hover:bg-brand-dark text-white"><Plus className="w-4 h-4" /> New Event</Button>} />

      <Card className="p-4 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="bg-card" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" className="bg-card" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</Button>
            <Button variant="outline" size="icon" className="bg-card" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {WEEKDAYS.map(d => <div key={d} className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
          {grid.map((date, i) => {
            const key = date?.toDateString();
            const dayEvents = key ? eventsByDay[key] ?? [] : [];
            const isToday = key === todayStr;
            return (
              <div key={i} className={`bg-card min-h-[104px] p-1.5 ${!date ? "opacity-40" : "cursor-pointer hover:bg-muted/40 transition-colors"}`}
                onClick={() => { if (date) { setSelectedDate(date.toISOString().split("T")[0]); setModal(true); } }}>
                {date && (
                  <>
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-brand text-white" : "text-muted-foreground"}`}>{date.getDate()}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((e: any) => (
                        <div key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${TYPE_COLORS[e.type] ?? TYPE_COLORS.other}`} title={e.title}>{e.title}</div>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground px-1.5">+{dayEvents.length - 3} more</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <EventModal open={modal} onClose={() => setModal(false)} defaultDate={selectedDate} />
    </div>
  );
}
