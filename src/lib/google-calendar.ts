/**
 * BuildMyLogic — Google Calendar & Schedule Synchronization
 * 
 * Provides automated Google Calendar event generation, .ICS export,
 * and Supabase persistence for learner build rhythm reminders.
 */

import { supabase, saveLearningScheduleToSupabase } from "./supabase";
import { getAuthSession } from "./auth";
import { logActivity, setLoopState } from "./loop-store";

export type ScheduleConfig = {
  startTime: string; // "HH:MM" e.g. "19:00"
  endTime: string;   // "HH:MM" e.g. "20:00"
  timezone?: string; // e.g. "Asia/Kolkata" or Intl.DateTimeFormat().resolvedOptions().timeZone
  repeatDaily: boolean;
  reminderMinutes: number;
  missionTitle?: string;
  missionDescription?: string;
};

/**
 * Converts a time string "HH:MM" for today into an ISO string format for Google Calendar (YYYYMMDDTHHmmSS)
 */
function formatDateTimeForGoogle(timeStr: string, addDays = 0): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  now.setDate(now.getDate() + addDays);
  now.setHours(hours || 19, minutes || 0, 0, 0);

  // Return UTC formatted string: YYYYMMDDTHHmmssZ
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const mm = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());

  return `${year}${month}${day}T${hh}${mm}${ss}Z`;
}

/**
 * Builds a direct Google Calendar template creation URL
 * Opens directly in the user's browser with pre-populated recurring event details
 */
export function buildGoogleCalendarUrl(config: ScheduleConfig): string {
  const title = config.missionTitle
    ? `BuildMyLogic: ${config.missionTitle}`
    : `BuildMyLogic — Daily Build Session`;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://buildmylogic.app";
  const sessionUrl = `${baseUrl}/sessions`;

  const details = [
    `🎯 Daily Build & Logic Session on BuildMyLogic`,
    config.missionTitle ? `📌 Current Mission: ${config.missionTitle}` : "",
    config.missionDescription ? `📝 Focus: ${config.missionDescription}` : "",
    ``,
    `🚀 Open your build session: ${sessionUrl}`,
    `⚡ VS Code Extension & Live Coach ready: ${baseUrl}/learn`,
    ``,
    `"Ship the system, then explain the design."`,
  ].filter(Boolean).join("\n");

  const startUtc = formatDateTimeForGoogle(config.startTime, 0);
  const endUtc = formatDateTimeForGoogle(config.endTime, 0);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: details,
    location: "BuildMyLogic Platform (Online)",
    ctz: config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  });

  if (config.repeatDaily) {
    params.set("recur", "RRULE:FREQ=DAILY");
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an RFC-5545 standard .ICS calendar file for universal import (Apple, Outlook, Google)
 */
export function downloadIcsFile(config: ScheduleConfig): void {
  const [startH, startM] = config.startTime.split(":").map(Number);
  const [endH, endM] = config.endTime.split(":").map(Number);
  const tz = config.timezone || "Asia/Kolkata";

  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  const dtStart = `${year}${month}${day}T${pad(startH || 19)}${pad(startM || 0)}00`;
  const dtEnd = `${year}${month}${day}T${pad(endH || 20)}${pad(endM || 0)}00`;
  const uid = `bml-${Date.now()}@buildmylogic.app`;

  const title = config.missionTitle
    ? `BuildMyLogic: ${config.missionTitle}`
    : `BuildMyLogic — Daily Build Session`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BuildMyLogic//Learner Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${year}${month}${day}T000000Z`,
    `DTSTART;TZID=${tz}:${dtStart}`,
    `DTEND;TZID=${tz}:${dtEnd}`,
    config.repeatDaily ? "RRULE:FREQ=DAILY" : "",
    `SUMMARY:${title}`,
    `DESCRIPTION:Build real-world software logic on BuildMyLogic. Daily focus session.`,
    `LOCATION:BuildMyLogic Workspace`,
    "BEGIN:VALARM",
    `TRIGGER:-PT${config.reminderMinutes || 10}M`,
    "ACTION:DISPLAY",
    "DESCRIPTION:BuildMyLogic session starting soon!",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `buildmylogic-schedule.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Saves learner schedule locally and to Supabase cloud
 */
export async function syncSchedule(config: ScheduleConfig): Promise<boolean> {
  // 1. Update local store
  setLoopState((prev) => ({
    ...prev,
    profile: prev.profile
      ? {
          ...prev.profile,
          startTime: config.startTime,
          endTime: config.endTime,
          repeatDaily: config.repeatDaily,
        }
      : prev.profile,
  }));

  // 2. Persist to Supabase if signed in
  const auth = getAuthSession();
  if (auth?.uid && supabase) {
    await saveLearningScheduleToSupabase({
      user_id: auth.uid,
      start_time: config.startTime,
      end_time: config.endTime,
      timezone: config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      repeat_daily: config.repeatDaily,
      calendar_enabled: true,
      reminder_minutes: config.reminderMinutes,
    });
  }

  logActivity({
    kind: "ai",
    text: `Saved build rhythm: ${config.startTime} - ${config.endTime} (${config.repeatDaily ? "Daily" : "One-off"}) with Google Calendar reminder`,
  });

  return true;
}
