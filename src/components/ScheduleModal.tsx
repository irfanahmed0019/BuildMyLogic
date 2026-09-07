import { useState, useEffect } from "react";
import { Calendar, Clock, Check, Bell, ExternalLink, Download, Sparkles, X, ChevronRight } from "lucide-react";
import { buildGoogleCalendarUrl, downloadIcsFile, syncSchedule, type ScheduleConfig } from "@/lib/google-calendar";
import { useLoop } from "@/lib/loop-store";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionTitle?: string;
  missionDescription?: string;
}

export function ScheduleModal({ isOpen, onClose, missionTitle, missionDescription }: ScheduleModalProps) {
  const state = useLoop();
  const profile = state.profile;
  const plan = state.plan;

  const currentMissionTitle = missionTitle || plan?.missions?.[0]?.title || "Daily Build";
  const currentMissionDesc = missionDescription || plan?.missions?.[0]?.description || "";

  const [startTime, setStartTime] = useState(profile?.startTime || "19:00");
  const [endTime, setEndTime] = useState(profile?.endTime || "20:00");
  const [repeatDaily, setRepeatDaily] = useState(profile?.repeatDaily ?? true);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [saved, setSaved] = useState(false);
  const [syncedCloud, setSyncedCloud] = useState(false);

  useEffect(() => {
    if (profile?.startTime) setStartTime(profile.startTime);
    if (profile?.endTime) setEndTime(profile.endTime);
  }, [profile]);

  if (!isOpen) return null;

  const scheduleConfig: ScheduleConfig = {
    startTime,
    endTime,
    repeatDaily,
    reminderMinutes,
    missionTitle: currentMissionTitle,
    missionDescription: currentMissionDesc,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  };

  const handleSaveAndSync = async () => {
    setSaved(true);
    await syncSchedule(scheduleConfig);
    setSyncedCloud(true);
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  const handleOpenGoogleCalendar = async () => {
    await syncSchedule(scheduleConfig);
    const url = buildGoogleCalendarUrl(scheduleConfig);
    window.open(url, "_blank", "noopener,noreferrer");
    setSaved(true);
  };

  const handleDownloadIcs = () => {
    downloadIcsFile(scheduleConfig);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="display text-xl font-extrabold tracking-tight">Set Your Build Time</h3>
            <p className="text-xs text-muted-foreground">Book your daily slot & sync reminders to Google Calendar</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {/* Mission preview badge */}
          {currentMissionTitle && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <span className="font-semibold text-foreground">Current Focus:</span>{" "}
              <span className="text-primary font-bold">{currentMissionTitle}</span>
              {currentMissionDesc && <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{currentMissionDesc}</p>}
            </div>
          )}

          {/* Time Picker Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Recurrence and Reminder Settings */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Recurrence</label>
              <button
                type="button"
                onClick={() => setRepeatDaily((r) => !r)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  repeatDaily ? "border-primary bg-primary-soft text-accent-foreground" : "border-border bg-background text-muted-foreground"
                }`}
              >
                {repeatDaily ? "🔁 Repeats Daily" : "📌 One-off Session"}
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Reminder Alert
              </label>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold outline-none focus:border-primary"
              >
                <option value={5}>5 mins before</option>
                <option value={10}>10 mins before</option>
                <option value={15}>15 mins before</option>
                <option value={30}>30 mins before</option>
                <option value={60}>1 hour before</option>
              </select>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-3 space-y-2.5">
            <button
              type="button"
              onClick={handleOpenGoogleCalendar}
              className="btn-base btn-primary-solid w-full flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-md hover:brightness-105"
            >
              <Calendar className="h-4 w-4" />
              <span>Add to Google Calendar & Reminder</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveAndSync}
                className="btn-base btn-outline flex items-center justify-center gap-2 text-xs font-bold"
              >
                {saved ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                {saved ? "Rhythm Saved!" : "Save Schedule"}
              </button>

              <button
                type="button"
                onClick={handleDownloadIcs}
                className="btn-base btn-outline flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                title="Download .ICS for Apple Calendar, Outlook or iCal"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .ICS</span>
              </button>
            </div>
          </div>

          {syncedCloud && (
            <p className="text-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Synced with your Supabase cloud profile & learning schedule.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Dashboard Card for Quick Google Calendar Sync
 */
export function ScheduleSyncCard({ onOpenModal }: { onOpenModal: () => void }) {
  const state = useLoop();
  const profile = state.profile;
  const startTime = profile?.startTime || "19:00";
  const endTime = profile?.endTime || "20:00";

  return (
    <div className="card-surface p-5 border border-primary/20 bg-gradient-to-br from-primary-soft/40 via-surface to-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Daily Build Rhythm</h3>
            <p className="text-xs text-muted-foreground">
              {startTime} – {endTime} {profile?.repeatDaily !== false ? "(Daily)" : "(Custom)"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="rounded-xl border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-bold text-accent-foreground hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1.5"
        >
          <span>Sync Calendar</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
