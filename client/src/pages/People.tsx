import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Users, Plus, Search, Mail, Phone, MoreHorizontal, Edit, Trash2, Briefcase, UserCog, Building2, Link2, Copy, CheckCheck, ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader, EmptyState, formatCurrency } from "@/components/PageShell";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { TenantFormModal } from "./Tenants";
import { OwnerFormModal } from "./Owners";

const VENDOR_CATEGORIES = ["plumbing", "electrical", "hvac", "general", "landscaping", "cleaning", "pest", "appliance", "roofing", "legal", "accounting", "other"];

function VendorFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: editData ?? { category: "general", status: "active" } });
  const create = trpc.vendors.create.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); toast.success("Vendor added"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.vendors.update.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); toast.success("Vendor updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const onSubmit = (d: any) => editData ? update.mutate({ id: editData.id, ...d }) : create.mutate(d);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editData ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Name *</Label><Input {...register("name", { required: true })} placeholder="Bob's Plumbing" /></div>
            <div className="space-y-1.5"><Label>Company</Label><Input {...register("company")} /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select defaultValue={editData?.category ?? "general"} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VENDOR_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input {...register("email")} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input {...register("phone")} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...register("address")} /></div>
            <div className="space-y-1.5"><Label>Tax ID</Label><Input {...register("taxId")} /></div>
            <div className="space-y-1.5"><Label>Insurance Expiry</Label><Input type="date" {...register("insuranceExpiry")} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea {...register("notes")} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending} className="bg-brand hover:bg-brand-dark text-white">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function People() {
  const [location, setLocation] = useLocation();
  const [tab, setTab] = useState("tenants");
  const [search, setSearch] = useState("");
  const [tenantModal, setTenantModal] = useState(false);
  const [editTenant, setEditTenant] = useState<any>(null);
  const [ownerModal, setOwnerModal] = useState(false);
  const [editOwner, setEditOwner] = useState<any>(null);
  const [vendorModal, setVendorModal] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteTenant, setInviteTenant] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const createInvite = trpc.auth.createInvite.useMutation({
    onSuccess: (data) => {
      // Use the full URL returned by the server (includes origin)
      setInviteLink(data.inviteUrl ?? `${window.location.origin}${data.inviteLink}`);
      setEmailSent(data.emailSent ?? false);
      setEmailError(data.emailError ?? null);
      if (data.emailSent) {
        toast.success(`Invite email sent to ${inviteTenant?.email}`);
      } else if (data.emailError) {
        toast.error(`Email delivery failed — copy the link below to share manually.`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleInviteTenant = (t: any) => {
    if (!t.email) {
      toast.error("This tenant has no email address. Please add one first.");
      return;
    }
    setInviteTenant(t);
    setInviteLink(null);
    setCopied(false);
    setInviteModal(true);
    createInvite.mutate({ tenantId: t.id, email: t.email, name: t.name, origin: window.location.origin });
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  };

  const handleCloseInviteModal = () => {
    setInviteModal(false);
    setInviteTenant(null);
    setInviteLink(null);
    setEmailSent(false);
    setEmailError(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const n = params.get("new");
    if (n === "tenant") { setTab("tenants"); setEditTenant(null); setTenantModal(true); }
    else if (n === "vendor") { setTab("vendors"); setEditVendor(null); setVendorModal(true); }
    else if (n === "owner") { setTab("owners"); setEditOwner(null); setOwnerModal(true); }
    else if (n === "prospect") { setLocation("/leasing"); return; }
    if (n) window.history.replaceState({}, "", "/people");
  }, [location]);

  const { data: tenants, isLoading: tLoading } = trpc.tenants.list.useQuery();
  const { data: owners } = trpc.owners.list.useQuery();
  const { data: vendors } = trpc.vendors.list.useQuery();

  const deleteTenant = trpc.tenants.delete.useMutation({
    onSuccess: () => { utils.tenants.list.invalidate(); toast.success("Tenant removed"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteOwner = trpc.owners.delete.useMutation({
    onSuccess: () => { utils.owners.list.invalidate(); toast.success("Owner removed"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteVendor = trpc.vendors.delete.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); toast.success("Vendor removed"); },
    onError: (e) => toast.error(e.message),
  });

  const fTenants = (tenants ?? []).filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.email ?? "").toLowerCase().includes(search.toLowerCase()));
  const fOwners = (owners ?? []).filter((o: any) => !search || o.name.toLowerCase().includes(search.toLowerCase()));
  const fVendors = (vendors ?? []).filter((v: any) => !search || v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader title="People" subtitle="Tenants, owners, and vendors in one place" />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="tenants">Tenants <span className="ml-1.5 text-xs opacity-60">{tenants?.length ?? 0}</span></TabsTrigger>
            <TabsTrigger value="owners">Owners <span className="ml-1.5 text-xs opacity-60">{owners?.length ?? 0}</span></TabsTrigger>
            <TabsTrigger value="vendors">Vendors <span className="ml-1.5 text-xs opacity-60">{vendors?.length ?? 0}</span></TabsTrigger>
          </TabsList>
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-card" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {tab === "tenants" && <Button onClick={() => { setEditTenant(null); setTenantModal(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2 ml-auto"><Plus className="w-4 h-4" /> Add Tenant</Button>}
          {tab === "owners" && <Button onClick={() => { setEditOwner(null); setOwnerModal(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2 ml-auto"><Plus className="w-4 h-4" /> Add Owner</Button>}
          {tab === "vendors" && <Button onClick={() => { setEditVendor(null); setVendorModal(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2 ml-auto"><Plus className="w-4 h-4" /> Add Vendor</Button>}
        </div>

        {/* TENANTS */}
        <TabsContent value="tenants">
          {tLoading ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
            : fTenants.length === 0 ? <EmptyState icon={<Users />} title="No tenants" description="Add your first tenant." />
            : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 stagger-children">
              {fTenants.map((t: any) => (
                <Card key={t.id} className="p-4 border border-border shadow-sm card-hover cursor-pointer group" onClick={() => setLocation(`/people/tenants/${t.id}`)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10"><AvatarFallback className="bg-brand-light text-brand text-sm font-semibold">{initials(t.name)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate group-hover:text-brand transition-colors">{t.name}</div>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted opacity-0 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTenant(t); setTenantModal(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleInviteTenant(t); }}><Link2 className="w-4 h-4 mr-2" /> Invite to Portal</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); deleteTenant.mutate({ id: t.id }); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {t.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {t.email}</div>}
                    {t.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {t.phone}</div>}
                  </div>
                  {/* Portal status badge */}
                  <div className="mt-2.5 pt-2.5 border-t border-border/50">
                    {t.portalStatus === "active" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <ShieldCheck className="w-3 h-3" /> Portal: Active
                      </span>
                    )}
                    {t.portalStatus === "invited" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Clock className="w-3 h-3" /> Portal: Invited
                      </span>
                    )}
                    {t.portalStatus === "expired" && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <AlertCircle className="w-3 h-3" /> Portal: Invite Expired
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleInviteTenant(t); }}
                          disabled={createInvite.isPending && inviteTenant?.id === t.id}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand/10 text-brand hover:bg-brand/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Link2 className="w-3 h-3" />
                          {createInvite.isPending && inviteTenant?.id === t.id ? "Sending…" : "Resend Invite"}
                        </button>
                      </div>
                    )}
                    {t.portalStatus === "none" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Portal: Not Invited
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* OWNERS */}
        <TabsContent value="owners">
          {fOwners.length === 0 ? <EmptyState icon={<UserCog />} title="No owners" description="Add property owners to track distributions." />
            : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 stagger-children">
              {fOwners.map((o: any) => (
                <Card key={o.id} className="p-4 border border-border shadow-sm card-hover group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10"><AvatarFallback className="bg-info-light text-info text-sm font-semibold">{initials(o.name)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{o.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{o.company || "Individual owner"}</div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted opacity-0 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditOwner(o); setOwnerModal(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteOwner.mutate({ id: o.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {o.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {o.email}</div>}
                    {o.distributionPercentage && <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {o.distributionPercentage}% distribution</div>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* VENDORS */}
        <TabsContent value="vendors">
          {fVendors.length === 0 ? <EmptyState icon={<Briefcase />} title="No vendors" description="Add vendors to assign to work orders." />
            : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Vendor</th><th>Category</th><th>Contact</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {fVendors.map((v: any) => (
                    <tr key={v.id}>
                      <td><div className="font-medium">{v.name}</div><div className="text-xs text-muted-foreground">{v.company}</div></td>
                      <td><span className="capitalize text-sm">{v.category}</span></td>
                      <td className="text-xs text-muted-foreground">{v.email}<br />{v.phone}</td>
                      <td><StatusBadge status={v.status} /></td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditVendor(v); setVendorModal(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteVendor.mutate({ id: v.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <TenantFormModal open={tenantModal} onClose={() => { setTenantModal(false); setEditTenant(null); }} editData={editTenant} />
      <OwnerFormModal open={ownerModal} onClose={() => { setOwnerModal(false); setEditOwner(null); }} editData={editOwner} />
      <VendorFormModal open={vendorModal} onClose={() => { setVendorModal(false); setEditVendor(null); }} editData={editVendor} />

      {/* Invite Tenant Modal */}
      <Dialog open={inviteModal} onOpenChange={(v) => { if (!v) handleCloseInviteModal(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-brand" />
              Invite Tenant to Portal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Tenant info card */}
            {inviteTenant && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-semibold text-sm shrink-0">
                  {inviteTenant.name?.[0]?.toUpperCase() ?? "T"}
                </div>
                <div>
                  <p className="font-medium">{inviteTenant.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{inviteTenant.email}</p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {createInvite.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                Generating invite &amp; sending email…
              </div>
            )}

            {/* Email sent success banner */}
            {inviteLink && emailSent && (
              <div className="flex items-start gap-2.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <CheckCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Invite email sent!</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    An email with the portal link has been delivered to <strong>{inviteTenant?.email}</strong>. The link expires in 72 hours.
                  </p>
                </div>
              </div>
            )}

            {/* Email failed warning — still show the link for manual sharing */}
            {inviteLink && emailError && (
              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Email delivery failed</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Copy the link below and share it with the tenant directly.</p>
                </div>
              </div>
            )}

            {/* Invite link (always shown after generation, as fallback) */}
            {inviteLink && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Invite link</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-md px-3 py-2 text-xs font-mono text-foreground break-all border border-border">
                    {inviteLink}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="shrink-0 gap-1.5"
                  >
                    {copied
                      ? <><CheckCheck className="w-3.5 h-3.5 text-green-500" /> Copied</>
                      : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseInviteModal}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
