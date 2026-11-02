import { useState } from "react";
import { Modal } from "./ui";
import { db } from "../data/db";
import { uid } from "../domain/engine";
import type { Food } from "../domain/types";
type Template = {
  name: string;
  aliases: string;
  diet: string;
  allergens: string;
  state: string;
};
export default function CustomFood({
  template,
  food,
  onClose,
  onSaved,
}: {
  template?: Template;
  food?: Food;
  onClose: () => void;
  onSaved: (food: Food) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const serving = Number(form.get("serving"));
    const nutrient = Object.fromEntries(
      ["kcal", "protein", "carbs", "fat", "fiber"].map((k) => [
        k,
        Math.round(((Number(form.get(k)) * 100) / serving) * 100) / 100,
      ]),
    );
    if (
      !String(form.get("name")).trim() ||
      !String(form.get("state")).trim() ||
      nutrient.protein + nutrient.carbs + nutrient.fat > 105 ||
      !serving ||
      Object.values(nutrient).some((n) => !Number.isFinite(n) || n < 0) ||
      nutrient.kcal > 1000 ||
      ["protein", "carbs", "fat", "fiber"].some((k) => nutrient[k] > 100)
    ) {
      setError(
        "Check the serving weight and label values. Values must be realistic for 100 g.",
      );
      setBusy(false);
      return;
    }
    const item = {
      id: food?.id || `custom-${uid()}`,
      name: String(form.get("name")).trim(),
      ...nutrient,
      state: String(form.get("state")).trim(),
      diet: String(form.get("diet")),
      allergens: String(form.get("allergens"))
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
      aliases: String(form.get("aliases"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      source: `User-entered label: ${String(form.get("source")).trim() || "personal food"}. Not independently verified.`,
      verification: "user-entered",
      servingGrams: serving,
    } as Food;
    try {
      await db.customFoods.put(item);
      onSaved(item);
      onClose();
    } catch {
      setError("Food could not be saved. Check available device storage.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={food ? "Edit your food" : "Add your own food"}
      onClose={onClose}
    >
      <p>
        Copy the nutrition panel from your packet. We’ll convert your serving to
        values per 100 g, so any portion can be logged correctly.
      </p>
      <form onSubmit={save}>
        <div className="form-grid">
          <label>
            Food name
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={food?.name || template?.name}
            />
          </label>
          <label>
            Brand / label reference
            <input
              name="source"
              placeholder="e.g. brand and product name"
              defaultValue={food?.source}
            />
          </label>
          <label>
            Label serving weight (g)
            <input
              name="serving"
              required
              type="number"
              min="1"
              max="2000"
              step="any"
              defaultValue={100}
            />
          </label>
          <label>
            Preparation state
            <input
              name="state"
              required
              defaultValue={food?.state || template?.state || "as sold"}
              placeholder="Dry, cooked, drained…"
            />
          </label>
          {["kcal", "protein", "carbs", "fat", "fiber"].map((k) => (
            <label key={k}>
              {k === "kcal"
                ? "Calories (kcal)"
                : `${k[0].toUpperCase() + k.slice(1)} (g)`}{" "}
              per label serving
              <input
                name={k}
                required
                type="number"
                min="0"
                max={k === "kcal" ? 10000 : 2000}
                step="any"
                defaultValue={food?.[k as "kcal"] ?? undefined}
              />
            </label>
          ))}
          <label>
            Dietary type
            <select
              name="diet"
              defaultValue={food?.diet || template?.diet || "Vegetarian"}
            >
              {[
                "Vegan",
                "Vegetarian",
                "Eggetarian",
                "Pescatarian",
                "Non-vegetarian",
              ].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Allergens (comma separated)
            <input
              name="allergens"
              defaultValue={food?.allergens.join(", ") || template?.allergens}
              placeholder="soy, milk, peanuts…"
            />
          </label>
          <label>
            Other search names
            <input
              name="aliases"
              defaultValue={food?.aliases?.join(", ") || template?.aliases}
              placeholder="Hindi names, local names…"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="danger">
            {error}
          </p>
        )}
        <p className="hint">
          Your foods stay on this device and are included in JSON backups. Check
          dry versus cooked weights. Brand labels may differ.
        </p>
        <button className="button" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save food"}
        </button>
      </form>
    </Modal>
  );
}
