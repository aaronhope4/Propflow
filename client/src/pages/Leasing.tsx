import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { FileText, Plus, Search, MoreHorizontal, Edit, Trash2, UserPlus, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader, EmptyState, formatCurrency, formatDate } from "@/components/PageShell";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

// ─── Lease Form Modal ───────────────────────────────────────────────────────
function LeaseFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const utils = trpc.useUtils();
  const { data: units } = trpc.units.all.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: editData
      ? { ...editData,
          startDate: editData.startDate ? new Date(editData.startDate).toISOString().split("T")[0] : "",
          endDate: editData.endDate ? new Date(editData.endDate).toISOString().split("T")[0] : "" }
      : { status: "pending", depositPaid: false, paymentDueDay: 1 },
  });

  const createMutation = trpc.leases.create.useMutation({
    onSuccess: () => { utils.leases.list.invalidate(); toast.success("Lease created"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.leases.update.useMutation({
    onSuccess: () => { utils.leases.list.invalidate(); toast.success("Lease updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: any) => {
    const payload = { ...data, unitId: Number(data.unitId), tenantId: Number(data.tenantId),
      paymentDueDay: Number(data.paymentDueDay),
      lateFeeGraceDays: data.lateFeeGraceDays ? Number(data.lateFeeGraceDays) : undefined };
    if (editData) updateMutation.mutate({ id: editData.id, ...payload });
    else createMutation.mutate(payload);
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editData ? "Edit Lease" : "Create New Lease"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Unit *</Label>
              <Select defaultValue={editData?.unitId?.toString()} onValueChange={(v) => setValue("unitId", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select unit…" /></SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u: any) => <SelectItem key={u.id} value={u.id.toString()}>Unit #{u.unitNumber} — {u.type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Tenant *</Label>
              <Select defaultValue={editData?.tenantId?.toString()} onValueChange={(v) => setValue("tenantId", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>
                  {(tenants ?? []).map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Start Date *</Label><Input type="date" {...register("startDate", { required: true })} /></div>
            <div className="space-y-1.5"><Label>End Date *</Label><Input type="date" {...register("endDate", { required: true })} /></div>
            <div className="space-y-1.5"><Label>Monthly Rent *</Label><Input {...register("rentAmount", { required: true })} placeholder="1500.00" /></div>
            <div className="space-y-1.5"><Label>Security Deposit *</Label><Input {...register("depositAmount", { required: true })} placeholder="1500.00" /></div>
            <div className="space-y-1.5"><Label>Payment Due Day</Label><Input type="number" {...register("paymentDueDay")} min={1} max={31} defaultValue={1} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue={editData?.status ?? "pending"} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending (Draft)</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Late Fee Amount</Label><Input {...register("lateFeeAmount")} placeholder="50.00" /></div>
            <div className="space-y-1.5"><Label>Late Fee Grace Days</Label><Input type="number" {...register("lateFeeGraceDays")} placeholder="5" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Lease Terms</Label><Textarea {...register("terms")} rows={3} placeholder="Lease terms and conditions…" /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-brand hover:bg-brand-dark text-white">
              {isPending ? "Saving…" : editData ? "Save Changes" : "Create Lease"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Prospect Form Modal ─────────────────────────────────────────────────────
function ProspectFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: editData ?? { stage: "new", leadSource: "website" } });
  const create = trpc.prospects.create.useMutation({
    onSuccess: () => { utils.prospects.list.invalidate(); toast.success("Prospect added"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.prospects.update.useMutation({
    onSuccess: () => { utils.prospects.list.invalidate(); toast.success("Prospect updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const onSubmit = (d: any) => editData ? update.mutate({ id: editData.id, ...d }) : create.mutate(d);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editData ? "Edit Prospect" : "New Prospect"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Name *</Label><Input {...register("name", { required: true })} placeholder="Jane Doe" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Email</Label><Input {...register("email")} placeholder="jane@email.com" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input {...register("phone")} placeholder="(555) 123-4567" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lead Source</Label>
              <Select defaultValue={editData?.leadSource ?? "website"} onValueChange={(v) => setValue("leadSource", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["website", "zillow", "referral", "walk_in", "phone", "social", "other"].map(s =>
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select defaultValue={editData?.stage ?? "new"} onValueChange={(v) => setValue("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["new", "contacted", "showing", "application", "approved", "leased", "lost"].map(s =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea {...register("notes")} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending} className="bg-brand hover:bg-brand-dark text-white">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Application Form Modal ──────────────────────────────────────────────────
function ApplicationFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: units } = trpc.units.all.useQuery();
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: { status: "pending" } });
  const create = trpc.applications.create.useMutation({
    onSuccess: () => { utils.applications.list.invalidate(); toast.success("Application created"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Rental Application</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => create.mutate({ ...d, unitId: d.unitId ? Number(d.unitId) : undefined }))} className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Applicant Name *</Label><Input {...register("applicantName", { required: true })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Email</Label><Input {...register("applicantEmail")} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input {...register("applicantPhone")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monthly Income</Label><Input {...register("monthlyIncome")} placeholder="6000" /></div>
            <div className="space-y-1.5"><Label>Desired Move-In</Label><Input type="date" {...register("desiredMoveIn")} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select onValueChange={(v) => setValue("unitId", parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Select unit…" /></SelectTrigger>
              <SelectContent>
                {(units ?? []).map((u: any) => <SelectItem key={u.id} value={u.id.toString()}>Unit #{u.unitNumber}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Leasing() {
  const [location] = useLocation();
  const [tab, setTab] = useState("leases");
  const [search, setSearch] = useState("");
  const [leaseModal, setLeaseModal] = useState(false);
  const [editLease, setEditLease] = useState<any>(null);
  const [prospectModal, setProspectModal] = useState(false);
  const [editProspect, setEditProspect] = useState<any>(null);
  const [appModal, setAppModal] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("new=1")) {
      setEditLease(null); setLeaseModal(true);
      window.history.replaceState({}, "", "/leasing");
    }
  }, [location]);

  const { data: leases, isLoading } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: units } = trpc.units.all.useQuery();
  const { data: prospects } = trpc.prospects.list.useQuery();
  const { data: applications } = trpc.applications.list.useQuery();

  const deleteLease = trpc.leases.delete.useMutation({
    onSuccess: () => { utils.leases.list.invalidate(); toast.success("Lease deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteProspect = trpc.prospects.delete.useMutation({
    onSuccess: () => { utils.prospects.list.invalidate(); toast.success("Prospect removed"); },
    onError: (e) => toast.error(e.message),
  });

  const tenantMap = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]));
  const unitMap = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]));

  const filteredLeases = (leases ?? []).filter((l: any) => {
    const t = tenantMap[l.tenantId], u = unitMap[l.unitId];
    return !search || t?.name.toLowerCase().includes(search.toLowerCase()) || u?.unitNumber?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader title="Leasing" subtitle="Manage leases, applications, and your leasing pipeline" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="leases">Leases <span className="ml-1.5 text-xs opacity-60">{leases?.length ?? 0}</span></TabsTrigger>
          <TabsTrigger value="applications">Applications <span className="ml-1.5 text-xs opacity-60">{applications?.length ?? 0}</span></TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline <span className="ml-1.5 text-xs opacity-60">{prospects?.length ?? 0}</span></TabsTrigger>
        </TabsList>

        {/* LEASES */}
        <TabsContent value="leases">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 bg-card" placeholder="Search leases…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => { setEditLease(null); setLeaseModal(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2 ml-auto">
              <Plus className="w-4 h-4" /> New Lease
            </Button>
          </div>
          {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            : filteredLeases.length === 0 ? <EmptyState icon={<FileText />} title="No leases yet" description="Create your first lease to get started." />
            : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Tenant</th><th>Unit</th><th>Term</th><th>Rent</th><th>Deposit</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {filteredLeases.map((lease: any) => {
                    const t = tenantMap[lease.tenantId], u = unitMap[lease.unitId];
                    return (
                      <tr key={lease.id}>
                        <td><div className="font-medium">{t?.name ?? `#${lease.tenantId}`}</div><div className="text-xs text-muted-foreground">{t?.email}</div></td>
                        <td className="font-medium">{u ? `#${u.unitNumber}` : `#${lease.unitId}`}</td>
                        <td className="text-muted-foreground text-xs">{formatDate(lease.startDate)} → {formatDate(lease.endDate)}</td>
                        <td className="font-medium">{formatCurrency(Number(lease.rentAmount))}/mo</td>
                        <td className="text-muted-foreground">{formatCurrency(Number(lease.depositAmount))}</td>
                        <td><StatusBadge status={lease.status} /></td>
                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditLease(lease); setLeaseModal(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteLease.mutate({ id: lease.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {/* APPLICATIONS */}
        <TabsContent value="applications">
          <div className="flex mb-4">
            <Button onClick={() => setAppModal(true)} className="bg-brand hover:bg-brand-dark text-white gap-2 ml-auto"><Plus className="w-4 h-4" /> New Application</Button>
          </div>
          {(applications ?? []).length === 0 ? <EmptyState icon={<ClipboardCheck />} title="No applications" description="Rental applications will appear here." />
            : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Applicant</th><th>Contact</th><th>Unit</th><th>Income</th><th>Status</th></tr></thead>
                <tbody>
                  {(applications ?? []).map((a: any) => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.applicantName}</td>
                      <td className="text-xs text-muted-foreground">{a.applicantEmail}<br />{a.applicantPhone}</td>
                      <td>{a.unitId ? `#${unitMap[a.unitId]?.unitNumber ?? a.unitId}` : "—"}</td>
                      <td>{a.monthlyIncome ? formatCurrency(Number(a.monthlyIncome)) : "—"}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        {/* PIPELINE */}
        <TabsContent value="pipeline">
          <div className="flex mb-4">
            <Button onClick={() => { setEditProspect(null); setProspectModal(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2 ml-auto"><UserPlus className="w-4 h-4" /> New Prospect</Button>
          </div>
          {(prospects ?? []).length === 0 ? <EmptyState icon={<UserPlus />} title="No prospects" description="Track leads through your leasing funnel." />
            : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(prospects ?? []).map((p: any) => (
                <Card key={p.id} className="p-4 border border-border shadow-sm card-hover">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditProspect(p); setProspectModal(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteProspect.mutate({ id: p.id })}><Trash2 className="w-4 h-4 mr-2" /> Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <StatusBadge status={p.stage} />
                    <span className="text-xs text-muted-foreground capitalize">{p.leadSource?.replace("_", " ")}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LeaseFormModal open={leaseModal} onClose={() => { setLeaseModal(false); setEditLease(null); }} editData={editLease} />
      <ProspectFormModal open={prospectModal} onClose={() => { setProspectModal(false); setEditProspect(null); }} editData={editProspect} />
      <ApplicationFormModal open={appModal} onClose={() => setAppModal(false)} />
    </div>
  );
}
