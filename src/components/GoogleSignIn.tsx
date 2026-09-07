import { useEffect, useRef, useState } from "react";
import { Check, Cloud, Loader2, LogOut } from "lucide-react";
import { hasCloudConfig, renderGoogleButton, signInWithGoogle, signOut, useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/loop-store";

export function GoogleSignIn({ compact = false }: { compact?: boolean }) {
  const auth = useAuth();
  const target = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = hasCloudConfig();

  useEffect(() => {
    if (auth || !target.current) return;
    let cancelled = false;
    void renderGoogleButton(target.current, async () => {
      if (cancelled) return;
      setBusy(true);
      setError(null);
      try {
        logActivity({ kind: "ai", text: "Connected your BuildMyLogic progress to Supabase Cloud" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed.");
      } finally {
        setBusy(false);
      }
    }, { width: compact ? 180 : 260 }).catch((err) =>
      setError(err instanceof Error ? err.message : "Google sign-in is unavailable.")
    );
    return () => {
      cancelled = true;
    };
  }, [auth, compact]);

  if (auth) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
          <Check className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-black">{auth.displayName}</p>
          <p className="truncate text-[10px] text-muted-foreground">Supabase synced</p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          title="Sign out"
          className="ml-2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        <Cloud className="mr-1.5 inline h-3.5 w-3.5" />
        Add Supabase env vars for cloud memory.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={target} className={busy ? "pointer-events-none opacity-50" : ""} />
      {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      {error && <p className="max-w-xs text-center text-[11px] font-semibold text-destructive">{error}</p>}
    </div>
  );
}

