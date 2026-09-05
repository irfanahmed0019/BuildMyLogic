import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Check, Clock3, Flame, Lock, Target, Trophy, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLoop } from "@/lib/loop-store";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress — BuildMyLogic" }] }),
  component: Progress,
});

function dayKey(value: number) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function levelLabel(level: number) {
  if (level >= 70) return "Advanced";
  if (level >= 40) return "Intermediate";
  return "Developing";
}

function Progress() {
  const state = useLoop();
  const [tab, setTab] = useState<"Overview" | "Skills" | "Missions" | "Activity">("Overview");
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const plan = state.plan;
  const missions = plan?.missions ?? [];
  const skills = plan?.skills ?? [];
  const completedMissions = missions.filter((m) => state.missionProgress[m.id]?.status === "done");
  const totalMinutes = state.sessions.reduce((sum, s) => sum + s.minutes, 0);
  const activeDays = new Set(state.sessions.map((s) => dayKey(s.at))).size;
  const averageSkill = skills.length ? Math.round(skills.reduce((sum, s) => sum + s.level, 0) / skills.length) : 0;
  const selected = missions.find((m) => m.id === selectedMission);
  const selectedSessions = selected ? state.sessions.filter((s) => s.missionTitle === selected.title).slice(0, 8) : [];

  const timeline = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(now);
      start.setDate(now.getDate() - (5 - index) * 7 - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const minutes = state.sessions
        .filter((s) => {
          const d = new Date(s.at);
          return d >= start && d <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
        })
        .reduce((sum, s) => sum + s.minutes, 0);
      return { label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }), minutes };
    });
  }, [state.sessions]);

  const maxTimeline = Math.max(30, ...timeline.map((x) => x.minutes));
  const month = new Date();
  const monthDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const completedDays = new Set(state.sessions.map((s) => dayKey(s.at)));
  const recent = state.activity.slice(0, 4);

  return (
    <AppShell
      crumb="Progress"
      title="Your Growth Journey"
      subtitle="See how far you’ve come. Every session, every challenge, every skill builds a stronger you."
      quote="Progress is built, not watched."
      wide
    >
      <div className="flex flex-wrap gap-2">
        {(["Overview", "Skills", "Missions", "Activity"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`btn-base ${tab === item ? "btn-ink" : "btn-outline"}`}>
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Sessions" value={state.sessions.length} note={`+${activeDays} active days`} icon={Clock3} />
        <StatCard label="Completed Missions" value={completedMissions.length} note={`${missions.length ? Math.round((completedMissions.length / missions.length) * 100) : 0}% of your journey`} icon={Trophy} />
        <StatCard label="Total Learning Time" value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`} note={`+${averageSkill}% average skill level`} icon={BarChart3} />
      </div>

      {tab === "Overview" && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2.35fr)_minmax(300px,1fr)]">
          <section className="card-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-extrabold">Skill Progress</h2><p className="mt-1 text-sm font-medium">Your skill levels based on real building experience.</p></div>
              <span className="rounded-xl border border-input px-3 py-2 text-xs font-extrabold">{state.profile?.technologies?.[0]?.name ?? "Your stack"}⌄</span>
            </div>
            <div className="mt-6 space-y-4">
              {skills.length === 0 ? <p className="text-sm font-bold">Complete a mission to start measuring your skills.</p> : skills.map((skill) => (
                <div key={skill.name} className="grid grid-cols-[135px_minmax(0,1fr)_45px_105px] items-center gap-3">
                  <span className="text-sm font-extrabold">{skill.name}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, skill.level))}%` }} /></div>
                  <span className="text-right text-sm font-extrabold">{skill.level}%</span>
                  <span className="rounded-full bg-primary-soft px-2 py-1 text-center text-[10px] font-extrabold text-black">{levelLabel(skill.level)}</span>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="card-surface p-5">
              <div className="flex items-center justify-between"><h2 className="text-base font-extrabold">Learning Timeline</h2><span className="rounded-xl border border-input px-2.5 py-1.5 text-[10px] font-extrabold">Last 6 weeks⌄</span></div>
              <div className="mt-5 grid h-52 grid-cols-6 items-end gap-3 border-b border-black/10 pb-6">
                {timeline.map((item) => <div key={item.label} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-[10px] font-extrabold">{item.minutes ? `${item.minutes}m` : ""}</span><div className="w-7 rounded-t-xl bg-primary/75" style={{ height: `${Math.max(8, (item.minutes / maxTimeline) * 100)}%` }} /><span className="text-[10px] font-extrabold">{item.label}</span></div>)}
              </div>
            </section>
            <section className="card-surface p-5">
              <div className="flex items-center justify-between"><h2 className="text-base font-extrabold">Recent Achievements</h2><Link to="/sessions" className="text-xs font-extrabold text-black">View All →</Link></div>
              <div className="mt-3 divide-y divide-black/10">{recent.length === 0 ? <p className="py-3 text-sm font-bold">Your first achievement will appear after you build.</p> : recent.slice(0, 3).map((item) => <div key={item.at} className="flex gap-3 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Trophy className="h-4 w-4" /></span><div><p className="text-sm font-extrabold">{item.text}</p><p className="mt-1 text-xs font-bold">{new Date(item.at).toLocaleDateString()}</p></div></div>)}</div>
            </section>
            <CalendarCard days={monthDays} leading={leading} month={month} completedDays={completedDays} />
          </aside>
        </div>
      )}

      {tab === "Overview" && (
        <section className="card-surface mt-5 p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">Mission Progress</h2><p className="mt-1 text-sm font-medium">Click any mission to see the sessions and work you have logged for it.</p></div><Link to="/missions" className="text-xs font-extrabold text-black">View All →</Link></div>
          <div className="mt-7 flex min-w-[760px] items-start overflow-x-auto pb-2">
            {missions.slice(0, 8).map((mission, index) => {
              const status = state.missionProgress[mission.id]?.status ?? "locked";
              const steps = state.missionProgress[mission.id]?.completedSteps?.length ?? 0;
              const active = selectedMission === mission.id;
              return <button type="button" key={mission.id} onClick={() => setSelectedMission(mission.id)} className="group min-w-[140px] flex-1 text-center">
                <div className="flex items-center">{index > 0 && <span className={`h-0.5 flex-1 ${status === "locked" ? "bg-black/10" : "bg-primary"}`} />}<span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${active ? "ring-4 ring-primary-soft" : ""} ${status === "done" ? "border-primary bg-primary text-white" : status === "active" ? "border-primary bg-white text-primary" : "border-black/15 bg-black/5 text-black"}`}>{status === "done" ? <Check className="h-4 w-4" /> : status === "active" ? <Target className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}</span>{index < Math.min(8, missions.length) - 1 && <span className={`h-0.5 flex-1 ${state.missionProgress[missions[index + 1]?.id]?.status === "locked" ? "bg-black/10" : "bg-primary"}`} />}</div>
                <p className="mt-3 text-xs font-extrabold leading-4 group-hover:text-primary">{mission.title}</p><p className="mt-1 text-[10px] font-extrabold">{status === "done" ? "Completed" : status === "active" ? `${steps}/${mission.steps.length} steps` : "Locked"}</p>
              </button>;
            })}
          </div>
          {selected && <MissionHistory mission={selected} sessions={selectedSessions} onClose={() => setSelectedMission(null)} />}
        </section>
      )}

      {tab === "Skills" && <section className="card-surface mt-5 p-6"><h2 className="text-xl font-extrabold">Skills you’re building</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{skills.map((skill) => <div key={skill.name} className="rounded-2xl border border-black/10 p-5"><div className="flex justify-between"><p className="font-extrabold">{skill.name}</p><span className="font-extrabold">{skill.level}%</span></div><div className="mt-4 h-2.5 rounded-full bg-black/10"><div className="h-full rounded-full bg-primary" style={{ width: `${skill.level}%` }} /></div><p className="mt-3 text-sm font-semibold">{skill.note || levelLabel(skill.level)}</p></div>)}</div></section>}

      {tab === "Missions" && <section className="card-surface mt-5 p-6"><h2 className="text-xl font-extrabold">Mission Evidence</h2><div className="mt-5 space-y-3">{missions.map((mission) => { const p = state.missionProgress[mission.id] ?? { status: "locked", completedSteps: [] }; const missionSessions = state.sessions.filter((s) => s.missionTitle === mission.title); return <button type="button" key={mission.id} onClick={() => setSelectedMission(mission.id)} className="flex w-full items-center gap-4 rounded-2xl border border-black/10 p-4 text-left hover:border-primary/40"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">{p.status === "done" ? <Check className="h-5 w-5" /> : p.status === "active" ? <Flame className="h-5 w-5" /> : <Lock className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><b className="block text-sm">{mission.title}</b><span className="mt-1 block text-xs font-semibold">{p.completedSteps?.length ?? 0}/{mission.steps.length} learning steps · {missionSessions.length} sessions logged</span></span><span className="text-xs font-extrabold">{mission.minutes}m</span></button>; })}</div>{selected && <MissionHistory mission={selected} sessions={selectedSessions} onClose={() => setSelectedMission(null)} />}</section>}

      {tab === "Activity" && <section className="card-surface mt-5 p-6"><h2 className="text-xl font-extrabold">Build Activity</h2><div className="mt-5 divide-y divide-black/10">{state.activity.length === 0 ? <p className="py-5 text-sm font-bold">No activity yet.</p> : state.activity.map((item) => <div key={item.at} className="flex gap-4 py-4"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" /><div><p className="text-sm font-extrabold">{item.text}</p><p className="mt-1 text-xs font-semibold">{new Date(item.at).toLocaleString()}</p></div></div>)}</div></section>}

      {tab === "Overview" && <section className="mt-5 rounded-2xl bg-black p-5 text-white"><p className="text-sm font-black">Keep the loop moving.</p><p className="mt-1 text-sm font-semibold">{state.sessions.length ? `You have logged ${state.sessions.length} session${state.sessions.length === 1 ? "" : "s"}. Your next improvement is one focused build away.` : "Start your first session and BuildMyLogic will begin measuring your real building progress."}</p></section>}
    </AppShell>
  );
}

function StatCard({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: typeof Clock3 }) {
  return <section className="card-surface p-5"><div className="flex items-center justify-between"><p className="text-sm font-extrabold">{label}</p><Icon className="h-5 w-5 text-primary" /></div><p className="display mt-2 text-3xl font-black">{value}</p><p className="mt-1 text-xs font-extrabold text-emerald-700">{note}</p></section>;
}

function MissionHistory({ mission, sessions, onClose }: { mission: NonNullable<ReturnType<typeof useLoop>["plan"]>["missions"][number]; sessions: ReturnType<typeof useLoop>["sessions"]; onClose: () => void }) {
  return <div className="mt-5 rounded-2xl border-2 border-primary/20 bg-primary-soft/40 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-wider text-primary">Mission history</p><h3 className="mt-1 text-lg font-black">{mission.title}</h3><p className="mt-1 text-sm font-semibold">{sessions.length} session{sessions.length === 1 ? "" : "s"} logged for this mission.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white" aria-label="Close history"><X className="h-4 w-4" /></button></div><div className="mt-4 space-y-3">{sessions.length === 0 ? <p className="rounded-xl bg-white p-4 text-sm font-bold">No session history yet. Start building this mission and your work will appear here.</p> : sessions.map((session) => <div key={session.at} className="rounded-xl border border-black/10 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black">{new Date(session.at).toLocaleString()}</p><span className="text-xs font-black">{session.minutes} min</span></div><p className="mt-2 text-sm font-semibold">{session.note || "No session note was added."}</p>{session.completedTasks?.length ? <p className="mt-2 text-xs font-bold">{session.completedTasks.length}/{session.tasks?.length ?? 0} session tasks completed.</p> : null}{session.review ? <p className="mt-2 text-xs font-bold">Vibe: {session.review.feedback}</p> : null}</div>)}</div></div>;
}

function CalendarCard({ days, leading, month, completedDays }: { days: number; leading: number; month: Date; completedDays: Set<string> }) {
  return <section className="card-surface p-5"><div className="flex items-center justify-between"><h2 className="text-base font-extrabold">Learning Calendar</h2><span className="text-sm font-black">{month.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div><div className="mt-5 grid grid-cols-7 gap-y-3 text-center text-[10px] font-black">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d}>{d.slice(0, 1)}</span>)}{Array.from({ length: leading + days }, (_, index) => { const day = index - leading + 1; if (day < 1) return <span key={index} />; const date = new Date(month.getFullYear(), month.getMonth(), day); const active = completedDays.has(dayKey(date.getTime())); return <span key={index} className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-primary text-white" : ""}`}>{day}</span>; })}</div><div className="mt-5 flex gap-4 text-[10px] font-black"><span>● Session completed</span><span>○ No activity</span></div></section>;
}
