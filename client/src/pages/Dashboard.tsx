import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard, Card, formatCurrency, formatDate } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useLocation } from "wouter";
import {
  Building2, Home, KeyRound, TrendingUp, AlertCircle,
  DollarSign, Wrench, ArrowRight, PieChart as PieIcon,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, AreaChart, Area,
} from "recharts";
import { Button } from "@/components/ui/button";

const COLORS = ["var(--color-chart-1)", "var(--color-chart-3)", "var(--color-chart-2)", "var(--color-chart-4)"];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: overview, isLoading } = trpc.overview.data.useQuery();
  const { data: monthly } = trpc.accounting.monthly.useQuery({});
  const { data: outstanding } = trpc.transactions.outstandingBalances.useQuery();

  const occData = overview ? [
    { name: "Occupied", value: overview.occupancy.occupied },
    { name: "Vacant", value: overview.occupancy.vacant },
  ] : [];
  const occRate = overview && overview.occupancy.total > 0
    ? Math.round((overview.occupancy.occupied / overview.occupancy.total) * 100) : 0;

  const totalOutstanding = (outstanding ?? []).reduce((s: number, o: any) => s + o.balance, 0);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Overview"
        subtitle="Your portfolio at a glance"
        actions={
          <Button onClick={() => setLocation("/reports")} variant="outline" className="bg-card gap-1.5">
            <TrendingUp className="h-4 w-4" /> View Reports
          </Button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
        <StatCard
          label="Properties" value={isLoading ? "—" : overview?.stats.properties ?? 0}
          sub={`${overview?.stats.units ?? 0} units · ${(overview?.stats.sqft ?? 0).toLocaleString()} sq ft`}
          icon={<Building2 className="h-4.5 w-4.5" />} accent="brand"
          onClick={() => setLocation("/properties")}
        />
        <StatCard
          label="Occupancy" value={`${occRate}%`}
          sub={`${overview?.occupancy.occupied ?? 0} occupied · ${overview?.occupancy.vacant ?? 0} vacant`}
          icon={<Home className="h-4.5 w-4.5" />} accent="success"
        />
        <StatCard
          label="Active Leases" value={overview?.stats.activeLeases ?? 0}
          sub="Currently in effect"
          icon={<KeyRound className="h-4.5 w-4.5" />} accent="info"
          onClick={() => setLocation("/leasing")}
        />
        <StatCard
          label="Outstanding A/R" value={formatCurrency(totalOutstanding)}
          sub={`${outstanding?.length ?? 0} leases with balances`}
          icon={<AlertCircle className="h-4.5 w-4.5" />} accent={totalOutstanding > 0 ? "danger" : "success"}
          onClick={() => setLocation("/accounting")}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Occupancy</h3>
            <PieIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={occData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2}>
                  {occData.map((_, i) => <Cell key={i} fill={i === 0 ? COLORS[2] : COLORS[1]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">{occRate}%</span>
              <span className="text-xs text-muted-foreground">Occupied</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[2] }} />Occupied</div>
            <div className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[1] }} />Vacant</div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Cash Flow (This Year)</h3>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly ?? []}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[2]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS[2]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[3]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS[3]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="monthName" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="income" stroke={COLORS[2]} fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expenses" stroke={COLORS[3]} fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Vacancies + lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Vacancies by Property</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={overview?.vacByProp ?? []} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="property" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip />
              <Bar dataKey="vacant" fill={COLORS[1]} radius={[0, 4, 4, 0]} name="Vacant Units" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Payments</h3>
            <button onClick={() => setLocation("/accounting")} className="text-xs text-brand hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            {(overview?.recentPayments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No payments yet</p>
            ) : (
              overview?.recentPayments.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-success-light flex items-center justify-center shrink-0">
                      <DollarSign className="h-3.5 w-3.5 text-success" />
                    </div>
                    <span className="text-muted-foreground truncate">{formatDate(p.date)}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Open Tasks & Requests</h3>
            <button onClick={() => setLocation("/tasks")} className="text-xs text-brand hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            {(overview?.openTasks ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No open tasks</p>
            ) : (
              overview?.openTasks.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-warning-light flex items-center justify-center shrink-0">
                      <Wrench className="h-3.5 w-3.5 text-warning" />
                    </div>
                    <span className="truncate">{t.title}</span>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
