import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/react-router";
import { rootAuthLoader } from "@clerk/react-router/ssr.server";
import { useState } from "react";
import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLocation,
  useNavigation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { Plus } from "lucide-react";
import { Button } from "./components/ui/button";
import { Spinner } from "./components/ui/spinner";
import Header from "./routes/components/header";

export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args);
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const shouldShowFab = !location.pathname.startsWith("/workouts/new");

  return (
    <ClerkProvider
      loaderData={loaderData}
      signUpFallbackRedirectUrl="/"
      signInFallbackRedirectUrl="/"
    >
      <Header />
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100]">
          <Spinner className="size-8 text-primary" />
        </div>
      )}
      <main className="pt-4 pb-24 px-4">
        <Outlet />
      </main>
      {shouldShowFab && (
        <SignedIn>
          <Button
            asChild
            variant="default"
            className="fixed bottom-6 right-6 rounded-full w-16 h-16 p-0 shadow-lg z-50 flex items-center justify-center"
            aria-label="トレーニングを開始する"
          >
            <Link to="/workouts/new">
              <Plus className="h-8 w-8 text-white" />
            </Link>
          </Button>
        </SignedIn>
      )}
    </ClerkProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
