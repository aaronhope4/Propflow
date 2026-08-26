import { useRef, useState } from "react";
import { FileCheck, Loader2, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const MAX_DOCUMENT_SIZE = 16 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png", "txt", "xlsx", "csv"]);
const CATEGORIES = ["lease", "addendum", "notice", "inspection", "insurance", "tax", "maintenance", "other"] as const;

type UploadStatus = "queued" | "reading" | "uploading" | "complete" | "failed";
type UploadItem = { id: string; file: File; status: UploadStatus; progress: number; error?: string };

function fileTitle(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return (lastDot > 0 ? fileName.slice(0, lastDot) : fileName).replace(/[-_]+/g, " ");
}

function uploadWithProgress(file: File, details: { propertyId: string; tenantId: string; category: string }, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("propertyId", details.propertyId);
    if (details.tenantId) formData.append("tenantId", details.tenantId);
    formData.append("category", details.category);
    request.open("POST", "/api/documents/upload");
    request.timeout = 120000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.max(1, Math.min(95, Math.round((event.loaded / event.total) * 95))));
    };
    request.onerror = () => reject(new Error("Network error during document upload"));
    request.onabort = () => reject(new Error("Document upload was canceled before completion"));
    request.ontimeout = () => reject(new Error("Document upload timed out"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      try {
        reject(new Error(JSON.parse(request.responseText).error || "Document upload failed"));
      } catch {
        reject(new Error("Document upload failed"));
      }
    };
    request.send(formData);
  });
}

export function DocumentUploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: properties } = trpc.properties.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("other");
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateItem = (id: string, update: Partial<UploadItem>) => {
    setQueue(items => items.map(item => item.id === id ? { ...item, ...update } : item));
  };

  const addFiles = (files: FileList | File[]) => {
    const accepted: UploadItem[] = [];
    for (const file of Array.from(files)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size === 0 || file.size > MAX_DOCUMENT_SIZE) {
        toast.error(`${file.name}: files must be between 1 byte and 16 MB`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, status: "queued", progress: 0 });
    }
    if (accepted.length) setQueue(items => [...items, ...accepted]);
  };

  const uploadItem = async (item: UploadItem) => {
    if (!propertyId) {
      toast.error("Select a property before uploading documents");
      return;
    }
    updateItem(item.id, { status: "uploading", progress: 0, error: undefined });
    try {
      await uploadWithProgress(item.file, { propertyId, tenantId, category }, (progress) => updateItem(item.id, { progress }));
      updateItem(item.id, { status: "complete", progress: 100 });
    } catch (error: any) {
      updateItem(item.id, { status: "failed", progress: 100, error: error.message || "Upload failed" });
    }
  };

  const uploadQueued = async () => {
    if (!propertyId) {
      toast.error("Select a property before uploading documents");
      return;
    }
    const pending = queue.filter(item => item.status === "queued" || item.status === "failed");
    for (const item of pending) await uploadItem(item);
    await utils.documents.all.invalidate();
  };

  const retryItem = async (id: string) => {
    const item = queue.find(candidate => candidate.id === id);
    if (!item) return;
    await uploadItem(item);
    await utils.documents.all.invalidate();
  };

  const closeAndReset = () => {
    if (queue.some(item => item.status === "reading" || item.status === "uploading")) return;
    setQueue([]);
    setPropertyId("");
    setTenantId("");
    setCategory("other");
    onClose();
  };

  const isWorking = queue.some(item => item.status === "reading" || item.status === "uploading");
  const pendingCount = queue.filter(item => item.status === "queued" || item.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeAndReset()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue placeholder="Select property…" /></SelectTrigger>
                <SelectContent>{(properties ?? []).map(property => <SelectItem key={property.id} value={String(property.id)}>{property.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tenant</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{(tenants ?? []).map(tenant => <SelectItem key={tenant.id} value={String(tenant.id)}>{tenant.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(value => <SelectItem key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-border px-6 py-8 text-center transition-colors hover:border-brand/50 hover:bg-brand/5">
            <Upload className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <span className="block text-sm font-medium">Choose one or more documents</span>
            <span className="mt-1 block text-xs text-muted-foreground">PDF, Office documents, images, text, or CSV · up to 16 MB per file</span>
          </button>
          <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx,.csv" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />

          {queue.length > 0 && (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {queue.map(item => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <FileCheck className={item.status === "complete" ? "h-5 w-5 text-success" : "h-5 w-5 text-muted-foreground"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{item.file.name}</p><span className="shrink-0 text-xs text-muted-foreground">{item.progress}%</span></div>
                      <Progress value={item.progress} className="mt-1.5 h-1.5" />
                      {item.status === "failed" && <p className="mt-1 text-xs text-destructive">{item.error}</p>}
                      {item.status === "complete" && <p className="mt-1 text-xs text-success">Uploaded</p>}
                    </div>
                    {item.status === "failed" && <Button type="button" variant="outline" size="sm" onClick={() => retryItem(item.id)} disabled={isWorking}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry</Button>}
                    {(item.status === "queued" || item.status === "failed") && <Button type="button" variant="ghost" size="icon" onClick={() => setQueue(items => items.filter(candidate => candidate.id !== item.id))} aria-label={`Remove ${item.file.name}`}><X className="h-4 w-4" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeAndReset} disabled={isWorking}>Cancel</Button>
          <Button type="button" onClick={uploadQueued} disabled={!pendingCount || isWorking || !propertyId} className="bg-brand text-white hover:bg-brand-dark">
            {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload {pendingCount || ""} {pendingCount === 1 ? "document" : "documents"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
