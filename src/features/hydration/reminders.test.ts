import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db, defaults, repository } from "../../data/db";
import { hydrationDue, claimHydrationReminder } from "./reminders";
import { localDate } from "../../domain/engine";
const now = new Date(2026, 10, 2, 12, 0);
const settings = {
  ...defaults,
  hydrationReminders: true,
  hydrationEnabledAt: now.getTime() - 61 * 60000,
};
beforeEach(async () => repository.clear());
describe("water reminders respect user choices", () => {
  it("waits for the interval, honors the time window and stops at the target", () => {
    expect(hydrationDue(settings, now, 250)).toBe(true);
    expect(
      hydrationDue({ ...settings, hydrationReminders: false }, now, 250),
    ).toBe(false);
    expect(
      hydrationDue(
        { ...settings, hydrationEnabledAt: now.getTime() - 30 * 60000 },
        now,
        250,
      ),
    ).toBe(false);
    expect(hydrationDue(settings, new Date(2026, 10, 2, 22, 0), 250)).toBe(
      false,
    );
    expect(hydrationDue(settings, now, settings.hydration)).toBe(false);
  });
  it("supports an overnight window without prompting during quiet hours", () => {
    const overnight = {
      ...settings,
      hydrationStart: "22:00",
      hydrationEnd: "06:00",
    };
    expect(hydrationDue(overnight, new Date(2026, 10, 2, 23, 0), 0)).toBe(true);
    expect(hydrationDue(overnight, new Date(2026, 10, 3, 12, 0), 0)).toBe(
      false,
    );
  });
  it("claims only one reminder across simultaneous tabs", async () => {
    await db.settings.put(settings);
    const claims = await Promise.all([
      claimHydrationReminder(now),
      claimHydrationReminder(now),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(
      (await db.settings.get("preferences"))?.hydrationLastReminderAt,
    ).toBe(now.getTime());
  });
  it("does not prompt after logged water reaches the personal target", async () => {
    await db.settings.put(settings);
    await db.water.put({
      id: "target",
      date: localDate(now),
      ml: settings.hydration,
    });
    expect(await claimHydrationReminder(now)).toBeNull();
  });
});
