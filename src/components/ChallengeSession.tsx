import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, CheckCircle2, ChevronDown, Code2, Copy, ExternalLink, Flame, Github, Play, RotateCcw, Sparkles, Terminal, Timer, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { logActivity, recordMissionEvidence, setLoopState, useLoop } from "@/lib/loop-store";
import type { SessionReview } from "@/lib/loop-types";
import { aiReviewSession } from "@/lib/sarvam.functions";
import { getAuthSession } from "@/lib/auth";

const BRIDGE_URL = "http://127.0.0.1:8091";
type SubmissionOS = "linux" | "windows";
type ChallengeStep = 1 | 2 | 3 | 4;

export function ChallengeSession() {
  const state = useLoop();
  const plan = state.plan;
  const sessionPlan = plan?.session;
  const planned = sessionPlan?.totalMinutes ?? 45;
  const missions = plan?.missions ?? [];
  const activeMission = missions.find((m) => state.missionProgress[m.id]?.status !== "done") ?? missions[0];
  const storedStartedAt = typeof window !== "undefined" ? Number(window.localStorage.getItem("loop-session-started-at") || 0) : 0;
  const storedDuration = typeof window !== "undefined" ? Number(window.localStorage.getItem("loop-session-duration") || 0) : 0;
  const initialRemaining = storedStartedAt && storedDuration ? Math.max(0, storedDuration - Math.floor((Date.now() - storedStartedAt) / 1000)) : planned * 60;
  const [seconds, setSeconds] = useState(initialRemaining);
  const [running, setRunning] = useState(Boolean(storedStartedAt && initialRemaining > 0));
  const [done, setDone] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<SessionReview | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<number | null>(null);
  const [workspacePath, setWorkspacePath] = useState("");
  const [projectFolder, setProjectFolder] = useState("");
  const [pickingProject, setPickingProject] = useState(false);
  const [vscodeSession, setVscodeSession] = useState<{ sessionId: string; token: string } | null>(null);
  const [message, setMessage] = useState("");
  const [submissionOS, setSubmissionOS] = useState<SubmissionOS>("linux");
  const [challengeStep, setChallengeStep] = useState<ChallengeStep>(2);
  const [copied, setCopied] = useState(false);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const startRef = useRef(planned * 60);

  useEffect(() => {
    const savedPath = window.localStorage.getItem("loop-vscode-path") ?? "";
    const savedProject = window.localStorage.getItem("loop-project-folder") ?? "";
    const savedSession = window.localStorage.getItem("bml-vscode-session");
    setWorkspacePath(savedPath);
    setProjectFolder(savedProject);
    if (savedSession) {
      try { setVscodeSession(JSON.parse(savedSession)); } catch { window.localStorage.removeItem("bml-vscode-session"); }
    }
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem("loop-session-started-at")) return;
    startRef.current = planned * 60;
    setSeconds(planned * 60);
  }, [planned]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) {
        setRunning(false);
        window.localStorage.removeItem("loop-session-started-at");
        window.localStorage.removeItem("loop-session-duration");
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const currentTasks = sessionPlan?.tasks ?? [
    { title: "Read the mission brief", minutes: 5 },
    { title: "Implement the next piece", minutes: 25 },
    { title: "Run and verify your work", minutes: 10 },
    { title: "Write down what changed", minutes: 5 },
  ];
  const elapsed = Math.max(1, Math.round((startRef.current - seconds) / 60));
  const pct = startRef.current ? Math.min(100, ((startRef.current - seconds) / startRef.current) * 100) : 0;
  const total = state.sessions.reduce((sum, item) => sum + item.minutes, 0);

  async function createVscodeSession() {
    if (!activeMission) throw new Error("No active mission is selected.");
    const auth = getAuthSession();
    const userId = auth?.uid || "local-user";
    const response = await fetch("/api/vscode/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge_id: activeMission.id, user_id: userId }) });
    const result = (await response.json()) as { ok?: boolean; session_id?: string; token?: string; error?: string };
    if (!response.ok || !result.ok || !result.session_id || !result.token) throw new Error(result.error || "Could not create the BuildMyLogic VS Code session.");
    const session = { sessionId: result.session_id, token: result.token };
    setVscodeSession(session);
    window.localStorage.setItem("bml-vscode-session", JSON.stringify(session));
    return { ...session, userId };
  }

  async function connectExtension(session: { sessionId: string; token: string; userId: string }) {
    const uri = `vscode://buildmylogic.buildmylogic-vscode/session?sessionId=${encodeURIComponent(session.sessionId)}&challengeId=${encodeURIComponent(activeMission?.id || "")}&userId=${encodeURIComponent(session.userId)}&token=${encodeURIComponent(session.token)}`;
    const anchor = document.createElement("a");
    anchor.href = uri;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function pickProjectFolder() {
    setPickingProject(true);
    setMessage("");
    try {
      const health = await fetch(`${BRIDGE_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(800) }).catch(() => null);
      if (health?.ok) {
        const response = await fetch(`${BRIDGE_URL}/pick-folder`, { method: "POST" });
        const result = (await response.json()) as { ok?: boolean; path?: string };
        if (response.ok && result.ok && result.path) {
          const path = result.path.trim().replace(/[\\/]+$/, "");
          const folder = path.split(/[\\/]/).filter(Boolean).pop() || path;
          setWorkspacePath(path);
          setProjectFolder(folder);
          window.localStorage.setItem("loop-vscode-path", path);
          window.localStorage.setItem("loop-project-folder", folder);
          return path;
        }
      }
      folderInputRef.current?.click();
    } catch {
      folderInputRef.current?.click();
    } finally {
      setPickingProject(false);
    }
    return "";
  }

  function selectProjectFolder(files: FileList | null) {
    if (!files?.length) return;
    const first = files[0];
    const relative = (first as File & { webkitRelativePath?: string }).webkitRelativePath ?? first.name;
    const folder = relative.split("/")[0] || first.name;
    setProjectFolder(folder);
    window.localStorage.setItem("loop-project-folder", folder);
  }

  async function openVsCode() {
    let path = workspacePath.trim();
    if (!path) path = await pickProjectFolder();
    if (!path) return;
    try {
      const response = await fetch(`${BRIDGE_URL}/open-vscode`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }), signal: AbortSignal.timeout(1200) }).catch(() => null);
      if (response?.ok) return;
      window.location.href = `vscode://file${encodeURI(path.startsWith("/") ? path : `/${path}`)}`;
    } catch {
      window.location.href = `vscode://file${encodeURI(path.startsWith("/") ? path : `/${path}`)}`;
    }
  }

  async function connectVsCode() {
    try {
      const connected = vscodeSession ? { ...vscodeSession, userId: getAuthSession()?.uid || "local-user" } : await createVscodeSession();
      if (!workspacePath.trim()) {
        const selected = await pickProjectFolder();
        if (!selected) return;
      }
      await openVsCode();
      await connectExtension(connected);
      setChallengeStep(2);
      setMessage("VS Code connected. Build locally, commit your changes, then push to GitHub.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect VS Code.");
    }
  }

  function requestSubmissionTest() {
    if (!vscodeSession) {
      void connectVsCode();
      return;
    }
    setChallengeStep(3);
    window.dispatchEvent(new CustomEvent("buildmylogic:test-submission", { detail: { sessionId: vscodeSession.sessionId, challengeId: activeMission?.id } }));
    setMessage("Test request sent to the VS Code integration. The extension will run the challenge checks and report the result.");
  }

  async function copyCommands() {
    const commands = "git add .\ngit commit -m \"Complete challenge\"\ngit push";
    await navigator.clipboard?.writeText(commands);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function startSession() {
    try {
      const connected = await createVscodeSession();
      const startedAt = Date.now();
      window.localStorage.setItem("loop-session-started-at", String(startedAt));
      window.localStorage.setItem("loop-session-duration", String(startRef.current));
      setRunning(true);
      await openVsCode();
      await connectExtension(connected);
      setChallengeStep(2);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start the session.");
      setRunning(false);
    }
  }

  async function finish() {
    if (saving || !activeMission) return;
    setSaving(true);
    setRunning(false);
    try {
      const result = await aiReviewSession({ data: { missionTitle: activeMission.title, note, minutes: elapsed } });
      setReview(result);
      setChallengeStep(4);
      setLoopState((prev) => ({ ...prev, sessions: [{ at: Date.now(), minutes: elapsed, missionTitle: activeMission.title, note, tasks: currentTasks, completedTasks: done, review: result }, ...prev.sessions].slice(0, 40) }));
      logActivity({ kind: "session", text: `Logged a ${elapsed} min session on ${activeMission.title}` });
      recordMissionEvidence(activeMission.id, 2);
      if (done.length) setLoopState((prev) => ({ ...prev, missionProgress: { ...prev.missionProgress, [activeMission.id]: { ...(prev.missionProgress[activeMission.id] ?? { status: "active", completedSteps: [] }), completedSteps: Array.from(new Set([...(prev.missionProgress[activeMission.id]?.completedSteps ?? []), ...done])) } } }));
      setNote("");
      window.localStorage.removeItem("loop-session-started-at");
      window.localStorage.removeItem("loop-session-duration");
    } catch (error) {
      setReview({ feedback: error instanceof Error ? error.message : "Could not review this session.", nextStep: "Try logging the session again.", skillBoost: "—" });
    } finally { setSaving(false); }
  }

  function completeMission() {
    if (!activeMission) return;
    const index = missions.findIndex((m) => m.id === activeMission.id);
    const next = missions[index + 1];
    window.localStorage.removeItem("loop-session-started-at");
    window.localStorage.removeItem("loop-session-duration");
    setLoopState((prev) => ({ ...prev, missionProgress: { ...prev.missionProgress, [activeMission.id]: { ...(prev.missionProgress[activeMission.id] ?? { status: "active", completedSteps: [] }), status: "done", completedSteps: Array.from({ length: activeMission.steps.length }, (_, i) => i) }, ...(next ? { [next.id]: { ...(prev.missionProgress[next.id] ?? { status: "locked", completedSteps: [] }), status: "active" } } : {}) } }));
    recordMissionEvidence(activeMission.id, 5);
    logActivity({ kind: "mission", text: `Completed mission “${activeMission.title}”` });
    setChallengeStep(4);
  }

  return <AppShell crumb="Sessions" title="Your Learning Sessions" subtitle="Stay consistent. Build a better you, one session at a time." quote="Small sessions, big progress." wide>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><button className="btn-base btn-ink">All Sessions</button><button className="btn-base btn-outline">Current</button><button className="btn-base btn-outline">Upcoming</button><button className="btn-base btn-outline">Past</button></div><button type="button" onClick={() => { void startSession(); }} className="btn-base btn-ink"><span className="text-lg leading-none">+</span> Start a New Session</button></div>

    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="card-surface overflow-hidden">
          <div className="border-b border-black/10 px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Code2 className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Current session</p><h2 className="text-lg font-black">{activeMission?.title ?? "Your build"}</h2></div></div><div className="flex items-center gap-2"><span className="pill bg-primary-soft text-black">● {activeMission?.stack ?? "Python"}</span><span className="pill border border-black/10 bg-white text-black"><Github className="h-3.5 w-3.5" /> GitHub</span></div></div></div>
          <div className="grid lg:grid-cols-[180px_minmax(0,1fr)]">
            <nav className="border-b border-black/10 bg-black/[0.02] p-4 lg:border-b-0 lg:border-r"><p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-black/40">Challenge</p><div className="space-y-1">{([{ n: 1, label: "Setup" }, { n: 2, label: "Challenge" }, { n: 3, label: "Submit" }, { n: 4, label: "Results" }] as const).map((item) => { const complete = item.n < challengeStep || (item.n === 4 && !!review); const active = item.n === challengeStep; return <button key={item.n} type="button" onClick={() => setChallengeStep(item.n)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black ${active ? "bg-primary-soft" : "hover:bg-black/5"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] ${complete ? "border-primary bg-primary text-white" : active ? "border-primary" : "border-black/20"}`}>{complete ? <Check className="h-3.5 w-3.5" /> : item.n}</span>{item.label}</button>; })}</div><div className="mt-7 border-t border-black/10 pt-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/40">Your skills</p>{(activeMission?.skills ?? ["Programming", "Problem solving"]).slice(0, 2).map((skill, i) => <div key={skill} className="mt-3"><p className="text-sm font-black">{skill}</p><div className="mt-2 h-1.5 rounded-full bg-black/10"><div className={`h-full rounded-full bg-primary ${i === 0 ? "w-3/4" : "w-1/2"}`} /></div></div>)}</div></nav>

            <div className="min-w-0 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">Your task</p><span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-black text-white">DIFFICULTY {activeMission?.difficulty ?? 1}</span></div><h3 className="mt-2 text-2xl font-black tracking-tight">{activeMission?.title ?? "Build something useful"}</h3></div><div className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-right"><p className="text-[10px] font-black uppercase text-black/40">Time</p><p className="font-mono text-sm font-black">{fmt(seconds)}</p></div></div>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-6">{activeMission?.description ?? "Build a working project from the brief. Do not follow a tutorial."}</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">{(activeMission?.steps ?? []).slice(0, 4).map((step, i) => <div key={step.title} className="rounded-xl border border-black/10 bg-white p-3"><p className="text-[10px] font-black uppercase text-black/40">{i + 1}</p><p className="mt-1 text-sm font-black">{step.title}</p><p className="mt-1 text-xs font-semibold text-black/55">{step.detail}</p></div>)}</div>

              <div className="mt-7 border-t border-black/10 pt-6"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-black">How to submit</h4><span className="text-[10px] font-black uppercase tracking-wider text-black/40">No ZIP required</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-primary-soft px-3 py-1.5">1. Build locally</span><span className="rounded-full bg-primary-soft px-3 py-1.5">2. Commit changes</span><span className="rounded-full bg-primary-soft px-3 py-1.5">3. Push to GitHub</span><span className="rounded-full bg-primary-soft px-3 py-1.5">4. Test submission</span></div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-[#111] text-white"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2"><Terminal className="h-4 w-4" /><span className="text-xs font-black">Git commands</span></div><div className="flex items-center gap-1 rounded-lg bg-white/5 p-1"><button type="button" onClick={() => setSubmissionOS("linux")} className={`rounded-md px-2.5 py-1 text-[10px] font-black ${submissionOS === "linux" ? "bg-white text-black" : "text-white/60"}`}>Linux / macOS</button><button type="button" onClick={() => setSubmissionOS("windows")} className={`rounded-md px-2.5 py-1 text-[10px] font-black ${submissionOS === "windows" ? "bg-white text-black" : "text-white/60"}`}>Windows</button></div></div><div className="px-4 py-4"><pre className="overflow-x-auto font-mono text-xs leading-6 text-white/90">{submissionOS === "linux" ? "$ git add .\n$ git commit -m \"Complete challenge\"\n$ git push" : "PS> git add .\nPS> git commit -m \"Complete challenge\"\nPS> git push"}</pre><button type="button" onClick={() => { void copyCommands(); }} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-black text-white hover:bg-white/10"><Copy className="h-3.5 w-3.5" />{copied ? "Copied" : "Copy commands"}</button></div></div>
                <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={requestSubmissionTest} className="btn-base btn-primary-solid"><Play className="h-4 w-4" /> Test Submission</button><button type="button" onClick={() => { void connectVsCode(); }} className="btn-base btn-outline"><Code2 className="h-4 w-4" />{vscodeSession ? "Reconnect VS Code" : "Connect VS Code"}<ExternalLink className="h-3.5 w-3.5" /></button></div><p className="mt-2 text-[10px] font-bold text-black/45">The browser does not read your source. VS Code + the BuildMyLogic extension will run the real challenge checks.</p></div>
            </div>
          </div>
        </section>

        {message && <p className="rounded-xl border border-black/10 bg-primary-soft px-4 py-3 text-xs font-bold">{message}</p>}

        <section className="card-surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Session progress</h2><p className="mt-1 text-sm font-semibold">Build → test → fix → prove. Every attempt becomes evidence.</p></div><span className="text-xs font-black">{done.length}/{currentTasks.length}</span></div><div className="mt-4 h-2 rounded-full bg-black/10"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, (done.length / currentTasks.length) * 100)}%` }} /></div><div className="mt-4 space-y-2">{currentTasks.map((task, index) => { const checked = done.includes(index); return <button type="button" key={`${task.title}-${index}`} onClick={() => setDone((prev) => checked ? prev.filter((x) => x !== index) : [...prev, index])} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left ${checked ? "border-primary bg-primary-soft" : "border-black/10 bg-white"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${checked ? "border-primary bg-primary text-white" : "border-black/20"}`}>{checked && <Check className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><b className="block text-sm">{task.title}</b><span className="mt-1 block text-xs font-semibold">{task.minutes} minutes</span></span></button>; })}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => { setRunning((value) => !value); if (!running) { window.localStorage.setItem("loop-session-started-at", String(Date.now())); window.localStorage.setItem("loop-session-duration", String(startRef.current)); } }} className="btn-base btn-ink"><Play className="h-4 w-4" />{running ? "Pause session" : "Resume session"}</button><button type="button" onClick={() => { setRunning(false); setSeconds(startRef.current); window.localStorage.removeItem("loop-session-started-at"); window.localStorage.removeItem("loop-session-duration"); }} className="btn-base btn-outline"><RotateCcw className="h-3.5 w-3.5" />Reset</button></div></section>

        {review && <section className="rounded-2xl border-2 border-primary bg-primary-soft p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-black"><Sparkles className="h-4 w-4 text-primary" /> Session review</h2><button type="button" onClick={() => setReview(null)}><XCircle className="h-4 w-4" /></button></div><p className="mt-3 text-sm font-black">{review.feedback}</p><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-black uppercase">Next action</p><p className="mt-1 text-sm font-black">{review.nextStep}</p></div><div className="rounded-xl bg-white p-4"><p className="text-[10px] font-black uppercase">Skill evidence</p><p className="mt-1 text-sm font-black">{review.skillBoost}</p></div></div></section>}

        <section className="card-surface p-5"><h2 className="text-lg font-black">Close the session</h2><p className="mt-1 text-sm font-semibold">Write what you actually built. This becomes part of your evidence history.</p><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="I built the calculator, fixed the division-by-zero bug, and pushed the changes…" className="mt-3 w-full rounded-xl border border-black/15 bg-white p-3 text-sm font-semibold outline-none focus:border-primary" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={finish} disabled={saving || !activeMission} className="btn-base btn-primary-solid"><Timer className="h-4 w-4" />{saving ? "Reviewing…" : `Log ${elapsed} min & get feedback`}</button><button type="button" onClick={completeMission} disabled={!activeMission} className="btn-base btn-outline"><Check className="h-4 w-4" />Complete mission</button></div></section>

        <section className="card-surface overflow-hidden"><div className="flex items-center justify-between px-5 py-4"><h2 className="text-lg font-black">Past Sessions</h2><span className="text-xs font-black">{total} min total</span></div>{state.sessions.length === 0 ? <p className="border-t border-black/10 p-6 text-center text-sm font-bold">No past sessions yet. Your first completed session will appear here.</p> : state.sessions.slice(0, 8).map((item) => { const open = selectedHistory === item.at; return <div key={item.at} className="border-t border-black/10"><button type="button" onClick={() => setSelectedHistory(open ? null : item.at)} className="grid w-full grid-cols-[1fr_1.5fr_.6fr_28px] items-center gap-3 px-5 py-4 text-left hover:bg-primary-soft/40"><span className="text-xs font-black">{new Date(item.at).toLocaleDateString()}</span><span className="truncate text-xs font-black">{item.missionTitle}</span><span className="text-xs font-black">{item.minutes}m</span><ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>{open && <div className="bg-black p-5 text-white"><p className="flex items-center gap-2 text-xs font-black"><CheckCircle2 className="h-4 w-4" /> Completed</p><p className="mt-2 text-sm font-black">{item.note || "No note added."}</p>{item.review && <div className="mt-4 grid gap-3 md:grid-cols-3"><div><p className="text-[10px] font-black uppercase">Feedback</p><p className="mt-1 text-xs font-bold">{item.review.feedback}</p></div><div><p className="text-[10px] font-black uppercase">Next</p><p className="mt-1 text-xs font-bold">{item.review.nextStep}</p></div><div><p className="text-[10px] font-black uppercase">Skill</p><p className="mt-1 text-xs font-bold">{item.review.skillBoost}</p></div></div>}</div>}</div>; })}</section>
        <input ref={folderInputRef} type="file" multiple className="hidden" onChange={(e) => selectProjectFolder(e.target.files)} />
      </div>

      <aside className="space-y-5"><section className="card-surface p-5"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Flame className="h-6 w-6" /></span><div><p className="text-sm font-black">Session Streak</p><p className="display text-2xl font-black">{streak(state.sessions)} days</p></div></div><p className="mt-2 text-xs font-semibold">Consistency compounds.</p></section><section className="card-surface p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-black">{new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><CalendarDays className="h-4 w-4" /></div><MiniCalendar sessions={state.sessions} /></section><section className="card-surface p-5"><h2 className="text-sm font-black">Session Insights</h2><div className="mt-3 rounded-xl bg-primary-soft p-4"><p className="text-sm font-black">{state.sessions.length ? "You are building a real history." : "Your first session starts the history."}</p><p className="mt-2 text-xs font-semibold">Average logged time: {state.sessions.length ? Math.round(total / state.sessions.length) : 0} minutes.</p></div></section><section className="card-surface p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-sm font-black">Tips from Vibe</h2></div><p className="mt-3 text-sm font-semibold">“Consistency beats intensity. Even a small session can move a skill forward.”</p><p className="mt-2 text-xs font-black">— Vibe</p></section><section className="card-surface p-5"><h2 className="text-sm font-black">Project workspace</h2><p className="mt-1 text-sm font-semibold">Choose your local project once. BuildMyLogic opens that exact workspace in VS Code.</p><button type="button" onClick={() => { void pickProjectFolder(); }} disabled={pickingProject} className="btn-base btn-outline mt-3 w-full disabled:cursor-wait disabled:opacity-60">{pickingProject ? "Selecting…" : projectFolder ? `Project: ${projectFolder}` : "Select project folder"}</button><div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2.5"><p className="text-[10px] font-black uppercase tracking-wider text-black/45">Workspace</p><p className="mt-1 break-all text-xs font-bold">{workspacePath || "No project selected"}</p></div><button type="button" onClick={() => { void connectVsCode(); }} className="btn-base btn-ink mt-3 w-full"><Code2 className="h-4 w-4" />{vscodeSession ? "Open & reconnect VS Code" : "Open & connect VS Code"}<ExternalLink className="h-3.5 w-3.5" /></button><p className="mt-2 text-[10px] font-bold">The extension will later stream test status, errors and proof back to this session.</p></section></aside>
    </div>
  </AppShell>;
}

function fmt(total: number) { return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }
function streak(sessions: { at: number }[]) { const days = new Set(sessions.map((s) => new Date(s.at).toDateString())); let cursor = new Date(); let count = 0; while (days.has(cursor.toDateString())) { count += 1; cursor.setDate(cursor.getDate() - 1); } return count; }
function MiniCalendar({ sessions }: { sessions: { at: number }[] }) { const now = new Date(); const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); const leading = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); const active = new Set(sessions.map((s) => new Date(s.at).toDateString())); return <><div className="mt-4 grid grid-cols-7 gap-y-3 text-center text-[10px] font-black">{["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={`${x}-${i}`}>{x}</span>)}{Array.from({ length: leading + days }, (_, i) => { const day = i - leading + 1; if (day < 1) return <span key={i} />; const d = new Date(now.getFullYear(), now.getMonth(), day); const on = active.has(d.toDateString()); return <span key={i} className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-primary text-white" : ""}`}>{day}</span>; })}</div><div className="mt-4 text-[10px] font-black">● Session completed &nbsp; ○ No session</div></>; }
