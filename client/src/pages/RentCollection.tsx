import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DollarSign, Plus, Search, CheckCircle, AlertTriangle, MoreHorizontal, Edit, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

function CreatePaymentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: leases } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: { status: "pending", dueDate: new Date().toISOString().split("T")[0] },
  });

  const createMutation = trpc.rentPayments.create.useMutation({
    onSuccess: () => { utils.rentPayments.list.invalidate(); toast.success("Payment record created"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: any) => {
    const amount = parseFloat(data.amount) || 0;
    const lateFee = parseFloat(data.lateFee) || 0;
    createMutation.mutate({
      ...data,
      leaseId: parseInt(data.leaseId),
      tenantId: parseInt(data.tenantId),
      totalAmount: (amount + lateFee).toFixed(2),
    });
  };

  const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t]));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payment Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Lease *</Label>
              <Select onValueChange={(v) => {
                setValue("leaseId", v);
                const lease = (leases ?? []).find(l => l.id.toString() === v);
                if (lease) {
                  setValue("tenantId", lease.tenantId.toString());
                  setValue("amount", lease.rentAmount);
                  setValue("totalAmount", lease.rentAmount);
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select lease…" /></SelectTrigger>
                <SelectContent>
                  {(leases ?? []).filter(l => l.status === "active").map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      {tenantMap[l.tenantId]?.name ?? `Tenant #${l.tenantId}`} — ${Number(l.rentAmount).toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Tenant *</Label>
              <Select onValueChange={(v) => setValue("tenantId", v)}>
                <SelectTrigger><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>
                  {(tenants ?? []).map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input {...register("amount", { required: true })} placeholder="1500.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Late Fee</Label>
              <Input {...register("lateFee")} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Input type="date" {...register("dueDate", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue="pending" onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-brand hover:bg-brand-dark text-white">
              {createMutation.isPending ? "Saving…" : "Create Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidModal({ open, onClose, payment }: { open: boolean; onClose: () => void; payment: any }) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: { paidDate: new Date().toISOString().split("T")[0], paymentMethod: "ach" },
  });

  const markPaidMutation = trpc.rentPayments.markPaid.useMutation({
    onSuccess: () => { utils.rentPayments.list.invalidate(); toast.success("Payment marked as paid"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: any) => {
    markPaidMutation.mutate({ id: payment.id, ...data });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">Amount: ${Number(payment?.totalAmount ?? 0).toLocaleString()}</p>
            <p className="text-muted-foreground">Due: {payment?.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "—"}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Date</Label>
            <Input type="date" {...register("paidDate", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select defaultValue="ach" onValueChange={(v) => setValue("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ach">ACH / Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={markPaidMutation.isPending} className="bg-success hover:bg-success/90 text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              {markPaidMutation.isPending ? "Saving…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RentCollection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [markPaidPayment, setMarkPaidPayment] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: payments, isLoading } = trpc.rentPayments.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();

  const deleteMutation = trpc.rentPayments.delete.useMutation({
    onSuccess: () => { utils.rentPayments.list.invalidate(); toast.success("Payment deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const applyLateFee = trpc.rentPayments.applyLateFee.useMutation({
    onSuccess: () => { utils.rentPayments.list.invalidate(); toast.success("Late fee applied"); },
    onError: (e) => toast.error(e.message),
  });

  const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t]));

  const filtered = (payments ?? []).filter(p => {
    const tenant = tenantMap[p.tenantId];
    const matchesSearch = !search || tenant?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments?.length ?? 0,
    paid: payments?.filter(p => p.status === "paid").length ?? 0,
    overdue: payments?.filter(p => p.status === "overdue").length ?? 0,
    pending: payments?.filter(p => p.status === "pending").length ?? 0,
    collected: payments?.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.totalAmount), 0) ?? 0,
    outstanding: payments?.filter(p => p.status !== "paid" && p.status !== "waived").reduce((sum, p) => sum + Number(p.totalAmount), 0) ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Rent Collection</h1>
          <p className="page-subtitle">Track and manage rent payments</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Add Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Collected</p>
            <p className="text-xl font-semibold text-success">${stats.collected.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stats.paid} payments</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Outstanding</p>
            <p className="text-xl font-semibold text-warning">${stats.outstanding.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stats.pending + stats.overdue} payments</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overdue</p>
            <p className="text-xl font-semibold text-danger">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground mt-0.5">payments overdue</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pending</p>
            <p className="text-xl font-semibold text-foreground">{stats.pending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by tenant…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold mb-1">No payments found</h3>
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "all" ? "Try adjusting your filters" : "Add payment records to start tracking rent"}
          </p>
        </div>
      ) : (
        <Card className="border border-border shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Late Fee</th>
                <th>Total</th>
                <th>Paid Date</th>
                <th>Method</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => {
                const tenant = tenantMap[p.tenantId];
                const isOverdue = p.status === "overdue" || (p.status === "pending" && new Date(p.dueDate) < new Date());
                return (
                  <tr key={p.id} className={isOverdue && p.status !== "paid" ? "bg-danger/5" : ""}>
                    <td>
                      <div className="font-medium text-foreground">{tenant?.name ?? `Tenant #${p.tenantId}`}</div>
                    </td>
                    <td className="text-muted-foreground">{new Date(p.dueDate).toLocaleDateString()}</td>
                    <td className="font-medium">${Number(p.amount).toLocaleString()}</td>
                    <td className="text-muted-foreground">{p.lateFee ? `$${Number(p.lateFee).toLocaleString()}` : "—"}</td>
                    <td className="font-semibold">${Number(p.totalAmount).toLocaleString()}</td>
                    <td className="text-muted-foreground">{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : "—"}</td>
                    <td className="text-muted-foreground capitalize">{p.paymentMethod?.replace("_", " ") ?? "—"}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {p.status !== "paid" && (
                            <DropdownMenuItem onClick={() => setMarkPaidPayment(p)}>
                              <CheckCircle className="w-4 h-4 mr-2 text-success" /> Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {p.status !== "paid" && (
                            <DropdownMenuItem onClick={() => applyLateFee.mutate({ id: p.id, lateFee: "50.00" })}>
                              <AlertTriangle className="w-4 h-4 mr-2 text-warning" /> Apply Late Fee
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteMutation.mutate({ id: p.id })}
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

      <CreatePaymentModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {markPaidPayment && (
        <MarkPaidModal open={!!markPaidPayment} onClose={() => setMarkPaidPayment(null)} payment={markPaidPayment} />
      )}
    </div>
  );
}
