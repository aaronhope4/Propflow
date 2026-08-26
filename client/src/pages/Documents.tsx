import { useState } from "react";
import { Download, File, FileCheck, FileText, MoreHorizontal, Plus, Search, Share2, Trash2, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getDocumentPreviewKind } from "@/lib/documentPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { DocumentShareDialog } from "@/components/DocumentShareDialog";
import { toast } from "sonner";

const CATEGORIES = ["lease", "addendum", "notice", "inspection", "insurance", "tax", "maintenance", "other"];
const CATEGORY_ICONS: Record<string, any> = { lease: FileCheck, default: FileText };

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentPreview({ document }: { document: any }) {
  const previewKind = getDocumentPreviewKind(document);
  if (previewKind === "image" && document.fileUrl) return <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="block h-28 overflow-hidden rounded-lg bg-muted" aria-label={`Open image preview for ${document.name}`}><img src={document.fileUrl} alt={`Preview of ${document.name}`} loading="lazy" className="h-full w-full object-cover" /></a>;
  if (previewKind === "pdf" && document.fileUrl) return <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="relative block h-28 overflow-hidden rounded-lg border border-border bg-muted" aria-label={`Open PDF preview for ${document.name}`}><iframe title={`First-page preview of ${document.name}`} src={`${document.fileUrl}#page=1&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`} className="pointer-events-none h-[220px] w-full origin-top scale-[0.52] border-0" tabIndex={-1} /><span className="absolute bottom-2 left-2 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-background">PDF</span></a>;
  return <div className="flex h-28 items-center justify-center rounded-lg bg-muted/70"><div className="flex flex-col items-center gap-1.5 text-muted-foreground"><File className="h-7 w-7" /><span className="text-[10px] font-medium uppercase tracking-wide">{document.fileName?.split(".").pop() ?? "FILE"}</span></div></div>;
}

export default function Documents() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteConfirmDocument, setDeleteConfirmDocument] = useState<any | null>(null);
  const [shareDocument, setShareDocument] = useState<any | null>(null);
  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.documents.all.useQuery();
  const { data: properties } = trpc.properties.list.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();
  const deleteMutation = trpc.documents.delete.useMutation({ onSuccess: () => { utils.documents.all.invalidate(); setDeleteConfirmDocument(null); toast.success("Document deleted"); }, onError: error => toast.error(error.message) });
  const propertyMap = Object.fromEntries((properties ?? []).map(property => [property.id, property]));
  const tenantMap = Object.fromEntries((tenants ?? []).map(tenant => [tenant.id, tenant]));
  const documentPropertyId = (doc: any) => doc.propertyId ?? (doc.entityType === "property" ? doc.entityId : undefined);
  const documentTenantId = (doc: any) => doc.tenantId ?? (doc.entityType === "tenant" ? doc.entityId : undefined);
  const filtered = (documents ?? []).filter((doc: any) => {
    const propertyId = documentPropertyId(doc);
    const tenantId = documentTenantId(doc);
    const matchesSearch = !search || doc.name.toLowerCase().includes(search.toLowerCase()) || (doc.fileName ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (categoryFilter === "all" || doc.category === categoryFilter) && (propertyFilter === "all" || propertyId === Number(propertyFilter)) && (tenantFilter === "all" || tenantId === Number(tenantFilter));
  });

  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-center justify-between"><div><h1 className="page-title">Documents</h1><p className="page-subtitle">{documents?.length ?? 0} documents stored</p></div><Button onClick={() => setUploadOpen(true)} className="bg-brand text-white hover:bg-brand-dark gap-2"><Plus className="h-4 w-4" />Upload documents</Button></div>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative w-full lg:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search documents…" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[620px]"><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{CATEGORIES.map(category => <SelectItem key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</SelectItem>)}</SelectContent></Select><Select value={propertyFilter} onValueChange={setPropertyFilter}><SelectTrigger><SelectValue placeholder="All properties" /></SelectTrigger><SelectContent><SelectItem value="all">All properties</SelectItem>{(properties ?? []).map(property => <SelectItem key={property.id} value={String(property.id)}>{property.name}</SelectItem>)}</SelectContent></Select><Select value={tenantFilter} onValueChange={setTenantFilter}><SelectTrigger><SelectValue placeholder="All tenants" /></SelectTrigger><SelectContent><SelectItem value="all">All tenants</SelectItem>{(tenants ?? []).map(tenant => <SelectItem key={tenant.id} value={String(tenant.id)}>{tenant.name}</SelectItem>)}</SelectContent></Select></div></div>
    {isLoading ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, index) => <Skeleton key={index} className="h-64 w-full" />)}</div> : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted"><FileText className="h-8 w-8 text-muted-foreground/50" /></div><h3 className="mb-1 font-semibold">No documents found</h3><p className="mb-4 text-sm text-muted-foreground">{search || categoryFilter !== "all" || propertyFilter !== "all" || tenantFilter !== "all" ? "Try adjusting your filters" : "Upload lease agreements and other documents"}</p><Button onClick={() => setUploadOpen(true)} className="bg-brand text-white hover:bg-brand-dark gap-2"><Upload className="h-4 w-4" />Upload documents</Button></div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">{filtered.map((doc: any) => { const Icon = CATEGORY_ICONS[doc.category] ?? CATEGORY_ICONS.default; const property = propertyMap[documentPropertyId(doc)]; const tenant = tenantMap[documentTenantId(doc)]; return <Card key={doc.id} className="group border border-border shadow-sm card-hover"><CardContent className="p-4"><DocumentPreview document={doc} /><div className="mt-3 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10"><Icon className="h-5 w-5 text-brand" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-medium text-foreground">{doc.name}</p><DropdownMenu><DropdownMenuTrigger asChild><button className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-colors hover:bg-muted group-hover:opacity-100 focus:opacity-100" aria-label={`Actions for ${doc.name}`}><MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" /></button></DropdownMenuTrigger><DropdownMenuContent align="end">{doc.fileUrl && <DropdownMenuItem asChild><a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" />Download</a></DropdownMenuItem>}<DropdownMenuItem onClick={() => setShareDocument(doc)}><Share2 className="mr-2 h-4 w-4" />Share link</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirmDocument(doc)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{doc.fileName ?? "—"}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded bg-muted px-1.5 py-0.5 text-xs capitalize text-muted-foreground">{doc.category}</span>{property && <span className="text-xs text-muted-foreground">{property.name}</span>}{tenant && <span className="text-xs text-muted-foreground">· {tenant.name}</span>}</div><div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span><span className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</span></div></div></div></CardContent></Card>; })}</div>}
    <DocumentUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    <DocumentShareDialog document={shareDocument} open={shareDocument !== null} onOpenChange={open => { if (!open) setShareDocument(null); }} />
    <AlertDialog open={deleteConfirmDocument !== null} onOpenChange={open => { if (!open) setDeleteConfirmDocument(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete document?</AlertDialogTitle><AlertDialogDescription>This will permanently remove <strong>{deleteConfirmDocument?.name ?? "this document"}</strong> from PropFlow. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending} onClick={() => { if (deleteConfirmDocument) deleteMutation.mutate({ id: deleteConfirmDocument.id }); }}>{deleteMutation.isPending ? "Deleting…" : "Delete document"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
