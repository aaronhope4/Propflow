import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  httpBatchLink,
  TRPCClientError,
} from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const SESSION_STORAGE_KEY =
  "propflow_session";

const queryClient =
  new QueryClient();

const redirectToLoginIfUnauthorized = (
  error: unknown,
) => {
  if (
    !(error instanceof TRPCClientError)
  ) {
    return;
  }

  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const isUnauthorized =
    error.message ===
    UNAUTHED_ERR_MSG;

  if (!isUnauthorized) {
    return;
  }

  const loginPath = "/login";

  if (
    window.location.pathname !==
    loginPath
  ) {
    window.location.href =
      loginPath;
  }
};

queryClient
  .getQueryCache()
  .subscribe((event) => {
    if (
      event.type ===
        "updated" &&
      event.action.type ===
        "error"
    ) {
      const error =
        event.query.state.error;

      redirectToLoginIfUnauthorized(
        error,
      );

      console.error(
        "[API Query Error]",
        error,
      );
    }
  });

queryClient
  .getMutationCache()
  .subscribe((event) => {
    if (
      event.type ===
        "updated" &&
      event.action.type ===
        "error"
    ) {
      const error =
        event.mutation.state.error;

      redirectToLoginIfUnauthorized(
        error,
      );

      console.error(
        "[API Mutation Error]",
        error,
      );
    }
  });

/**
 * Local development:
 *
 *   VITE_API_URL=""
 *   → /api/trpc
 *
 * Production/testing:
 *
 *   VITE_API_URL=https://propflow-api-f7m5.onrender.com
 *
 *   → https://propflow-api-f7m5.onrender.com/api/trpc
 */
const apiBaseUrl =
  import.meta.env.VITE_API_URL?.trim() ||
  "";

const trpcUrl =
  `${apiBaseUrl}/api/trpc`.replace(
    /([^:]\/)\/+/g,
    "$1",
  );

const trpcClient =
  trpc.createClient({
    links: [
      httpBatchLink({
        url: trpcUrl,

        transformer:
          superjson,

        async fetch(
          input,
          init,
        ) {
          const headers =
            new Headers(
              init?.headers,
            );

          /**
           * Add the bearer token when
           * the browser has one.
           */
          if (
            typeof window !==
            "undefined"
          ) {
            const sessionToken =
              window.sessionStorage.getItem(
                SESSION_STORAGE_KEY,
              );

            if (
              sessionToken
            ) {
              headers.set(
                "Authorization",
                `Bearer ${sessionToken}`,
              );
            }
          }

          return globalThis.fetch(
            input,
            {
              ...(init ?? {}),
              headers,

              /**
               * Keep cookies enabled as well.
               * Normal browsers can continue
               * using the httpOnly cookie.
               */
              credentials:
                "include",
            },
          );
        },
      }),
    ],
  });

createRoot(
  document.getElementById(
    "root",
  )!,
).render(
  <trpc.Provider
    client={trpcClient}
    queryClient={queryClient}
  >
    <QueryClientProvider
      client={queryClient}
    >
      <App />
    </QueryClientProvider>
  </trpc.Provider>,
);
