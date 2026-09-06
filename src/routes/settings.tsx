import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Trash2, Calendar, Download, ExternalLink, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { logActivity, resetLoop, setLoopState, useLoop } from "@/lib/loop-store";
import type { TechItem } from "@/lib/loop-types";
import { buildGoogleCalendarUrl, downloadIcsFile, syncSchedule } from "@/lib/google-calendar";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BuildMyLogic" },
      {
        name: "description",
        content: "Update your name, daily build window, goal and known technologies so BuildMyLogic plans around you.",
      },
      { property: "og:title", content: "Settings — BuildMyLogic" },
      { property: "og:description", content: "Your name, build window, goal and tech stack in one place." },
    ],
  }),
  component: Settings,
});

const LEVELS: TechItem["level"][] = ["beginner", "intermediate", "advanced"];

function Settings() {
  const state = useLoop();
  const navigate = useNavigate();
  const profile = state.profile;

  const [name, setName] = useState(profile?.name ?? "");
  const [goal, setGoal] = useState(profile?.goal ?? "");
  const [goalDetail, setGoalDetail] = useState(profile?.goalDetail ?? "");
  const [startTime, setStartTime] = useState(profile?.startTime ?? "19:00");
  const [endTime, setEndTime] = useState(profile?.endTime ?? "20:00");
  const [repeatDaily, setRepeatDaily] = useState(profile?.repeatDaily ?? true);
  const [tech, setTech] = useState<TechItem[]>(profile?.technologies ?? []);
  const [newTech, setNewTech] = useState("");
  const [saved, setSaved] = useState(false);

  function save() {
    setLoopState((prev) =>
      prev.profile
        ? {
            ...prev,
            profile: {
              ...prev.profile,
              name,
              goal,
              goalDetail,
              startTime,
              endTime,
              repeatDaily,
              technologies: tech,
            },
          }
        : prev,
    );
    logActivity({ kind: "ai", text: "Updated your builder settings" });
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  }

  const field =
    "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13.5px] outline-none placeholder:text-muted-foreground focus:border-primary";

  return (
    <AppShell
      crumb="Settings"
      title="Settings"
      subtitle="Change how BuildMyLogic plans your missions, skills and daily sessions."
      quote="Small settings, sharper plan."
    >
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section className="card-surface p-6">
            <h3 className="text-sm font-bold">Your profile</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  What you are building towards
                </label>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Land a backend internship"
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Why it matters
                </label>
                <textarea
                  value={goalDetail}
                  onChange={(e) => setGoalDetail(e.target.value)}
                  rows={3}
                  className={field}
                />
              </div>
            </div>
          </section>

          <section className="card-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Daily build window</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your sessions and reminders are sized to fit this rhythm.
                </p>
              </div>
              <span className="pill bg-primary-soft text-accent-foreground text-[11px] font-bold">
                <Calendar className="h-3 w-3 inline mr-1" /> Google Calendar
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={field}
                />
              </div>
              <button
                type="button"
                onClick={() => setRepeatDaily((r) => !r)}
                className={`btn-base ${repeatDaily ? "btn-primary-solid" : "btn-outline"}`}
              >
                {repeatDaily ? "Repeats daily" : "One-off"}
              </button>
            </div>

            {/* Google Calendar Quick Sync Actions */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Sync this slot directly to your calendar with alerts
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = buildGoogleCalendarUrl({
                      startTime,
                      endTime,
                      repeatDaily,
                      reminderMinutes: 15,
                      missionTitle: state.plan?.missions?.[0]?.title || "Daily Build",
                    });
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="btn-base btn-primary-solid text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Sync Google Calendar</span>
                  <ExternalLink className="h-3 w-3 opacity-75" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    downloadIcsFile({
                      startTime,
                      endTime,
                      repeatDaily,
                      reminderMinutes: 15,
                      missionTitle: state.plan?.missions?.[0]?.title || "Daily Build",
                    });
                  }}
                  className="btn-base btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Download .ICS file"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>.ICS</span>
                </button>
              </div>
            </div>
          </section>

          <section className="card-surface p-6">
            <h3 className="text-sm font-bold">Technologies you know</h3>
            <div className="mt-4 space-y-2.5">
              {tech.map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5"
                >
                  <span className="text-[13.5px] font-medium">{t.name}</span>
                  <div className="flex items-center gap-1.5">
                    {LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() =>
                          setTech((prev) => prev.map((x, xi) => (xi === i ? { ...x, level } : x)))
                        }
                        className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold capitalize transition-colors ${
                          t.level === level
                            ? "bg-primary-soft text-accent-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTech((prev) => prev.filter((_, xi) => xi !== i))}
                      aria-label={`Remove ${t.name}`}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {tech.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing added yet.</p>
              )}
            </div>
            <div className="mt-4 flex gap-2.5">
              <input
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                placeholder="Add a technology"
                className={field}
              />
              <button
                type="button"
                onClick={() => {
                  const value = newTech.trim();
                  if (!value) return;
                  setTech((prev) => [...prev, { name: value, level: "beginner" }]);
                  setNewTech("");
                }}
                className="btn-base btn-outline shrink-0"
              >
                Add
              </button>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} className="btn-base btn-primary-solid">
              <Save className="h-4 w-4" />
              Save changes
            </button>
            {saved && <span className="text-xs font-semibold text-accent-foreground">Saved.</span>}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <section className="card-surface p-5">
            <h3 className="text-sm font-bold">Your current plan</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {state.plan?.projectTitle ?? "No plan generated yet."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted p-3">
                <p className="display text-xl font-extrabold">{state.plan?.missions.length ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Missions</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="display text-xl font-extrabold">{state.sessions.length}</p>
                <p className="text-[11px] text-muted-foreground">Sessions logged</p>
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h3 className="text-sm font-bold">Start over</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              This clears your resume, plan, missions and session history, and takes you back to the
              introduction.
            </p>
            <button
              type="button"
              onClick={() => {
                resetLoop();
                void navigate({ to: "/" });
              }}
              className="btn-base btn-outline mt-4 w-full text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset everything
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
