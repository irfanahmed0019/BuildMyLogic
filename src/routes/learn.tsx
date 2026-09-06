import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Code2, File, FolderOpen, Paperclip, Send, Sparkles, Terminal, UserRound, X, Plug, Copy, Lightbulb } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { clearLearningChatMessages, logActivity, recordMissionEvidence, recordSkillEvidence, resetLoop, saveLearningChat, selectLearningMission, setMissionProgress, useLoop } from "@/lib/loop-store";
import type { LearningMode, LearningState } from "@/lib/loop-types";
import { aiTeachMicroLesson } from "@/lib/sarvam.functions";
import { C_CURRICULUM_MAP, parseDrillState, type CConceptId } from "@/lib/curriculum-engine";


export const Route = createFileRoute("/learn")({ head: () => ({ meta: [{ title: "Learn — BuildMyLogic" }] }), component: Learn });

const fallbackTopics = [
  ["Problem Solving", "Break the mission into smaller decisions."],
  ["Input & Output", "Move data safely through your program."],
  ["Conditionals", "Make your program react to state."],
  ["Loops", "Repeat work without repeating code."],
  ["Functions", "Turn repeated logic into reusable units."],
  ["Debugging", "Find the actual cause instead of guessing."],
] as const;

type Level = "zero" | "some" | "comfortable";
type Attachment = { name: string; size: number; path?: string; text?: string };
type ChatMessage = { role: "mentor" | "student"; text: string; attachments?: { name: string; size: number }[] };

