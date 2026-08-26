import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Search, MoreHorizontal, Edit, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

type LeaseForm = {
  unitId: number; tenantId: number;
  startDate: string; endDate: string;
  rentAmount: string; depositAmount: string;
  depositPaid: boolean; paymentDueDay: number;
  lateFeeAmount?: string; lateFeeGraceDays?: number;
  status: "pending" | "active" | "expired" | "terminated";
  terms?: string; notes?: string;
};

function LeaseFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const utils = trpc.useUtils();
  const { data: units } = trpc.units.all.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();

  const { register, handleSubmit, reset, setValue, watch } = useForm<LeaseForm>({
    defaultValues: editData
      ? {
          ...editData,
          startDate: editData.startDate ? new Date(editData.startDate).toISOString().split("T")[0] : "",
          endDate: editData.endDate ? new Date(editData.endDate).toISOString().split("T")[0] : "",
        }
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

  const onSubmit = (data: LeaseForm) => {
    const payload = {
      ...data,
      unitId: Number(data.unitId),
      tenantId: Number(data.tenantId),
      paymentDueDay: Number(data.paymentDueDay),
      lateFeeGraceDays: data.lateFeeGraceDays ? Number(data.lateFeeGraceDays) : undefined,
    };
    if (editData) updateMutation.mutate({ id: editData.id, ...payload });
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Lease" : "Create New Lease"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Unit *</Label>
              <Select
                defaultValue={editData?.unitId?.toString()}
                onValueChange={(v) => setValue("unitId", parseInt(v))}
              >
                <SelectTrigger><SelectValue placeholder="Select unit…" /></SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      Unit #{u.unitNumber} — {u.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Tenant *</Label>
              <Select
                defaultValue={editData?.tenantId?.toString()}
                onValueChange={(v) => setValue("tenantId", parseInt(v))}
              >
                <SelectTrigger><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>
                  {(tenants ?? []).map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" {...register("startDate", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <Input type="date" {...register("endDate", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Rent *</Label>
              <Input {...register("rentAmount", { required: true })} placeholder="1500.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Security Deposit *</Label>
              <Input {...register("depositAmount", { required: true })} placeholder="1500.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Due Day</Label>
              <Input type="number" {...register("paymentDueDay")} min={1} max={31} defaultValue={1} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue={editData?.status ?? "pending"} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Late Fee Amount</Label>
              <Input {...register("lateFeeAmount")} placeholder="50.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Late Fee Grace Days</Label>
              <Input type="number" {...register("lateFeeGraceDays")} placeholder="5" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Lease Terms</Label>
              <Textarea {...register("terms")} rows={3} placeholder="Lease terms and conditions…" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register("notes")} rows={2} placeholder="Internal notes…" />
            </div>
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

export default function Leases() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: leases, isLoading } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: units } = trpc.units.all.useQuery();

  const deleteMutation = trpc.leases.delete.useMutation({
    onSuccess: () => { utils.leases.list.invalidate(); toast.success("Lease deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t]));
  const unitMap = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]));

  const filtered = (leases ?? []).filter(l => {
    const tenant = tenantMap[l.tenantId];
    const unit = unitMap[l.unitId];
    const matchesSearch = !search ||
      tenant?.name.toLowerCase().includes(search.toLowerCase()) ||
      unit?.unitNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const daysUntilExpiry = (endDate: Date) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Leases</h1>
          <p className="page-subtitle">{leases?.length ?? 0} total leases</p>
        </div>
        <Button onClick={() => { setEditData(null); setModalOpen(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> New Lease
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by tenant or unit…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No leases found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first lease to get started"}
          </p>
          {!search && statusFilter === "all" && (
            <Button onClick={() => setModalOpen(true)} className="bg-brand hover:bg-brand-dark text-white gap-2">
              <Plus className="w-4 h-4" /> New Lease
            </Button>
          )}
        </div>
      ) : (
        <Card className="border border-border shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Start</th>
                <th>End</th>
                <th>Rent</th>
                <th>Deposit</th>
                <th>Status</th>
                <th>Expires In</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lease => {
                const tenant = tenantMap[lease.tenantId];
                const unit = unitMap[lease.unitId];
                const days = daysUntilExpiry(lease.endDate);
                return (
                  <tr key={lease.id}>
                    <td>
                      <div className="font-medium text-foreground">{tenant?.name ?? `Tenant #${lease.tenantId}`}</div>
                      <div className="text-xs text-muted-foreground">{tenant?.email}</div>
                    </td>
                    <td className="font-medium">
                      {unit ? `#${unit.unitNumber}` : `Unit #${lease.unitId}`}
                    </td>
                    <td className="text-muted-foreground">{new Date(lease.startDate).toLocaleDateString()}</td>
                    <td className="text-muted-foreground">{new Date(lease.endDate).toLocaleDateString()}</td>
                    <td className="font-medium">${Number(lease.rentAmount).toLocaleString()}/mo</td>
                    <td className="text-muted-foreground">${Number(lease.depositAmount).toLocaleString()}</td>
                    <td><StatusBadge status={lease.status} /></td>
                    <td>
                      {lease.status === "active" && (
                        <span className={`text-xs font-medium ${days < 30 ? "text-warning" : days < 0 ? "text-danger" : "text-muted-foreground"}`}>
                          {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                        </span>
                      )}
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditData(lease); setModalOpen(true); }}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteMutation.mutate({ id: lease.id })}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
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

      <LeaseFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditData(null); }} editData={editData} />
    </div>
  );
}
