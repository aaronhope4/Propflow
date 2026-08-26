import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSent(true);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    forgotMutation.mutate({ email: email.trim().toLowerCase(), origin: window.location.origin });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">WAA PropFlow</span>
        </div>

        {sent ? (
          /* ── Success state ── */
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Check your inbox</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  If an account exists for <strong className="text-foreground">{email}</strong>, we've sent a
                  password reset link. It expires in 1 hour.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Didn't receive the email?{" "}
              <button
                onClick={() => setSent(false)}
                className="text-brand hover:underline font-medium"
              >
                Try again
              </button>
            </p>
          </div>
        ) : (
          /* ── Request form ── */
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Forgot your password?</h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-brand hover:bg-brand-dark text-white font-medium"
                disabled={forgotMutation.isPending}
              >
                {forgotMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending reset link…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            <div className="border-t border-border pt-5">
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
