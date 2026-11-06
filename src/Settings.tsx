import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bell,
  Check,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { InstallSection } from "./features/install/InstallApp";
import { appVersion } from "./version";
import HydrationPreferences from "./features/hydration/HydrationPreferences";
import { db, repository, saveSettings } from "./data/db";
import type { Profile, Settings as Preferences } from "./domain/types";
import { Heading, Modal } from "./components/ui";
import { importBackup } from "./data/backup";
import { useUI } from "./store";
import { days } from "./domain/calendar";
import { displayHeight } from "./domain/height";
const policies: Record<string, string> = {
  "Privacy policy":
    "Your profile, health screening, workout sets, food records, preferences and measurements are stored in IndexedDB in this browser. The app does not transmit these records or use analytics. Hosting receives ordinary asset and update requests, including network metadata. YouTube opens only when you select a tutorial; its own policies apply. Backups are downloaded to a location you choose. Notifications require permission and are best-effort. No account or cloud synchronization is provided.",
  "Terms & conditions":
    "FORM provides general fitness tracking and educational estimates. You are responsible for exercising within your ability and for maintaining backups. Specific outcomes are not guaranteed. Do not misuse the application or infringe others’ intellectual property. Software and fitness guidance are provided subject to applicable law; no term excludes mandatory consumer rights. Updates may change features; review this policy after updates. This is a template requiring legal review for the deployment and applicable Indian law, including relevant data protection obligations.",
  "Medical & fitness disclaimer":
    "This application does not diagnose or treat illness and does not replace a clinician or qualified trainer. Seek guidance for medical restrictions, significant pain or injury. Stop painful movement. Seek urgent medical care for chest pain, fainting or severe unusual breathlessness. Recommended loads are never automatically imposed. No training program guarantees injury prevention.",
  "Nutrition disclaimer":
    "Food values and energy targets are estimates. Actual needs vary. Consumer body-fat measurements can be inaccurate. Protein supplements are optional. Minors and people who are pregnant, have an eating disorder or relevant medical conditions should seek individualized professional advice rather than use restrictive targets.",
  "Data storage & backup":
    "Browser storage can be evicted, cleared, or lost when uninstalling, switching browsers or devices. Persistent-storage requests reduce some eviction risk but do not guarantee backup. Export JSON regularly and store it securely; exports contain personal health information and are not encrypted. Import validates the format and replaces existing records in one transaction after your confirmation. Updates preserve IndexedDB. Clear all data permanently removes local records.",
  "Third-party services":
    "React, Dexie, Workbox and other bundled open-source libraries run locally. There are no required external APIs, fonts or embedded video players. Explicit YouTube links require internet and leave this app. Hosting and manual service-worker updates use your network connection; normal browser service-worker lifecycle checks may also occur. There are no reliable closed-app scheduled alarms in this browser-only app.",
  "About & support": `FORM ${appVersion} — Build your everyday strong. An offline-first fitness and nutrition companion. For support, contact the administrator of the deployment you are using or open an issue in msiend/GYM-App on GitHub. No support email or legal entity has been supplied. Legal documents are reviewable templates, not certified legal advice.`,
};
export default function Settings({
  profile,
  settings: s,
  onEdit,
}: {
  profile?: Profile;
  settings: Preferences;
  onEdit: () => void;
}) {
  const { notify } = useUI();
  const [legal, setLegal] = useState("");
  const [storage, setStorage] = useState<StorageEstimate>();
  const [persistent, setPersistent] = useState(false);
  const [update, setUpdate] = useState("");
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const [checking, setChecking] = useState(false);
  const active = useLiveQuery(() =>
    db.sessions.where("status").equals("active").count(),
  );
  async function save(patch: Partial<Preferences>) {
    await saveSettings(patch);
  }
  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then(setStorage)
      .catch(() => {});
    navigator.storage
      ?.persisted?.()
      .then(setPersistent)
      .catch(() => {});
    navigator.serviceWorker?.getRegistration().then((r) => {
      if (r?.waiting) setWaiting(r.waiting);
    });
  }, []);
  async function checkUpdate() {
    if (!navigator.onLine) {
      setUpdate("An internet connection is required to check for updates.");
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setUpdate("Service workers are not supported in this browser.");
      return;
    }
    setChecking(true);
    setUpdate("Checking the deployed application…");
    try {
      const r = await navigator.serviceWorker.getRegistration();
      if (!r) {
        setUpdate(
          "Use a production build over HTTPS or localhost to enable app updates.",
        );
        return;
      }
      await r.update();
      await save({ lastUpdate: new Date().toISOString() });
      if (r.waiting) {
        setWaiting(r.waiting);
        setUpdate("An update is ready to install.");
      } else if (r.installing) {
        setUpdate("Downloading and caching updated assets…");
        const worker = r.installing;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            setWaiting(r.waiting || worker);
            setUpdate("An update is ready to install.");
          }
          if (worker.state === "redundant")
            setUpdate("Update installation failed. Try again later.");
        });
      } else setUpdate("You are using the latest version.");
    } catch {
      setUpdate(
        "Could not reach the deployed application. Check your connection and try again.",
      );
    } finally {
      setChecking(false);
    }
  }
  async function activate() {
    if (active) {
      notify("Finish your active workout before installing an update.");
      return;
    }
    if (
      !waiting ||
      !confirm(
        "Install the cached update and reload? Your local records will be preserved.",
      )
    )
      return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    waiting.postMessage({ type: "SKIP_WAITING" });
  }
  async function exportData() {
    const data = await repository.export();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup exported. Keep this personal file secure.");
  }
  return (
    <>
      <Heading title="Settings" />
      <div className="settings-grid">
        <div className="stack">
          <section className="card settings-card">
            <h3>
              <Smartphone size={19} />
              Profile & training
            </h3>
            <div className="list-row">
              <span className="avatar">{profile?.name[0] || "Y"}</span>
              <div className="grow">
                <strong>{profile?.name || "Your profile"}</strong>
                <small>
                  {profile
                    ? `${profile.goal} · ${profile.equipment} · ${displayHeight(profile.height, profile.heightUnit)}`
                    : "Start your personal plan"}
                </small>
              </div>
              <button className="button secondary" onClick={onEdit}>
                Edit profile
              </button>
            </div>
            <label>
              Weight unit
              <select
                aria-label="Weight unit"
                value={s.unit}
                onChange={(e) => save({ unit: e.target.value })}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lbs">Pounds (lbs)</option>
              </select>
            </label>
            <label>
              Default rest timer (seconds)
              <input
                type="number"
                min="10"
                max="600"
                value={s.rest}
                onChange={(e) =>
                  save({ rest: Math.min(600, Math.max(10, +e.target.value)) })
                }
              />
            </label>
          </section>
          <section className="card settings-card">
            <h3>Water goal & reminders</h3>
            <HydrationPreferences
              settings={s}
              onSaved={() => notify("Water preferences saved.")}
            />
          </section>
          <section className="card settings-card">
            <h3>Appearance & language</h3>
            <label>
              Theme
              <select
                aria-label="Theme"
                value={s.theme}
                onChange={(e) => save({ theme: e.target.value })}
              >
                <option value="dark">Dark · Midnight</option>
                <option value="light">Light · Daybreak</option>
              </select>
            </label>
            <label>
              Text size
              <select
                aria-label="Text size"
                value={s.textSize || "normal"}
                onChange={(e) =>
                  save({ textSize: e.target.value as "normal" | "large" })
                }
              >
                <option value="normal">Comfortable</option>
                <option value="large">Extra large</option>
              </select>
            </label>
            <label>
              Language / भाषा
              <select
                aria-label="App language"
                value={s.language}
                onChange={(e) => save({ language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी · navigation & greeting</option>
              </select>
            </label>
            <p className="hint">
              Hindi navigation and greeting are available. Detailed exercise and
              nutrition content is currently English.
            </p>
          </section>
          <section className="card settings-card">
            <h3>
              <Bell size={19} />
              Reminders
            </h3>
            <label className="check">
              <input
                type="checkbox"
                checked={s.reminders}
                onChange={async (e) => {
                  if (!e.target.checked) {
                    await save({ reminders: false });
                    return;
                  }
                  if (!("Notification" in window)) {
                    notify("Notifications are not supported in this browser.");
                    return;
                  }
                  const permission = await Notification.requestPermission();
                  if (permission === "granted") await save({ reminders: true });
                  else
                    notify(
                      "Notification permission was not granted. You can change it in browser settings.",
                    );
                }}
              />
              Enable best-effort workout reminders
            </label>
            <label>
              Reminder time
              <input
                type="time"
                value={s.reminderTime}
                onChange={(e) => save({ reminderTime: e.target.value })}
              />
            </label>
            <div className="day-picker compact">
              {days.map((d, i) => (
                <button
                  key={d}
                  className={s.reminderDays.includes(i) ? "selected" : ""}
                  onClick={() =>
                    save({
                      reminderDays: s.reminderDays.includes(i)
                        ? s.reminderDays.filter((x) => x !== i)
                        : [...s.reminderDays, i],
                    })
                  }
                >
                  {d.slice(0, 2)}
                </button>
              ))}
            </div>
            <label>
              Reminder message
              <input
                value={s.reminderMessage}
                onChange={(e) => save({ reminderMessage: e.target.value })}
              />
            </label>
            <p className="hint">
              Workout reminders and rest timers work while the app is open.
              Browser timers cannot guarantee background or closed-app alarms.
              On iOS, notifications may require an installed Home Screen app.
            </p>
          </section>
        </div>
        <div className="stack">
          <section className="card settings-card">
            <h3>
              <RefreshCw size={19} />
              Application updates
            </h3>
            <div className="list-row">
              <span className="grow">Installed version</span>
              <span className="tag green">{appVersion}</span>
            </div>
            <p className="muted">
              Last check:{" "}
              {s.lastUpdate
                ? new Date(s.lastUpdate).toLocaleString()
                : "Not checked yet"}
            </p>
            <p className="hint">
              Updates check the deployed service worker and cache new assets.
              Your IndexedDB data stays on your device.
            </p>
            <div className="inline-form">
              <button
                className="button secondary"
                disabled={checking}
                onClick={checkUpdate}
              >
                <RefreshCw size={15} className={checking ? "spin" : ""} />
                {checking ? "Checking…" : "Check for updates"}
              </button>
              {waiting && (
                <button
                  className="button"
                  disabled={!!active}
                  onClick={activate}
                >
                  Install update
                </button>
              )}
            </div>
            {update && (
              <p role="status" className="notice">
                {update}
              </p>
            )}
          </section>
          <section className="card settings-card">
            <h3>
              <HardDrive size={19} />
              Device & storage
            </h3>
            <div className="list-row">
              <span className="grow">Connection</span>
              <span className="tag">
                {navigator.onLine ? "Online" : "Offline"}
              </span>
            </div>
            <div className="list-row">
              <span className="grow">Device storage used</span>
              <strong>
                {storage?.usage
                  ? (storage.usage / 1024 / 1024).toFixed(1) + " MB"
                  : "—"}
              </strong>
            </div>
            <button
              className="button secondary"
              onClick={async () => {
                if (!navigator.storage?.persist) {
                  notify(
                    "This browser does not support persistent-storage requests. Export regular backups.",
                  );
                  return;
                }
                const granted = await navigator.storage.persist();
                setPersistent(!!granted);
                notify(
                  granted
                    ? "Persistent storage granted. Keep making backups."
                    : "Browser declined persistent storage. Regular backups are important.",
                );
              }}
            >
              <Database size={15} />
              {persistent
                ? "Persistent storage granted"
                : "Request persistent storage"}
            </button>
            <p className="hint">
              Persistent storage is not a backup. Clearing browser data removes
              your records.
            </p>
          </section>
          <InstallSection />
          <section className="card settings-card">
            <h3>
              <ShieldCheck size={19} />
              Your data, in your hands
            </h3>
            <p className="muted">Back up your progress. Take it with you.</p>
            <div className="data-buttons">
              <button className="button secondary" onClick={exportData}>
                <Download size={16} />
                Export JSON backup
              </button>
              <label className="button secondary import-label">
                <Upload size={16} />
                Import / restore backup
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 10 * 1024 * 1024) {
                      notify("Backup exceeds the 10 MB import limit.");
                      return;
                    }
                    if (
                      !confirm(
                        "Restore this backup? All existing local records will be replaced. Export a backup first if needed.",
                      )
                    )
                      return;
                    try {
                      await importBackup(await f.text());
                      notify("Backup restored successfully.");
                    } catch {
                      notify(
                        "Import rejected. The file is invalid or incompatible; your existing data was preserved.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="button danger-button"
                onClick={async () => {
                  if (
                    confirm(
                      "Permanently delete all FORM records from this browser? Export a backup first.",
                    ) &&
                    confirm("This cannot be undone. Clear all data?")
                  ) {
                    await repository.clear();
                    location.reload();
                  }
                }}
              >
                <Trash2 size={16} />
                Clear all data
              </button>
            </div>
          </section>
          <section className="card settings-card">
            <h3>Legal & information</h3>
            {Object.keys(policies).map((title) => (
              <button
                key={title}
                className="legal-link"
                onClick={() => setLegal(title)}
              >
                {title}
                <ExternalLink size={14} />
              </button>
            ))}
          </section>
        </div>
      </div>
      {legal && (
        <Modal title={legal} onClose={() => setLegal("")}>
          <p>{policies[legal]}</p>
          <p className="hint">
            Version {appVersion} · Review before production deployment.
          </p>
          <button className="button secondary" onClick={() => setLegal("")}>
            <Check size={15} />
            Done
          </button>
        </Modal>
      )}
    </>
  );
}
