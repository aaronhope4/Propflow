import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";

export default function Home() {
  const { user, loading, error, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="p-6">
        {isAuthenticated ? (
          <>
            <h1 className="text-2xl font-bold">
              Welcome, {user?.name || "User"}
            </h1>

            <p className="mt-2 text-muted-foreground">
              You are logged in.
            </p>

            <Button
              variant="default"
              className="mt-4"
              onClick={() => logout()}
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">
              Welcome to PropFlow
            </h1>

            <p className="mt-2 text-muted-foreground">
              You are not currently logged in.
            </p>

            <Button
              variant="default"
              className="mt-4"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Login
            </Button>
          </>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-500">
            {error.message}
          </p>
        )}

        <div className="mt-6">
          <Streamdown>
            PropFlow property management platform.
          </Streamdown>
        </div>
      </main>
    </div>
  );
}