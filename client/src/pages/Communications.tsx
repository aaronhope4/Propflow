import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Megaphone, Plus, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, EmptyState, formatDate } from "@/components/PageShell";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

function AnnouncementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: properties } = trpc.properties.list.useQuery();
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: { audience: "all_tenants" } });
  const create = trpc.communications.createAnnouncement.useMutation({
    onSuccess: () => { utils.communications.announcements.invalidate(); toast.success("Announcement sent"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const onSubmit = (d: any) => create.mutate({ ...d, propertyId: d.propertyId ? Number(d.propertyId) : undefined });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Title *</Label><Input {...register("title", { required: true })} placeholder="e.g. Parking lot maintenance" /></div>
          <div className="space-y-1.5"><Label>Message *</Label><Textarea rows={5} {...register("body", { required: true })} placeholder="Write your announcement…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select defaultValue="all_tenants" onValueChange={(v) => setValue("audience", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_tenants">All Tenants</SelectItem>
                  <SelectItem value="property">By Property</SelectItem>
                  <SelectItem value="specific">Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Property (optional)</Label>
              <Select onValueChange={(v) => setValue("propertyId", v)}>
                <SelectTrigger><SelectValue placeholder="All…" /></SelectTrigger>
                <SelectContent>{(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Send Announcement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Communications() {
  const [location] = useLocation();
  const [modal, setModal] = useState(false);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.communications.announcements.useQuery();
  const del = trpc.communications.deleteAnnouncement.useMutation({
    onSuccess: () => { utils.communications.announcements.invalidate(); toast.success("Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("new") === "announcement") { setModal(true); window.history.replaceState({}, "", "/communications"); }
  }, [location]);

  return (
    <div className="max-w-[1100px] mx-auto animate-fade-in">
      <PageHeader title="Communications" subtitle="Broadcast announcements to your tenants" icon={<Megaphone className="w-6 h-6" />}
        actions={<Button onClick={() => setModal(true)} className="gap-2 bg-brand hover:bg-brand-dark text-white"><Plus className="w-4 h-4" /> New Announcement</Button>} />

      {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
        : (data ?? []).length === 0 ? <EmptyState icon={<Mail />} title="No announcements yet" description="Send your first announcement to keep tenants informed." />
        : (
        <div className="space-y-3">
          {(data ?? []).map((a: any) => (
            <Card key={a.id} className="p-5 border border-border shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{a.title}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-light text-brand capitalize">{(a.audience ?? "all_tenants").replace("_", " ")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(a.createdAt)}</p>
                </div>
                <button className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground" onClick={() => del.mutate({ id: a.id })}><Trash2 className="w-4 h-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AnnouncementModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
}
