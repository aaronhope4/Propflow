import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import OrganizationThemeSync from "./components/OrganizationThemeSync";

// Admin pages
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import TenantDetail from "./pages/TenantDetail";
import Leasing from "./pages/Leasing";
import People from "./pages/People";
import Vendors from "./pages/Vendors";
import Tasks from "./pages/Tasks";
import Accounting from "./pages/Accounting";
import Reports from "./pages/Reports";
import Calendar from "./pages/Calendar";
import Communications from "./pages/Communications";
import Documents from "./pages/Documents";
import Workflows from "./pages/Workflows";
import Settings from "./pages/Settings";
import AIAssistant from "./pages/AIAssistant";

// Tenant portal
import TenantPortal from "./pages/TenantPortal";

// Auth
import Login from "./pages/Login";
import Register from "./pages/Register";
import AcceptInvite from "./pages/AcceptInvite";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

function AdminRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/ai-assistant" component={AIAssistant} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/rentals" component={Properties} />
        <Route path="/rentals/:id" component={PropertyDetail} />
        <Route path="/properties" component={Properties} />
        <Route path="/properties/:id" component={PropertyDetail} />
        <Route path="/leasing" component={Leasing} />
        <Route path="/people" component={People} />
        <Route path="/people/tenants/:id" component={TenantDetail} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/accounting" component={Accounting} />
        <Route path="/reports" component={Reports} />
        <Route path="/communications" component={Communications} />
        <Route path="/documents" component={Documents} />
        <Route path="/files" component={Documents} />
        <Route path="/workflows" component={Workflows} />
        <Route path="/settings" component={Settings} />
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function TenantRoutes() {
  return (
    <Switch>
      <Route path="/portal" component={TenantPortal} />
      <Route path="/portal/:tab" component={TenantPortal} />
      <Route path="/" component={() => <Redirect to="/portal" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading WAA PropFlow…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route component={Login} />
      </Switch>
    );
  }

  if (user.role === "tenant") {
    return <TenantRoutes />;
  }

  return <AdminRoutes />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <OrganizationThemeSync />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
