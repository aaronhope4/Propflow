import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Briefcase, Building2, Edit, FileText, Mail, MapPin, MoreHorizontal, Phone, Plus, Search, ShieldAlert, ShieldCheck, Star, Trash2, Upload, UserRound, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

const CATEGORIES = ["plumbing", "electrical", "hvac", "general", "landscaping", "cleaning", "pest", "appliance", "roofing", "legal", "accounting", "other"] as const;
const MAX_CERTIFICATE_SIZE = 16 * 1024 * 1024;

type VendorFormValues = {
  company: string; contactName: string; specialties?: string; category: (typeof CATEGORIES)[number]; phone: string;
  email?: string; address: string; notes?: string; status: "active" | "inactive"; preferredProvider: boolean; serviceAreas?: string;
};
const blankVendor: VendorFormValues = { company: "", contactName: "", specialties: "", category: "general", phone: "", email: "", address: "", notes: "", status: "active", preferredProvider: false, serviceAreas: "" };

function dateLabel(value?: string | Date | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}
function daysUntil(value?: string | Date | null) {
  if (!value) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(value); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}
function complianceTone(days: number | null) {
  if (days === null) return { label: "No certificate", className: "bg-muted text-muted-foreground" };
  if (days < 0) return { label: "Expired", className: "bg-destructive/10 text-destructive" };
  if (days <= 30) return { label: `${days}d to expiry`, className: "bg-amber-100 text-amber-800" };
  return { label: "Current", className: "bg-emerald-100 text-emerald-800" };
}

