import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Settings as SettingsIcon,
  Building2,
  Landmark,
  User,
  Plus,
  CreditCard,
  Upload,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Users,
  Mail,
  Shield,
  Trash2,
  Send,
  Copy,
  Palette,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { PageHeader, EmptyState, formatCurrency } from "@/components/PageShell";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { applyOrganizationTheme, THEME_PALETTES, type ThemePaletteId } from "@/lib/orgTheme";

// ─── Common timezones ─────────────────────────────────────────────────────────
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
];

function PaletteThumbnail({ palette }: { palette: (typeof THEME_PALETTES)[number] }) {
  const [sidebar, accent, canvas] = palette.swatches;
  return (
    <div className="mt-3 h-20 w-full overflow-hidden rounded-md border border-black/10 bg-white flex" aria-hidden="true">
      <div className="w-[27%] p-1.5" style={{ backgroundColor: sidebar }}>
        <div className="h-2 w-2/3 rounded-sm bg-white/80" />
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-white/35" />
          <div className="h-1.5 w-4/5 rounded-full bg-white/25" />
          <div className="h-1.5 w-2/3 rounded-full bg-white/25" />
        </div>
      </div>
      <div className="flex-1 p-2" style={{ backgroundColor: canvas }}>
        <div className="flex items-center justify-between">
          <span className="h-1.5 w-1/3 rounded-full bg-black/25" />
          <span className="h-3 w-8 rounded-sm" style={{ backgroundColor: accent }} />
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {[0, 1, 2].map((item) => <span key={item} className="h-6 rounded-sm border border-black/10 bg-white/90" />)}
        </div>
        <div className="h-2 mt-2 rounded-sm" style={{ backgroundColor: `${accent}33` }} />
      </div>
    </div>
  );
}

// ─── Plan badge helper ────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    trial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    starter: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    pro: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    enterprise: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${colors[plan] ?? colors.starter}`}>
      {plan}
    </span>
  );
}

