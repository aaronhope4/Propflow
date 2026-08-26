import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ClipboardList, Plus, Wrench, MoreHorizontal, Edit, Trash2, MessageSquarePlus, Repeat, CheckCircle2, Clock, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { PageHeader, EmptyState, formatDate, formatCurrency } from "@/components/PageShell";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const TASK_CATEGORIES = ["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "cleaning", "general", "other"];
const PRIORITIES = ["urgent", "high", "medium", "low"];

// ─── Task Modal ──────────────────────────────────────────────────────────────
function TaskModal({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const utils = trpc.useUtils();
  const { data: properties } = trpc.properties.list.useQuery();
  const { register, handleSubmit, reset, setValue } = useForm<any>({
    defaultValues: editData ?? { type: "task", priority: "medium", category: "general" },
  });
  const create = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task created"); onClose(); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const onSubmit = (d: any) => {
    const payload = { ...d, propertyId: d.propertyId ? Number(d.propertyId) : undefined };
    if (editData) update.mutate({ id: editData.id, title: payload.title, description: payload.description, priority: payload.priority, assigneeName: payload.assigneeName, dueDate: payload.dueDate });
    else create.mutate(payload);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editData ? "Edit Task" : "New Task / Request"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Title *</Label><Input {...register("title", { required: true })} placeholder="Leaky faucet in unit 3B" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea {...register("description")} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            {!editData && (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select defaultValue="task" onValueChange={(v) => setValue("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Internal Task</SelectItem>
                    <SelectItem value="tenant_request">Tenant Request</SelectItem>
                    <SelectItem value="owner_request">Owner Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue={editData?.priority ?? "medium"} onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!editData && (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select defaultValue="general" onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {!editData && (
              <div className="space-y-1.5">
                <Label>Property</Label>
                <Select onValueChange={(v) => setValue("propertyId", parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5"><Label>Assignee</Label><Input {...register("assigneeName")} placeholder="Staff member" /></div>
            <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" {...register("dueDate")} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending} className="bg-brand hover:bg-brand-dark text-white">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Work Order Modal ────────────────────────────────────────────────────────
function WorkOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: properties } = trpc.properties.list.useQuery();
  const { data: vendors } = trpc.vendors.list.useQuery();
  const [recurring, setRecurring] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<any>({ defaultValues: { priority: "medium" } });
  const create = trpc.workOrders.create.useMutation({
    onSuccess: () => { utils.workOrders.list.invalidate(); toast.success("Work order created"); onClose(); reset(); setRecurring(false); },
    onError: (e) => toast.error(e.message),
  });
  const onSubmit = (d: any) => create.mutate({
    ...d, isRecurring: recurring,
    propertyId: d.propertyId ? Number(d.propertyId) : undefined,
    vendorId: d.vendorId ? Number(d.vendorId) : undefined,
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label>Subject *</Label><Input {...register("subject", { required: true })} placeholder="HVAC quarterly service" /></div>
          <div className="space-y-1.5"><Label>Work Description</Label><Textarea {...register("workDescription")} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Select onValueChange={(v) => setValue("vendorId", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Assign vendor…" /></SelectTrigger>
                <SelectContent>{(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select onValueChange={(v) => setValue("propertyId", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue="medium" onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Est. Bill Amount</Label><Input {...register("billAmount")} placeholder="450.00" /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2"><Repeat className="w-4 h-4 text-brand" /><div><Label className="cursor-pointer">Recurring Work Order</Label><p className="text-xs text-muted-foreground">Auto-create on a schedule</p></div></div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>
          {recurring ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select defaultValue="monthly" onValueChange={(v) => setValue("frequency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"].map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" {...register("startDate")} /></div>
            </div>
          ) : (
            <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" {...register("dueDate")} /></div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand hover:bg-brand-dark text-white">Create Work Order</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkOrderVendorDialog({ workOrder, open, onClose }: { workOrder: any | null; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: vendors } = trpc.vendors.list.useQuery();
  const [vendorId, setVendorId] = useState<string>("");
  useEffect(() => setVendorId(workOrder?.vendorId ? String(workOrder.vendorId) : "unassigned"), [workOrder]);
  const update = trpc.workOrders.update.useMutation({
    onSuccess: () => { utils.workOrders.list.invalidate(); toast.success("Work order vendor updated"); onClose(); },
    onError: (error) => toast.error(error.message),
  });
  return <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
    <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Assign service provider</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2"><p className="text-sm text-muted-foreground">{workOrder?.subject}</p>
        <Select value={vendorId} onValueChange={setVendorId}><SelectTrigger><SelectValue placeholder="Assign vendor…" /></SelectTrigger><SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {(vendors ?? []).filter((vendor: any) => vendor.status === "active").map((vendor: any) => <SelectItem key={vendor.id} value={String(vendor.id)}>{vendor.company || vendor.name}{vendor.preferredProvider ? " · Preferred" : ""}</SelectItem>)}
        </SelectContent></Select>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => workOrder && update.mutate({ id: workOrder.id, vendorId: vendorId === "unassigned" ? null : Number(vendorId) })} disabled={update.isPending}>{update.isPending ? "Assigning…" : "Save assignment"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

// ─── Task Detail Drawer ──────────────────────────────────────────────────────
function TaskDrawer({ taskId, onClose }: { taskId: number | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: task } = trpc.tasks.byId.useQuery({ id: taskId! }, { enabled: !!taskId });
  const { data: updates } = trpc.tasks.updates.useQuery({ taskId: taskId! }, { enabled: !!taskId });
  const [msg, setMsg] = useState("");
  const post = trpc.tasks.postUpdate.useMutation({
    onSuccess: () => { utils.tasks.updates.invalidate({ taskId: taskId! }); setMsg(""); toast.success("Update posted"); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.byId.invalidate({ id: taskId! }); utils.tasks.list.invalidate(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Sheet open={!!taskId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>{task?.title ?? "Task"}</SheetTitle></SheetHeader>
        {task && (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-2">
              <StatusBadge status={task.status} /><PriorityBadge priority={task.priority} />
            </div>
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Category</p><p className="capitalize">{task.category ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Assignee</p><p>{task.assigneeName ?? "Unassigned"}</p></div>
              <div><p className="text-xs text-muted-foreground">Due</p><p>{formatDate(task.dueDate)}</p></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p>{formatDate(task.createdAt)}</p></div>
            </div>
            <div className="space-y-1.5">
              <Label>Update Status</Label>
              <Select value={task.status} onValueChange={(v) => updateStatus.mutate({ id: task.id, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["not_started", "in_progress", "on_hold", "completed", "overdue"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="form-section-title">Activity</p>
              <div className="space-y-3 mt-2">
                {(updates ?? []).length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
                {(updates ?? []).map((u: any) => (
                  <div key={u.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-light text-brand flex items-center justify-center text-xs font-semibold shrink-0">{(u.authorName ?? "U")[0]}</div>
                    <div className="min-w-0">
                      <p className="text-sm">{u.message}</p>
                      <p className="text-xs text-muted-foreground">{u.authorName} · {formatDate(u.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input placeholder="Post an update…" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && msg.trim()) post.mutate({ taskId: task.id, message: msg }); }} />
                <Button size="icon" disabled={!msg.trim() || post.isPending} className="bg-brand hover:bg-brand-dark text-white" onClick={() => post.mutate({ taskId: task.id, message: msg })}><MessageSquarePlus className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function Tasks() {
  const [location] = useLocation();
  const [tab, setTab] = useState("tasks");
  const [taskModal, setTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [woModal, setWoModal] = useState(false);
  const [assignWorkOrder, setAssignWorkOrder] = useState<any | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const n = new URLSearchParams(window.location.search).get("new");
    if (n === "task") { setTab("tasks"); setEditTask(null); setTaskModal(true); }
    else if (n === "workorder") { setTab("workorders"); setWoModal(true); }
    if (n) window.history.replaceState({}, "", "/tasks");
  }, [location]);

  const { data: tasks, isLoading } = trpc.tasks.list.useQuery();
  const { data: workOrders } = trpc.workOrders.list.useQuery();
  const { data: vendors } = trpc.vendors.list.useQuery();

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteWO = trpc.workOrders.delete.useMutation({
    onSuccess: () => { utils.workOrders.list.invalidate(); toast.success("Work order deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const vendorMap = Object.fromEntries((vendors ?? []).map((v: any) => [v.id, v]));

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader title="Tasks & Maintenance" subtitle="Track tasks, tenant requests, and vendor work orders" />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="tasks">Tasks & Requests <span className="ml-1.5 text-xs opacity-60">{tasks?.length ?? 0}</span></TabsTrigger>
            <TabsTrigger value="workorders">Work Orders <span className="ml-1.5 text-xs opacity-60">{workOrders?.length ?? 0}</span></TabsTrigger>
          </TabsList>
          {tab === "tasks"
            ? <Button onClick={() => { setEditTask(null); setTaskModal(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2 ml-auto"><Plus className="w-4 h-4" /> New Task</Button>
            : <Button onClick={() => setWoModal(true)} className="bg-brand hover:bg-brand-dark text-white gap-2 ml-auto"><Wrench className="w-4 h-4" /> New Work Order</Button>}
        </div>

        <TabsContent value="tasks">
          {isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            : (tasks ?? []).length === 0 ? <EmptyState icon={<ClipboardList />} title="No tasks" description="Create a task or wait for tenant requests." />
            : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Title</th><th>Type</th><th>Priority</th><th>Assignee</th><th>Due</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {(tasks ?? []).map((t: any) => (
                    <tr key={t.id} className="cursor-pointer" onClick={() => setDrawerId(t.id)}>
                      <td className="font-medium">{t.title}</td>
                      <td className="text-xs text-muted-foreground capitalize">{(t.type ?? "task").replace("_", " ")}</td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td className="text-sm text-muted-foreground">{t.assigneeName ?? "—"}</td>
                      <td className="text-sm text-muted-foreground">{formatDate(t.dueDate)}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditTask(t); setTaskModal(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteTask.mutate({ id: t.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workorders">
          {(workOrders ?? []).length === 0 ? <EmptyState icon={<Wrench />} title="No work orders" description="Create work orders to dispatch vendors." />
            : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Subject</th><th>Vendor</th><th>Priority</th><th>Schedule</th><th>Bill</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {(workOrders ?? []).map((w: any) => (
                    <tr key={w.id}>
                      <td>
                        <div className="font-medium flex items-center gap-1.5">{w.subject}{w.isRecurring && <Repeat className="w-3.5 h-3.5 text-brand" />}</div>
                        <div className="text-xs text-muted-foreground">{w.workDescription?.slice(0, 50)}</div>
                      </td>
                      <td className="text-sm">{w.vendorId ? vendorMap[w.vendorId]?.name ?? "—" : <span className="text-muted-foreground">Unassigned</span>}</td>
                      <td><PriorityBadge priority={w.priority} /></td>
                      <td className="text-xs text-muted-foreground">{w.isRecurring ? <span className="capitalize">{w.frequency}</span> : formatDate(w.dueDate)}</td>
                      <td className="text-sm">{w.billAmount ? formatCurrency(Number(w.billAmount)) : "—"}</td>
                      <td><StatusBadge status={w.status} /></td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><button className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setAssignWorkOrder(w)}><UserRoundCheck className="w-4 h-4 mr-2" /> Assign vendor</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteWO.mutate({ id: w.id })}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <TaskModal open={taskModal} onClose={() => { setTaskModal(false); setEditTask(null); }} editData={editTask} />
      <WorkOrderModal open={woModal} onClose={() => setWoModal(false)} />
      <WorkOrderVendorDialog workOrder={assignWorkOrder} open={Boolean(assignWorkOrder)} onClose={() => setAssignWorkOrder(null)} />
      <TaskDrawer taskId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}
