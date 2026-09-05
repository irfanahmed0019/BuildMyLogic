import { createFileRoute } from "@tanstack/react-router";
import { Activity, ChevronRight, Code2, Database, GitBranch, Lightbulb, Search, ShieldCheck, Target, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLoop } from "@/lib/loop-store";

export const Route = createFileRoute("/skills")({ head: () => ({ meta: [{ title: "Skills — BuildMyLogic" }] }), component: Skills });

const iconMap = [Lightbulb, Code2, Database, GitBranch, Activity, ShieldCheck];
const LANGUAGE_HINTS = ["python", "javascript", "typescript", "java", "c", "c++", "c#", "go", "rust", "php", "ruby", "kotlin", "swift", "html", "css", "sql", "django", "react", "node"];

function levelLabel(level: number) {
  if (level === 0) return "Not proven";
  if (level < 35) return "Developing";
  if (level < 70) return "Proving";
  return "Proven";
}

function Skills() {
  const state = useLoop();
  const skills = state.plan?.skills ?? [];
  const known = state.profile?.technologies ?? [];
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"All Skills" | "By Language" | "Strengths" | "Weak Areas">("All Skills");

  const languages = known.filter((item) => LANGUAGE_HINTS.some((hint) => item.name.toLowerCase().includes(hint)));
  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    let result = skills.filter((s) => s.name.toLowerCase().includes(query));
    if (tab === "By Language") {
      const languageNames = languages.map((x) => x.name.toLowerCase());
      result = result.filter((s) => languageNames.some((name) => s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase())));
    }
    if (tab === "Strengths") result = result.filter((s) => s.level > 0).sort((a, b) => b.level - a.level);
    if (tab === "Weak Areas") result = result.filter((s) => s.level < 35).sort((a, b) => a.level - b.level);
    return result;
  }, [languages, q, skills, tab]);

  const avg = skills.length ? Math.round(skills.reduce((a, s) => a + s.level, 0) / skills.length) : 0;
  const improving = skills.filter((s) => s.level > 0 && s.level < 100).length;
  const focus = skills.filter((s) => s.level < 35).length;
  const provenActions = state.activity.length;
  const completedMissions = state.plan?.missions.filter((m) => state.missionProgress[m.id]?.status === "done").length ?? 0;
  const completedSessions = state.sessions.length;
  const conceptsProven = state.activity.filter((a) => a.kind === "skill").length;

  return <AppShell crumb="Skills" title="Build Real Skills." subtitle="BuildMyLogic never treats your resume or self-report as proof. These numbers start at zero and move only when your work creates evidence." quote="Skills are proven, not claimed." wide>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">{(["All Skills", "By Language", "Strengths", "Weak Areas"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`btn-base ${tab === item ? "btn-ink" : "btn-outline"}`}>{item}</button>)}</div>
      <label className="flex h-10 min-w-[280px] items-center gap-2 rounded-xl border border-input bg-surface px-3 text-sm text-muted-foreground"><Search className="h-4 w-4" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search skills…" className="w-full bg-transparent outline-none" /></label>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className="card-surface p-5"><div className="flex items-center gap-4"><div className="relative flex h-20 w-20 items-center justify-center rounded-full border-[7px] border-muted"><div className="absolute inset-[-7px] rounded-full border-[7px] border-primary border-b-transparent" style={{ transform: `rotate(${avg * 3.6}deg)` }} /><span className="text-xl font-bold">{avg}%</span></div><div><p className="text-xs text-muted-foreground">BuildMyLogic Skill Level</p><p className="mt-1 text-sm font-semibold">{avg === 0 ? "Nothing proven yet." : "Based on your evidence."}</p><p className="mt-1 text-xs text-muted-foreground">Self-reported skills do not raise this.</p></div></div></section>
      <section className="card-surface p-5"><p className="text-xs text-muted-foreground">Skills with evidence</p><p className="display mt-2 text-3xl font-extrabold">{improving}</p><p className="mt-1 text-xs font-semibold text-emerald-700">↑ Moved above zero through BuildMyLogic</p></section>
      <section className="card-surface p-5"><p className="text-xs text-muted-foreground">Skills to focus</p><p className="display mt-2 text-3xl font-extrabold">{focus}</p><p className="mt-1 text-xs font-semibold text-rose-500">↓ Still needs proof</p></section>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
      <section className="card-surface p-5 lg:col-span-8">
        <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Your Skills</h3><p className="mt-1 text-xs text-muted-foreground">Every skill begins at 0%. Completing learning, building, testing and missions creates evidence that moves it.</p></div><span className="rounded-full border border-black bg-white px-3 py-1 text-[10px] font-black">{tab}</span></div>
        <div className="mt-5 divide-y divide-border">{filtered.map((s, i) => { const Icon = iconMap[i % iconMap.length]; return <div key={s.name} className="flex items-center gap-3 py-3.5"><Icon className="h-6 w-6 shrink-0" strokeWidth={1.7} /><div className="min-w-0 w-48"><p className="text-sm font-semibold">{s.name}</p><p className="truncate text-[11px] text-muted-foreground">{s.level === 0 ? "No BuildMyLogic evidence yet." : s.note}</p></div><div className="flex-1"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${s.level}%` }} /></div></div><span className="w-10 text-right text-xs font-semibold">{s.level}%</span><span className="hidden rounded-lg bg-muted px-2 py-1 text-[10px] font-semibold md:block">{levelLabel(s.level)}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>; })}{filtered.length === 0 && <div className="py-10 text-center text-sm font-semibold text-muted-foreground">No skills match this view yet.</div>}</div>
      </section>

      <aside className="space-y-5 lg:col-span-4">
        <section className="rounded-2xl border border-primary/15 bg-primary-soft p-5"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><h3 className="text-sm font-bold">BuildMyLogic Evidence</h3></div><p className="mt-3 text-xs leading-5 text-muted-foreground">This is independent from what you claimed during onboarding. It reflects what you actually did inside BuildMyLogic.</p><div className="mt-4 space-y-3"><div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5"><span className="text-xs font-bold">Actions recorded</span><b>{provenActions}</b></div><div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5"><span className="text-xs font-bold">Sessions completed</span><b>{completedSessions}</b></div><div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5"><span className="text-xs font-bold">Missions completed</span><b>{completedMissions}</b></div><div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5"><span className="text-xs font-bold">Concepts understood</span><b>{conceptsProven}</b></div></div></section>
        <section className="card-surface p-5"><h3 className="text-sm font-bold">By Language</h3><p className="mt-1 text-xs text-muted-foreground">Your declared stack is shown separately. It does not inflate your BuildMyLogic score.</p><div className="mt-3 flex flex-wrap gap-2">{known.map((t) => <span key={t.name} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs">{t.name}</span>)}</div>{languages.length === 0 && <p className="mt-3 text-xs text-muted-foreground">No language-level technologies detected yet.</p>}</section>
        <section className="card-surface p-5"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">The rule</h3></div><p className="mt-3 text-xs leading-5 text-muted-foreground">A zero is useful. It tells you exactly where the evidence gap is. Don't fake the number — close the gap by building.</p></section>
      </aside>
    </div>
  </AppShell>;
}
