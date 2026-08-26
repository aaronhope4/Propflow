import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Wrench, Plus, Search, MoreHorizontal, Edit, Trash2, CheckCircle,
  ImagePlus, X, Loader2, Upload, ZoomIn, ArrowLeft, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

// ─── Shared image upload types & helpers ─────────────────────────────────────
interface UploadedImage {
  localUrl: string;
  storageUrl?: string;
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

// ─── Reusable photo upload zone ───────────────────────────────────────────────
function PhotoUploadZone({
  images,
  setImages,
  maxFiles = 5,
  label,
}: {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  maxFiles?: number;
  label: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const remaining = maxFiles - images.length;
    if (remaining <= 0) { toast.error(`Maximum ${maxFiles} images allowed`); return; }
    const toAdd = arr.slice(0, remaining);
    if (toAdd.some((f) => !f.type.startsWith("image/"))) { toast.error("Only image files are allowed"); return; }
    if (toAdd.some((f) => f.size > 10 * 1024 * 1024)) { toast.error("Each image must be under 10 MB"); return; }

    const newImages: UploadedImage[] = toAdd.map((file) => ({
      localUrl: URL.createObjectURL(file),
      uploading: true,
      file,
    }));
    setImages((prev) => [...prev, ...newImages]);

    for (const img of newImages) {
      try {
        const storageUrl = await uploadImageToServer(img.file);
        setImages((prev) => prev.map((p) => p.localUrl === img.localUrl ? { ...p, uploading: false, storageUrl } : p));
      } catch (err: any) {
        setImages((prev) => prev.map((p) => p.localUrl === img.localUrl ? { ...p, uploading: false, error: err.message } : p));
        toast.error(`Failed to upload ${img.file.name}`);
      }
    }
  };

  const removeImage = (localUrl: string) => {
    URL.revokeObjectURL(localUrl);
    setImages((prev) => prev.filter((img) => img.localUrl !== localUrl));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm">
          <ImagePlus className="w-3.5 h-3.5" /> {label}
          <span className="text-muted-foreground font-normal">(optional, up to {maxFiles})</span>
        </Label>
        {images.length > 0 && <span className="text-xs text-muted-foreground">{images.length}/{maxFiles}</span>}
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.localUrl} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group">
              <img src={img.localUrl} alt="preview" className="w-full h-full object-cover" />
              {img.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
              {img.error && (
                <div className="absolute inset-0 bg-destructive/70 flex items-center justify-center">
                  <span className="text-white text-[9px] text-center px-1">Failed</span>
                </div>
              )}
              {!img.uploading && (
                <button
                  type="button"
                  onClick={() => removeImage(img.localUrl)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < maxFiles && (
        <label
          className={`flex flex-col items-center justify-center gap-1.5 w-full rounded-lg border-2 border-dashed p-3 cursor-pointer transition-colors ${
            dragOver ? "border-brand bg-brand/5" : "border-border/60 hover:border-brand/50 hover:bg-muted/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        >
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <Upload className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-medium text-foreground">Click to upload</span> or drag & drop
          </p>
        </label>
      )}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
        <X className="w-5 h-5 text-white" />
      </button>
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">{index + 1} / {urls.length}</span>
      {index > 0 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setIndex((i) => i - 1); }} className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      )}
      <img src={urls[index]} alt={`Photo ${index + 1}`} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
      {index < urls.length - 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setIndex((i) => i + 1); }} className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <ArrowRight className="w-5 h-5 text-white" />
        </button>
      )}
      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {urls.map((url, i) => (
            <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setIndex(i); }} className={`w-10 h-10 rounded-md overflow-hidden border-2 transition-colors ${i === index ? "border-white" : "border-white/30 hover:border-white/60"}`}>
              <img src={url} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Photo strip (read-only thumbnails) ──────────────────────────────────────
function PhotoStrip({ urls, label }: { urls: string[]; label: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (!urls.length) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
        <ImagePlus className="w-3 h-3" /> {label} ({urls.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url, i) => (
          <button key={i} type="button" onClick={() => setLightbox(i)} className="relative w-14 h-14 rounded-md overflow-hidden border border-border group hover:border-brand/50 transition-colors">
            <img src={url} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>
      {lightbox !== null && <Lightbox urls={urls} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ─── Maintenance Form Modal ───────────────────────────────────────────────────
function MaintenanceFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const utils = trpc.useUtils();
  const { data: units } = trpc.units.all.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const [adminImages, setAdminImages] = useState<UploadedImage[]>([]);

  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: editData ?? { priority: "medium", status: "open", category: "other" },
  });

  const isEditing = !!editData;

  const createMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => { utils.maintenance.list.invalidate(); toast.success("Request created"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.maintenance.update.useMutation({
    onSuccess: () => {
      utils.maintenance.list.invalidate();
      toast.success("Request updated");
      adminImages.forEach((img) => URL.revokeObjectURL(img.localUrl));
      setAdminImages([]);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const stillUploading = adminImages.some((img) => img.uploading);

  const onSubmit = (data: any) => {
    if (stillUploading) { toast.error("Please wait for photos to finish uploading"); return; }
    const newAdminUrls = adminImages.filter((img) => img.storageUrl).map((img) => img.storageUrl as string);
    if (isEditing) {
      updateMutation.mutate({
        id: editData.id,
        ...data,
        unitId: data.unitId ? parseInt(data.unitId) : undefined,
        tenantId: data.tenantId ? parseInt(data.tenantId) : undefined,
        ...(newAdminUrls.length > 0 ? { adminImageUrls: newAdminUrls } : {}),
      });
    } else {
      createMutation.mutate({
        ...data,
        unitId: data.unitId ? parseInt(data.unitId) : undefined,
        tenantId: data.tenantId ? parseInt(data.tenantId) : undefined,
      });
    }
  };

  // Existing admin photos already stored on the record
  const existingAdminPhotos: string[] = editData?.parsedAdminImageUrls ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Request" : "New Maintenance Request"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Title *</Label>
              <Input {...register("title", { required: true })} placeholder="e.g. Leaking faucet in kitchen" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select defaultValue={editData?.unitId?.toString()} onValueChange={(v) => setValue("unitId", v)}>
                <SelectTrigger><SelectValue placeholder="Select unit…" /></SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>Unit #{u.unitNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tenant</Label>
              <Select defaultValue={editData?.tenantId?.toString()} onValueChange={(v) => setValue("tenantId", v)}>
                <SelectTrigger><SelectValue placeholder="Select tenant…" /></SelectTrigger>
                <SelectContent>
                  {(tenants ?? []).map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select defaultValue={editData?.category ?? "other"} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="pest">Pest Control</SelectItem>
                  <SelectItem value="landscaping">Landscaping</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue={editData?.priority ?? "medium"} onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue={editData?.status ?? "open"} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register("description")} rows={3} placeholder="Describe the issue in detail…" />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input {...register("assignedTo")} placeholder="Vendor or contractor name" />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Cost</Label>
              <Input {...register("estimatedCost")} placeholder="250.00" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register("notes")} rows={2} placeholder="Internal notes…" />
            </div>
          </div>

          {/* Before/After photo upload — only shown when editing an existing request */}
          {isEditing && (
            <div className="border-t border-border/60 pt-4 space-y-3">
              {/* Show existing admin photos */}
              {existingAdminPhotos.length > 0 && (
                <PhotoStrip urls={existingAdminPhotos} label="Previously uploaded photos" />
              )}
              {/* Upload new photos */}
              <PhotoUploadZone
                images={adminImages}
                setImages={setAdminImages}
                maxFiles={10}
                label="Before / After Photos"
              />
              <p className="text-xs text-muted-foreground">
                New photos are added to any previously uploaded ones. Upload before & after shots to document the work.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { adminImages.forEach((img) => URL.revokeObjectURL(img.localUrl)); setAdminImages([]); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || stillUploading} className="bg-brand hover:bg-brand-dark text-white gap-1.5">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {stillUploading ? "Uploading photos…" : isEditing ? "Save Changes" : "Create Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Maintenance() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: requests, isLoading } = trpc.maintenance.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const { data: units } = trpc.units.all.useQuery();

  const deleteMutation = trpc.maintenance.delete.useMutation({
    onSuccess: () => { utils.maintenance.list.invalidate(); toast.success("Request deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const resolveMutation = trpc.maintenance.update.useMutation({
    onSuccess: () => { utils.maintenance.list.invalidate(); toast.success("Request resolved"); },
    onError: (e) => toast.error(e.message),
  });

  const tenantMap = Object.fromEntries((tenants ?? []).map(t => [t.id, t]));
  const unitMap = Object.fromEntries((units ?? []).map((u: any) => [u.id, u]));

  const filtered = (requests ?? []).filter((r: any) => {
    const tenant = tenantMap[r.tenantId];
    const matchesSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      tenant?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    open: requests?.filter((r: any) => r.status === "open").length ?? 0,
    inProgress: requests?.filter((r: any) => r.status === "in_progress").length ?? 0,
    resolved: requests?.filter((r: any) => r.status === "resolved").length ?? 0,
    urgent: requests?.filter((r: any) => r.priority === "urgent").length ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Track and manage maintenance requests</p>
        </div>
        <Button onClick={() => { setEditData(null); setModalOpen(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open", value: stats.open, color: "text-info" },
          { label: "In Progress", value: stats.inProgress, color: "text-warning" },
          { label: "Resolved", value: stats.resolved, color: "text-success" },
          { label: "Urgent", value: stats.urgent, color: "text-danger" },
        ].map(s => (
          <Card key={s.label} className="border border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search requests…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
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
            <Wrench className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold mb-1">No maintenance requests</h3>
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "all" || priorityFilter !== "all" ? "Try adjusting your filters" : "No requests submitted yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => {
            const tenant = tenantMap[r.tenantId];
            const unit = unitMap[r.unitId];
            const tenantPhotos: string[] = r.parsedImageUrls ?? [];
            const adminPhotos: string[] = r.parsedAdminImageUrls ?? [];
            const hasPhotos = tenantPhotos.length > 0 || adminPhotos.length > 0;

            return (
              <Card key={r.id} className="border border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                        <StatusBadge status={r.priority} />
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        {unit && <span>Unit #{unit.unitNumber}</span>}
                        {tenant && <span>{tenant.name}</span>}
                        {r.category && <span className="capitalize">{r.category.replace("_", " ")}</span>}
                        {r.assignedTo && <span>→ {r.assignedTo}</span>}
                        {r.estimatedCost && <span>${Number(r.estimatedCost).toLocaleString()} est.</span>}
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}

                      {/* Photo strips */}
                      {hasPhotos && (
                        <div className="mt-3 space-y-2">
                          {tenantPhotos.length > 0 && <PhotoStrip urls={tenantPhotos} label="Tenant photos" />}
                          {adminPhotos.length > 0 && <PhotoStrip urls={adminPhotos} label="Manager photos" />}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditData(r); setModalOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit / Add Photos
                        </DropdownMenuItem>
                        {r.status !== "resolved" && (
                          <DropdownMenuItem onClick={() => resolveMutation.mutate({ id: r.id, status: "resolved" })}>
                            <CheckCircle className="w-4 h-4 mr-2 text-success" /> Mark Resolved
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: r.id })}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <MaintenanceFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditData(null); }} editData={editData} />
    </div>
  );
}
