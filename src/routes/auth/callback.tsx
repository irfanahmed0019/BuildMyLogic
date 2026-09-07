/**
 * BuildMyLogic — OAuth Callback Handler
 * 
 * Safely processes redirects from Supabase Google OAuth, extracts session
 * credentials from URL hash or code exchange, and redirects learner to Dashboard.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Signing you in…");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      void navigate({ to: "/dashboard" });
      return;
    }

    let isMounted = true;

    async function handleAuth() {
      if (!supabase) return;

      try {
        // 1. Check if session was already established or detected from URL hash
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session && isMounted) {
          void navigate({ to: "/dashboard" });
          return;
        }

        // 2. If code exists in URL (PKCE/authorization code), try to exchange
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && isMounted) {
            void navigate({ to: "/dashboard" });
            return;
          }
        }

        // 3. Listen for auth state change (e.g., hash fragment token detection)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session && isMounted) {
            void navigate({ to: "/dashboard" });
          }
        });

        // Fallback timer: if already signed in or after brief wait, head to dashboard
        setTimeout(() => {
          if (isMounted) {
            void navigate({ to: "/dashboard" });
          }
        }, 1500);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err) {
        console.warn("Auth callback handled with fallback:", err);
        if (isMounted) {
          // Graceful fallback to dashboard
          setTimeout(() => void navigate({ to: "/dashboard" }), 1000);
        }
      }
    }

    void handleAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center card-surface p-8 max-w-sm w-full">
        <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-sm font-semibold text-foreground">{status}</p>
        <p className="text-xs text-muted-foreground mt-2">Connecting your BuildMyLogic session…</p>
        
        {errorMessage && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void navigate({ to: "/dashboard" })}
              className="btn-base btn-primary-solid text-xs py-2 px-4"
            >
              Continue to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
