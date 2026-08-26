import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { UserCog, Plus, Search, Mail, Phone, MoreHorizontal, Edit, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

type OwnerForm = {
  name: string; email: string; phone?: string;
  company?: string; taxId?: string; bankName?: string;
  bankAccount?: string; bankRouting?: string;
  distributionPercentage?: string; notes?: string;
};

export function OwnerFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, reset } = useForm<OwnerForm>({
    defaultValues: editData ?? {},
  });

  const createMutation = trpc.owners.create.useMutation({
    onSuccess: () => { utils.owners.list.invalidate(); toast.success("Owner added"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.owners.update.useMutation({
    onSuccess: () => { utils.owners.list.invalidate(); toast.success("Owner updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: OwnerForm) => {
    if (editData) updateMutation.mutate({ id: editData.id, ...data });
    else createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Owner" : "Add Property Owner"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div>
            <p className="form-section-title">Personal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input {...register("name", { required: true })} placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" {...register("email", { required: true })} placeholder="john@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register("phone")} placeholder="(512) 555-0100" />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input {...register("company")} placeholder="Doe Properties LLC" />
              </div>
              <div className="space-y-1.5">
                <Label>Tax ID / SSN</Label>
                <Input {...register("taxId")} placeholder="XX-XXXXXXX" />
              </div>
            </div>
          </div>

          <div>
            <p className="form-section-title">Banking Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Bank Name</Label>
                <Input {...register("bankName")} placeholder="Chase Bank" />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input {...register("bankAccount")} placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>Routing Number</Label>
                <Input {...register("bankRouting")} placeholder="021000021" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Distribution %</Label>
                <Input {...register("distributionPercentage")} placeholder="100" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={2} placeholder="Any additional notes…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-brand hover:bg-brand-dark text-white">
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editData ? "Save Changes" : "Add Owner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Owners() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: owners, isLoading } = trpc.owners.list.useQuery();
  const { data: properties } = trpc.properties.list.useQuery();

  const deleteMutation = trpc.owners.delete.useMutation({
    onSuccess: () => { utils.owners.list.invalidate(); toast.success("Owner deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (owners ?? []).filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (o.company ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Property Owners</h1>
          <p className="page-subtitle">{owners?.length ?? 0} owners registered</p>
        </div>
        <Button onClick={() => { setEditData(null); setModalOpen(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Add Owner
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search owners…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <UserCog className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold mb-1">No owners found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Try a different search" : "Add property owners to track distributions"}
          </p>
          {!search && (
            <Button onClick={() => setModalOpen(true)} className="bg-brand hover:bg-brand-dark text-white gap-2">
              <Plus className="w-4 h-4" /> Add Owner
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {filtered.map(owner => {
            const initials = owner.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
            const ownerProperties = (properties ?? []).filter(p => p.ownerId === owner.id);
            return (
              <Card key={owner.id} className="border border-border shadow-sm card-hover group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm font-semibold bg-brand-light text-brand">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{owner.name}</p>
                        {owner.company && <p className="text-xs text-muted-foreground">{owner.company}</p>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditData(owner); setModalOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteMutation.mutate({ id: owner.id })}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                    {owner.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{owner.phone}</span>
                      </div>
                    )}
                    {owner.address && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{owner.city ?? owner.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{ownerProperties.length} {ownerProperties.length === 1 ? 'property' : 'properties'}</span>
                    {owner.state && (
                      <span className="text-xs font-medium text-muted-foreground">{owner.city}, {owner.state}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <OwnerFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditData(null); }} editData={editData} />
    </div>
  );
}
