import { useEffect } from "react";
import type { Settings } from "../../domain/types";
import { saveSettings } from "../../data/db";
import { useUI } from "../../store";
import { claimHydrationReminder } from "./reminders";
export function useHydrationReminders(settings: Settings) {
  const notify = useUI((s) => s.notify);
  useEffect(() => {
    if (!settings.hydrationReminders) return;
    let cancelled = false;
    let inFlight = false;
    let failureReported = false;
    const check = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        if (!settings.hydrationEnabledAt) {
          await saveSettings({ hydrationEnabledAt: Date.now() });
          return;
        }
        const due = await claimHydrationReminder();
        if (!due || cancelled) return;
        const message =
          due.hydrationMessage ||
          "Time for a water break. Drink to your needs.";
        notify(message);
        if (
          due.hydrationNotifications &&
          window.isSecureContext &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            const registration =
              "serviceWorker" in navigator
                ? await navigator.serviceWorker.getRegistration()
                : undefined;
            if (registration?.active)
              await registration.showNotification("FORM · Water break", {
                body: message,
                icon: "/icon-192.png",
                tag: "form-hydration",
              });
            else
              new Notification("FORM · Water break", {
                body: message,
                icon: "/icon-192.png",
                tag: "form-hydration",
              });
          } catch {
            /* The in-app reminder was delivered even when the browser declines a notification. */
          }
        }
      } catch {
        if (!failureReported && !cancelled) {
          failureReported = true;
          notify(
            "Water reminder settings could not be read. Check browser site storage and try enabling reminders again.",
          );
        }
      } finally {
        inFlight = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    void check();
    const timer = setInterval(() => void check(), 15000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    settings.hydrationReminders,
    settings.hydrationEnabledAt,
    settings.hydrationInterval,
    settings.hydrationStart,
    settings.hydrationEnd,
    settings.hydrationNotifications,
    notify,
  ]);
}
