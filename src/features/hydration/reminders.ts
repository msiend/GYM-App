import type { Settings } from "../../domain/types";
import { db, defaults } from "../../data/db";
import { localDate } from "../../domain/engine";
export function minutes(time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function hydrationDue(settings: Settings, now: Date, totalMl: number) {
  if (!settings.hydrationReminders || totalMl >= settings.hydration)
    return false;
  const interval = settings.hydrationInterval ?? 60;
  if (interval < 30 || interval > 180) return false;
  const start = minutes(settings.hydrationStart ?? "09:00"),
    end = minutes(settings.hydrationEnd ?? "21:00");
  if (start === null || end === null || start === end) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const inWindow =
    start < end
      ? current >= start && current < end
      : current >= start || current < end;
  if (!inWindow) return false;
  const last = Math.max(
    settings.hydrationEnabledAt || 0,
    settings.hydrationLastReminderAt || 0,
  );
  return last > 0 && now.getTime() - last >= interval * 60000;
}
/** Claim reminders transactionally to avoid simultaneous prompts in several tabs. */
export async function claimHydrationReminder(now = new Date()) {
  return db.transaction("rw", [db.settings, db.water], async () => {
    const settings = { ...defaults, ...(await db.settings.get("preferences")) };
    const logs = await db.water.where("date").equals(localDate(now)).toArray();
    const total = logs.reduce((sum, l) => sum + l.ml, 0);
    if (!hydrationDue(settings, now, total)) return null;
    await db.settings.put({
      ...settings,
      hydrationLastReminderAt: now.getTime(),
    });
    return settings;
  });
}
