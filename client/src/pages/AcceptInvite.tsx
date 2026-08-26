import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Eye, EyeOff, Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const utils = trpc.useUtils();

  // Validate the token and get tenant info
  const { data: tokenData, isLoading: validating, error: tokenError } = trpc.auth.validateInvite.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // Narrow to valid token data
  const validToken = tokenData?.valid ? tokenData : null;

  const acceptMutation = trpc.auth.acceptInvite.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setAccepted(true);
      toast.success("Account activated! Redirecting to your portal…");
      setTimeout(() => navigate("/portal"), 2000);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to activate account. The link may have expired.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Please enter a password.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    acceptMutation.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Invalid invite link</h2>
          <p className="text-muted-foreground text-sm">
            This invite link is missing a token. Please use the link sent to your email.
          </p>
          <Button variant="outline" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-brand mx-auto" />
          <p className="text-muted-foreground text-sm">Validating your invite link…</p>
        </div>
      </div>
    );
  }

    if (tokenError || !tokenData || !tokenData.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Invite link expired or invalid</h2>
          <p className="text-muted-foreground text-sm">
            {tokenError?.message ?? (!tokenData?.valid ? tokenData?.reason : undefined) ?? "This invite link is no longer valid. Please contact your property manager for a new invite."}
          </p>
          <Button variant="outline" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">Account activated!</h2>
          <p className="text-muted-foreground text-sm">
            Welcome, {validToken?.name ?? "Tenant"}! Redirecting you to your tenant portal…
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-brand mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">WAA PropFlow</span>
        </div>

        {/* Welcome message */}
        <div className="bg-brand/10 border border-brand/20 rounded-xl p-5 space-y-1">
          <p className="text-sm font-medium text-foreground">
            You've been invited to the tenant portal
          </p>
          <p className="text-sm text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{validToken?.name ?? "Tenant"}</span>!
            Set a password below to activate your account.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Account email: <span className="font-mono text-foreground">{validToken?.email}</span>
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Set your password</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Choose a secure password to access your tenant portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-brand hover:bg-brand-dark text-white font-medium"
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activating account…
              </>
            ) : (
              "Activate my account"
            )}
          </Button>
        </form>

        <div className="border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-brand font-medium hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
