import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Lock, PlayCircle, Search, Timer, Sparkles, Database, Users, Globe, ListChecks, BarChart3, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { logActivity, setMissionProgress, useLoop } from "@/lib/loop-store";
import { isChallengeUnlocked } from "@/lib/challenge-engine";

export const Route = createFileRoute("/missions")({ head: () => ({ meta: [{ title: "Missions — BuildMyLogic" }] }), component: Missions });
const icons = [Database, Users, Globe, ListChecks, BarChart3, Sparkles];

function Missions() {
  const state = useLoop(); const navigate = useNavigate(); const missions = state.plan?.missions ?? [];
  const [filter, setFilter] = useState("All Missions"); const [query, setQuery] = useState("");
  const currentIndex = Math.max(0, missions.findIndex((m) => state.missionProgress[m.id]?.status === "active"));
  const completedIds = missions.filter((m) => state.missionProgress[m.id]?.status === "done").map((m) => m.id);
  const demonstratedSkills = Object.keys(state.skillMemory ?? {});

  const filtered = useMemo(() => missions.filter((m, index) => {
    const p = state.missionProgress[m.id]?.status;
    const unlockInfo = isChallengeUnlocked(m, demonstratedSkills, completedIds);
    const isLocked = index > 0 && !unlockInfo.unlocked && p !== "done" && p !== "active";
    const status = p ?? (isLocked ? "locked" : index === 0 ? "active" : "locked");
    const ok = filter === "All Missions" || (filter === "In Progress" && status === "active") || (filter === "Completed" && status === "done") || (filter === "Locked" && status === "locked");
    return ok && m.title.toLowerCase().includes(query.toLowerCase());
  }), [missions, filter, query, state.missionProgress, demonstratedSkills, completedIds]);

  function start(id: string) { window.localStorage.setItem("loop-auto-start-session", "1"); setMissionProgress(id, { status: "active" }); void navigate({ to: "/sessions" }); }

  return <AppShell crumb="Missions" title="Build. Learn. Prove." subtitle="Hands-on projects designed to take you from learning to real-world building." quote="Real skills come from real projects." wide>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="lg:col-span-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">{["All Missions","In Progress","Completed","Locked"].map(x=><button key={x} onClick={()=>setFilter(x)} className={`btn-base px-4 py-2 ${filter===x?"btn-ink":"btn-outline"}`}>{x}</button>)}</div>
          <label className="flex h-10 min-w-[250px] items-center gap-2 rounded-xl border border-input bg-surface px-3 text-sm text-muted-foreground"><Search className="h-4 w-4"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search missions…" className="w-full bg-transparent outline-none"/></label>
        </div>
        <div className="mt-4 space-y-3">{filtered.map((mission,index)=>{
          const p = state.missionProgress[mission.id] ?? { status: index === 0 ? "active" : "locked", completedSteps: [] };
          const unlockInfo = isChallengeUnlocked(mission, demonstratedSkills, completedIds);
          const isLocked = index > 0 && !unlockInfo.unlocked && p.status !== "done" && p.status !== "active";
          const Icon = icons[index % icons.length];
          const active = p.status === "active";
          const done = p.status === "done";
          return <article key={mission.id} className={`rounded-2xl border bg-surface p-4 shadow-sm ${active ? "border-primary/30 bg-primary-soft/20" : isLocked ? "opacity-80 border-border" : "border-border"}`}>
          <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className="h-7 w-7"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="display text-lg font-bold">{mission.title}</h2>{active&&<span className="pill bg-primary-soft text-accent-foreground"><Sparkles className="h-3 w-3"/> In Progress</span>}{isLocked&&<span className="pill bg-muted text-muted-foreground"><Lock className="h-3 w-3"/> Locked (Prerequisites required)</span>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{mission.description}</p><div className="mt-2 flex flex-wrap gap-1.5">{[mission.stack,`Difficulty ${mission.difficulty}`,...mission.skills.slice(0,2)].map(t=><span key={t} className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium">{t}</span>)}{unlockInfo.missingSkills.length > 0 && isLocked && <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-1 text-[10px] font-medium">Requires: {unlockInfo.missingSkills.join(", ")}</span>}</div></div><div className="hidden w-28 shrink-0 text-xs text-muted-foreground md:block"><div className="flex items-center gap-1"><Timer className="h-3.5 w-3.5"/>~{mission.minutes} mins</div><div className="mt-2 flex gap-1">{Array.from({length:5}).map((_,i)=><span key={i} className={`h-1.5 w-4 rounded-full ${i<mission.difficulty?"bg-primary":"bg-muted"}`}/>)}</div></div><button disabled={isLocked} onClick={()=>start(mission.id)} className={`btn-base shrink-0 ${done?"btn-outline":active?"btn-primary-solid":"btn-outline"}`}>{done?"Completed":active?"Continue":isLocked?"Locked":"Start Mission"}{!done&&!isLocked&&<ChevronRight className="h-4 w-4"/>}</button></div>
        </article>})}{filtered.length===0&&<div className="card-surface p-10 text-center text-sm text-muted-foreground">No missions match this view.</div>}</div>
      </div>
      <aside className="space-y-5 lg:col-span-3">
        <section className="card-surface p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Your Mission Track</h3><span className="text-xs text-muted-foreground">{Math.min(currentIndex+1,missions.length)} / {missions.length}</span></div><div className="mt-6 flex items-start">{missions.slice(0,6).map((m,i)=>{const s=state.missionProgress[m.id]?.status??"locked";return <div key={m.id} className="relative flex-1 text-center"><div className="flex items-center">{i>0&&<span className="h-px flex-1 bg-border"/>}<span className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] ${s==="done"?"border-primary bg-primary text-white":s==="active"?"border-primary bg-white text-primary":"border-muted-foreground/40 bg-white"}`}>{s==="done"?<Check className="h-3 w-3"/>:i+1}</span>{i<Math.min(missions.length,6)-1&&<span className="h-px flex-1 bg-border"/>}</div><p className="mt-2 line-clamp-2 text-[9px] text-muted-foreground">{m.title}</p></div>})}</div></section>
        <section className="card-surface p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Featured Mission</h3><span className="pill bg-primary-soft text-accent-foreground">✦ For you</span></div>{missions[2]&&<div className="mt-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary"><Sparkles className="h-6 w-6"/></div><h4 className="mt-3 font-bold">{missions[2].title}</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">{missions[2].description}</p><button className="mt-4 w-full btn-base btn-outline" onClick={()=>start(missions[2].id)}>Open mission <ChevronRight className="h-4 w-4"/></button></div>}</section>
        <section className="rounded-2xl bg-primary-soft p-5"><p className="text-sm font-bold">Complete missions. Earn evidence.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Show what you can build, not just what you know.</p></section>
      </aside>
    </div>
  </AppShell>;
}
