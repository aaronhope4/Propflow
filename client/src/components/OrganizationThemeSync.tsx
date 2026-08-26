import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { applyOrganizationTheme } from "@/lib/orgTheme";

/** Keeps the persisted organization palette on the document root for every admin route. */
export default function OrganizationThemeSync() {
  const { user } = useAuth();
  const { data } = trpc.org.getTheme.useQuery(undefined, {
    enabled: Boolean(user && user.role !== "tenant"),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (user?.role === "tenant") return;
    applyOrganizationTheme(data?.themePalette);
  }, [data?.themePalette, user?.role]);

  return null;
}
