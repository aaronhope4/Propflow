import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  DollarSign, Plus, Receipt, Banknote, TrendingUp, TrendingDown, Trash2, Layers, Building2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader, EmptyState, StatCard, formatCurrency, formatDate } from "@/components/PageShell";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const PAYMENT_METHODS = ["cash", "check", "ach", "credit_card", "debit_card", "cashiers_check", "money_order", "eft"];
const INCOME_ACCOUNTS = ["Base Rent", "CAM", "Property Taxes", "Insurance", "Utilities", "Late Fee", "Parking", "Other Income"];
const EXPENSE_ACCOUNTS = ["Repairs & Maintenance", "Utilities", "Insurance", "Property Taxes", "Management Fee", "Landscaping", "Cleaning", "Legal & Professional", "Supplies", "Other Expense"];

// ─── Record Payment Modal ────────────────────────────────────────────────────
function PaymentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: leases } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: accounts } = trpc.banking.accounts.useQuery();
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: { date: new Date().toISOString().split("T")[0], paymentMethod: "ach" } });
  const create = trpc.transactions.createPayment.useMutation({
    onSuccess: () => { utils.transactions.list.invalidate(); utils.transactions.outstandingBalances.invalidate(); toast.success("Payment recorded"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const tenantMap = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]));
  const onSubmit = (d: any) => {
    const lease = (leases ?? []).find((l: any) => l.id === Number(d.leaseId));
    create.mutate({ ...d, leaseId: Number(d.leaseId), tenantId: lease?.tenantId, bankAccountId: d.bankAccountId ? Number(d.bankAccountId) : undefined });
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Receive Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Lease *</Label>
            <Select onValueChange={(v) => setValue("leaseId", v)}>
              <SelectTrigger><SelectValue placeholder="Select lease…" /></SelectTrigger>
              <SelectContent>
                {(leases ?? []).map((l: any) => <SelectItem key={l.id} value={l.id.toString()}>{tenantMap[l.tenantId]?.name ?? `Lease #${l.id}`} — {formatCurrency(Number(l.rentAmount))}/mo</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Amount *</Label><Input {...register("amount", { required: true })} placeholder="1500.00" /></div>
            <div className="space-y-1.5"><Label>Date *</Label><Input type="date" {...register("date", { required: true })} /></div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select defaultValue="ach" onValueChange={(v) => setValue("paymentMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Deposit To</Label>
              <Select onValueChange={(v) => setValue("bankAccountId", v)}>
                <SelectTrigger><SelectValue placeholder="Account…" /></SelectTrigger>
                <SelectContent>{(accounts ?? []).map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Reference / Memo</Label><Input {...register("reference")} placeholder="Check #1234" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Record Payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Line Items editor ───────────────────────────────────────────────────────
function LineItemsEditor({ items, setItems, accounts }: { items: any[]; setItems: (i: any[]) => void; accounts: string[] }) {
  const total = items.reduce((s, li) => s + (Number(li.amount) || 0), 0);
  return (
    <div className="space-y-2">
      <Label>Line Items</Label>
      {items.map((li, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <Select value={li.account} onValueChange={(v) => { const n = [...items]; n[idx].account = v; setItems(n); }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Account" /></SelectTrigger>
            <SelectContent>{accounts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="w-28" placeholder="0.00" value={li.amount} onChange={(e) => { const n = [...items]; n[idx].amount = e.target.value; setItems(n); }} />
          <button type="button" className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1}><X className="w-4 h-4" /></button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setItems([...items, { account: "", amount: "" }])}><Plus className="w-3.5 h-3.5" /> Add line</Button>
        <span className="text-sm font-semibold">Total: {formatCurrency(total)}</span>
      </div>
    </div>
  );
}

// ─── Post Charge Modal (multi-line CAM) ──────────────────────────────────────
function ChargeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: leases } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const [items, setItems] = useState<any[]>([{ account: "Base Rent", amount: "" }]);
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: { date: new Date().toISOString().split("T")[0] } });
  const create = trpc.transactions.createCharge.useMutation({
    onSuccess: () => { utils.transactions.list.invalidate(); utils.transactions.outstandingBalances.invalidate(); toast.success("Charge posted"); onClose(); reset(); setItems([{ account: "Base Rent", amount: "" }]); },
    onError: (e) => toast.error(e.message),
  });
  const tenantMap = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]));
  const onSubmit = (d: any) => {
    const lease = (leases ?? []).find((l: any) => l.id === Number(d.leaseId));
    const valid = items.filter(li => li.account && Number(li.amount) > 0);
    if (!valid.length) { toast.error("Add at least one line item"); return; }
    create.mutate({ leaseId: Number(d.leaseId), tenantId: lease?.tenantId, unitId: lease?.unitId, date: d.date, description: d.description, lineItems: valid });
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Post Charge</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Lease *</Label>
            <Select onValueChange={(v) => setValue("leaseId", v)}>
              <SelectTrigger><SelectValue placeholder="Select lease…" /></SelectTrigger>
              <SelectContent>{(leases ?? []).map((l: any) => <SelectItem key={l.id} value={l.id.toString()}>{tenantMap[l.tenantId]?.name ?? `Lease #${l.id}`}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Date *</Label><Input type="date" {...register("date", { required: true })} /></div>
          <LineItemsEditor items={items} setItems={setItems} accounts={INCOME_ACCOUNTS} />
          <div className="space-y-1.5"><Label>Description</Label><Input {...register("description")} placeholder="Monthly charges — incl. CAM & taxes" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Post Charge</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Expense Modal ────────────────────────────────────────────────────
function ExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: vendors } = trpc.vendors.list.useQuery();
  const { data: properties } = trpc.properties.list.useQuery();
  const { data: accounts } = trpc.banking.accounts.useQuery();
  const [items, setItems] = useState<any[]>([{ account: "Repairs & Maintenance", amount: "" }]);
  const [capturing, setCapturing] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: { date: new Date().toISOString().split("T")[0], paymentMethod: "ach" } });
  const create = trpc.transactions.createExpense.useMutation({
    onSuccess: () => { utils.transactions.list.invalidate(); toast.success("Expense recorded"); onClose(); reset(); setItems([{ account: "Repairs & Maintenance", amount: "" }]); },
    onError: (e) => toast.error(e.message),
  });
  const aiCapture = trpc.ai.captureExpense.useMutation({
    onSuccess: (res: any) => {
      setCapturing(false);
      if (res?.vendor) toast.success(`AI extracted: ${res.vendor}`);
      if (res?.amount) setItems([{ account: res.category ?? "Repairs & Maintenance", amount: String(res.amount) }]);
      if (res?.date) setValue("date", res.date);
      if (res?.vendor) setValue("description", res.vendor);
    },
    onError: (e) => { setCapturing(false); toast.error(e.message); },
  });
  const onSubmit = (d: any) => {
    const valid = items.filter(li => li.account && Number(li.amount) > 0);
    create.mutate({
      ...d,
      vendorId: d.vendorId ? Number(d.vendorId) : undefined,
      propertyId: d.propertyId ? Number(d.propertyId) : undefined,
      bankAccountId: d.bankAccountId ? Number(d.bankAccountId) : undefined,
      lineItems: valid.length ? valid : undefined,
      amount: valid.length ? undefined : d.amount,
    });
  };
  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturing(true);
    const reader = new FileReader();
    reader.onload = () => aiCapture.mutate({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
        <div className="rounded-lg border border-dashed border-brand/40 bg-brand-light/40 p-3 flex items-center justify-between">
          <div className="text-sm"><p className="font-medium text-brand">AI Expense Capture</p><p className="text-xs text-muted-foreground">Upload a receipt to auto-fill</p></div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleReceipt} />
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-dark">{capturing ? "Reading…" : "Upload Receipt"}</span>
          </label>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Select onValueChange={(v) => setValue("vendorId", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select onValueChange={(v) => setValue("propertyId", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Date *</Label><Input type="date" {...register("date", { required: true })} /></div>
            <div className="space-y-1.5">
              <Label>Paid From</Label>
              <Select onValueChange={(v) => setValue("bankAccountId", v)}>
                <SelectTrigger><SelectValue placeholder="Account…" /></SelectTrigger>
                <SelectContent>{(accounts ?? []).map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <LineItemsEditor items={items} setItems={setItems} accounts={EXPENSE_ACCOUNTS} />
          <div className="space-y-1.5"><Label>Description</Label><Input {...register("description")} placeholder="What was this for?" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Record Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Post (CAM by sqft) Modal ───────────────────────────────────────────
function BulkPostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: properties } = trpc.properties.list.useQuery();
  const { data: leases } = trpc.leases.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: units } = trpc.units.all.useQuery();
  const [propertyId, setPropertyId] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState("");
  const [account, setAccount] = useState("CAM");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const tenantMap = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]));
  const unitMap = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]));

  const propertyLeases = useMemo(() => {
    if (!propertyId) return [];
    return (leases ?? []).filter((l: any) => {
      const u = unitMap[l.unitId];
      return u && String(u.propertyId) === propertyId && l.status === "active";
    });
  }, [propertyId, leases, units]);

  const totalSqft = propertyLeases.reduce((s: number, l: any) => s + (Number(unitMap[l.unitId]?.squareFeet) || 0), 0);
  const allocations = propertyLeases.map((l: any) => {
    const sqft = Number(unitMap[l.unitId]?.squareFeet) || 0;
    const share = totalSqft > 0 ? sqft / totalSqft : 1 / (propertyLeases.length || 1);
    return { lease: l, sqft, share, amount: (Number(totalAmount) * share) };
  });

  const create = trpc.transactions.bulkPostCharges.useMutation({
    onSuccess: (res: any) => { utils.transactions.list.invalidate(); utils.transactions.outstandingBalances.invalidate(); toast.success(`Posted ${res.posted} charges`); onClose(); setTotalAmount(""); setPropertyId(""); },
    onError: (e) => toast.error(e.message),
  });
  const onPost = () => {
    if (!propertyId || Number(totalAmount) <= 0 || !allocations.length) { toast.error("Select property and amount"); return; }
    create.mutate({
      date, account, description: `${account} allocation`,
      charges: allocations.map(a => ({ leaseId: a.lease.id, tenantId: a.lease.tenantId, unitId: a.lease.unitId, propertyId: Number(propertyId), amount: a.amount.toFixed(2) })),
    });
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulk Post Charges — CAM by Square Footage</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["CAM", "Property Taxes", "Insurance", "Utilities"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Total Amount *</Label><Input value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="10000.00" /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          {propertyId && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="data-table text-sm">
                <thead><tr><th>Tenant</th><th>Unit</th><th>Sq Ft</th><th>Share</th><th>Charge</th></tr></thead>
                <tbody>
                  {allocations.length === 0 ? <tr><td colSpan={5} className="text-center text-muted-foreground py-4">No active leases for this property</td></tr>
                    : allocations.map(a => (
                    <tr key={a.lease.id}>
                      <td>{tenantMap[a.lease.tenantId]?.name ?? `#${a.lease.tenantId}`}</td>
                      <td>#{unitMap[a.lease.unitId]?.unitNumber}</td>
                      <td>{a.sqft.toLocaleString()}</td>
                      <td>{(a.share * 100).toFixed(1)}%</td>
                      <td className="font-medium">{formatCurrency(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onPost} disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Post {allocations.length} Charges</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Accounting() {
  const [location] = useLocation();
  const [tab, setTab] = useState("overview");
  const [paymentModal, setPaymentModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [chargeModal, setChargeModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const n = new URLSearchParams(window.location.search).get("new");
    if (n === "expense") setExpenseModal(true);
    else if (n === "payment") setPaymentModal(true);
    if (n) window.history.replaceState({}, "", "/accounting");
  }, [location]);

  const { data: transactions, isLoading } = trpc.transactions.list.useQuery();
  const { data: monthly } = trpc.accounting.monthly.useQuery();
  const { data: outstanding } = trpc.transactions.outstandingBalances.useQuery();

  const deleteTxn = trpc.transactions.delete.useMutation({
    onSuccess: () => { utils.transactions.list.invalidate(); toast.success("Transaction deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    (transactions ?? []).forEach((t: any) => {
      if (t.type === "payment") income += Number(t.amount);
      if (t.type === "expense") expense += Number(t.amount);
    });
    return { income, expense, net: income - expense };
  }, [transactions]);

  const totalOutstanding = (outstanding ?? []).reduce((s: number, o: any) => s + Number(o.balance ?? 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader title="Accounting" subtitle="Charges, payments, expenses, and banking" />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Button onClick={() => setChargeModal(true)} variant="outline" className="gap-2 bg-card"><Receipt className="w-4 h-4" /> Post Charge</Button>
        <Button onClick={() => setPaymentModal(true)} variant="outline" className="gap-2 bg-card"><DollarSign className="w-4 h-4" /> Receive Payment</Button>
        <Button onClick={() => setExpenseModal(true)} variant="outline" className="gap-2 bg-card"><Banknote className="w-4 h-4" /> Record Expense</Button>
        <Button onClick={() => setBulkModal(true)} className="gap-2 bg-brand hover:bg-brand-dark text-white ml-auto"><Layers className="w-4 h-4" /> Bulk Post (CAM)</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Income (Collected)" value={formatCurrency(totals.income)} icon={<TrendingUp className="w-5 h-5" />} accent="success" />
        <StatCard label="Expenses" value={formatCurrency(totals.expense)} icon={<TrendingDown className="w-5 h-5" />} accent="danger" />
        <StatCard label="Net Operating Income" value={formatCurrency(totals.net)} icon={<DollarSign className="w-5 h-5" />} accent="brand" />
        <StatCard label="Outstanding A/R" value={formatCurrency(totalOutstanding)} icon={<Receipt className="w-5 h-5" />} accent="warning" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-5 border border-border shadow-sm">
            <h3 className="font-semibold mb-4">Income vs. Expenses (12 mo)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="monthName" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          {isLoading ? <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : (transactions ?? []).length === 0 ? <EmptyState icon={<Receipt />} title="No transactions" description="Post a charge or record a payment." />
            : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Method</th><th className="text-right">Amount</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {(transactions ?? []).map((t: any) => (
                    <tr key={t.id}>
                      <td className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(t.date)}</td>
                      <td><span className="capitalize text-sm font-medium">{t.type}</span></td>
                      <td className="text-sm">{t.description ?? t.category ?? "—"}</td>
                      <td className="text-xs text-muted-foreground capitalize">{t.paymentMethod?.replace("_", " ") ?? "—"}</td>
                      <td className={`text-right font-semibold ${t.type === "expense" ? "text-danger" : t.type === "payment" ? "text-success" : ""}`}>
                        {t.type === "expense" ? "−" : t.type === "payment" ? "+" : ""}{formatCurrency(Number(t.amount))}
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground" onClick={() => deleteTxn.mutate({ id: t.id })}><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="outstanding">
          {(outstanding ?? []).length === 0 ? <EmptyState icon={<Building2 />} title="All caught up" description="No outstanding balances." />
            : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Tenant</th><th>Lease</th><th className="text-right">Charged</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr></thead>
                <tbody>
                  {(outstanding ?? []).map((o: any) => (
                    <tr key={o.leaseId}>
                      <td className="font-medium">{o.tenantName ?? `Lease #${o.leaseId}`}</td>
                      <td className="text-sm text-muted-foreground">#{o.leaseId}</td>
                      <td className="text-right">{formatCurrency(Number(o.charged ?? 0))}</td>
                      <td className="text-right">{formatCurrency(Number(o.paid ?? 0))}</td>
                      <td className="text-right font-semibold text-danger">{formatCurrency(Number(o.balance ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <PaymentModal open={paymentModal} onClose={() => setPaymentModal(false)} />
      <ExpenseModal open={expenseModal} onClose={() => setExpenseModal(false)} />
      <ChargeModal open={chargeModal} onClose={() => setChargeModal(false)} />
      <BulkPostModal open={bulkModal} onClose={() => setBulkModal(false)} />
    </div>
  );
}