// ─── Bank Account Modal ───────────────────────────────────────────────────────
function BankAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: { type: "checking" } });
  const create = trpc.banking.createAccount.useMutation({
    onSuccess: () => { utils.banking.accounts.invalidate(); toast.success("Account added"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => create.mutate({ ...d, openingBalance: d.openingBalance || "0" }))} className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Account Name *</Label><Input {...register("name", { required: true })} placeholder="Operating Account" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select defaultValue="checking" onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["checking", "savings", "trust", "credit_card"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Opening Balance</Label><Input {...register("openingBalance")} placeholder="0.00" /></div>
          </div>
          <div className="space-y-1.5"><Label>Bank Name</Label><Input {...register("bankName")} placeholder="e.g. Chase" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Add Account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Role badge helper ────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    user: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    tenant: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${styles[role] ?? styles.user}`}>
      {role}
    </span>
  );
}

// ─── Team Members Card ────────────────────────────────────────────────────────
function TeamMembersCard() {
  const utils = trpc.useUtils();
  const { user: me } = useAuth();
  const { data: members = [], isLoading } = trpc.team.list.useQuery();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager">("manager");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const invite = trpc.team.invite.useMutation({
    onSuccess: (data) => {
      utils.team.list.invalidate();
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteLink(data.inviteUrl);
      setInviteName(""); setInviteEmail("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRole = trpc.team.updateRole.useMutation({
    onSuccess: () => { utils.team.list.invalidate(); toast.success("Role updated"); },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.team.remove.useMutation({
    onSuccess: () => { utils.team.list.invalidate(); toast.success("Member removed"); },
    onError: (e) => toast.error(e.message),
  });

  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) { toast.error("Name and email are required"); return; }
    invite.mutate({ name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole, origin: window.location.origin });
  };

  return (
    <Card className="p-6 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-brand" />
          <h3 className="font-semibold">Team Members</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{members.length}</span>
        </div>
        <Button size="sm" className="gap-1.5 bg-brand hover:bg-brand-dark text-white" onClick={() => { setShowInvite(true); setInviteLink(null); }}>
          <Plus className="w-3.5 h-3.5" /> Invite Member
        </Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="mb-5 p-4 rounded-lg border border-brand/30 bg-brand/5 space-y-3">
          <p className="text-sm font-medium text-foreground">Invite a new team member</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Full Name</Label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Smith" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email Address</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@company.com" type="email" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "manager")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager — can manage properties &amp; tenants</SelectItem>
                  <SelectItem value="admin">Admin — full access including settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 mt-5">
              <Button size="sm" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button size="sm" className="gap-1.5 bg-brand hover:bg-brand-dark text-white" disabled={invite.isPending} onClick={handleInvite}>
                <Send className="w-3.5 h-3.5" /> {invite.isPending ? "Sending…" : "Send Invite"}
              </Button>
            </div>
          </div>
          {inviteLink && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted text-xs">
              <Mail className="w-3.5 h-3.5 text-brand shrink-0" />
              <span className="text-muted-foreground truncate flex-1">Invite sent! Link: {inviteLink}</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 shrink-0" onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Link copied"); }}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Member list */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading members…</div>
      ) : members.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No team members yet. Invite someone to get started.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-brand">{(m.name ?? m.email ?? "?")[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.status === "invited" && (
                  <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Pending</span>
                )}
                {m.id !== me?.id ? (
                  <Select
                    value={m.role}
                    onValueChange={(v) => updateRole.mutate({ userId: m.id, role: v as "admin" | "manager" })}
                  >
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <RoleBadge role={m.role} />
                )}
                {m.id !== me?.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${m.name ?? m.email} from the organization?`)) {
                        remove.mutate({ userId: m.id });
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Organization Settings Tab ────────────────────────────────────────────────
function OrgSettingsTab() {
  const utils = trpc.useUtils();
  const { data: org, isLoading } = trpc.org.getSettings.useQuery();
  const updateOrg = trpc.org.updateSettings.useMutation({
    onSuccess: () => { utils.org.getSettings.invalidate(); toast.success("Organization settings saved"); },
    onError: (e) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [themePalette, setThemePalette] = useState<ThemePaletteId>("forest_slate");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when org data loads
  useEffect(() => {
    if (org) {
      setName(org.name ?? "");
      setTimezone(org.timezone ?? "America/Chicago");
      setLogoUrl(org.logoUrl ?? null);
      setThemePalette((org.themePalette as ThemePaletteId) ?? "forest_slate");
    }
  }, [org]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/maintenance/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const url: string = json.urls?.[0] ?? json.url;
      setLogoUrl(url);
      toast.success("Logo uploaded — click Save to apply");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateOrg.mutate({ name: name.trim() || undefined, timezone, logoUrl, themePalette });
  };

  // Trial info
  const trialEndsAt = org?.trialEndsAt ? new Date(org.trialEndsAt) : null;
  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const trialExpired = daysLeft !== null && daysLeft <= 0;

  if (isLoading) {
    return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <TeamMembersCard />
      {/* Plan & Trial Status */}
      <Card className="p-6 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-brand" />
          <h3 className="font-semibold">Plan & Billing</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/60">
            <span className="text-sm text-muted-foreground">Current plan</span>
            <PlanBadge plan={org?.plan ?? "trial"} />
          </div>
          {trialEndsAt && (
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-sm text-muted-foreground">Trial status</span>
              <span className={`text-sm font-medium flex items-center gap-1.5 ${trialExpired ? "text-destructive" : daysLeft! <= 3 ? "text-amber-600" : "text-foreground"}`}>
                {trialExpired ? (
                  <><AlertTriangle className="h-3.5 w-3.5" /> Expired</>
                ) : (
                  <>{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</>
                )}
              </span>
            </div>
          )}
          {trialEndsAt && (
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-sm text-muted-foreground">Trial ends</span>
              <span className="text-sm font-medium">{trialEndsAt.toLocaleDateString()}</span>
            </div>
          )}
          <div className="pt-2">
            <Button
              className="bg-brand hover:bg-brand-dark text-white"
              onClick={() => toast.info("Stripe billing coming soon — contact support@waapropflow.com to upgrade.")}
            >
              Upgrade Plan
            </Button>
          </div>
        </div>
      </Card>

      {/* Company Profile */}
      <Card className="p-6 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-brand" />
          <h3 className="font-semibold">Company Profile</h3>
        </div>
        <div className="space-y-5">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="w-16 h-16 rounded-xl object-contain border border-border bg-muted"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Uploading…" : "Upload Logo"}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive block"
                    onClick={() => setLogoUrl(null)}
                  >
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG or SVG · max 2 MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your company name"
            />
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Timezone
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used for displaying dates and scheduling reminders.</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Dashboard Theme</Label>
            <p className="text-xs text-muted-foreground">Choose an approved palette for everyone in your organization.</p>
            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              {THEME_PALETTES.map((palette) => {
                const selected = themePalette === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => { setThemePalette(palette.id); applyOrganizationTheme(palette.id); }}
                    className={`text-left rounded-lg border p-3 transition-colors ${selected ? "border-brand bg-brand/5 ring-1 ring-brand/25" : "border-border hover:bg-muted/60"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{palette.name}</span>
                      {selected && <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{palette.description}</p>
                    <PaletteThumbnail palette={palette} />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">The selection previews immediately and applies to the organization after saving.</p>
          </div>

          <Button
            className="bg-brand hover:bg-brand-dark text-white"
            disabled={updateOrg.isPending}
            onClick={handleSave}
          >
            {updateOrg.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [bankModal, setBankModal] = useState(false);
  const { data: accounts } = trpc.banking.accounts.useQuery();

  return (
    <div className="max-w-[1000px] mx-auto animate-fade-in">
      <PageHeader title="Settings" subtitle="Manage your organization, banking, and account" icon={<SettingsIcon className="w-6 h-6" />} />

      <Tabs defaultValue="organization">
        <TabsList className="mb-4">
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="banking">Bank Accounts</TabsTrigger>
          <TabsTrigger value="account">My Account</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <OrgSettingsTab />
        </TabsContent>

        <TabsContent value="banking">
          <div className="flex justify-end mb-4">
            <Button className="gap-2 bg-brand hover:bg-brand-dark text-white" onClick={() => setBankModal(true)}>
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </div>
          {(accounts ?? []).length === 0
            ? <EmptyState icon={<Landmark />} title="No bank accounts" description="Add a bank account to track deposits and expenses." />
            : (
              <div className="grid sm:grid-cols-2 gap-4">
                {(accounts ?? []).map((a: any) => (
                  <Card key={a.id} className="p-5 border border-border shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-brand" />
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">
                        {(a.type ?? "checking").replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="font-semibold mt-3">{a.name}</h3>
                    <p className="text-sm text-muted-foreground">{a.bankName ?? "—"}</p>
                    <p className="text-lg font-semibold mt-2">{formatCurrency(Number(a.currentBalance ?? a.openingBalance ?? 0))}</p>
                  </Card>
                ))}
              </div>
            )}
        </TabsContent>

        <TabsContent value="account">
          <Card className="p-6 border border-border shadow-sm max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-brand" />
              <h3 className="font-semibold">My Account</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{user?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.email ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium capitalize">{user?.role ?? "—"}</span>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 rounded-md bg-brand-light p-2 text-brand">
                    {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </div>
                  <div>
                    <Label htmlFor="dark-mode" className="text-sm font-medium">Dark mode</Label>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Use a nighttime version of your organization’s selected palette. This preference is saved for this browser.</p>
                  </div>
                </div>
                <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={() => toggleTheme?.()} aria-label="Toggle dark mode" />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <BankAccountModal open={bankModal} onClose={() => setBankModal(false)} />
    </div>
  );
}
