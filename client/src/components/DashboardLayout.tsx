import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  BarChart3,
  Sparkles,
  Calendar as CalendarIcon,
  ClipboardList,
  MessageSquare,
  FolderOpen,
  Workflow,
  Settings,
  LogOut,
  PanelLeft,
  Search,
  Plus,
  KeyRound,
  Bell,
  Home,
  UserPlus,
  Wrench,
  Receipt,
  FileSignature,
  Briefcase,
} from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, X } from "lucide-react";

type NavItem = { icon: typeof LayoutDashboard; label: string; path: string };
type NavGroup = { label?: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    items: [
      { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
      { icon: Sparkles, label: "AI Assistant", path: "/ai-assistant" },
      { icon: CalendarIcon, label: "Calendar", path: "/calendar" },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: Building2, label: "Rentals", path: "/properties" },
      { icon: KeyRound, label: "Leasing", path: "/leasing" },
      { icon: Users, label: "People", path: "/people" },
      { icon: Briefcase, label: "Vendors", path: "/vendors" },
      { icon: ClipboardList, label: "Tasks & Maintenance", path: "/tasks" },
    ],
  },
  {
    label: "Finance",
    items: [
      { icon: DollarSign, label: "Accounting", path: "/accounting" },
      { icon: BarChart3, label: "Reports", path: "/reports" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: MessageSquare, label: "Communications", path: "/communications" },
      { icon: FolderOpen, label: "Files & Agreements", path: "/documents" },
      { icon: Workflow, label: "Workflows", path: "/workflows" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

const createActions = [
  { icon: Home, label: "New Property", path: "/properties?new=1" },
  { icon: Users, label: "New Tenant", path: "/people?new=tenant" },
  { icon: FileSignature, label: "New Lease", path: "/leasing?new=1" },
  { icon: UserPlus, label: "New Prospect", path: "/people?new=prospect" },
  { icon: Wrench, label: "New Work Order", path: "/tasks?new=workorder" },
  { icon: ClipboardList, label: "New Task", path: "/tasks?new=task" },
  { icon: Receipt, label: "Record Expense", path: "/accounting?new=expense" },
  { icon: DollarSign, label: "Receive Payment", path: "/accounting?new=payment" },
  { icon: Briefcase, label: "New Vendor", path: "/vendors?new=1" },
];

const SIDEBAR_WIDTH_KEY = "propflow-sidebar-width";
const DEFAULT_WIDTH = 250;
const MIN_WIDTH = 210;
const MAX_WIDTH = 320;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">WAA PropFlow</span>
          </div>
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-semibold">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Access your property management dashboard</p>
          </div>
          <Button
            onClick={() => { window.location.href = "/login"; }}
            size="lg"
            className="w-full bg-brand hover:bg-brand-dark text-white"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

/** Shows a dismissible amber banner when the org trial ends within 7 days */
function TrialBanner() {
  const { data: org } = trpc.org.getSettings.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const [dismissed, setDismissed] = useState(false);
  const [, setLocation] = useLocation();

  if (dismissed || !org?.trialEndsAt) return null;

  const trialEnd = new Date(org.trialEndsAt);
  const now = new Date();
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Only show if on trial plan and within 7 days (or already expired)
  if (org.plan !== "trial" || daysLeft > 7) return null;

  const isExpired = daysLeft <= 0;
  const label = isExpired
    ? "Your free trial has ended."
    : daysLeft === 1
    ? "Your free trial ends tomorrow!"
    : `Your free trial ends in ${daysLeft} days.`;

  return (
    <div className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium ${
      isExpired ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    }`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs border-current"
        onClick={() => setLocation("/settings?tab=billing")}
      >
        Upgrade now
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="h-6 w-6 rounded flex items-center justify-center hover:bg-black/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeItem = allItems.find(item =>
    location === item.path || location.startsWith(item.path + "/")
  );

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Keyboard shortcut for search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const q = searchQuery.toLowerCase();
    return allItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border bg-sidebar"
          disableTransition={isResizing}
        >
          {/* Logo */}
          <SidebarHeader className="h-16 border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors shrink-0 focus:outline-none"
              >
                <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
              </button>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="font-semibold text-sidebar-foreground tracking-tight text-sm">WAA PropFlow</span>
                  <p className="text-xs text-sidebar-foreground/40 leading-none mt-0.5">Property Management</p>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="py-3 gap-0">
            {navGroups.map((group, gi) => (
              <div key={gi} className="px-2 pb-1">
                {group.label && !isCollapsed && (
                  <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/35">
                    {group.label}
                  </p>
                )}
                <SidebarMenu className="space-y-0.5">
                  {group.items.map(item => {
                    const isActive = location === item.path || location.startsWith(item.path + "/");
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 rounded-lg transition-all font-normal text-[13px] ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-brand" : ""}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          {/* User footer */}
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors w-full text-left focus:outline-none group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-7 w-7 shrink-0 ring-1 ring-sidebar-border">
                    <AvatarFallback className="text-[11px] font-semibold bg-brand text-white">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-sidebar-foreground truncate leading-none">{user?.name ?? "User"}</p>
                      <p className="text-[11px] text-sidebar-foreground/40 truncate mt-1">{user?.role === "admin" ? "Administrator" : "Manager"}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-brand/30 transition-colors"
            style={{ zIndex: 50 }}
            onMouseDown={() => !isCollapsed && setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset className="bg-background">
        {/* Mobile header */}
        {isMobile && (
          <div className="flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 sticky top-0 z-40 backdrop-blur">
            <SidebarTrigger className="h-8 w-8 rounded-lg" />
            <span className="font-medium text-sm flex-1">{activeItem?.label ?? "WAA PropFlow"}</span>
            <button onClick={() => setSearchOpen(true)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted">
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Page header bar */}
        {!isMobile && (
          <div className="flex h-14 items-center gap-3 border-b border-border bg-background/95 px-6 sticky top-0 z-40 backdrop-blur">
            <button
              onClick={toggleSidebar}
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="h-4 w-px bg-border" />
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{activeItem?.label ?? "WAA PropFlow"}</span>
            </nav>

            <div className="flex-1" />

            {/* Global search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground hover:bg-muted transition-colors w-64"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="text-[10px] font-medium bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </button>

            {/* Create New */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 bg-brand hover:bg-brand-dark text-white gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {createActions.map((a) => (
                  <DropdownMenuItem key={a.label} onClick={() => setLocation(a.path)} className="cursor-pointer">
                    <a.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <button
              onClick={() => setLocation("/communications")}
              className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors relative"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        <TrialBanner />
        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </SidebarInset>

      {/* Global Search Overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
          onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
        >
          <div
            className="w-full max-w-lg bg-popover rounded-xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "scale-in 0.15s cubic-bezier(0.23,1,0.32,1)" }}
          >
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, tenants, properties..."
                className="flex-1 h-12 bg-transparent outline-none text-sm"
              />
              <kbd className="text-[10px] font-medium bg-muted border border-border rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { setLocation(item.path); setSearchOpen(false); setSearchQuery(""); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-accent text-left transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