function renderRichText(text: string, role: ChatMessage["role"]): ReactNode {
  const lines = text.split(/\n/);
  return lines.map((line, lineIndex) => {
    const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
    return (
      <span key={`line-${lineIndex}`} className="learn-rich-line">
        {tokens.map((token, tokenIndex) => {
          if (token.startsWith("**") && token.endsWith("**")) {
            return <strong key={`token-${tokenIndex}`} className="font-black">{token.slice(2, -2)}</strong>;
          }
          if (token.startsWith("`") && token.endsWith("`")) {
            return <code key={`token-${tokenIndex}`} className={`learn-inline-code ${role === "student" ? "is-student" : ""}`}>{token.slice(1, -1)}</code>;
          }
          return <span key={`token-${tokenIndex}`}>{token}</span>;
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

const modeOptions: { id: LearningMode; title: string; detail: string; emoji: string }[] = [
  { id: "practical", title: "Practical-first", detail: "Build first. Learn only the theory you need.", emoji: "🛠️" },
  { id: "balanced", title: "Theory + practice", detail: "A little theory, then use it immediately.", emoji: "⚖️" },
  { id: "theory", title: "Theory-first", detail: "Understand the idea, then practice it.", emoji: "🧠" },
];

const levelOptions: { id: Level; title: string; detail: string; emoji: string }[] = [
  { id: "zero", title: "I know nothing yet", detail: "Start from the beginning.", emoji: "🌱" },
  { id: "some", title: "I know a little", detail: "I have seen it, but need practice.", emoji: "🙂" },
  { id: "comfortable", title: "I'm comfortable", detail: "Skip the easy parts and test me.", emoji: "🚀" },
];

const textLike = /\.(c|h|cpp|cc|cxx|py|js|jsx|ts|tsx|java|go|rs|rb|php|html?|css|scss|json|md|txt|sql|sh|bash|yml|yaml|xml|toml|env)$/i;

function Learn() {
  const state = useLoop();
  const navigate = useNavigate();
  const missions = state.plan?.missions ?? [];
  const selectedMission = missions.find((m) => m.id === state.selectedLearningMissionId);
  const activeMission = missions.find((m) => state.missionProgress[m.id]?.status === "active") ?? missions[0];
  const current = selectedMission ?? activeMission;
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<LearningMode>("balanced");
  const [level, setLevel] = useState<Level | null>(null);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState("");
  const [lessonState, setLessonState] = useState<string>("hello_world");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [readyForProject, setReadyForProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const [vscodeSession, setVscodeSession] = useState<{ sessionId: string; token: string; challengeId: string } | null>(null);
  const [vscodeLoading, setVscodeLoading] = useState(false);
  const [vscodeCopied, setVscodeCopied] = useState<string | null>(null);


  useEffect(() => {
    if (current && !topic) setTopic(current.skills?.[0] ?? fallbackTopics[0][0]);
  }, [current, topic]);

  const missionTopics = useMemo(() => {
    if (!current) return [] as readonly [string, string][];
    return [...new Set([...current.skills, ...fallbackTopics.map((x) => x[0])])]
      .slice(0, 8)
      .map((name) => fallbackTopics.find((x) => x[0] === name) ?? [name, `Learn ${name} only when it helps you build ${current.title}.`] as const);
  }, [current]);

  useEffect(() => {
    if (!topic || !current || started) return;
    const cached = state.learningChats[`v5::${current.id}::${topic}`];
    if (cached) {
      setMode(cached.mode || "balanced");
      setLevel((cached as any).level || "zero");
      setMessages(cached.messages as ChatMessage[]);
      setMemory(cached.memory ?? "");
      setLessonState(cached.lessonState ?? "hello_world");
      if (cached.messages.length) setStarted(true);
    }
  }, [current, state.learningChats, started, topic]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function resizeComposer() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 180;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  useEffect(() => {
    resizeComposer();
  }, [answer]);

  if (!state.plan || !current) {
    return <AppShell crumb="Learn" title="What do you want to learn today?" subtitle="BuildMyLogic learns what you need before you build it." quote="Learn only what helps you build."><section className="card-surface p-10 text-center"><BookOpen className="mx-auto h-9 w-9 text-primary" /><h2 className="display mt-4 text-2xl font-black">Your learning path is waiting.</h2><p className="mx-auto mt-2 max-w-xl text-sm font-semibold">Finish onboarding and BuildMyLogic will connect learning directly to your first mission.</p><Link to="/" className="btn-base btn-primary-solid mt-5">Start onboarding</Link></section></AppShell>;
  }

  const chatKey = `v5::${current.id}::${topic}`;

  async function readAttachment(file: File, relativePath?: string): Promise<Attachment> {
    const base = { name: relativePath || file.name, size: file.size, path: relativePath };
    if (!textLike.test(file.name) || file.size > 40_000) return base;
    try { return { ...base, text: await file.text() }; } catch { return base; }
  }

  async function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).slice(0, 30);
    const read = await Promise.all(incoming.map((file) => readAttachment(file, (file as File & { webkitRelativePath?: string }).webkitRelativePath)));
    setAttachments((prev) => [...prev, ...read].slice(0, 30));
  }

  async function startChat() {
    const effectiveMode = mode || "balanced";
    const effectiveLevel: Level = level || "zero";
    const cached = state.learningChats[chatKey];
    setStarted(true);
    setError(null);
    if (cached?.messages?.length) {
      setMessages(cached.messages as ChatMessage[]);
      setMode(cached.mode || "balanced");
      setLevel((cached as any).level || "zero");
      setMemory(cached.memory ?? "");
      setLessonState(cached.lessonState ?? "hello_world");
      setUnderstood(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }

    // Zero-knowledge users should not be asked to self-diagnose again. Start at
    // the smallest useful artifact. This also prevents stale/advanced mission
    // context from becoming the learner's first step.
    const isC = /(^|[^a-z])(c|cmake)([^a-z]|$)/i.test(`${current.stack} ${topic} ${current.title}`);
    const starter = effectiveLevel === "zero" && isC
      ? "Let's start from zero. We'll make your first tiny C program: **Hello World**.\n\n```c\n#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello World\\n\");\n    return 0;\n}\n```\n\nPut that in `hello.c` and run it. Do you see `Hello World` in the terminal?"
      : isC
        ? "Hey 👋\n\nDo you know C, or should we start from the beginning?"
        : `Hey 👋\n\nHave you used ${topic} before?`;
    const initial: ChatMessage = { role: "mentor", text: starter };
    setMessages([initial]);
    const initialLessonState = isC ? "hello_world" : "assessment";
    setMemory(cached?.memory ?? "");
    setLessonState(initialLessonState);
    saveLearningChat(chatKey, { mode: effectiveMode, level: effectiveLevel, lessonState: initialLessonState, messages: [initial], memory: cached?.memory ?? "", updatedAt: Date.now() } as any);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function sendCurrentMessage() {
    const outgoing = answer.trim();
    if (busy || sendingRef.current || (!outgoing && !attachments.length)) return;
    sendingRef.current = true;
    try {
      await teach(outgoing || "I uploaded my project. Please look at it with me.");
    } finally {
      sendingRef.current = false;
    }
  }

  async function teach(studentAnswer?: string, wantsSimpler = false, forcedLevel = level, forcedTopic = topic, forcedMode = mode) {
    const outgoing = String(studentAnswer ?? answer).trim();
    const effectiveLevel: Level = forcedLevel || level || (state.learningChats[chatKey] as any)?.level || "zero";
    const effectiveMode: LearningMode = forcedMode || mode || state.learningChats[chatKey]?.mode || "balanced";
    if (!current || busy || (!outgoing && !attachments.length && !wantsSimpler)) return;
    setBusy(true);
    setError(null);
    const history = messages.slice(-6);
    const currentMemory = memory || state.learningChats[chatKey]?.memory || "";
    const attachmentContext = attachments.filter((file) => file.text).map((file) => `FILE: ${file.name}\n${file.text}`).join("\n\n").slice(0, 40000);
    try {
      const result = await aiTeachMicroLesson({
        data: {
          topic: forcedTopic,
          missionTitle: current.title,
          missionDescription: current.description,
          level: effectiveLevel === "zero" ? "zero prior knowledge" : effectiveLevel === "some" ? "some prior exposure" : "comfortable with the basics",
          learningMode: effectiveMode,
          history,
          memory: currentMemory,
          studentAnswer,
          wantsSimpler,
          attachmentContext,
          lessonState,
        },
      });
      const next: ChatMessage[] = [
        ...history,
        ...(studentAnswer ? [{ role: "student" as const, text: studentAnswer, attachments: attachments.map(({ name, size }) => ({ name, size })) }] : []),
        { role: "mentor" as const, text: `${result.message}${result.question ? `\n\n${result.question}` : ""}` },
      ];
      setMessages(next);
      const nextMemory = String(result.memory ?? currentMemory).slice(0, 900);
      setMemory(nextMemory);
      setLessonState(result.lessonState ?? lessonState);
      saveLearningChat(chatKey, { mode: effectiveMode, level: effectiveLevel, lessonState: result.lessonState ?? lessonState, messages: next.slice(-60), memory: nextMemory, updatedAt: Date.now() } as any);
      setUnderstood(result.understood);
      setReadyForProject(result.readyForProject);
      setAnswer("");
      setAttachments([]);
      if (result.understood) {
        recordMissionEvidence(current.id, 1);
        recordSkillEvidence(result.nextConcept || topic, `Understood ${result.nextConcept || topic} concept checkpoint`, 4, "checkpoint_answer");
      }
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vibe could not answer right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const finishConcept = () => {
    setMissionProgress(current.id, { status: "active", completedSteps: Array.from(new Set([...(state.missionProgress[current.id]?.completedSteps ?? []), 0])) });
    recordMissionEvidence(current.id, 2);
    recordSkillEvidence(topic, `Understood ${topic} while preparing for “${current.title}”`, 6, "checkpoint_answer");
    logActivity({ kind: "skill", text: `Understood ${topic} while preparing for “${current.title}”` });
    if (readyForProject) void navigate({ to: "/sessions" });
    else void teach("I understand this. What is the next small thing I need to learn?", false);
  };

  if (started) {
    return <AppShell crumb={`Learn › ${topic}`} title={current.title} subtitle="Ask Vibe anything about the part you're building. Your chat is saved automatically." quote={state.plan.quote} wide>
      <div className="mx-auto flex max-w-[980px] flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setStarted(false)} className="btn-base btn-outline"><ArrowLeft className="h-4 w-4" />Change setup</button>
            <button type="button" onClick={() => { if (window.confirm("Reset your build path and start fresh onboarding with simple beginner projects?")) { resetLoop(); void navigate({ to: "/" }); } }} className="btn-base btn-outline text-xs text-muted-foreground hover:text-destructive">Reset project path</button>
          </div>
          <div className="flex items-center gap-2"><span className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-bold">{modeOptions.find((x) => x.id === mode)?.emoji} {modeOptions.find((x) => x.id === mode)?.title}</span><span className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-bold">Saved</span></div>
        </div>

        <section className="learn-chat-shell">
          <div className="learn-chat-header"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-black">Vibe</p><p className="text-[11px] font-medium text-muted-foreground">Learning with you · {current.title}</p></div><div className="ml-auto flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">BUILDMYLOGIC MEMORY ACTIVE</span><button type="button" onClick={() => { clearLearningChatMessages(chatKey); setMessages([]); setMemory(""); setLessonState("hello_world"); setError(null); setUnderstood(false); setReadyForProject(false); setStarted(false); }} className="learn-clear-chat">Clear & reset chat</button></div></div>
          {(() => {
            const { conceptId, drillIndex } = parseDrillState(lessonState);
            const step = C_CURRICULUM_MAP[conceptId];
            if (!step) return null;
            return (
              <div className="flex flex-wrap items-center justify-between border-b border-black/10 bg-black/[0.02] px-5 py-2 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-black text-white">
                    Step {step.stepNumber} / 14
                  </span>
                  <span className="font-bold">{step.title}</span>
                  {drillIndex !== undefined ? (
                    <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-black">
                      Practice {drillIndex + 1} / 3 · No Hints
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-black/10">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(step.stepNumber / 14) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {Math.round((step.stepNumber / 14) * 100)}%
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="learn-chat-messages">
            {messages.map((message, i) => <div key={`${message.role}-${i}`} className={`learn-message-row ${message.role === "student" ? "is-student" : "is-mentor"}`}>
              {message.role === "mentor" ? <span className="learn-avatar mentor"><Sparkles className="h-4 w-4" /></span> : null}
              <div className={`learn-message ${message.role === "student" ? "student" : "mentor"}`}>
                <div className={`learn-rich-text ${message.role === "student" ? "is-student" : "is-mentor"}`}>{renderRichText(message.text, message.role)}</div>
                {message.attachments?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.attachments.map((file) => <span key={file.name} className="learn-attachment"><File className="h-3.5 w-3.5" />{file.name}</span>)}</div> : null}
              </div>
              {message.role === "student" ? <span className="learn-avatar student"><UserRound className="h-4 w-4" /></span> : null}
            </div>)}
            {busy && <div className="learn-message-row is-mentor"><span className="learn-avatar mentor"><Sparkles className="h-4 w-4" /></span><div className="learn-message mentor"><span className="learn-dots"><i /><i /><i /></span></div></div>}
            <div ref={messagesEndRef} className="h-px" />
          </div>

          {error && <div className="mx-5 mb-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold">⚠ {error}</div>}
          {attachments.length > 0 && <div className="mx-5 mb-2 flex flex-wrap gap-2">{attachments.map((file, i) => <span key={`${file.name}-${i}`} className="learn-attachment removable"><File className="h-3.5 w-3.5" />{file.name}<button type="button" onClick={() => setAttachments((prev) => prev.filter((_, index) => index !== i))} aria-label={`Remove ${file.name}`}><X className="h-3 w-3" /></button></span>)}</div>}
          <div className="learn-composer-wrap">
            <form
              className="learn-composer"
              onSubmit={(e) => {
                e.preventDefault();
                if (busy || (!answer.trim() && !attachments.length)) return;
                void sendCurrentMessage();
              }}
            >
              <button type="button" onClick={() => fileInputRef.current?.click()} className="learn-composer-icon" aria-label="Attach files or a folder"><Paperclip className="h-5 w-5" /></button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.currentTarget.value = ""; }} />
              <input type="file" multiple className="hidden" id="bml-folder-upload" {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.currentTarget.value = ""; }} />
              <label htmlFor="bml-folder-upload" className="learn-composer-icon cursor-pointer" aria-label="Upload a folder"><FolderOpen className="h-5 w-5" /></label>
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => { setAnswer(e.target.value); resizeComposer(); }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  void sendCurrentMessage();
                }}
                onFocus={resizeComposer}
                placeholder="Ask Vibe anything…"
                rows={1}
                className="learn-composer-input"
                disabled={busy}
                aria-label="Message Vibe"
              />
              <button
                type="submit"
                disabled={busy || (!answer.trim() && !attachments.length)}
                className="learn-send"
                aria-label="Send message"
                title={busy ? "Sending…" : "Send message"}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Enter to send · Shift + Enter for a new line · attach files or a whole folder</p>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void teach("💡 Give me a hint for this step", false)}
              className="btn-base btn-outline text-xs"
            >
              <Lightbulb className="h-3.5 w-3.5" /> Give me a hint
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void teach("I don't know yet. Please explain with an easy example.", true)}
              className="btn-base btn-outline text-xs text-muted-foreground"
            >
              🤷 I don't know
            </button>
          </div>
          <div className="flex items-center gap-2">
            {understood && <button type="button" disabled={busy} onClick={finishConcept} className="btn-base btn-ink"><Check className="h-4 w-4" />I get it — next</button>}
            {readyForProject ? (
              <button type="button" onClick={() => void navigate({ to: "/sessions" })} className="btn-base btn-primary-solid text-xs font-bold"><Code2 className="h-4 w-4" />Ready to build in VS Code →</button>
            ) : (
              <button type="button" onClick={() => void navigate({ to: "/sessions" })} className="ml-auto text-xs font-bold text-muted-foreground hover:text-foreground">Go build →</button>
            )}
          </div>
        </div>
      </div>

    </AppShell>;
  }

  return <AppShell crumb="Learn" title="Before we teach, choose what you're building. 👋" subtitle="Pick the real project part you want to work on. Then Vibe will meet you at your level." quote="Don't collect lessons. Build evidence." wide>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="card-surface p-7">
        <div className="rounded-2xl bg-black p-5 text-white"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-black"><Terminal className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-white/55">Current project</p><h2 className="mt-1 text-xl font-black">{state.plan.projectTitle}</h2><p className="mt-2 text-xs font-semibold leading-5 text-white/70">{state.plan.projectPitch}</p></div><span className="rounded-full border border-white/25 px-3 py-1 text-[10px] font-black">✓ Selected</span></div></div>
        <div className="mt-7"><p className="text-xs font-black uppercase tracking-widest text-muted-foreground">1 · Project part</p><h2 className="display mt-2 text-3xl font-black">What are you working on right now?</h2><p className="mt-2 text-sm font-semibold">BuildMyLogic remembers each conversation separately. Switching missions won't erase your previous learning.</p></div>
        <div className="mt-5 grid gap-2.5">{missions.map((mission, index) => { const isSelected = mission.id === current.id; const status = state.missionProgress[mission.id]?.status ?? (index === 0 ? "active" : "locked"); return <button key={mission.id} type="button" onClick={() => { selectLearningMission(mission.id); setTopic(mission.skills?.[0] ?? fallbackTopics[0][0]); setMessages([]); setStarted(false); setUnderstood(false); setReadyForProject(false); }} className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${isSelected ? "border-black bg-primary-soft" : "border-black/10 hover:border-black"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSelected ? "bg-black text-white" : "bg-muted"}`}>{status === "done" ? "✓" : index + 1}</span><span className="min-w-0 flex-1"><b className="block text-sm">{mission.title}</b><span className="mt-1 block text-xs font-semibold text-muted-foreground">{mission.stack} · {mission.description}</span></span>{isSelected && <Check className="h-5 w-5" />}</button>; })}</div>
        <div className="mt-8"><p className="text-xs font-black uppercase tracking-widest text-muted-foreground">2 · Learning style</p><h2 className="display mt-2 text-3xl font-black">How should Vibe teach you?</h2></div>
        <div className="mt-5 grid gap-2.5">{modeOptions.map((option) => <button key={option.id} type="button" onClick={() => setMode(option.id)} className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left ${mode === option.id ? "border-black bg-primary-soft" : "border-black/10 hover:border-black"}`}><span className="text-xl">{option.emoji}</span><span className="flex-1"><b className="block text-sm">{option.title}</b><span className="mt-1 block text-xs font-semibold text-muted-foreground">{option.detail}</span></span>{mode === option.id && <Check className="h-5 w-5" />}</button>)}</div>
        <div className="mt-8"><p className="text-xs font-black uppercase tracking-widest text-muted-foreground">3 · Starting point</p><h2 className="display mt-2 text-3xl font-black">Do you know this already?</h2></div>
        <div className="mt-5 grid gap-2.5">{levelOptions.map((option) => <button key={option.id} type="button" onClick={() => setLevel(option.id)} className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left ${level === option.id ? "border-black bg-primary-soft" : "border-black/10 hover:border-black"}`}><span className="text-xl">{option.emoji}</span><span className="flex-1"><b className="block text-sm">{option.title}</b><span className="mt-1 block text-xs font-semibold text-muted-foreground">{option.detail}</span></span>{level === option.id && <Check className="h-5 w-5" />}</button>)}</div>
        <button type="button" disabled={!level || busy} onClick={() => void startChat()} className="btn-base btn-primary-solid mt-6 disabled:opacity-50">{state.learningChats[chatKey]?.messages?.length ? "Continue where I left off" : "Start with Vibe"}<ArrowRight className="h-4 w-4" /></button>
      </section>
      <aside className="space-y-4">
        <section className="card-surface p-5">
          <p className="text-xs font-black uppercase tracking-widest">Vibe's rule</p>
          <h2 className="mt-2 text-xl font-black">Simple first. Build next.</h2>
          <p className="mt-3 text-sm font-semibold leading-6">Vibe starts with a basic question, listens to your answer, then teaches only the next thing you need.</p>
        </section>

        {/* VS Code Extension Connect Panel */}
        <section className="card-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Plug className="h-4 w-4" />
            <h2 className="text-sm font-black">Connect VS Code</h2>
            {vscodeSession && <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-700">● ACTIVE</span>}
          </div>
          {!vscodeSession ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground mb-3">Write code in VS Code. BuildMyLogic watches and helps automatically.</p>
              <button
                type="button"
                disabled={vscodeLoading}
                onClick={async () => {
                  setVscodeLoading(true);
                  try {
                    const res = await fetch("/api/vscode/sessions", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ challenge_id: current?.id || "learn", user_id: state.plan?.projectTitle || "learner" }),
                    });
                    const data = await res.json() as { session_id?: string; token?: string; challenge_id?: string };
                    if (data.session_id && data.token) {
                      setVscodeSession({ sessionId: data.session_id, token: data.token, challengeId: data.challenge_id || current?.id || "learn" });
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setVscodeLoading(false);
                  }
                }}
                className="btn-base btn-ink w-full text-xs"
              >
                {vscodeLoading ? "Connecting…" : "Generate pairing token"}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-black text-green-700">✅ Session ready! Follow steps below in VS Code:</p>

              {/* Step 1 */}
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Step 1 · Set server URL</p>
                <p className="text-xs font-semibold mb-1.5">Open VS Code → Settings → search <code className="bg-gray-100 px-1 rounded">buildmylogic</code> → set Server URL to:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-gray-100 px-2 py-1 text-[11px] font-mono break-all">http://localhost:8080</code>
                  <button type="button" onClick={() => { void navigator.clipboard.writeText("http://localhost:8080"); setVscodeCopied("url"); setTimeout(() => setVscodeCopied(null), 1500); }} className="shrink-0 rounded p-1 hover:bg-gray-100">
                    {vscodeCopied === "url" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Step 2 · Session ID</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-gray-100 px-2 py-1 text-[11px] font-mono break-all">{vscodeSession.sessionId}</code>
                  <button type="button" onClick={() => { void navigator.clipboard.writeText(vscodeSession.sessionId); setVscodeCopied("sid"); setTimeout(() => setVscodeCopied(null), 1500); }} className="shrink-0 rounded p-1 hover:bg-gray-100">
                    {vscodeCopied === "sid" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Step 3 · Token (secret)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-gray-100 px-2 py-1 text-[11px] font-mono break-all">{vscodeSession.token}</code>
                  <button type="button" onClick={() => { void navigator.clipboard.writeText(vscodeSession.token); setVscodeCopied("tok"); setTimeout(() => setVscodeCopied(null), 1500); }} className="shrink-0 rounded p-1 hover:bg-gray-100">
                    {vscodeCopied === "tok" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-black/10 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Step 4 · Start session in VS Code</p>
                <p className="text-xs font-semibold">Press <kbd className="rounded bg-gray-200 px-1 text-[10px]">Ctrl+Shift+P</kbd> → type <strong>BuildMyLogic: Start Session</strong> → paste the Session ID and Token above.</p>
              </div>

              <button type="button" onClick={() => setVscodeSession(null)} className="w-full text-center text-[10px] font-bold text-muted-foreground hover:text-destructive">
                Reset pairing
              </button>
            </div>
          )}
        </section>

        <section className="card-surface p-5">
          <h2 className="text-sm font-black">What can you bring?</h2>
          <div className="mt-3 space-y-2 text-xs font-semibold">
            <p>📄 Files — code, notes, docs</p>
            <p>📁 Folders — upload a whole project</p>
            <p>💬 Chat — ask questions in plain English</p>
            <p>🗣️ Manglish ok! Type freely.</p>
          </div>
        </section>
        <section className="card-surface p-5">
          <h2 className="text-sm font-black">Mission skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">{current.skills.map((skill) => <span key={skill} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-black">{skill}</span>)}</div>
        </section>
      </aside>
    </div>
  </AppShell>;
}

