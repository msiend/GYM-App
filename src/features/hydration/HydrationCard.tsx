import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Droplets, Plus, Settings2, Undo2 } from "lucide-react";
import { db, defaults } from "../../data/db";
import { localDate, uid } from "../../domain/engine";
import { saveErrorMessage } from "../../data/errors";
import { Modal } from "../../components/ui";
import HydrationPreferences from "./HydrationPreferences";
export default function HydrationCard() {
  const stored = useLiveQuery(() => db.settings.get("preferences"));
  const settings = { ...defaults, ...stored };
  const logs =
    useLiveQuery(() => db.water.where("date").equals(localDate()).toArray()) ||
    [];
  const total = logs.reduce((s, l) => s + l.ml, 0);
  const latest = logs
    .filter((l) => l.createdAt)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  const [amount, setAmount] = useState(250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(false);
  async function add(ml: number) {
    if (!Number.isFinite(ml) || ml < 1 || ml > 2000) {
      setError("Enter a serving from 1 to 2,000 ml.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await db.water.add({
        id: uid(),
        date: localDate(),
        ml,
        createdAt: Date.now(),
      });
    } catch (err) {
      setError(saveErrorMessage(err, "your water entry"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="card water-card">
        <header>
          <span className="water-card-title">
            <Droplets size={23} />
            <h2>Water today</h2>
          </span>
          <button className="text-link" onClick={() => setPreferences(true)}>
            <Settings2 size={16} />
            Water preferences
          </button>
        </header>
        <div className="water-total">
          <strong>
            {total.toLocaleString()}
            <small> / {settings.hydration.toLocaleString()} ml</small>
          </strong>
          <span>
            {settings.hydrationReminders
              ? `Reminders every ${settings.hydrationInterval ?? 60} min`
              : "Reminders off"}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Daily water logged"
          aria-valuemin={0}
          aria-valuemax={settings.hydration}
          aria-valuenow={Math.min(total, settings.hydration)}
        >
          <span
            style={{
              width: `${Math.min(100, (total / settings.hydration) * 100)}%`,
            }}
          />
        </div>
        <div className="water-quick-add">
          {[150, 250, 500].map((ml) => (
            <button
              className="button secondary"
              key={ml}
              disabled={busy}
              onClick={() => add(ml)}
              aria-label={`Log ${ml} ml of water`}
            >
              <Plus size={16} />
              {ml} ml
            </button>
          ))}
        </div>
        <form
          className="water-custom"
          onSubmit={(e) => {
            e.preventDefault();
            void add(amount);
          }}
        >
          <label>
            Custom amount (ml)
            <input
              aria-label="Custom water amount (ml)"
              type="number"
              required
              min="1"
              max="2000"
              step="1"
              value={amount}
              onChange={(e) => setAmount(+e.target.value)}
            />
          </label>
          <button className="button secondary" type="submit" disabled={busy}>
            Log water
          </button>
        </form>
        {latest && (
          <button
            className="text-link"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await db.water.delete(latest.id);
              } catch (err) {
                setError(saveErrorMessage(err, "the water change"));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Undo2 size={15} />
            Undo last {latest.ml} ml
          </button>
        )}
        {error && (
          <p className="danger" role="alert">
            {error}
          </p>
        )}
        <p className="water-explanation">
          {total >= settings.hydration
            ? "You’ve reached your chosen target. No need to drink extra just to fill the tracker."
            : "Log what you drink. Water needs vary with activity, weather, diet and health."}
        </p>
        {!settings.hydrationReminders && (
          <button className="text-link" onClick={() => setPreferences(true)}>
            Set a gentle water reminder
          </button>
        )}
      </section>
      {preferences && (
        <Modal
          title="Water goal & reminders"
          onClose={() => setPreferences(false)}
        >
          <HydrationPreferences
            settings={settings}
            onSaved={() => setPreferences(false)}
          />
        </Modal>
      )}
    </>
  );
}
