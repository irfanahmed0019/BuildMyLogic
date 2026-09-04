import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, BookOpen, Rocket, Sparkles, TrendingUp, Timer, Settings as SettingsIcon, LogOut, Bell, RefreshCw, ChevronDown } from "lucide-react";
import { aiRetunePlan } from "@/lib/sarvam.functions";
import { logActivity, resetLoop, setLoopState, useLoop } from "@/lib/loop-store";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { signOut, useAuth } from "@/lib/auth";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/missions", label: "Missions", icon: Rocket },
  { to: "/skills", label: "Skills", icon: Sparkles },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/sessions", label: "Sessions", icon: Timer },
] as const;

export function AppShell({ crumb, title, subtitle, quote, children, wide = false }: { crumb: string; title: string; subtitle: string; quote?: string; children: ReactNode; wide?: boolean }) {
  const state = useLoop();
  const auth = useAuth();
  const navigate = useNavigate();
  const [tuning, setTuning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const name = state.profile?.name?.trim() || "Builder";

  useEffect(() => {
    if (auth?.displayName && state.profile && (state.profile.name === "Builder" || !state.profile.name)) {
      setLoopState((prev) => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, name: auth.displayName } : prev.profile,
      }));
    }
  }, [auth, state.profile]);

  async function retune() {
    if (!state.plan || !state.profile || tuning) return;
    setTuning(true);
    setNotice("Reading how you have been building…");
    try {
      const plan = await aiRetunePlan({ data: { profile: state.profile, plan: state.plan, activity: state.activity } });
      const evidenceByName = new Map(state.plan.skills.map((skill) => [skill.name.toLowerCase(), skill.level]));
      const evidencePlan = { ...plan, skills: (plan.skills ?? []).map((skill) => ({ ...skill, level: evidenceByName.get(skill.name.toLowerCase()) ?? 0, note: evidenceByName.has(skill.name.toLowerCase()) ? skill.note : "No BuildMyLogic evidence yet. Build and prove it." })) };
      setLoopState((prev) => ({ ...prev, plan: evidencePlan }));
      logActivity({ kind: "ai", text: "AI re-tuned your missions, skills and session plan" });
      setNotice("Your path was rebuilt around your latest performance.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not re-tune right now.");
    } finally {
      setTuning(false);
      setTimeout(() => setNotice(null), 5000);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[236px] flex-col justify-between border-r border-border bg-surface px-5 py-6">
        <div>
          <Link to="/dashboard" className="block px-2">
            <span className="display flex items-center text-[22px] font-black tracking-[-0.05em]">BuildMyLogic<span className="mb-3 ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" /></span>
          </Link>
          <nav className="mt-10 space-y-1.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-foreground/80 transition-colors hover:bg-muted" activeProps={{ className: "flex items-center gap-3 rounded-xl bg-primary-soft px-3.5 py-2.5 text-[14px] font-semibold text-accent-foreground" }}>
                <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <div className="mb-7 space-y-1 border-t border-border pt-5">
            <Link to="/settings" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><SettingsIcon className="h-[19px] w-[19px]" strokeWidth={1.9} />Settings</Link>
            <button type="button" onClick={() => { signOut(); resetLoop(); void navigate({ to: "/" }); }} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="h-[19px] w-[19px]" strokeWidth={1.9} />Logout</button>
          </div>
          <div className="rounded-xl bg-primary-soft px-4 py-4">
            <p className="text-[13px] font-bold">Keep Building.</p>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">A better you is a more capable builder.</p>
            <div className="mt-2 text-right text-xl text-primary">↗</div>
          </div>
        </div>
      </aside>

      <div className="ml-[236px] min-w-0">
        <header className="flex h-[76px] items-center justify-end gap-5 border-b border-border/60 px-8">
          <button type="button" onClick={() => setNotice(`${state.activity.length} updates in your build log.`)} aria-label="Notifications" className="relative rounded-full p-2 text-foreground hover:bg-muted">
            <Bell className="h-[21px] w-[21px]" strokeWidth={1.8} />
            {state.activity.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />}
          </button>
          <div className="h-7 w-px bg-border" />
          <button type="button" onClick={retune} disabled={tuning} className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground md:flex">
            <RefreshCw className={`h-3.5 w-3.5 ${tuning ? "animate-spin" : ""}`} /> {tuning ? "Updating…" : "AI tune"}
          </button>
          <div className="flex items-center gap-3">
            {!auth && <GoogleSignIn compact />}
            <Link to="/settings" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-ink-foreground">{name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden text-sm font-semibold sm:inline">{name}</span><ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </header>

        <main className={`mx-auto px-7 pb-12 pt-7 ${wide ? "max-w-[1420px]" : "max-w-[1320px]"}`}>
          <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{crumb}</p>
              <h1 className="display text-[42px] font-extrabold leading-[1.04] tracking-[-0.055em]">{title}</h1>
              <p className="mt-2 max-w-4xl text-[17px] leading-6 text-muted-foreground">{subtitle}</p>
            </div>
            {quote && <p className="max-w-[190px] pt-3 text-right text-[13px] leading-5 text-muted-foreground">“{quote}”</p>}
          </div>
          {notice && <div className="mb-5 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-xs font-medium text-accent-foreground">{notice}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