function VendorFormModal({ open, onClose, vendor }: { open: boolean; onClose: () => void; vendor: any | null }) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<VendorFormValues>({ defaultValues: blankVendor });
  const preferredProvider = watch("preferredProvider");
  const category = watch("category");
  const status = watch("status");
  useEffect(() => reset(vendor ? {
    company: vendor.company ?? "", contactName: vendor.name ?? "", specialties: vendor.specialties ?? "", category: vendor.category ?? "general",
    phone: vendor.phone ?? "", email: vendor.email ?? "", address: vendor.address ?? "", notes: vendor.notes ?? "", status: vendor.status ?? "active",
    preferredProvider: Boolean(vendor.preferredProvider), serviceAreas: vendor.serviceAreas ?? "",
  } : blankVendor), [vendor, reset]);
  const create = trpc.vendors.create.useMutation({ onSuccess: () => { utils.vendors.list.invalidate(); toast.success("Vendor added"); onClose(); }, onError: (error) => toast.error(error.message) });
  const update = trpc.vendors.update.useMutation({ onSuccess: () => { utils.vendors.list.invalidate(); toast.success("Vendor updated"); onClose(); }, onError: (error) => toast.error(error.message) });
  const submit = (values: VendorFormValues) => {
    const payload = { company: values.company.trim(), name: values.contactName.trim(), specialties: values.specialties?.trim() || undefined, category: values.category,
      phone: values.phone.trim(), email: values.email?.trim() || undefined, address: values.address.trim(), notes: values.notes?.trim() || undefined,
      status: values.status, preferredProvider: values.preferredProvider, serviceAreas: values.serviceAreas?.trim() || undefined };
    if (vendor) update.mutate({ id: vendor.id, ...payload }); else create.mutate(payload);
  };
  const pending = create.isPending || update.isPending;
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !pending) onClose(); }}>
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{vendor ? "Edit vendor" : "Add vendor"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit(submit)} className="space-y-4 pt-2"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label htmlFor="vendor-company">Company name *</Label><Input id="vendor-company" placeholder="Acme Mechanical" {...register("company", { required: "Company name is required" })} className={errors.company ? "border-destructive" : ""} />{errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="vendor-contact">Point of contact *</Label><Input id="vendor-contact" placeholder="Jordan Lee" {...register("contactName", { required: "Point of contact is required" })} className={errors.contactName ? "border-destructive" : ""} />{errors.contactName && <p className="text-xs text-destructive">{errors.contactName.message}</p>}</div>
        <div className="space-y-1.5"><Label>Primary specialty</Label><Select value={category} onValueChange={(value: VendorFormValues["category"]) => setValue("category", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="vendor-phone">Telephone number *</Label><Input id="vendor-phone" type="tel" placeholder="(555) 555-1234" {...register("phone", { required: "Telephone number is required" })} className={errors.phone ? "border-destructive" : ""} />{errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}</div>
        <div className="md:col-span-2 space-y-1.5"><Label htmlFor="vendor-specialties">Additional specialties</Label><Input id="vendor-specialties" placeholder="Commercial HVAC, rooftop units, preventative maintenance" {...register("specialties")} /></div>
        <div className="md:col-span-2 space-y-1.5"><Label htmlFor="vendor-service-areas">Service areas</Label><Input id="vendor-service-areas" placeholder="Tulsa, Broken Arrow, Jenks" {...register("serviceAreas")} /><p className="text-xs text-muted-foreground">Separate areas with commas.</p></div>
        <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-3"><div><Label htmlFor="vendor-preferred">Preferred provider</Label><p className="text-xs text-muted-foreground mt-0.5">Highlight this vendor for direct work-order assignment.</p></div><Switch id="vendor-preferred" checked={preferredProvider} onCheckedChange={(checked) => setValue("preferredProvider", checked)} /></div>
        <div className="md:col-span-2 space-y-1.5"><Label htmlFor="vendor-address">Company address *</Label><Textarea id="vendor-address" rows={2} placeholder="Street address, city, state, ZIP" {...register("address", { required: "Company address is required" })} className={errors.address ? "border-destructive" : ""} />{errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="vendor-email">Email</Label><Input id="vendor-email" type="email" placeholder="dispatch@acme.com" {...register("email")} /></div>
        <div className="space-y-1.5"><Label>Status</Label><Select value={status} onValueChange={(value: "active" | "inactive") => setValue("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
        <div className="md:col-span-2 space-y-1.5"><Label htmlFor="vendor-notes">General notes</Label><Textarea id="vendor-notes" rows={2} placeholder="Availability, insurance notes, preferred service areas…" {...register("notes")} /></div>
      </div><DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" className="bg-primary hover:bg-primary/90" disabled={pending}>{pending ? "Saving…" : vendor ? "Save changes" : "Add vendor"}</Button></DialogFooter></form>
    </DialogContent>
  </Dialog>;
}

function VendorProfileDialog({ vendor, open, onClose }: { vendor: any | null; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [file, setFile] = useState<File | null>(null);
  const [certificateName, setCertificateName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [performanceNote, setPerformanceNote] = useState("");
  const [rating, setRating] = useState("5");
  const [deleteNote, setDeleteNote] = useState<any | null>(null);
  const { data: certificates } = trpc.vendors.certificates.useQuery({ vendorId: vendor?.id ?? 0 }, { enabled: open && !!vendor });
  const { data: notes } = trpc.vendors.performanceNotes.useQuery({ vendorId: vendor?.id ?? 0 }, { enabled: open && !!vendor });
  const removeCertificate = trpc.vendors.removeCertificate.useMutation({ onSuccess: () => { utils.vendors.certificates.invalidate({ vendorId: vendor.id }); utils.vendors.compliance.invalidate(); toast.success("Certificate removed"); }, onError: (error) => toast.error(error.message) });
  const addNote = trpc.vendors.addPerformanceNote.useMutation({ onSuccess: () => { utils.vendors.performanceNotes.invalidate({ vendorId: vendor.id }); setPerformanceNote(""); setRating("5"); toast.success("Performance note saved"); }, onError: (error) => toast.error(error.message) });
  const removeNote = trpc.vendors.removePerformanceNote.useMutation({ onSuccess: () => { utils.vendors.performanceNotes.invalidate({ vendorId: vendor.id }); setDeleteNote(null); toast.success("Performance note removed"); }, onError: (error) => toast.error(error.message) });
  useEffect(() => { if (!open) { setFile(null); setCertificateName(""); setExpiresAt(""); setPerformanceNote(""); setRating("5"); } }, [open]);
  const upload = () => {
    if (!vendor || !file || !expiresAt) { toast.error("Select a certificate and expiry date"); return; }
    if (file.size > MAX_CERTIFICATE_SIZE) { toast.error("Certificates must be 16 MB or smaller"); return; }
    const payload = new FormData(); payload.append("file", file); payload.append("vendorId", String(vendor.id)); payload.append("expiresAt", expiresAt); payload.append("name", certificateName.trim() || file.name.replace(/\.[^.]+$/, ""));
    setUploading(true); const request = new XMLHttpRequest(); request.open("POST", "/api/vendors/certificates/upload");
    request.onload = () => { setUploading(false); if (request.status >= 200 && request.status < 300) { utils.vendors.certificates.invalidate({ vendorId: vendor.id }); utils.vendors.compliance.invalidate(); setFile(null); setCertificateName(""); setExpiresAt(""); toast.success("Insurance certificate uploaded"); } else { try { toast.error(JSON.parse(request.responseText).error || "Certificate upload failed"); } catch { toast.error("Certificate upload failed"); } } };
    request.onerror = () => { setUploading(false); toast.error("Certificate upload failed. Please retry."); }; request.send(payload);
  };
  return <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Vendor compliance & performance</DialogTitle><p className="text-sm text-muted-foreground">{vendor?.company || vendor?.name}</p></DialogHeader>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2"><section className="space-y-4"><div><h3 className="font-semibold">Insurance certificates</h3><p className="text-sm text-muted-foreground">Upload PDF, JPG, or PNG certificates and set an expiry date.</p></div>
      <div className="rounded-lg border border-border p-3 space-y-3"><Input value={certificateName} onChange={(event) => setCertificateName(event.target.value)} placeholder="Certificate label (optional)" /><Input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /><Button type="button" size="sm" onClick={upload} disabled={uploading || !file || !expiresAt} className="w-full gap-2"><Upload className="h-4 w-4" />{uploading ? "Uploading…" : "Upload certificate"}</Button></div>
      <div className="space-y-2">{(certificates ?? []).length === 0 ? <p className="text-sm text-muted-foreground py-3">No certificates uploaded yet.</p> : (certificates ?? []).map((certificate: any) => { const tone = complianceTone(daysUntil(certificate.expiresAt)); return <div key={certificate.id} className="rounded-lg border border-border p-3 flex gap-3 items-start"><FileText className="h-5 w-5 text-brand shrink-0 mt-0.5" /><div className="min-w-0 flex-1"><a href={certificate.fileUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate block">{certificate.name}</a><p className="text-xs text-muted-foreground">Expires {dateLabel(certificate.expiresAt)}</p><span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.className}`}>{tone.label}</span></div><Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeCertificate.mutate({ id: certificate.id })} aria-label="Remove certificate"><X className="h-4 w-4" /></Button></div>; })}</div>
    </section><section className="space-y-4"><div><h3 className="font-semibold">Performance notes</h3><p className="text-sm text-muted-foreground">Track service quality, responsiveness, and follow-up observations.</p></div>
      <div className="rounded-lg border border-border p-3 space-y-3"><Textarea value={performanceNote} onChange={(event) => setPerformanceNote(event.target.value)} placeholder="e.g. Completed service on time; recommend for future HVAC calls." rows={4} /><div className="flex gap-3"><Select value={rating} onValueChange={setRating}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{[5,4,3,2,1].map((value) => <SelectItem key={value} value={String(value)}>{value} star{value === 1 ? "" : "s"}</SelectItem>)}</SelectContent></Select><Button type="button" className="ml-auto" disabled={!performanceNote.trim() || addNote.isPending} onClick={() => addNote.mutate({ vendorId: vendor.id, note: performanceNote.trim(), rating: Number(rating) })}>Save note</Button></div></div>
      <div className="space-y-2">{(notes ?? []).length === 0 ? <p className="text-sm text-muted-foreground py-3">No performance notes yet.</p> : (notes ?? []).map((note: any) => <div key={note.id} className="rounded-lg border border-border p-3"><div className="flex items-center gap-1 text-amber-500">{Array.from({ length: note.rating ?? 0 }).map((_, index) => <Star key={index} className="h-3.5 w-3.5 fill-current" />)}<span className="ml-1 text-xs text-muted-foreground">{note.authorName || "Administrator"} · {dateLabel(note.createdAt)}</span><button type="button" className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Remove performance note" onClick={() => setDeleteNote(note)}><Trash2 className="h-3.5 w-3.5" /></button></div><p className="text-sm mt-2 whitespace-pre-line">{note.note}</p></div>)}</div>
    </section></div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Close</Button></DialogFooter>
  </DialogContent><AlertDialog open={Boolean(deleteNote)} onOpenChange={(nextOpen) => !nextOpen && setDeleteNote(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove performance note?</AlertDialogTitle><AlertDialogDescription>This permanently removes the selected vendor performance note.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteNote && removeNote.mutate({ id: deleteNote.id })}>{removeNote.isPending ? "Removing…" : "Remove note"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></Dialog>;
}

export default function Vendors() {
  const [query, setQuery] = useState(""); const [modalOpen, setModalOpen] = useState(false); const [editingVendor, setEditingVendor] = useState<any | null>(null); const [profileVendor, setProfileVendor] = useState<any | null>(null); const [deleteVendor, setDeleteVendor] = useState<any | null>(null);
  const utils = trpc.useUtils(); const { data: vendors, isLoading } = trpc.vendors.list.useQuery(); const { data: compliance } = trpc.vendors.compliance.useQuery();
  const remove = trpc.vendors.delete.useMutation({ onSuccess: () => { utils.vendors.list.invalidate(); utils.vendors.compliance.invalidate(); toast.success("Vendor removed"); setDeleteVendor(null); }, onError: (error) => toast.error(error.message) });
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("new") === "1") { setEditingVendor(null); setModalOpen(true); window.history.replaceState({}, "", "/vendors"); } }, []);
  const filtered = useMemo(() => (vendors ?? []).filter((vendor: any) => [vendor.company, vendor.name, vendor.specialties, vendor.category, vendor.phone, vendor.address, vendor.serviceAreas].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())), [vendors, query]);
  const complianceByVendor = useMemo(() => new Map<number, any[]>((compliance ?? []).reduce((acc: [number, any[]][], item: any) => { const found = acc.find(([id]) => id === item.vendorId); if (found) found[1].push(item); else acc.push([item.vendorId, [item]]); return acc; }, [])), [compliance]);
  const alerts = (compliance ?? []).filter((item: any) => (daysUntil(item.expiresAt) ?? 999) <= 30);
  return <div className="max-w-[1400px] mx-auto animate-fade-in"><PageHeader title="Vendors" subtitle="Manage trusted service providers, specialties, compliance, and primary contacts" />
    {alerts.length > 0 && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-amber-900"><ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" /><div><p className="font-semibold text-sm">Vendor insurance needs attention</p><p className="text-sm">{alerts.length} certificate{alerts.length === 1 ? " is" : "s are"} expired or within 30 days of expiry. Email reminders will be sent to organization admins daily.</p></div></div>}
    <div className="flex flex-col md:flex-row gap-3 md:items-center mb-5"><div className="relative flex-1 max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, contact, specialty, area, or phone…" className="pl-9 bg-card" /></div><Button className="bg-primary hover:bg-primary/90 gap-2 md:ml-auto" onClick={() => { setEditingVendor(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> Add vendor</Button></div>
    {isLoading ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, index) => <Card key={index} className="h-48 animate-pulse bg-muted/50" />)}</div> : filtered.length === 0 ? <EmptyState icon={<Briefcase />} title={query ? "No matching vendors" : "No vendors yet"} description={query ? "Try another search term." : "Add your first service provider to begin building your vendor directory."} action={!query ? <Button onClick={() => setModalOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add vendor</Button> : undefined} /> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 stagger-children">{filtered.map((vendor: any) => { const certificates = complianceByVendor.get(vendor.id) ?? []; const mostUrgent = certificates.sort((a: any, b: any) => (daysUntil(a.expiresAt) ?? 999) - (daysUntil(b.expiresAt) ?? 999))[0]; const areas = String(vendor.serviceAreas ?? "").split(",").map((area) => area.trim()).filter(Boolean); return <Card key={vendor.id} className="p-5 border border-border shadow-sm group"><div className="flex items-start justify-between gap-4"><div className="flex gap-3 min-w-0"><div className="h-10 w-10 shrink-0 rounded-lg bg-brand-light text-brand flex items-center justify-center"><Building2 className="h-5 w-5" /></div><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="font-semibold truncate">{vendor.company || vendor.name}</h2>{vendor.preferredProvider && <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full bg-brand-light text-brand px-2 py-0.5"><BadgeCheck className="h-3 w-3" /> Preferred</span>}</div><p className="text-sm text-muted-foreground flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> {vendor.name || "Contact not set"}</p></div></div><div className="flex items-center gap-2"><StatusBadge status={vendor.status} /><DropdownMenu><DropdownMenuTrigger asChild><button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted" aria-label={`Actions for ${vendor.company || vendor.name}`}><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setProfileVendor(vendor)}><ShieldCheck className="h-4 w-4 mr-2" /> Compliance & notes</DropdownMenuItem><DropdownMenuItem onClick={() => { setEditingVendor(vendor); setModalOpen(true); }}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteVendor(vendor)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Specializes in</p><p className="capitalize font-medium">{vendor.category}{vendor.specialties ? <span className="font-normal text-muted-foreground"> · {vendor.specialties}</span> : null}</p></div><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Telephone</p><p className="flex items-center gap-1.5">{vendor.phone ? <><Phone className="h-3.5 w-3.5 text-brand" />{vendor.phone}</> : "Not set"}</p></div><div className="sm:col-span-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Company address</p><p className="flex items-start gap-1.5 text-muted-foreground whitespace-pre-line"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand" />{vendor.address || "Not set"}</p></div>{areas.length > 0 && <div className="sm:col-span-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Service areas</p><div className="flex flex-wrap gap-1.5">{areas.map((area) => <span key={area} className="rounded-full bg-muted px-2 py-0.5 text-xs">{area}</span>)}</div></div>}{vendor.email && <div className="sm:col-span-2"><p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5 text-brand" />{vendor.email}</p></div>}<div className="sm:col-span-2 rounded-lg bg-muted/60 p-2.5 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /><span className="text-xs font-medium">Insurance</span>{mostUrgent ? (() => { const tone = complianceTone(daysUntil(mostUrgent.expiresAt)); return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.className}`}>{tone.label}</span>; })() : <span className="text-xs text-muted-foreground">No certificate</span>}</div><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setProfileVendor(vendor)}>Manage</Button></div></div>
      </Card>; })}</div>}
    <VendorFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingVendor(null); }} vendor={editingVendor} /><VendorProfileDialog vendor={profileVendor} open={Boolean(profileVendor)} onClose={() => setProfileVendor(null)} />
    <AlertDialog open={Boolean(deleteVendor)} onOpenChange={(open) => { if (!open) setDeleteVendor(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete vendor?</AlertDialogTitle><AlertDialogDescription>This will permanently remove <strong>{deleteVendor?.company || deleteVendor?.name}</strong> from the vendor directory. Existing work orders will remain but become unassigned.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteVendor && remove.mutate({ id: deleteVendor.id })}>{remove.isPending ? "Deleting…" : "Delete vendor"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
