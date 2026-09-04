/**
 * BuildMyLogic — Learner Dashboard
 * 
 * Central hub for the learner's journey: active missions, skill radar,
 * daily build rhythm scheduler (Google Calendar sync), and real-time telemetry.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Lock,
  Rocket,
  Sparkles,
  Terminal,
  TrendingUp,
  Clock,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { setMissionProgress, useLoop } from "@/lib/loop-store";
import { ScheduleModal, ScheduleSyncCard } from "@/components/ScheduleModal";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BuildMyLogic" }] }),
  component: Dashboard,
});

/**
 * Calculates a friendly greeting based on local time
 */
function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const state = useLoop();
  const navigate = useNavigate();
  const plan = state.plan;
  const name = state.profile?.name?.trim() || "Builder";
  const missions = plan?.missions ?? [];
  const current = missions.find((m) => state.missionProgress[m.id]?.status === "active") ?? missions[0];
  const currentIndex = Math.max(0, missions.findIndex((m) => m.id === current?.id));
  const doneCount = missions.filter((m) => state.missionProgress[m.id]?.status === "done").length;
  const currentSteps = current ? (state.missionProgress[current.id]?.completedSteps?.length ?? 0) : 0;
  const currentTotalSteps = current?.steps.length ?? 1;
  const goal = state.profile?.goal || "Build real-world skills";

  // Google Calendar scheduling modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  // Check if learner has booked a Google Calendar reminder recently
  useEffect(() => {
    const calendarPromptDismissed = window.sessionStorage.getItem("bml-calendar-dismissed");
    if (!calendarPromptDismissed && plan) {
      // Show subtle reminder banner to set their learning rhythm
      setShowPromptBanner(true);
    }
  }, [plan]);

  const dismissBanner = () => {
    setShowPromptBanner(false);
    window.sessionStorage.setItem("bml-calendar-dismissed", "1");
  };

  return (
    <AppShell
      crumb="Dashboard"
      title={`${greeting()}, ${name}.`}
      subtitle={plan?.headline ?? "Your next skill is waiting to be proven."}
      quote={plan?.quote}
      wide
    >
      {/* Schedule & Google Calendar Modal */}
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        missionTitle={current?.title}
        missionDescription={current?.description}
      />

      {!plan || !current ? (
        <section className="card-surface p-12 text-center">
          <Rocket className="mx-auto h-9 w-9 text-primary" />
          <h2 className="display mt-4 text-2xl font-bold">Your build path is waiting.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Tell BuildMyLogic what you want to achieve and we'll build the path around it.
          </p>
          <Link to="/" className="btn-base btn-primary-solid mt-6 inline-flex items-center gap-2">
            <span>Start onboarding</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          {/* Daily Build Rhythm Banner (Google Calendar reminder prompt) */}
          {showPromptBanner && (
            <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary-soft/50 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Set your daily learning time</h4>
                  <p className="text-xs text-muted-foreground">
                    Block {state.profile?.startTime || "19:00"} - {state.profile?.endTime || "20:00"} on Google Calendar so you never miss your build streak.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                  className="btn-base btn-primary-solid text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-sm"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Add to Google Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={dismissBanner}
                  className="rounded-xl px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* 6-Stage Pedagogical Loop Progress Tracker */}
          <section className="card-surface overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-6">
              {["Learn", "Build", "Fail", "Understand", "Improve", "Loop"].map((label, i) => (
                <div
                  key={label}
                  className={`border-r border-border px-4 py-4 last:border-r-0 ${
                    i === 0 ? "bg-primary-soft/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold">{label}</span>
                  </div>
                  <p className="mt-1 pl-9 text-[10px] text-muted-foreground">
                    {[
                      "Understand the concept",
                      "Write code",
                      "Face challenges",
                      "Get feedback",
                      "Fix & improve",
                      "Repeat & level up",
                    ][i]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Main Dashboard Grid */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left Column — Current Mission & Skills */}
            <div className="space-y-5 lg:col-span-8">
              {/* Current Active Mission Card */}
              <section className="card-surface p-6">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                    Current Mission
                  </p>
                  <span className="pill bg-primary-soft text-accent-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Recommended for you
                  </span>
                </div>

                <div className="mt-5 flex items-start gap-5">
                  <div className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-2xl bg-muted">
                    <Terminal className="h-8 w-8 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="display text-2xl font-bold">{current.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {current.stack} <span className="mx-1">•</span> Difficulty {current.difficulty}{" "}
                      <span className="mx-1">•</span> ~{current.minutes} mins
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{current.description}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] font-semibold text-muted-foreground">Skills you'll practice</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {current.skills.map((skill) => (
                      <span key={skill} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                  <button
                    type="button"
                    className="group inline-flex items-center gap-1.5 text-xs font-semibold text-accent-foreground hover:text-primary transition-colors"
                    onClick={() => {
                      setMissionProgress(current.id, { status: "active" });
                      void navigate({ to: "/learn" });
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Need to learn something?</span>
                    <span className="font-bold underline">Learn for this mission →</span>
                  </button>
                  <button
                    type="button"
                    className="btn-base btn-ink"
                    onClick={() => {
                      window.localStorage.setItem("loop-auto-start-session", "1");
                      void navigate({ to: "/sessions" });
                    }}
                  >
                    <Terminal className="h-4 w-4" />
                    <span>Start building</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>

              {/* Skills Radar & Recent Activity */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <section className="card-surface p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Your Skills</h3>
                    <Link to="/skills" className="text-xs font-semibold text-accent-foreground hover:underline">
                      View all →
                    </Link>
                  </div>
                  <div className="space-y-3.5">
                    {(plan.skills ?? []).slice(0, 5).map((s) => (
                      <div key={s.name} className="flex items-center gap-3 text-xs">
                        <span className="w-28 truncate font-medium">{s.name}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${s.level}%` }} />
                        </div>
                        <span className="w-8 text-right text-[11px] font-semibold">{s.level}%</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card-surface p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Recent Activity</h3>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  {state.activity.length === 0 ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Finish a session and your real build history will appear here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {state.activity.slice(0, 4).map((a) => (
                        <div key={a.at} className="border-l-2 border-primary pl-3">
                          <p className="text-xs font-medium">{a.text}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {new Date(a.at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* Right Column — Calendar Rhythm & Insights */}
            <aside className="space-y-5 lg:col-span-4">
              {/* Daily Build Rhythm Quick Sync Card */}
              <ScheduleSyncCard onOpenModal={() => setScheduleModalOpen(true)} />

              {/* Learning Flow Progress */}
              <section className="card-surface p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Your Learning Flow</h3>
                  <span className="text-xs font-bold text-primary">
                    {current
                      ? `${Math.min(
                          4,
                          2 + (currentSteps > 0 ? 1 : 0) + (doneCount > 0 ? 1 : 0)
                        )} / 4`
                      : "0 / 4"}
                  </span>
                </div>
                <div className="mt-5 space-y-4">
                  {[
                    ["Onboarding", "Completed"],
                    ["Personalized Path", plan ? "Ready" : "Waiting"],
                    ["Build & Learn", current ? `${currentSteps}/${currentTotalSteps} mission steps` : "Waiting"],
                    ["Prove & Grow", `${doneCount}/${missions.length} missions completed`],
                  ].map(([t, s], i) => (
                    <div key={t} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          i < 2
                            ? "border-ink bg-ink text-white"
                            : i === 2
                            ? "border-primary text-primary"
                            : "border-border"
                        }`}
                      >
                        {i < 2 ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : i === 2 ? (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      <div>
                        <p className="text-xs font-semibold">{t}</p>
                        <p className="text-[11px] text-muted-foreground">{s}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* AI Insight Card */}
              <section className="card-surface p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">BuildMyLogic Insight</h3>
                  <span className="pill bg-primary-soft text-accent-foreground text-[10px]">AI</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Your path is optimized for <strong>{goal}</strong>. Each mission produces verifiable proof that you can architect, test, and ship.
                </p>
              </section>

              {/* Next Upcoming Missions */}
              <section className="card-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Next Missions</h3>
                  <Link to="/missions" className="text-xs font-semibold text-accent-foreground hover:underline">
                    View all →
                  </Link>
                </div>
                {missions.slice(currentIndex + 1, currentIndex + 4).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 border-t border-border py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{m.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.stack} · Difficulty {m.difficulty}
                      </p>
                    </div>
                  </div>
                ))}
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {doneCount} of {missions.length} missions completed
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}
