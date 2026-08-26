import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Building2, Plus, Search, MapPin, Home, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";

type PropertyForm = {
  name: string; address: string; city: string; state: string; zip: string;
  type: "residential" | "commercial" | "mixed" | "industrial";
  description?: string; yearBuilt?: number; totalUnits: number;
};

function PropertyFormModal({
  open, onClose, editData,
}: {
  open: boolean; onClose: () => void; editData?: any;
}) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, reset, setValue, watch } = useForm<PropertyForm>({
    defaultValues: editData ?? { type: "residential", totalUnits: 1 },
  });

  const createMutation = trpc.properties.create.useMutation({
    onSuccess: () => { utils.properties.list.invalidate(); toast.success("Property created"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.properties.update.useMutation({
    onSuccess: () => { utils.properties.list.invalidate(); toast.success("Property updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: PropertyForm) => {
    if (editData) {
      updateMutation.mutate({ id: editData.id, ...data, yearBuilt: data.yearBuilt ? Number(data.yearBuilt) : undefined, totalUnits: Number(data.totalUnits) });
    } else {
      createMutation.mutate({ ...data, yearBuilt: data.yearBuilt ? Number(data.yearBuilt) : undefined, totalUnits: Number(data.totalUnits) });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Property" : "Add New Property"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Property Name *</Label>
              <Input {...register("name", { required: true })} placeholder="e.g. Sunset Apartments" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Street Address *</Label>
              <Input {...register("address", { required: true })} placeholder="123 Main Street" />
            </div>
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input {...register("city", { required: true })} placeholder="Austin" />
            </div>
            <div className="space-y-1.5">
              <Label>State *</Label>
              <Input {...register("state", { required: true })} placeholder="TX" />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP Code *</Label>
              <Input {...register("zip", { required: true })} placeholder="78701" />
            </div>
            <div className="space-y-1.5">
              <Label>Property Type</Label>
              <Select defaultValue={editData?.type ?? "residential"} onValueChange={(v) => setValue("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="mixed">Mixed Use</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Units</Label>
              <Input type="number" {...register("totalUnits")} defaultValue={1} min={1} />
            </div>
            <div className="space-y-1.5">
              <Label>Year Built</Label>
              <Input type="number" {...register("yearBuilt")} placeholder="2000" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register("description")} placeholder="Brief description of the property..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-brand hover:bg-brand-dark text-white">
              {isPending ? "Saving…" : editData ? "Save Changes" : "Add Property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Properties() {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("new=1")) {
      setEditData(null);
      setModalOpen(true);
      window.history.replaceState({}, "", "/properties");
    }
  }, [location]);

  const { data: properties, isLoading } = trpc.properties.list.useQuery();
  const deleteMutation = trpc.properties.delete.useMutation({
    onSuccess: () => { utils.properties.list.invalidate(); toast.success("Property deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (properties ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  const typeColors: Record<string, string> = {
    residential: "bg-brand-light text-brand",
    commercial: "bg-info-light text-info",
    mixed: "bg-warning-light text-warning",
    industrial: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">{properties?.length ?? 0} properties in your portfolio</p>
        </div>
        <Button onClick={() => { setEditData(null); setModalOpen(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Add Property
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search properties…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border border-border">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No properties found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Try a different search term" : "Add your first property to get started"}
          </p>
          {!search && (
            <Button onClick={() => setModalOpen(true)} className="bg-brand hover:bg-brand-dark text-white gap-2">
              <Plus className="w-4 h-4" /> Add Property
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {filtered.map(property => (
            <Card
              key={property.id}
              className="border border-border shadow-sm card-hover cursor-pointer group"
              onClick={() => setLocation(`/properties/${property.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-brand" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[property.type] ?? "bg-muted text-muted-foreground"}`}>
                      {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditData(property); setModalOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: property.id }); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-1 group-hover:text-brand transition-colors">{property.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{property.address}, {property.city}, {property.state} {property.zip}</span>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Home className="w-3.5 h-3.5" />
                    <span>{property.totalUnits} units</span>
                  </div>
                  {property.yearBuilt && (
                    <div className="text-xs text-muted-foreground">Built {property.yearBuilt}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PropertyFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null); }}
        editData={editData}
      />
    </div>
  );
}
