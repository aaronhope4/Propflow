import { useState } from "react";
import { Workflow, Zap, Bell, FileText, DollarSign, Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageShell";
import { toast } from "sonner";

type Rule = { id: string; name: string; description: string; trigger: string; action: string; icon: any; enabled: boolean };

const DEFAULT_RULES: Rule[] = [
  { id: "late-fee", name: "Auto Late Fee", description: "Apply a late fee when rent is 5 days overdue.", trigger: "Rent 5 days overdue", action: "Post $50 late fee charge", icon: DollarSign, enabled: true },
  { id: "lease-expiry", name: "Lease Expiration Reminder", description: "Notify manager 60 days before a lease expires.", trigger: "Lease expiring in 60 days", action: "Send reminder + create renewal task", icon: Bell, enabled: true },
  { id: "wo-ack", name: "Work Order Acknowledgement", description: "Email tenant when their request is received.", trigger: "New maintenance request", action: "Send confirmation to tenant", icon: Wrench, enabled: true },
  { id: "rent-reminder", name: "Rent Reminder", description: "Remind tenants 3 days before rent is due.", trigger: "3 days before due date", action: "Send rent reminder email", icon: Bell, enabled: false },
  { id: "welcome", name: "New Tenant Welcome", description: "Send a welcome packet when a lease is activated.", trigger: "Lease activated", action: "Send welcome email + portal invite", icon: FileText, enabled: false },
  { id: "cam-recon", name: "Quarterly CAM Reconciliation", description: "Generate CAM reconciliation statements each quarter.", trigger: "End of quarter", action: "Generate CAM statements", icon: DollarSign, enabled: false },
];

export default function Workflows() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const toggle = (id: string) => {
    setRules((r) => r.map((x) => x.id === id ? { ...x, enabled: !x.enabled } : x));
    const rule = rules.find((x) => x.id === id);
    toast.success(`${rule?.name} ${rule?.enabled ? "disabled" : "enabled"}`);
  };
  return (
    <div className="max-w-[1100px] mx-auto animate-fade-in">
      <PageHeader title="Workflows" subtitle="Automate routine property management tasks" icon={<Workflow className="w-6 h-6" />}
        actions={<Button className="gap-2 bg-brand hover:bg-brand-dark text-white" onClick={() => toast.message("Custom workflow builder coming soon")}><Plus className="w-4 h-4" /> New Workflow</Button>} />

      <div className="rounded-lg border border-brand/30 bg-brand-light/30 p-4 mb-6 flex items-center gap-3">
        <Zap className="w-5 h-5 text-brand shrink-0" />
        <p className="text-sm text-foreground">Workflows run automatically based on triggers in your portfolio. Toggle rules on or off below.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {rules.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className={`p-5 border shadow-sm transition-colors ${r.enabled ? "border-brand/40" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.enabled ? "bg-brand text-white" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <Switch checked={r.enabled} onCheckedChange={() => toggle(r.id)} />
              </div>
              <h3 className="font-semibold mt-3">{r.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
              <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5 text-xs">
                <div className="flex items-center gap-2"><span className="text-muted-foreground w-14">When</span><span className="px-2 py-0.5 rounded bg-muted font-medium">{r.trigger}</span></div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground w-14">Then</span><span className="px-2 py-0.5 rounded bg-muted font-medium">{r.action}</span></div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
