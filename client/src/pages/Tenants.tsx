import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Users, Plus, Search, Mail, Phone, MoreHorizontal, Edit, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

type TenantForm = {
  name: string; email: string; phone?: string;
  emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactRelation?: string;
  employerName?: string; monthlyIncome?: string; notes?: string;
  status: "active" | "inactive" | "evicted";
};

export function TenantFormModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, reset, setValue } = useForm<TenantForm>({
    defaultValues: editData ?? { status: "active" },
  });

  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: () => { utils.tenants.list.invalidate(); toast.success("Tenant added"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => { utils.tenants.list.invalidate(); toast.success("Tenant updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: TenantForm) => {
    if (editData) updateMutation.mutate({ id: editData.id, ...data });
    else createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Tenant" : "Add New Tenant"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div>
            <p className="form-section-title">Personal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input {...register("name", { required: true })} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" {...register("email", { required: true })} placeholder="jane@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register("phone")} placeholder="(512) 555-0100" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Status</Label>
                <Select defaultValue={editData?.status ?? "active"} onValueChange={(v) => setValue("status", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="evicted">Evicted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <p className="form-section-title">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input {...register("emergencyContactName")} placeholder="John Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register("emergencyContactPhone")} placeholder="(512) 555-0200" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Relationship</Label>
                <Input {...register("emergencyContactRelation")} placeholder="Spouse, Parent, Sibling…" />
              </div>
            </div>
          </div>

          <div>
            <p className="form-section-title">Employment</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employer</Label>
                <Input {...register("employerName")} placeholder="Acme Corp" />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Income</Label>
                <Input {...register("monthlyIncome")} placeholder="5000.00" />
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
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editData ? "Save Changes" : "Add Tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Tenants() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: tenants, isLoading } = trpc.tenants.list.useQuery();
  const deleteMutation = trpc.tenants.delete.useMutation({
    onSuccess: () => { utils.tenants.list.invalidate(); toast.success("Tenant deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (tenants ?? []).filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    (t.phone ?? "").includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">{tenants?.length ?? 0} tenants in your portfolio</p>
        </div>
        <Button onClick={() => { setEditData(null); setModalOpen(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Add Tenant
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search tenants…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No tenants found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Try a different search term" : "Add your first tenant to get started"}
          </p>
          {!search && (
            <Button onClick={() => setModalOpen(true)} className="bg-brand hover:bg-brand-dark text-white gap-2">
              <Plus className="w-4 h-4" /> Add Tenant
            </Button>
          )}
        </div>
      ) : (
        <Card className="border border-border shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Contact</th>
                <th>Employer</th>
                <th>Status</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tenant => (
                <tr
                  key={tenant.id}
                  className="cursor-pointer"
                  onClick={() => setLocation(`/tenants/${tenant.id}`)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-semibold bg-brand-light text-brand">
                          {tenant.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{tenant.name}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" /> {tenant.email}
                      </div>
                      {tenant.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" /> {tenant.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-muted-foreground text-sm">{tenant.employerName ?? "—"}</td>
                  <td><StatusBadge status={tenant.status} /></td>
                  <td className="text-muted-foreground text-sm">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/tenants/${tenant.id}`); }}>
                          <User className="w-4 h-4 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditData(tenant); setModalOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: tenant.id }); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <TenantFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditData(null); }} editData={editData} />
    </div>
  );
}
