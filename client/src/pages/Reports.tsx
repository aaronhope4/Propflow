import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { FileBarChart, Printer, Sparkles, TrendingUp, TrendingDown, Building2, Calculator, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState, formatCurrency } from "@/components/PageShell";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

// ─── Transaction drill-down dialog ─────────────────────────────────────────────
function DrillDownDialog({ account, kind, startDate, endDate, propertyId, onClose }: { account: string | null; kind: "income" | "expense"; startDate: string; endDate: string; propertyId?: number; onClose: () => void; }) {
  const { data, isLoading } = trpc.transactions.list.useQuery(
    { type: kind === "income" ? "charge" : "expense", startDate, endDate, propertyId },
    { enabled: !!account },
  );
  const rows = useMemo(
    () => (data ?? []).filter((t: any) => (t.account ?? t.category ?? "Other") === account),
    [data, account],
  );
  const total = rows.reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);
  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{account} — Transaction Detail</DialogTitle></DialogHeader>
        {isLoading ? <Skeleton className="h-48 w-full" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No transactions found for this account in the selected period.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {rows.map((t: any) => (
                  <tr key={t.id}>
                    <td className="text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="text-sm">{t.description ?? t.memo ?? t.category ?? "—"}</td>
                    <td className="text-sm text-muted-foreground">{t.reference ?? "—"}</td>
                    <td className={`text-right font-medium ${kind === "income" ? "text-success" : "text-danger"}`}>{formatCurrency(Number(t.amount))}</td>
                  </tr>
                ))}
                <tr className="font-semibold border-t-2 border-border"><td colSpan={3} className="py-2">Total ({rows.length})</td><td className="py-2 text-right">{formatCurrency(total)}</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function startOfYear() { return `${new Date().getFullYear()}-01-01`; }
function today() { return new Date().toISOString().split("T")[0]; }

const RECOVERABLE = ["CAM", "Property Taxes", "Insurance", "Utilities", "Repairs & Maintenance", "Landscaping", "Cleaning"];

// ─── Profit & Loss ───────────────────────────────────────────────────────────
function ProfitAndLoss() {
  const { data: properties } = trpc.properties.list.useQuery();
  const [startDate, setStartDate] = useState(startOfYear());
  const [endDate, setEndDate] = useState(today());
  const [propertyId, setPropertyId] = useState<string>("all");

  const { data, isLoading } = trpc.reports.profitAndLoss.useQuery({
    startDate, endDate, propertyId: propertyId === "all" ? undefined : Number(propertyId),
  });

  const incomeByAccount = useMemo(() => {
    const m: Record<string, number> = {};
    (data?.income ?? []).forEach((r: any) => { m[r.account ?? "Other"] = (m[r.account ?? "Other"] || 0) + Number(r.amount); });
    return Object.entries(m).filter(([, v]) => v !== 0);
  }, [data]);
  const expenseByAccount = useMemo(() => {
    const m: Record<string, number> = {};
    (data?.expenses ?? []).forEach((r: any) => { m[r.account ?? "Other"] = (m[r.account ?? "Other"] || 0) + Number(r.amount); });
    return Object.entries(m).filter(([, v]) => v !== 0);
  }, [data]);

  const totalIncome = incomeByAccount.reduce((s, [, v]) => s + v, 0);
  const totalExpense = expenseByAccount.reduce((s, [, v]) => s + v, 0);
  const noi = totalIncome - totalExpense;
  const [drill, setDrill] = useState<{ account: string; kind: "income" | "expense" } | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="space-y-1.5"><Label>From</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" /></div>
        <div className="space-y-1.5"><Label>To</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" /></div>
        <div className="space-y-1.5">
          <Label>Property</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-2 ml-auto bg-card" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print / PDF</Button>
      </div>

      {isLoading ? <Skeleton className="h-80 w-full" /> : (
        <Card className="p-6 border border-border shadow-sm print:shadow-none print:border-0">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">Profit &amp; Loss Statement</h2>
            <p className="text-sm text-muted-foreground">{startDate} to {endDate}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-success mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Income</h3>
              <table className="w-full text-sm">
                <tbody>
                  {incomeByAccount.length === 0 ? <tr><td className="py-2 text-muted-foreground">No income recorded</td></tr> :
                    incomeByAccount.map(([acc, v]) => (
                    <tr key={acc} className="border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-colors group print:cursor-auto" onClick={() => setDrill({ account: acc, kind: "income" })}><td className="py-2"><span className="inline-flex items-center gap-1">{acc}<ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity print:hidden" /></span></td><td className="py-2 text-right font-medium">{formatCurrency(v)}</td></tr>
                  ))}
                  <tr className="font-semibold"><td className="py-2">Total Income</td><td className="py-2 text-right text-success">{formatCurrency(totalIncome)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-danger mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Expenses</h3>
              <table className="w-full text-sm">
                <tbody>
                  {expenseByAccount.length === 0 ? <tr><td className="py-2 text-muted-foreground">No expenses recorded</td></tr> :
                    expenseByAccount.map(([acc, v]) => (
                    <tr key={acc} className="border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-colors group print:cursor-auto" onClick={() => setDrill({ account: acc, kind: "expense" })}><td className="py-2 capitalize"><span className="inline-flex items-center gap-1">{acc}<ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity print:hidden" /></span></td><td className="py-2 text-right font-medium">{formatCurrency(v)}</td></tr>
                  ))}
                  <tr className="font-semibold"><td className="py-2">Total Expenses</td><td className="py-2 text-right text-danger">{formatCurrency(totalExpense)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t-2 border-border flex items-center justify-between">
            <span className="text-lg font-semibold">Net Operating Income</span>
            <span className={`text-2xl font-bold ${noi >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(noi)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3 print:hidden">Tip: click any income or expense line to view the underlying transactions.</p>
        </Card>
      )}
      <DrillDownDialog
        account={drill?.account ?? null}
        kind={drill?.kind ?? "income"}
        startDate={startDate}
        endDate={endDate}
        propertyId={propertyId === "all" ? undefined : Number(propertyId)}
        onClose={() => setDrill(null)}
      />
    </div>
  );
}

// ─── A/R Aging ───────────────────────────────────────────────────────────────
function ArAging() {
  const [asOf] = useState(today());
  const { data, isLoading } = trpc.reports.arAging.useQuery({ asOf });
  const { data: tenants } = trpc.tenants.list.useQuery();
  const tenantMap = Object.fromEntries((tenants ?? []).map((t: any) => [t.id, t]));

  const buckets = useMemo(() => {
    const b = { current: 0, d30: 0, d60: 0, d90: 0 };
    const now = new Date(asOf).getTime();
    (data ?? []).forEach((r: any) => {
      const days = Math.floor((now - new Date(r.date).getTime()) / 86400000);
      const amt = Number(r.amount);
      if (days <= 30) b.current += amt; else if (days <= 60) b.d30 += amt; else if (days <= 90) b.d60 += amt; else b.d90 += amt;
    });
    return b;
  }, [data, asOf]);

  if (isLoading) return <Skeleton className="h-80 w-full" />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Outstanding receivables as of {asOf}</p>
        <Button variant="outline" className="gap-2 bg-card" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print / PDF</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[["Current (0–30)", buckets.current], ["31–60 days", buckets.d30], ["61–90 days", buckets.d60], ["90+ days", buckets.d90]].map(([label, v], i) => (
          <Card key={i} className="p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label as string}</p>
            <p className={`text-xl font-semibold mt-1 ${i >= 2 ? "text-danger" : i === 1 ? "text-warning" : ""}`}>{formatCurrency(v as number)}</p>
          </Card>
        ))}
      </div>
      {(data ?? []).length === 0 ? <EmptyState icon={<Building2 />} title="No outstanding charges" description="All receivables are current." /> : (
        <Card className="border border-border shadow-sm overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Tenant</th><th>Description</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {(data ?? []).map((r: any) => (
                <tr key={r.id}>
                  <td className="text-sm text-muted-foreground">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="font-medium">{tenantMap[r.tenantId]?.name ?? `Tenant #${r.tenantId}`}</td>
                  <td className="text-sm">{r.description ?? r.category ?? "Charge"}</td>
                  <td className="text-sm capitalize">{r.status}</td>
                  <td className="text-right font-semibold text-danger">{formatCurrency(Number(r.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── CAM Reconciliation ──────────────────────────────────────────────────────
function CamReconciliation() {
  const { data: properties } = trpc.properties.list.useQuery();
  const [propertyId, setPropertyId] = useState<string>("");
  const [startDate, setStartDate] = useState(startOfYear());
  const [endDate, setEndDate] = useState(today());

  const { data, isLoading } = trpc.reports.camReconciliation.useQuery(
    { propertyId: Number(propertyId), startDate, endDate, recoverableAccounts: RECOVERABLE },
    { enabled: !!propertyId },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="space-y-1.5">
          <Label>Property *</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select property…" /></SelectTrigger>
            <SelectContent>{(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>From</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" /></div>
        <div className="space-y-1.5"><Label>To</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" /></div>
        {propertyId && <Button variant="outline" className="gap-2 ml-auto bg-card" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print Statements</Button>}
      </div>

      {!propertyId ? <EmptyState icon={<Calculator />} title="Select a property" description="Choose a property to run CAM reconciliation by square footage." />
        : isLoading ? <Skeleton className="h-80 w-full" />
        : !data ? <EmptyState icon={<Calculator />} title="No data" description="No recoverable expenses found for this period." />
        : (
        <Card className="p-6 border border-border shadow-sm print:shadow-none">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Recoverable</p><p className="text-lg font-semibold">{formatCurrency(data.totalRecoverable)}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sq Ft</p><p className="text-lg font-semibold">{Number(data.totalSqft).toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Tenants</p><p className="text-lg font-semibold">{data.rows.length}</p></div>
          </div>
          <table className="data-table">
            <thead><tr><th>Tenant</th><th>Unit</th><th className="text-right">Sq Ft</th><th className="text-right">Pro-Rata %</th><th className="text-right">CAM Share</th><th className="text-right">Est. Paid</th><th className="text-right">True-Up</th></tr></thead>
            <tbody>
              {data.rows.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="font-medium">{r.tenantName}</td>
                  <td>#{r.unitNumber}</td>
                  <td className="text-right">{Number(r.sqft).toLocaleString()}</td>
                  <td className="text-right">{Number(r.proRataPct).toFixed(1)}%</td>
                  <td className="text-right">{formatCurrency(r.camShare)}</td>
                  <td className="text-right">{formatCurrency(r.estPaid)}</td>
                  <td className={`text-right font-semibold ${r.trueUp > 0 ? "text-danger" : "text-success"}`}>{r.trueUp > 0 ? "+" : ""}{formatCurrency(r.trueUp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-4">True-Up reflects the balance owed (+) or credit due (−) after reconciling each tenant's pro-rata share of recoverable expenses against amounts already charged.</p>
        </Card>
      )}
    </div>
  );
}

// ─── AI Insights panel ───────────────────────────────────────────────────────
function AiInsights() {
  const { data, isLoading, refetch, isFetching } = trpc.ai.insights.useQuery(undefined, { refetchOnWindowFocus: false });
  return (
    <Card className="p-5 border border-brand/30 bg-brand-light/30 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2 text-brand"><Sparkles className="w-4 h-4" /> AI Insights</h3>
        <Button size="sm" variant="outline" className="bg-card" disabled={isFetching} onClick={() => { refetch(); toast.message("Refreshing insights…"); }}>{isFetching ? "Analyzing…" : "Refresh"}</Button>
      </div>
      {isLoading ? <Skeleton className="h-24 w-full" /> : (
        <div className="prose prose-sm max-w-none text-foreground"><Streamdown>{String(data?.insights ?? "No insights available.")}</Streamdown></div>
      )}
    </Card>
  );
}

export default function Reports() {
  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader title="Reports" subtitle="Financial statements, aging, and CAM reconciliation" icon={<FileBarChart className="w-6 h-6" />} />
      <div className="mb-6"><AiInsights /></div>
      <Tabs defaultValue="pnl">
        <TabsList className="mb-4">
          <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="ar">A/R Aging</TabsTrigger>
          <TabsTrigger value="cam">CAM Reconciliation</TabsTrigger>
        </TabsList>
        <TabsContent value="pnl"><ProfitAndLoss /></TabsContent>
        <TabsContent value="ar"><ArAging /></TabsContent>
        <TabsContent value="cam"><CamReconciliation /></TabsContent>
      </Tabs>
    </div>
  );
}
