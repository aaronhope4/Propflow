import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Home, DollarSign, Wrench, FileText, Plus, CheckCircle, CreditCard,
  Landmark, Repeat, Download, ArrowRight, ArrowLeft, ShieldCheck,
  MapPin, CalendarDays, Clock, AlertTriangle, ChevronRight, Send,
  ImagePlus, X, Loader2, Upload, ZoomIn,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

function formatDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Generate a clean, printable account statement in a new window (Save as PDF from the print dialog)
function generateStatement({ tenantName, lease, payments, balance }: { tenantName: string; lease: any; payments: any[]; balance: number }) {
  const money = (n: any) => formatCurrency(Number(n ?? 0));
  const fmtD = (d: any) => (d ? new Date(d).toLocaleDateString() : "—");
  const today = new Date().toLocaleDateString();
  const rows = [...payments]
    .sort((a, b) => new Date(a.dueDate ?? a.createdAt).getTime() - new Date(b.dueDate ?? b.createdAt).getTime())
    .map((p) => {
      const total = Number(p.totalAmount ?? p.amount ?? 0);
      const isPaid = p.status === "paid" || p.status === "received";
      return `<tr>
        <td>${fmtD(p.dueDate ?? p.createdAt)}</td>
        <td>${money(p.amount)}</td>
        <td>${money(p.lateFee ?? 0)}</td>
        <td style="font-weight:600">${money(total)}</td>
        <td>${p.paidDate ? fmtD(p.paidDate) : "—"}</td>
        <td style="text-transform:capitalize;color:${isPaid ? "#15803d" : "#b45309"}">${(p.status ?? "").replace("_", " ")}</td>
      </tr>`;
    })
    .join("");
  const totalPaid = payments.filter((p) => p.status === "paid" || p.status === "received").reduce((s, p) => s + Number(p.totalAmount ?? p.amount ?? 0), 0);
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Account Statement — ${tenantName}</title>
  <style>
    *{box-sizing:border-box} body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;margin:0;padding:48px;line-height:1.5}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1f3a5f;padding-bottom:20px;margin-bottom:28px}
    .brand{font-size:24px;font-weight:700;color:#1f3a5f;letter-spacing:-0.5px}
    .brand span{color:#c8a951}
    .meta{text-align:right;font-size:13px;color:#555}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 8px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
    .box{background:#f7f8fa;border:1px solid #e5e7eb;border-radius:8px;padding:16px}
    .box p{margin:2px 0;font-size:14px}
    .label{color:#888;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
    th{text-align:left;background:#1f3a5f;color:#fff;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
    td{padding:10px 12px;border-bottom:1px solid #eee}
    tr:nth-child(even) td{background:#fafbfc}
    .totals{margin-top:24px;display:flex;justify-content:flex-end}
    .totals table{width:auto;min-width:280px}
    .totals td{border:none;padding:6px 12px}
    .totals .grand{font-size:18px;font-weight:700;color:#1f3a5f;border-top:2px solid #1f3a5f}
    .foot{margin-top:48px;text-align:center;color:#aaa;font-size:11px}
    @media print{body{padding:24px}}
  </style></head><body>
    <div class="head">
      <div><div class="brand">WAA <span>PropFlow</span></div><p style="color:#888;font-size:13px;margin-top:4px">Tenant Account Statement</p></div>
      <div class="meta"><p><strong>Statement Date</strong></p><p>${today}</p></div>
    </div>
    <div class="info-grid">
      <div class="box"><h2>Tenant</h2><p style="font-weight:600">${tenantName}</p>${lease ? `<p class="label">Monthly Rent</p><p>${money(lease.rentAmount)}</p>` : ""}</div>
      <div class="box"><h2>Lease</h2>${lease ? `<p class="label">Term</p><p>${fmtD(lease.startDate)} — ${fmtD(lease.endDate)}</p><p class="label" style="margin-top:6px">Status</p><p style="text-transform:capitalize">${lease.status}</p>` : "<p>No active lease</p>"}</div>
    </div>
    <h2>Transaction History</h2>
    <table><thead><tr><th>Due Date</th><th>Amount</th><th>Late Fee</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead><tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">No transactions</td></tr>`}</tbody></table>
    <div class="totals"><table>
      <tr><td>Total Paid</td><td style="text-align:right;color:#15803d;font-weight:600">${money(totalPaid)}</td></tr>
      <tr class="grand"><td>Current Balance Due</td><td style="text-align:right">${money(balance)}</td></tr>
    </table></div>
    <div class="foot">WAA PropFlow · Generated ${today} · This statement is for informational purposes.</div>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { toast.error("Please allow pop-ups to view your statement"); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ─── Make Payment Wizard ────────────────────────────────────────────────
function MakePaymentModal({ open, onClose, lease, balance }: { open: boolean; onClose: () => void; lease: any; balance: number }) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"ach" | "credit_card" | "debit_card">("ach");

  const rent = Number(lease?.rentAmount ?? 0);
  const suggested = balance > 0 ? balance : rent;

  const pay = trpc.portal.makePayment.useMutation({
    onSuccess: () => {
      utils.rentPayments.myPayments.invalidate();
      setStep(3);
    },
    onError: (e) => toast.error(e.message),
  });

  const reset = () => { setStep(1); setAmount(""); setMethod("ach"); };
  const close = () => { onClose(); setTimeout(reset, 200); };

  const fee = method === "ach" ? 0 : Math.round(Number(amount || 0) * 0.029 * 100) / 100 + 0.3;
  const total = Number(amount || 0) + fee;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{step === 3 ? "Payment Confirmed" : "Make a Payment"}</DialogTitle></DialogHeader>

        {step === 1 && (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-semibold">{formatCurrency(balance)}</p>
              <p className="text-xs text-muted-foreground mt-1">Monthly rent: {formatCurrency(rent)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Amount</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={suggested.toFixed(2)} />
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" className="bg-card text-xs h-7" onClick={() => setAmount(suggested.toFixed(2))}>Full Balance ({formatCurrency(suggested)})</Button>
                <Button type="button" size="sm" variant="outline" className="bg-card text-xs h-7" onClick={() => setAmount(rent.toFixed(2))}>One Month ({formatCurrency(rent)})</Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button className="bg-brand hover:bg-brand-dark text-white gap-1" disabled={!Number(amount)} onClick={() => setStep(2)}>Continue <ArrowRight className="w-4 h-4" /></Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              {[
                { id: "ach", label: "Bank Transfer (ACH)", desc: "No processing fee", icon: Landmark },
                { id: "credit_card", label: "Credit Card", desc: "2.9% + $0.30 fee", icon: CreditCard },
                { id: "debit_card", label: "Debit Card", desc: "2.9% + $0.30 fee", icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => setMethod(m.id as any)} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${method === m.id ? "border-brand bg-brand-light/40" : "border-border hover:bg-muted/40"}`}>
                    <Icon className={`w-5 h-5 ${method === m.id ? "text-brand" : "text-muted-foreground"}`} />
                    <div className="flex-1"><p className="text-sm font-medium">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
                    {method === m.id && <CheckCircle className="w-4 h-4 text-brand" />}
                  </button>
                );
              })}
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>{formatCurrency(Number(amount))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Processing Fee</span><span>{formatCurrency(fee)}</span></div>
              <div className="flex justify-between font-semibold pt-1 border-t border-border/60"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Payments are processed securely. This is a simulated transaction.</p>
            <DialogFooter>
              <Button variant="outline" className="gap-1" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button className="bg-brand hover:bg-brand-dark text-white" disabled={pay.isPending} onClick={() => pay.mutate({ leaseId: lease.id, amount: String(amount), paymentMethod: method })}>{pay.isPending ? "Processing…" : `Pay ${formatCurrency(total)}`}</Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 mt-2 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto"><CheckCircle className="w-8 h-8 text-success" /></div>
            <div>
              <p className="font-semibold text-lg">Payment Successful</p>
              <p className="text-sm text-muted-foreground mt-1">{formatCurrency(Number(amount))} was paid via {method.replace("_", " ")}.</p>
            </div>
            <Button className="w-full bg-brand hover:bg-brand-dark text-white" onClick={close}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── AutoPay Modal ──────────────────────────────────────────────────────
function AutoPayModal({ open, onClose, lease }: { open: boolean; onClose: () => void; lease: any }) {
  const utils = trpc.useUtils();
  const { data: settings } = trpc.autopay.mySettings.useQuery();
  const [enabled, setEnabled] = useState(false);
  const [day, setDay] = useState("1");
  const [method, setMethod] = useState<"bank_account" | "credit_card">("bank_account");

  useMemo(() => {
    if (settings) { setEnabled(!!settings.enabled); setDay(String(settings.dayOfMonth ?? 1)); setMethod((settings.paymentMethod as any) ?? "bank_account"); }
  }, [settings]);

  const save = trpc.autopay.save.useMutation({
    onSuccess: () => { utils.autopay.mySettings.invalidate(); toast.success(enabled ? "AutoPay enabled" : "AutoPay updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>AutoPay Settings</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div><p className="font-medium text-sm">Enable AutoPay</p><p className="text-xs text-muted-foreground">Rent is paid automatically each month.</p></div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <SelectItem key={d} value={String(d)}>{d}{["st", "nd", "rd"][((d % 100) - 20) % 10 - 1] ?? (d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th")} of month</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_account">Bank Account</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-brand hover:bg-brand-dark text-white" disabled={save.isPending} onClick={() => save.mutate({ leaseId: lease?.id, enabled, dayOfMonth: Number(day), paymentMethod: method, amount: lease?.rentAmount })}>Save</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Maintenance Request List with Photo Gallery ────────────────────────────
function MaintenanceRequestList({ requests }: { requests: any[] }) {
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const openLightbox = (urls: string[], index: number) => setLightbox({ urls, index });
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () => setLightbox((lb) => lb ? { ...lb, index: Math.max(0, lb.index - 1) } : lb);
  const nextPhoto = () => setLightbox((lb) => lb ? { ...lb, index: Math.min(lb.urls.length - 1, lb.index + 1) } : lb);

  return (
    <>
      <div className="space-y-3">
        {requests.map((r: any) => {
          const photos: string[] = r.parsedImageUrls?.length > 0
            ? r.parsedImageUrls
            : r.imageUrls ? (() => { try { return JSON.parse(r.imageUrls); } catch { return []; } })()
            : [];
          return (
            <Card key={r.id} className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{r.title}</p>
                      <StatusBadge status={r.priority} />
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.category && <span className="capitalize">{r.category} · </span>}
                      Submitted {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* Photo gallery */}
                {photos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <ImagePlus className="w-3 h-3" /> {photos.length} photo{photos.length !== 1 ? "s" : ""} attached
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((url: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openLightbox(photos, idx)}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group hover:border-brand/50 transition-colors"
                        >
                          <img
                            src={url}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Counter */}
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightbox.index + 1} / {lightbox.urls.length}
          </span>

          {/* Prev */}
          {lightbox.index > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Image */}
          <img
            src={lightbox.urls[lightbox.index]}
            alt={`Photo ${lightbox.index + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightbox.index < lightbox.urls.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Thumbnail strip */}
          {lightbox.urls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {lightbox.urls.map((url: string, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightbox((lb) => lb ? { ...lb, index: i } : lb); }}
                  className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                    i === lightbox.index ? "border-white" : "border-white/30 hover:border-white/60"
                  }`}
                >
                  <img src={url} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Inline Maintenance Shortcut ────────────────────────────────────────
// ─── Image upload helper ─────────────────────────────────────────────────────
interface UploadedImage {
  localUrl: string;   // object URL for preview
  storageUrl?: string; // /manus-storage/... after upload
  uploading: boolean;
  error?: string;
  file: File;
}

async function uploadImageToServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("images", file);
  const res = await fetch("/api/maintenance/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? "Upload failed");
  }
  const { urls } = await res.json();
  return urls[0] as string;
}

function QuickMaintenanceCard({ tenantId, unitId }: { tenantId?: number; unitId?: number }) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { priority: "medium", category: "other", title: "", description: "" },
  });
  const category = watch("category");
  const priority = watch("priority");

  const createMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => {
      utils.maintenance.myRequests.invalidate();
      // Revoke object URLs to free memory
      images.forEach((img) => URL.revokeObjectURL(img.localUrl));
      setImages([]);
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setExpanded(false); reset(); }, 2500);
    },
    onError: (e) => toast.error(e.message),
  });

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const remaining = 5 - images.length;
    if (remaining <= 0) { toast.error("Maximum 5 images allowed"); return; }
    const toAdd = arr.slice(0, remaining);
    const invalid = toAdd.filter((f) => !f.type.startsWith("image/"));
    if (invalid.length > 0) { toast.error("Only image files are allowed"); return; }
    const oversized = toAdd.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) { toast.error("Each image must be under 10 MB"); return; }

    const newImages: UploadedImage[] = toAdd.map((file) => ({
      localUrl: URL.createObjectURL(file),
      uploading: true,
      file,
    }));
    setImages((prev) => [...prev, ...newImages]);

    // Upload each file to S3 immediately on selection
    for (const img of newImages) {
      try {
        const storageUrl = await uploadImageToServer(img.file);
        setImages((prev) =>
          prev.map((p) => p.localUrl === img.localUrl ? { ...p, uploading: false, storageUrl } : p)
        );
      } catch (err: any) {
        setImages((prev) =>
          prev.map((p) => p.localUrl === img.localUrl ? { ...p, uploading: false, error: err.message } : p)
        );
        toast.error(`Failed to upload ${img.file.name}: ${err.message}`);
      }
    }
  };

  const removeImage = (localUrl: string) => {
    URL.revokeObjectURL(localUrl);
    setImages((prev) => prev.filter((img) => img.localUrl !== localUrl));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const onFormSubmit = (data: any) => {
    const uploadedUrls = images.filter((img) => img.storageUrl).map((img) => img.storageUrl as string);
    const stillUploading = images.some((img) => img.uploading);
    if (stillUploading) { toast.error("Please wait for images to finish uploading"); return; }
    createMutation.mutate({ ...data, tenantId, unitId: unitId ?? 0, imageUrls: uploadedUrls });
  };

  if (submitted) {
    return (
      <Card className="border border-success/30 bg-success/5 shadow-sm">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="font-semibold text-sm">Request Submitted!</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your property manager has been notified and will follow up soon.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-5">
        {/* Header row — always visible */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="font-semibold text-sm">Submit a Maintenance Request</p>
              <p className="text-xs text-muted-foreground mt-0.5">Something broken or needs attention? Let us know.</p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        </button>

        {/* Expanded form */}
        {expanded && (
          <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="mt-4 space-y-3 border-t border-border/60 pt-4"
          >
            <div className="space-y-1.5">
              <Label>Issue Title <span className="text-destructive">*</span></Label>
              <Input {...register("title", { required: true })} placeholder="e.g. Leaking faucet in bathroom" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "cleaning", "other"].map(c => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setValue("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register("description")} rows={3} placeholder="Please describe the issue in detail…" />
            </div>

            {/* ─── Image Upload ─────────────────────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <ImagePlus className="w-3.5 h-3.5" /> Photos
                  <span className="text-muted-foreground font-normal">(optional, up to 5)</span>
                </Label>
                {images.length > 0 && (
                  <span className="text-xs text-muted-foreground">{images.length}/5 added</span>
                )}
              </div>

              {/* Thumbnail previews */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((img) => (
                    <div key={img.localUrl} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                      <img
                        src={img.localUrl}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                      {/* Upload progress overlay */}
                      {img.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                      {/* Error overlay */}
                      {img.error && (
                        <div className="absolute inset-0 bg-destructive/70 flex items-center justify-center">
                          <span className="text-white text-[10px] text-center px-1">Failed</span>
                        </div>
                      )}
                      {/* Remove button */}
                      {!img.uploading && (
                        <button
                          type="button"
                          onClick={() => removeImage(img.localUrl)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone — only show when under 5 images */}
              {images.length < 5 && (
                <label
                  className={`flex flex-col items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
                    dragOver
                      ? "border-brand bg-brand/5"
                      : "border-border/60 hover:border-brand/50 hover:bg-muted/30"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                  />
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Click to upload</span> or drag & drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, HEIC up to 10 MB each</p>
                  </div>
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="bg-card" onClick={() => { setExpanded(false); images.forEach((img) => URL.revokeObjectURL(img.localUrl)); setImages([]); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || images.some((img) => img.uploading)} className="bg-brand hover:bg-brand-dark text-white gap-2 flex-1">
                {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {createMutation.isPending ? "Submitting…" : images.some((img) => img.uploading) ? "Uploading photos…" : "Submit Request"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Welcome Card ────────────────────────────────────────────────────────
function WelcomeCard({ dashboard, balance, pendingCount, onPay, onAutoPay, autopayEnabled, leaseLoading }: {
  dashboard: any; balance: number; pendingCount: number;
  onPay: () => void; onAutoPay: () => void; autopayEnabled: boolean; leaseLoading: boolean;
}) {
  if (leaseLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  const { tenant, lease, unit, property, nextDueDate, daysUntilExpiry } = dashboard ?? {};
  const tenantName = tenant?.name ?? "Tenant";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const expiryWarning = daysUntilExpiry !== null && daysUntilExpiry !== undefined && daysUntilExpiry <= 60 && daysUntilExpiry > 0;

  return (
    <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/8 via-brand/4 to-transparent p-6 shadow-sm">
      {/* Top row: greeting + action buttons */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium text-brand/70 uppercase tracking-wider">{greeting}</p>
          <h2 className="text-2xl font-bold mt-0.5">{tenantName}</h2>
          {property && unit && (
            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{property.name} · Unit {unit.unitNumber}</span>
            </div>
          )}
          {property && (
            <p className="text-xs text-muted-foreground mt-0.5 ml-5">
              {[property.address, property.city, property.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 bg-card/80" onClick={onAutoPay}>
            <Repeat className="w-3.5 h-3.5" />
            AutoPay {autopayEnabled && <span className="text-success text-xs font-semibold">On</span>}
          </Button>
          <Button size="sm" className="bg-brand hover:bg-brand-dark text-white gap-1.5" onClick={onPay} disabled={!lease}>
            <DollarSign className="w-3.5 h-3.5" /> Pay Now
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {lease && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Monthly rent */}
          <div className="rounded-lg bg-background/60 border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Monthly Rent</p>
            <p className="text-lg font-semibold mt-0.5">{formatCurrency(Number(lease.rentAmount))}</p>
          </div>
          {/* Balance */}
          <div className={`rounded-lg border p-3 ${balance > 0 ? "bg-warning/8 border-warning/30" : "bg-success/8 border-success/30"}`}>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Balance Due</p>
            <p className={`text-lg font-semibold mt-0.5 ${balance > 0 ? "text-warning" : "text-success"}`}>
              {balance > 0 ? formatCurrency(balance) : "Paid up!"}
            </p>
            {pendingCount > 0 && <p className="text-[11px] text-warning mt-0.5">{pendingCount} payment{pendingCount !== 1 ? "s" : ""} pending</p>}
          </div>
          {/* Next due date */}
          <div className="rounded-lg bg-background/60 border border-border/50 p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Next Due</p>
            <p className="text-sm font-semibold mt-0.5 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-brand" />
              {nextDueDate ? formatDate(nextDueDate) : "—"}
            </p>
          </div>
          {/* Lease expiry */}
          <div className={`rounded-lg border p-3 ${expiryWarning ? "bg-amber-500/8 border-amber-500/30" : "bg-background/60 border-border/50"}`}>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Lease Ends</p>
            <p className={`text-sm font-semibold mt-0.5 flex items-center gap-1 ${expiryWarning ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {expiryWarning && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              {lease.endDate ? formatDate(lease.endDate) : "—"}
            </p>
            {expiryWarning && daysUntilExpiry !== null && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">{daysUntilExpiry} days remaining</p>
            )}
          </div>
        </div>
      )}

      {/* No lease state */}
      {!lease && !leaseLoading && (
        <div className="mt-4 rounded-lg bg-muted/40 border border-border/50 p-4 text-center">
          <Home className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active lease found. Contact your property manager for assistance.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Portal Page ────────────────────────────────────────────────────
export default function TenantPortal() {
  const { user } = useAuth();
  const [payOpen, setPayOpen] = useState(false);
  const [autoPayOpen, setAutoPayOpen] = useState(false);

  const { data: dashboard, isLoading: dashLoading } = trpc.portal.myDashboard.useQuery();
  const { data: leases } = trpc.leases.myLeases.useQuery();
  const { data: payments, isLoading: paymentsLoading } = trpc.rentPayments.myPayments.useQuery();
  const { data: requests, isLoading: requestsLoading } = trpc.maintenance.myRequests.useQuery();
  const { data: myDocs } = trpc.documents.myDocuments.useQuery();
  const { data: autopay } = trpc.autopay.mySettings.useQuery();

  const activeLease = dashboard?.lease ?? leases?.find((l) => l.status === "active") ?? leases?.[0];
  const pendingPayments = (payments ?? []).filter((p) => p.status === "pending" || p.status === "overdue");
  const openRequests = (requests ?? []).filter((r: any) => r.status === "open" || r.status === "in_progress");
  const balance = pendingPayments.reduce((s, p) => s + Number(p.totalAmount ?? p.amount ?? 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="page-title">My Portal</h1>
        <p className="page-subtitle">Manage your tenancy, payments, and maintenance in one place</p>
      </div>

      {/* Welcome card with lease details */}
      <WelcomeCard
        dashboard={dashboard}
        balance={balance}
        pendingCount={pendingPayments.length}
        onPay={() => setPayOpen(true)}
        onAutoPay={() => setAutoPayOpen(true)}
        autopayEnabled={!!autopay?.enabled}
        leaseLoading={dashLoading}
      />

      {/* Quick stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendingPayments.length > 0 ? "bg-warning/10" : "bg-success/10"}`}>
                <DollarSign className={`w-5 h-5 ${pendingPayments.length > 0 ? "text-warning" : "text-success"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Payments</p>
                <p className="font-semibold text-lg">{pendingPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${openRequests.length > 0 ? "bg-info/10" : "bg-muted"}`}>
                <Wrench className={`w-5 h-5 ${openRequests.length > 0 ? "text-info" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Open Requests</p>
                <p className="font-semibold text-lg">{openRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-brand" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Documents</p>
                <p className="font-semibold text-lg">{myDocs?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inline maintenance shortcut */}
      <QuickMaintenanceCard tenantId={activeLease?.tenantId} unitId={activeLease?.unitId} />

      {/* Tabs: Payments / Maintenance history / Documents */}
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments" className="gap-2"><DollarSign className="w-3.5 h-3.5" /> Payments</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="w-3.5 h-3.5" /> Maintenance
            {openRequests.length > 0 && <span className="ml-1 text-[10px] font-bold bg-info/20 text-info px-1.5 py-0.5 rounded-full">{openRequests.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="w-3.5 h-3.5" /> Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" className="gap-2 bg-card" onClick={() => generateStatement({ tenantName: user?.name ?? "Tenant", lease: activeLease, payments: payments ?? [], balance })}>
              <Download className="w-4 h-4" /> Statement
            </Button>
          </div>
          {paymentsLoading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            : (payments ?? []).length === 0 ? <div className="text-center py-12"><CheckCircle className="w-10 h-10 text-success mx-auto mb-3" /><p className="font-medium">No payment records</p></div>
            : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Due Date</th><th>Amount</th><th>Late Fee</th><th>Total</th><th>Paid Date</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {(payments ?? []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="text-muted-foreground">{new Date(p.dueDate).toLocaleDateString()}</td>
                      <td className="font-medium">{formatCurrency(Number(p.amount))}</td>
                      <td className="text-muted-foreground">{p.lateFee ? formatCurrency(Number(p.lateFee)) : "—"}</td>
                      <td className="font-semibold">{formatCurrency(Number(p.totalAmount))}</td>
                      <td className="text-muted-foreground">{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : "—"}</td>
                      <td className="text-muted-foreground capitalize">{p.paymentMethod?.replace("_", " ") ?? "—"}</td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          {requestsLoading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            : (requests ?? []).length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium">No maintenance requests</p>
                <p className="text-sm text-muted-foreground mt-1">Use the shortcut above to submit one</p>
              </div>
            ) : (
<MaintenanceRequestList requests={requests ?? []} />
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {(!myDocs || myDocs.length === 0) ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium">No Documents Yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your lease agreements and documents will appear here once uploaded by your property manager.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myDocs.map((doc: any) => (
                <Card key={doc.id} className="border border-border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-brand" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{(doc.category ?? "document").replace("_", " ")} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 bg-card"><Download className="w-3.5 h-3.5" /> View</Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {activeLease && <MakePaymentModal open={payOpen} onClose={() => setPayOpen(false)} lease={activeLease} balance={balance} />}
      <AutoPayModal open={autoPayOpen} onClose={() => setAutoPayOpen(false)} lease={activeLease} />
    </div>
  );
}
