import { cn } from "@/lib/utils";

type StatusType = string;

const statusConfig: Record<string, { label: string; className: string }> = {
  // Unit status
  vacant: { label: "Vacant", className: "bg-success-light text-success" },
  occupied: { label: "Occupied", className: "bg-brand-light text-brand" },
  maintenance: { label: "Maintenance", className: "bg-warning-light text-warning" },
  unavailable: { label: "Unavailable", className: "bg-muted text-muted-foreground" },
  // Lease status
  active: { label: "Active", className: "bg-success-light text-success" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-warning-light text-warning" },
  terminated: { label: "Terminated", className: "bg-danger-light text-danger" },
  // Payment status
  paid: { label: "Paid", className: "bg-success-light text-success" },
  overdue: { label: "Overdue", className: "bg-danger-light text-danger" },
  partial: { label: "Partial", className: "bg-warning-light text-warning" },
  waived: { label: "Waived", className: "bg-muted text-muted-foreground" },
  // Maintenance status
  open: { label: "Open", className: "bg-info-light text-info" },
  in_progress: { label: "In Progress", className: "bg-warning-light text-warning" },
  on_hold: { label: "On Hold", className: "bg-muted text-muted-foreground" },
  resolved: { label: "Resolved", className: "bg-success-light text-success" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  // Priority
  urgent: { label: "Urgent", className: "bg-danger-light text-danger" },
  high: { label: "High", className: "bg-warning-light text-warning" },
  medium: { label: "Medium", className: "bg-info-light text-info" },
  low: { label: "Low", className: "bg-success-light text-success" },
  // Tenant status
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground" },
  evicted: { label: "Evicted", className: "bg-danger-light text-danger" },
  // Task status
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  completed: { label: "Completed", className: "bg-success-light text-success" },
  // Transaction / charge status
  received: { label: "Received", className: "bg-success-light text-success" },
  cleared: { label: "Cleared", className: "bg-success-light text-success" },
  // Application / prospect status
  screening: { label: "Screening", className: "bg-info-light text-info" },
  approved: { label: "Approved", className: "bg-success-light text-success" },
  denied: { label: "Denied", className: "bg-danger-light text-danger" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
  new: { label: "New", className: "bg-brand-light text-brand" },
  contacted: { label: "Contacted", className: "bg-info-light text-info" },
  showing: { label: "Showing", className: "bg-warning-light text-warning" },
  application: { label: "Application", className: "bg-info-light text-info" },
  lost: { label: "Lost", className: "bg-muted text-muted-foreground" },
  leased: { label: "Leased", className: "bg-success-light text-success" },
  scheduled: { label: "Scheduled", className: "bg-info-light text-info" },
};

export function StatusBadge({ status, className }: { status: StatusType; className?: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}

const priorityDot: Record<string, string> = {
  urgent: "bg-danger",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-success",
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const config = statusConfig[priority] ?? { label: priority, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
      config.className,
      className
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", priorityDot[priority] ?? "bg-muted-foreground")} />
      {config.label}
    </span>
  );
}
