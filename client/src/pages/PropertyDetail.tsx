import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, MapPin, Plus, Edit, Trash2, Home, MoreHorizontal, FileText, Users, ClipboardList, LayoutGrid, FolderOpen, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useEffect, useState, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type UnitForm = {
  unitNumber: string; type: "studio" | "1br" | "2br" | "3br" | "4br+" | "commercial";
  bedrooms?: number; bathrooms?: string; sqft?: number; floor?: number;
  rentAmount: string; depositAmount?: string;
  status: "vacant" | "occupied" | "maintenance" | "unavailable";
  amenities?: string; notes?: string;
};

function UnitFormModal({ open, onClose, propertyId, editData }: { open: boolean; onClose: () => void; propertyId: number; editData?: any }) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<UnitForm>({
    defaultValues: editData ?? { type: "1br", status: "vacant", bedrooms: 1, bathrooms: "1.0" },
  });

  // Re-populate form when editData changes (e.g. opening edit modal for different units)
  useEffect(() => {
    if (editData) {
      reset({
        unitNumber: editData.unitNumber ?? "",
        type: editData.type ?? "1br",
        bedrooms: editData.bedrooms ?? undefined,
        bathrooms: editData.bathrooms != null ? String(editData.bathrooms) : "",
        sqft: editData.sqft ?? undefined,
        floor: editData.floor ?? undefined,
        rentAmount: editData.rentAmount != null ? String(editData.rentAmount) : "",
        depositAmount: editData.depositAmount != null ? String(editData.depositAmount) : "",
        status: editData.status ?? "vacant",
        amenities: editData.amenities ?? "",
        notes: editData.notes ?? "",
      });
    } else {
      reset({ type: "1br", status: "vacant", bedrooms: 1, bathrooms: "1.0" });
    }
  }, [editData, reset]);

  const createMutation = trpc.units.create.useMutation({
    onSuccess: () => { utils.units.byProperty.invalidate({ propertyId }); toast.success("Unit added"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.units.update.useMutation({
    onSuccess: () => { utils.units.byProperty.invalidate({ propertyId }); toast.success("Unit updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: UnitForm) => {
    // Strip empty strings and NaN from optional fields before sending
    const clean = (v: any) => (v === "" || v === null || (typeof v === "number" && isNaN(v)) ? undefined : v);
    const sanitized = {
      ...data,
      bedrooms: clean(data.bedrooms),
      sqft: clean(data.sqft),
      floor: clean(data.floor),
      bathrooms: clean(data.bathrooms),
      depositAmount: clean(data.depositAmount),
      amenities: clean(data.amenities),
      notes: clean(data.notes),
    };
    if (editData) {
      updateMutation.mutate({ id: editData.id, ...sanitized });
    } else {
      createMutation.mutate({ propertyId, ...sanitized });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Unit" : "Add New Unit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit Number *</Label>
              <Input
                {...register("unitNumber", { required: "Unit number is required" })}
                placeholder="101"
                className={errors.unitNumber ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.unitNumber && <p className="text-xs text-destructive">{errors.unitNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select defaultValue={editData?.type ?? "1br"} onValueChange={(v) => setValue("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="1br">1 Bedroom</SelectItem>
                  <SelectItem value="2br">2 Bedrooms</SelectItem>
                  <SelectItem value="3br">3 Bedrooms</SelectItem>
                  <SelectItem value="4br+">4+ Bedrooms</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bedrooms</Label>
              <Input type="number" {...register("bedrooms", { valueAsNumber: true })} min={0} placeholder="e.g. 2" />
            </div>
            <div className="space-y-1.5">
              <Label>Bathrooms</Label>
              <Input {...register("bathrooms")} placeholder="1.0" />
            </div>
            <div className="space-y-1.5">
              <Label>Square Feet</Label>
              <Input type="number" {...register("sqft", { valueAsNumber: true })} placeholder="850" />
            </div>
            <div className="space-y-1.5">
              <Label>Floor</Label>
              <Input type="number" {...register("floor", { valueAsNumber: true })} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Rent *</Label>
              <Input
                {...register("rentAmount", {
                  required: "Monthly rent is required",
                  pattern: { value: /^\d+(\.\d{1,2})?$/, message: "Enter a valid amount (e.g. 1500 or 1500.00)" },
                })}
                placeholder="1500.00"
                className={errors.rentAmount ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.rentAmount && (
                <p className="text-xs text-destructive">
                  {errors.rentAmount.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Security Deposit</Label>
              <Input {...register("depositAmount")} placeholder="1500.00" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue={editData?.status ?? "vacant"} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Amenities</Label>
              <Input {...register("amenities")} placeholder="Parking, Laundry, Balcony…" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register("notes")} rows={2} placeholder="Any additional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-brand hover:bg-brand-dark text-white">
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editData ? "Save Changes" : "Add Unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString() : "—");
const money = (n: any) => `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const propertyId = parseInt(params.id ?? "0");
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [unitSort, setUnitSort] = useState<{ key: "unitNumber" | "rentAmount"; dir: "asc" | "desc" }>({ key: "unitNumber", dir: "asc" });
  const utils = trpc.useUtils();

  const { data: property, isLoading: propLoading } = trpc.properties.byId.useQuery({ id: propertyId });
  const { data: units, isLoading: unitsLoading } = trpc.units.byProperty.useQuery({ propertyId });
  const { data: allLeases } = trpc.leases.list.useQuery(undefined);
  const { data: allTenants } = trpc.tenants.list.useQuery();
  const { data: tasks } = trpc.tasks.list.useQuery({ propertyId });
  const { data: documents } = trpc.documents.all.useQuery();

  const deleteUnitMutation = trpc.units.delete.useMutation({
    onSuccess: () => { utils.units.byProperty.invalidate({ propertyId }); toast.success("Unit deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const sortedUnits = useMemo(() => {
    if (!units) return [];
    return [...units].sort((a, b) => {
      if (unitSort.key === "rentAmount") {
        const diff = Number(a.rentAmount ?? 0) - Number(b.rentAmount ?? 0);
        return unitSort.dir === "asc" ? diff : -diff;
      }
      const cmp = (a.unitNumber ?? "").localeCompare(b.unitNumber ?? "", undefined, { numeric: true });
      return unitSort.dir === "asc" ? cmp : -cmp;
    });
  }, [units, unitSort]);

  const toggleSort = (key: "unitNumber" | "rentAmount") => {
    setUnitSort(prev => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

  const SortIcon = ({ col }: { col: "unitNumber" | "rentAmount" }) => {
    if (unitSort.key !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return unitSort.dir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const unitIds = useMemo(() => new Set((units ?? []).map(u => u.id)), [units]);
  const propertyLeases = useMemo(() => (allLeases ?? []).filter((l: any) => unitIds.has(l.unitId)), [allLeases, unitIds]);
  const tenantIds = useMemo(() => new Set(propertyLeases.map((l: any) => l.tenantId)), [propertyLeases]);
  const propertyTenants = useMemo(() => (allTenants ?? []).filter((t: any) => tenantIds.has(t.id)), [allTenants, tenantIds]);
  const propertyDocs = useMemo(
    () => (documents ?? []).filter((d: any) => d.entityType === "property" && d.entityId === propertyId),
    [documents, propertyId],
  );

  const unitStats = {
    total: units?.length ?? 0,
    vacant: units?.filter(u => u.status === "vacant").length ?? 0,
    occupied: units?.filter(u => u.status === "occupied").length ?? 0,
    maintenance: units?.filter(u => u.status === "maintenance").length ?? 0,
  };
  const totalSqft = (units ?? []).reduce((s, u) => s + (u.sqft ?? 0), 0);
  const monthlyRent = (units ?? []).reduce((s, u) => s + Number(u.rentAmount ?? 0), 0);

  const unitName = (unitId: number) => {
    const u = (units ?? []).find(x => x.id === unitId);
    return u ? `#${u.unitNumber}` : "—";
  };
  const tenantName = (tid: number) => (allTenants ?? []).find((t: any) => t.id === tid)?.name ?? "—";

  if (propLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Property not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/rentals")}>
          Back to Rentals
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => setLocation("/rentals")}
          className="mt-1 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{property.name}</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{property.address}, {property.city}, {property.state} {property.zip}</span>
          </div>
        </div>
        <Button onClick={() => { setEditUnit(null); setUnitModalOpen(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Add Unit
        </Button>
      </div>

      {/* Quick stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Type", value: property.type, capitalize: true },
          { label: "Units", value: unitStats.total },
          { label: "Occupied", value: `${unitStats.total ? Math.round((unitStats.occupied / unitStats.total) * 100) : 0}%` },
          { label: "Total Sq Ft", value: totalSqft ? totalSqft.toLocaleString() : "—" },
          { label: "Monthly Rent", value: money(monthlyRent) },
          { label: "Year Built", value: property.yearBuilt ?? "—" },
        ].map(s => (
          <Card key={s.label} className="border border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`font-semibold ${s.capitalize ? "capitalize" : ""}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5"><LayoutGrid className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="units" className="gap-1.5"><Home className="w-3.5 h-3.5" /> Units ({unitStats.total})</TabsTrigger>
          <TabsTrigger value="leases" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Leases ({propertyLeases.length})</TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Tenants ({propertyTenants.length})</TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><FolderOpen className="w-3.5 h-3.5" /> Files ({propertyDocs.length})</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Tasks ({(tasks ?? []).length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Units", value: unitStats.total, color: "text-foreground" },
              { label: "Occupied", value: unitStats.occupied, color: "text-brand" },
              { label: "Vacant", value: unitStats.vacant, color: "text-success" },
              { label: "Maintenance", value: unitStats.maintenance, color: "text-warning" },
            ].map(s => (
              <Card key={s.label} className="border border-border shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border border-border shadow-sm">
            <CardHeader><CardTitle className="text-sm font-semibold">Property Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Address</p><p className="font-medium">{property.address}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">City / State</p><p className="font-medium">{property.city}, {property.state}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ZIP</p><p className="font-medium">{property.zip}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p><p className="font-medium capitalize">{property.type}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Leases</p><p className="font-medium">{propertyLeases.filter((l: any) => l.status === "active").length}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Open Tasks</p><p className="font-medium">{(tasks ?? []).filter((t: any) => t.status !== "completed" && t.status !== "resolved").length}</p></div>
            </CardContent>
          </Card>
          {property.description && (
            <Card className="border border-border shadow-sm">
              <CardHeader><CardTitle className="text-sm font-semibold">Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{property.description}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Units */}
        <TabsContent value="units" className="mt-4">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-0">
              {unitsLoading ? (
                <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !units || units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Home className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No units added yet</p>
                  <Button onClick={() => setUnitModalOpen(true)} variant="outline" className="mt-3 gap-2"><Plus className="w-4 h-4" /> Add First Unit</Button>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <button onClick={() => toggleSort("unitNumber")} className="flex items-center hover:text-foreground transition-colors">
                          Unit <SortIcon col="unitNumber" />
                        </button>
                      </th>
                      <th>Type</th>
                      <th>Beds/Baths</th>
                      <th>Sq Ft</th>
                      <th>
                        <button onClick={() => toggleSort("rentAmount")} className="flex items-center hover:text-foreground transition-colors">
                          Rent <SortIcon col="rentAmount" />
                        </button>
                      </th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUnits.map(unit => (
                      <tr key={unit.id}>
                        <td className="font-semibold text-foreground">#{unit.unitNumber}</td>
                        <td className="capitalize text-muted-foreground">{unit.type}</td>
                        <td className="text-muted-foreground">{unit.bedrooms}bd / {unit.bathrooms}ba</td>
                        <td className="text-muted-foreground">{unit.sqft ? `${unit.sqft.toLocaleString()} sqft` : "—"}</td>
                        <td className="font-medium">{money(unit.rentAmount)}/mo</td>
                        <td><StatusBadge status={unit.status} /></td>
                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditUnit(unit); setUnitModalOpen(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirmId(unit.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leases */}
        <TabsContent value="leases" className="mt-4">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-0">
              {propertyLeases.length === 0 ? (
                <EmptyState icon={FileText} text="No leases for this property yet" />
              ) : (
                <table className="data-table">
                  <thead><tr><th>Unit</th><th>Tenant</th><th>Start</th><th>End</th><th>Rent</th><th>Status</th></tr></thead>
                  <tbody>
                    {propertyLeases.map((l: any) => (
                      <tr key={l.id} className="cursor-pointer" onClick={() => setLocation("/leasing")}>
                        <td className="font-semibold">{unitName(l.unitId)}</td>
                        <td>{tenantName(l.tenantId)}</td>
                        <td className="text-muted-foreground">{fmtDate(l.startDate)}</td>
                        <td className="text-muted-foreground">{fmtDate(l.endDate)}</td>
                        <td className="font-medium">{money(l.rentAmount)}/mo</td>
                        <td><StatusBadge status={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenants */}
        <TabsContent value="tenants" className="mt-4">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-0">
              {propertyTenants.length === 0 ? (
                <EmptyState icon={Users} text="No tenants associated with this property" />
              ) : (
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead>
                  <tbody>
                    {propertyTenants.map((t: any) => (
                      <tr key={t.id} className="cursor-pointer" onClick={() => setLocation(`/tenants/${t.id}`)}>
                        <td className="font-semibold">{t.name}</td>
                        <td className="text-muted-foreground">{t.email}</td>
                        <td className="text-muted-foreground">{t.phone ?? "—"}</td>
                        <td><StatusBadge status={t.status ?? "active"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files */}
        <TabsContent value="files" className="mt-4">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-0">
              {propertyDocs.length === 0 ? (
                <EmptyState icon={FolderOpen} text="No documents attached to this property" action={<Button variant="outline" className="mt-3 gap-2" onClick={() => setLocation("/files")}><Plus className="w-4 h-4" /> Go to Files</Button>} />
              ) : (
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Type</th><th>Uploaded</th></tr></thead>
                  <tbody>
                    {propertyDocs.map((d: any) => (
                      <tr key={d.id}>
                        <td className="font-medium">{d.name}</td>
                        <td className="text-muted-foreground capitalize">{d.category ?? "document"}</td>
                        <td className="text-muted-foreground">{fmtDate(d.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-4">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-0">
              {(tasks ?? []).length === 0 ? (
                <EmptyState icon={ClipboardList} text="No tasks for this property" action={<Button variant="outline" className="mt-3 gap-2" onClick={() => setLocation("/tasks")}><Plus className="w-4 h-4" /> Go to Tasks</Button>} />
              ) : (
                <table className="data-table">
                  <thead><tr><th>Title</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>
                  <tbody>
                    {(tasks ?? []).map((t: any) => (
                      <tr key={t.id} className="cursor-pointer" onClick={() => setLocation("/tasks")}>
                        <td className="font-medium">{t.title}</td>
                        <td><PriorityBadge priority={t.priority ?? "medium"} /></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td className="text-muted-foreground">{fmtDate(t.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UnitFormModal
        open={unitModalOpen}
        onClose={() => { setUnitModalOpen(false); setEditUnit(null); }}
        propertyId={propertyId}
        editData={editUnit}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the unit and cannot be undone. Any associated leases or records will lose their unit reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteConfirmId !== null) { deleteUnitMutation.mutate({ id: deleteConfirmId }); setDeleteConfirmId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ icon: Icon, text, action }: { icon: any; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
