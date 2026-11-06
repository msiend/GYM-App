import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { db } from "./data/db";
import { localDate, uid } from "./domain/engine";
import type { Profile } from "./domain/types";
import { Heading, Modal, Empty } from "./components/ui";
import { exerciseById } from "./data/exercises";
import { resistanceVolume } from "./domain/volume";
export default function Progress({ profile: p }: { profile?: Profile }) {
  const weights =
    useLiveQuery(() => db.weights.orderBy("date").toArray()) || [];
  const sessions = useLiveQuery(() => db.sessions.toArray()) || [];
  const logs = useLiveQuery(() => db.sets.toArray()) || [];
  const cardio = useLiveQuery(() => db.cardio.toArray()) || [];
  const [modal, setModal] = useState("");
  const [range, setRange] = useState(30);
  const [exercise, setExercise] = useState("");
  const completed = sessions
    .filter((s) => s.status === "complete")
    .sort((a, b) => a.date.localeCompare(b.date));
  const start = new Date();
  start.setDate(start.getDate() - range);
  const filtered = weights.filter((w) => w.date >= localDate(start));
  const weekly = Array.from({ length: Math.ceil(range / 7) }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (Math.ceil(range / 7) - 1 - i) * 7 - 6);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const ss = completed.filter(
      (s) => s.date >= localDate(d) && s.date <= localDate(end),
    );
    return {
      week: localDate(d).slice(5),
      workouts: ss.length,
      volume: Math.round(
        resistanceVolume(
          logs.filter((l) => ss.some((s) => s.id === l.sessionId)),
        ),
      ),
    };
  });
  const exerciseIds = [...new Set(logs.map((l) => l.exerciseId))];
  const exerciseData = completed
    .filter((s) => s.date >= localDate(start))
    .map((s) => ({
      date: s.date.slice(5),
      load: Math.max(
        0,
        ...logs
          .filter(
            (l) =>
              l.sessionId === s.id &&
              l.done &&
              l.exerciseId === (exercise || exerciseIds[0]),
          )
          .map((l) => l.weight),
      ),
    }));
  async function record(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const date = String(form.get("date"));
    if (modal === "weight") {
      await db.weights.add({
        id: uid(),
        date,
        weight: Number(form.get("weight")),
        waist: Number(form.get("waist")) || undefined,
        chest: Number(form.get("chest")) || undefined,
        arm: Number(form.get("arm")) || undefined,
        thigh: Number(form.get("thigh")) || undefined,
        notes: String(form.get("notes") || ""),
      });
    } else
      await db.cardio.add({
        id: uid(),
        date,
        activity: String(form.get("activity")),
        minutes: Number(form.get("minutes")),
        distance: Number(form.get("distance")),
        intensity: String(form.get("intensity")),
        heartRate: Number(form.get("heartRate")) || undefined,
      });
    setModal("");
  }
  const chart = (
    title: string,
    data: object[],
    key: string,
    x: string,
    color = "var(--chart-green)",
    bar = false,
  ) => (
    <section className="card chart-card">
      <h3>{title}</h3>
      {key === "volume" && (
        <p className="hint">
          Recorded external load × repetitions. Timed holds and bands are
          excluded; unweighted exercises contribute zero here. Paired dumbbells
          use the per-hand load you recorded. This is a logging metric, not a
          measure of effort or calories.
        </p>
      )}
      {data.length ? (
        <ResponsiveContainer width="100%" height={240}>
          {bar ? (
            <BarChart data={data}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey={x}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
              />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} width={44} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              />
              <Bar dataKey={key} fill={color} radius={[5, 5, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey={x}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              />
              <Line
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      ) : (
        <Empty
          title="A little data goes a long way"
          description="Your recorded progress will appear here."
        />
      )}
    </section>
  );
  return (
    <>
      <Heading
        eyebrow="YOUR EFFORT, OVER TIME"
        title="Look how far you’ll go"
        description="Follow the trends. Celebrate the showing up."
        action={
          <div className="inline-form">
            <button
              className="button secondary"
              onClick={() => setModal("cardio")}
            >
              <Plus size={16} />
              Log cardio
            </button>
            <button className="button" onClick={() => setModal("weight")}>
              <Plus size={16} />
              Log progress
            </button>
          </div>
        }
      />
      <div className="tabs">
        {[7, 30, 90].map((r) => (
          <button
            className={r === range ? "active" : ""}
            key={r}
            onClick={() => setRange(r)}
          >
            Last {r} days
          </button>
        ))}
      </div>
      <div className="stat-grid">
        <section className="card stat">
          <span className="eyebrow">CURRENT WEIGHT</span>
          <strong>
            {weights.at(-1)?.weight || p?.weight || "—"}
            <small>kg</small>
          </strong>
        </section>
        <section className="card stat">
          <span className="eyebrow">WORKOUTS COMPLETE</span>
          <strong>{completed.length}</strong>
        </section>
        <section className="card stat">
          <span className="eyebrow">SETS COMPLETED</span>
          <strong>{logs.filter((l) => l.done).length}</strong>
        </section>
        <section className="card stat">
          <span className="eyebrow">CARDIO LOGGED</span>
          <strong>
            {cardio.reduce((s, c) => s + c.minutes, 0)}
            <small>min</small>
          </strong>
        </section>
      </div>
      <div className="chart-grid">
        {chart(
          "Body weight · kg",
          filtered.map((w) => ({ ...w, date: w.date.slice(5) })),
          "weight",
          "date",
        )}
        {chart(
          "Workout consistency · sessions",
          weekly,
          "workouts",
          "week",
          "var(--chart-blue)",
          true,
        )}
        {chart(
          "Weekly resistance volume · kg × reps",
          weekly,
          "volume",
          "week",
          "var(--chart-green)",
          true,
        )}
        <div>
          <label className="exercise-select">
            Exercise
            <select
              value={exercise || exerciseIds[0] || ""}
              onChange={(e) => setExercise(e.target.value)}
            >
              {exerciseIds.length ? (
                exerciseIds.map((id) => (
                  <option key={id} value={id}>
                    {exerciseById(id).name}
                  </option>
                ))
              ) : (
                <option>No recorded exercises</option>
              )}
            </select>
          </label>
          {chart(
            "Heaviest recorded set · kg",
            exerciseIds.length ? exerciseData : [],
            "load",
            "date",
            "var(--chart-purple)",
          )}
        </div>
      </div>
      <p className="notice">
        For general adult health, WHO guidance is 150–300 minutes of moderate
        activity weekly, plus muscle strengthening at least two days. Start
        below this if needed and build gradually to your capacity. Any activity
        counts.
      </p>
      <details className="card instruction">
        <summary>Body measurements & notes · {weights.length} entries</summary>
        {weights.map((w) => (
          <div className="list-row" key={w.id}>
            <div className="grow">
              <strong>
                {w.date} · {w.weight} kg
              </strong>
              <small>
                {[
                  ["Waist", w.waist],
                  ["Chest", w.chest],
                  ["Arm", w.arm],
                  ["Thigh", w.thigh],
                ]
                  .filter((x) => x[1])
                  .map((x) => `${x[0]} ${x[1]} cm`)
                  .join(" · ")}
              </small>
              <p>{w.notes}</p>
            </div>
            <button
              aria-label="Delete measurement"
              className="icon-button"
              onClick={() => {
                if (confirm("Delete this measurement record?"))
                  db.weights.delete(w.id);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </details>
      <details className="card instruction">
        <summary>Cardio history · {cardio.length} entries</summary>
        {cardio.length ? (
          cardio.map((c) => (
            <div className="list-row" key={c.id}>
              <div className="grow">
                <strong>
                  {c.activity} · {c.minutes} min
                </strong>
                <small>
                  {c.date} · {c.distance} km · {c.intensity}
                  {c.heartRate ? ` · ${c.heartRate} bpm` : ""}
                </small>
              </div>
              <button
                aria-label="Delete cardio entry"
                className="icon-button"
                onClick={() => {
                  if (confirm("Delete this cardio record?"))
                    db.cardio.delete(c.id);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <p>No cardio recorded yet.</p>
        )}
      </details>
      {modal && (
        <Modal
          title={
            modal === "weight" ? "Your progress, recorded" : "Log your cardio"
          }
          onClose={() => setModal("")}
        >
          <form onSubmit={record}>
            <label>
              Date
              <input
                type="date"
                name="date"
                required
                defaultValue={localDate()}
                max={localDate()}
              />
            </label>
            {modal === "weight" ? (
              <>
                <label>
                  Body weight (kg)
                  <input
                    type="number"
                    name="weight"
                    min="25"
                    max="350"
                    step=".1"
                    required
                    defaultValue={weights.at(-1)?.weight || p?.weight}
                  />
                </label>
                <div className="form-grid">
                  {["waist", "chest", "arm", "thigh"].map((m) => (
                    <label key={m}>
                      {m} (cm, optional)
                      <input
                        type="number"
                        name={m}
                        min="5"
                        max="300"
                        step=".1"
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Progress notes
                  <textarea name="notes" placeholder="How are you feeling?" />
                </label>
              </>
            ) : (
              <>
                <label>
                  Activity
                  <select name="activity">
                    {[
                      "Walking",
                      "Treadmill",
                      "Cycling",
                      "Stationary bike",
                      "Elliptical",
                      "Swimming",
                      "Jogging",
                      "Rowing",
                      "Stair climber",
                    ].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Minutes
                    <input
                      type="number"
                      name="minutes"
                      min="1"
                      max="600"
                      required
                    />
                  </label>
                  <label>
                    Distance (km)
                    <input
                      type="number"
                      name="distance"
                      min="0"
                      max="300"
                      step=".01"
                      defaultValue={0}
                    />
                  </label>
                  <label>
                    Heart rate (optional, bpm)
                    <input type="number" name="heartRate" min="30" max="250" />
                  </label>
                  <label>
                    Intensity
                    <select name="intensity">
                      <option>Light</option>
                      <option>Moderate</option>
                      <option>Vigorous</option>
                    </select>
                  </label>
                </div>
              </>
            )}
            <button className="button" type="submit">
              Save entry
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
