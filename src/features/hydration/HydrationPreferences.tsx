import { useState } from "react";
import type { Settings } from "../../domain/types";
import { saveSettings } from "../../data/db";
import { saveErrorMessage } from "../../data/errors";
import { minutes } from "./reminders";
export default function HydrationPreferences({
  settings,
  onSaved,
}: {
  settings: Settings;
  onSaved?: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="hydration-preferences"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const form = new FormData(e.currentTarget);
        const start = String(form.get("start")),
          end = String(form.get("end"));
        if (minutes(start) === null || minutes(end) === null || start === end) {
          setError("Choose different valid start and end times.");
          return;
        }
        const target = Number(form.get("target")),
          interval = Number(form.get("interval"));
        if (
          !Number.isFinite(target) ||
          target < 250 ||
          target > 6000 ||
          interval < 30 ||
          interval > 180
        ) {
          setError("Check the water target and reminder interval.");
          return;
        }
        const enabled = form.get("enabled") === "on";
        setBusy(true);
        try {
          await saveSettings({
            hydration: target,
            hydrationReminders: enabled,
            hydrationInterval: interval,
            hydrationStart: start,
            hydrationEnd: end,
            hydrationMessage:
              String(form.get("message")).trim() ||
              "Time for a water break. Drink to your needs.",
            ...(enabled && !settings.hydrationReminders
              ? { hydrationEnabledAt: Date.now(), hydrationLastReminderAt: 0 }
              : {}),
          });
          onSaved?.();
        } catch (err) {
          setError(saveErrorMessage(err, "water preferences"));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        My daily water target (ml)
        <input
          name="target"
          type="number"
          required
          min="250"
          max="6000"
          step="1"
          defaultValue={settings.hydration}
        />
      </label>
      <label className="check">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={settings.hydrationReminders}
        />
        Remind me to drink water
      </label>
      <div className="form-grid">
        <label>
          Remind me every
          <select
            name="interval"
            defaultValue={settings.hydrationInterval ?? 60}
          >
            {[30, 60, 90, 120, 180].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </label>
        <label>
          Start time
          <input
            name="start"
            type="time"
            required
            defaultValue={settings.hydrationStart ?? "09:00"}
          />
        </label>
        <label>
          End time
          <input
            name="end"
            type="time"
            required
            defaultValue={settings.hydrationEnd ?? "21:00"}
          />
        </label>
      </div>
      <label>
        Reminder message
        <input
          name="message"
          maxLength={200}
          defaultValue={
            settings.hydrationMessage ||
            "Time for a water break. Drink to your needs."
          }
        />
      </label>
      <p className="hint">
        Gentle prompts while this app is open. They stop when your logged water
        reaches your target. Closed-app or background alarms cannot be
        guaranteed. A target is personal—not a requirement to keep drinking.
        Follow any medical fluid limits.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={!!settings.hydrationNotifications}
          disabled={busy}
          onChange={async (e) => {
            const enabled = e.target.checked;
            if (!enabled) {
              await saveSettings({ hydrationNotifications: false });
              return;
            }
            if (!window.isSecureContext || !("Notification" in window)) {
              setError(
                "Browser notifications need HTTPS or localhost on the same device. In-app water reminders still work on a local-IP address.",
              );
              return;
            }
            setBusy(true);
            try {
              const permission = await Notification.requestPermission();
              if (permission === "granted")
                await saveSettings({ hydrationNotifications: true });
              else
                setError(
                  "Notification permission was not granted. In-app prompts still work.",
                );
            } catch {
              setError(
                "This browser could not enable notifications. In-app prompts still work.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
        Also show browser notifications where supported
      </label>
      {error && (
        <p role="alert" className="danger">
          {error}
        </p>
      )}
      <button className="button" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save water preferences"}
      </button>
    </form>
  );
}
