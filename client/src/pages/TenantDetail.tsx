import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Mail, Phone, Briefcase, AlertCircle, FileText, DollarSign, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { useState } from "react";
import { TenantFormModal } from "./Tenants";

export default function TenantDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const tenantId = parseInt(params.id ?? "0");
  const [editOpen, setEditOpen] = useState(false);

  const { data: tenant, isLoading } = trpc.tenants.byId.useQuery({ id: tenantId });
  const { data: leases } = trpc.leases.byTenant.useQuery({ tenantId });
  const { data: payments } = trpc.rentPayments.list.useQuery({ tenantId });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Tenant not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/tenants")}>Back to Tenants</Button>
      </div>
    );
  }

  const initials = tenant.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => setLocation("/tenants")} className="mt-1 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-sm font-semibold bg-brand-light text-brand">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="page-title">{tenant.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={tenant.status} />
              <span className="text-sm text-muted-foreground">Tenant since {new Date(tenant.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Edit className="w-4 h-4" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact info */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{tenant.email}</span>
            </div>
            {tenant.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{tenant.phone}</span>
              </div>
            )}
            {tenant.employerName && (
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{tenant.employerName}</span>
              </div>
            )}
            {tenant.monthlyIncome && (
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm">${Number(tenant.monthlyIncome).toLocaleString()}/mo income</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency contact */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.emergencyContactName ? (
              <div className="space-y-2">
                <p className="font-medium text-sm">{tenant.emergencyContactName}</p>
                {tenant.emergencyContactRelation && (
                  <p className="text-xs text-muted-foreground">{tenant.emergencyContactRelation}</p>
                )}
                {tenant.emergencyContactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{tenant.emergencyContactPhone}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">No emergency contact on file</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.notes ? (
              <p className="text-sm text-muted-foreground">{tenant.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lease history */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand" /> Lease History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {!leases || leases.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No leases found for this tenant</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Rent</th>
                  <th>Deposit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leases.map(lease => (
                  <tr key={lease.id}>
                    <td className="font-medium">Unit #{lease.unitId}</td>
                    <td className="text-muted-foreground">{new Date(lease.startDate).toLocaleDateString()}</td>
                    <td className="text-muted-foreground">{new Date(lease.endDate).toLocaleDateString()}</td>
                    <td className="font-medium">${Number(lease.rentAmount).toLocaleString()}/mo</td>
                    <td className="text-muted-foreground">${Number(lease.depositAmount).toLocaleString()}</td>
                    <td><StatusBadge status={lease.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-brand" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {!payments || payments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <DollarSign className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No payment records found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Late Fee</th>
                  <th>Total</th>
                  <th>Paid Date</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="text-muted-foreground">{new Date(p.dueDate).toLocaleDateString()}</td>
                    <td className="font-medium">${Number(p.amount).toLocaleString()}</td>
                    <td className="text-muted-foreground">{p.lateFee ? `$${Number(p.lateFee).toLocaleString()}` : "—"}</td>
                    <td className="font-semibold">${Number(p.totalAmount).toLocaleString()}</td>
                    <td className="text-muted-foreground">{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : "—"}</td>
                    <td className="text-muted-foreground capitalize">{p.paymentMethod?.replace("_", " ") ?? "—"}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <TenantFormModal open={editOpen} onClose={() => setEditOpen(false)} editData={tenant} />
    </div>
  );
}
