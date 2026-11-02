import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  Check,
  Clock,
  Dumbbell,
  BookOpen,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { ExerciseOverview, TutorialLink } from "./components/ExerciseGuide";
import { bodyPartLabel } from "./domain/exercise-guide";
import PlanSettings from "./components/PlanSettings";
import { db, defaults } from "./data/db";
import { exercises, exerciseById } from "./data/exercises";
import { eligible, localDate, progression, uid } from "./domain/engine";
import type { Profile, Session, SetLog } from "./domain/types";
import { Empty, Heading, Modal, Ring } from "./components/ui";
import { days } from "./domain/calendar";
import { useUI } from "./store";
export default function Workout({
  profile: p,
  onSetup,
}: {
  profile?: Profile;
  onSetup: () => void;
}) {
  const plan = useLiveQuery(() => db.plans.get("current"));
  const sessions = useLiveQuery(() => db.sessions.toArray()) || [];
  const logs = useLiveQuery(() => db.sets.toArray()) || [];
  const settings =
    useLiveQuery(() => db.settings.get("preferences")) || defaults;
  const [planSettings, setPlanSettings] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState("All muscles");
  const [equipmentFilter, setEquipmentFilter] = useState("All equipment");
  const [tab, setTab] = useState("plan");
  const [selected, setSelected] = useState(new Date().getDay());
  const [info, setInfo] = useState("");
  const [replace, setReplace] = useState("");
  const [search, setSearch] = useState("");
  const [timer, setTimer] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [paused, setPaused] = useState(false);
  const [starting, setStarting] = useState(false);
  const { notify } = useUI();
  const active = sessions.find((s) => s.status === "active");
  const day = plan?.days.find((d) => d.day === selected) || plan?.days[0];
  const done = active
    ? logs.filter((l) => l.sessionId === active.id && l.done).length
    : 0;
  const total = active
    ? logs.filter((l) => l.sessionId === active.id).length
    : 0;
  useEffect(() => {
    if (!deadline || paused) return;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimer(left);
      if (!left) {
        setDeadline(0);
        notify("Rest complete. Ready when you are.");
        navigator.vibrate?.([100, 50, 100]);
        if ("Notification" in window && Notification.permission === "granted")
          navigator.serviceWorker?.ready.then((r) =>
            r.showNotification("FORM · Rest complete", {
              body: "Take your time. Start your next set when ready.",
            }),
          );
      }
    }, 250);
    return () => clearInterval(tick);
  }, [deadline, paused, notify]);
  async function start() {
    if (!day || starting) return;
    setStarting(true);
    try {
      const session: Session = {
        id: uid(),
        date: localDate(),
        focus: day.focus,
        status: "active",
        exercises: day.exercises,
        notes: "",
      };
      await db.transaction("rw", [db.sessions, db.sets], async () => {
        if (await db.sessions.where("status").equals("active").count()) return;
        await db.sessions.add(session);
        for (const e of session.exercises)
          await db.sets.bulkAdd(
            Array.from({ length: e.sets }, (_, i) => ({
              id: uid(),
              sessionId: session.id,
              exerciseId: e.exerciseId,
              index: i,
              weight: 0,
              reps: e.reps,
              done: false,
              rpe: 7,
              pain: false,
              technique: true,
            })),
          );
      });
      setTab("plan");
    } finally {
      setStarting(false);
    }
  }
  async function saveSet(log: SetLog, patch: Partial<SetLog>) {
    await db.sets.update(log.id, patch);
    if (patch.done) {
      const rest =
        active?.exercises.find((e) => e.exerciseId === log.exerciseId)?.rest ||
        settings.rest;
      setTimer(rest);
      setDeadline(Date.now() + rest * 1000);
      setPaused(false);
    }
  }
  async function finish() {
    if (!active) return;
    if (
      !window.confirm(
        done < total
          ? "Some sets are incomplete. Finish and save the completed work?"
          : "Finish this workout and save it to history?",
      )
    )
      return;
    await db.sessions.update(active.id, { status: "complete" });
    setTimer(0);
    setDeadline(0);
    notify("Workout saved. Every effort counts.");
  }
  async function swap(id: string) {
    if (!active) return;
    const old = active.exercises.find((e) => e.exerciseId === replace)!;
    await db.transaction("rw", [db.sessions, db.sets], async () => {
      await db.sets
        .where("sessionId")
        .equals(active.id)
        .filter((l) => l.exerciseId === replace)
        .delete();
      await db.sessions.update(active.id, {
        exercises: active.exercises.map((e) =>
          e.exerciseId === replace ? { ...e, exerciseId: id } : e,
        ),
      });
      await db.sets.bulkAdd(
        Array.from({ length: old.sets }, (_, i) => ({
          id: uid(),
          sessionId: active.id,
          exerciseId: id,
          index: i,
          weight: 0,
          reps: old.reps,
          done: false,
          rpe: 7,
          pain: false,
          technique: true,
        })),
      );
    });
    setReplace("");
  }
  return (
    <>
      <Heading
        eyebrow="MOVE WITH INTENTION"
        title="Your training space"
        description="Good form. Steady effort. Progress that’s yours."
        action={
          active ? (
            <button className="button" onClick={finish}>
              <Check size={17} />
              Finish workout
            </button>
          ) : p ? (
            <button
              className="button secondary"
              onClick={() => setPlanSettings(true)}
            >
              Change plan
            </button>
          ) : undefined
        }
      />
      <div className="tabs">
        {["plan", "library", "history"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "plan"
              ? "My workout"
              : t === "library"
                ? "Exercise library"
                : "History"}
          </button>
        ))}
      </div>
      {tab === "plan" &&
        (!p ? (
          <Empty
            title="A plan built around you"
            description="Create your profile to get a personalized training week."
          >
            <button className="button" onClick={onSetup}>
              Create my plan
              <ArrowRight size={16} />
            </button>
          </Empty>
        ) : p.medical ? (
          <Empty
            title="Let’s put your health first"
            description="Your screening indicates that professional guidance is needed before an unrestricted plan. The exercise library is available for reference."
          />
        ) : (
          <>
            {plan && !active && (
              <section className="card plan-explanation">
                <div className="section-title">
                  <div>
                    <h2>{plan.split}</h2>
                    <p>{plan.days.length} training days · your weekly plan</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setPlanSettings(true)}
                  >
                    Change plan
                  </button>
                </div>
                {plan.rationale ? (
                  <p>{plan.rationale}</p>
                ) : (
                  <p>
                    Your plan was made with an earlier version. Use Change plan
                    to preview the expanded exercise library and improved
                    programming.
                  </p>
                )}
                {plan.warnings?.map((w) => (
                  <p key={w} className="hint">
                    {w}
                  </p>
                ))}
                <div className="training-day-list">
                  {plan.days.map((d) => (
                    <button
                      key={d.day}
                      disabled={!!active}
                      className={selected === d.day ? "selected" : ""}
                      onClick={() => setSelected(d.day)}
                    >
                      <strong>{days[d.day]}</strong>
                      <span>{d.focus}</span>
                      <small>{d.exercises.length} exercises</small>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <div className="day-picker">
              {days.map((d, i) => (
                <button
                  key={d}
                  className={selected === i ? "selected" : ""}
                  onClick={() => setSelected(i)}
                >
                  {d.slice(0, 3)}
                  {plan?.days.some((x) => x.day === i) && (
                    <span className="tiny-dot" />
                  )}
                </button>
              ))}
            </div>
            {!active && !plan?.days.some((d) => d.day === selected) && (
              <div className="notice">
                Recovery day. Gentle walking or comfortable mobility is
                optional. Your next training session is shown below.
              </div>
            )}
            {(active || day) && (
              <>
                <section className="card workout-summary">
                  <div>
                    <span className="tag green">
                      {active ? "WORKOUT IN PROGRESS" : plan?.split}
                    </span>
                    <h2>{active?.focus || day?.focus}</h2>
                    <div className="session-muscles">
                      <span>Main focus</span>
                      {[
                        ...new Set(
                          (active?.exercises || day?.exercises || []).map(
                            (item) => exerciseById(item.exerciseId).muscle,
                          ),
                        ),
                      ].map((m) => (
                        <span key={m} className="muscle-chip primary">
                          {bodyPartLabel(m)}
                        </span>
                      ))}
                    </div>
                    <p>
                      <Clock size={15} />
                      {p.duration} min <span>•</span>{" "}
                      {(active?.exercises || day?.exercises)?.length} exercises{" "}
                      <span>•</span>{" "}
                      {active
                        ? "Saved as you go"
                        : "Choose a conservative starting load"}
                    </p>
                  </div>
                  {active ? (
                    <Ring value={done} total={total} size={82} />
                  ) : (
                    <button
                      className="button"
                      onClick={start}
                      disabled={starting}
                    >
                      <Play size={16} />
                      {starting ? "Starting…" : "Start workout"}
                    </button>
                  )}
                </section>
                <details className="card instruction">
                  <summary>01 / Prepare · 5–10 minute warm-up</summary>
                  <p>
                    Start with easy walking or marching, gentle shoulder and hip
                    movements, then light rehearsal sets for your first
                    movements. Warm up longer if you need it. Stay within a
                    pain-free range.
                  </p>
                </details>
                {(active?.exercises || day?.exercises || []).map((item, i) => {
                  const ex = exerciseById(item.exerciseId);
                  const sets = logs
                    .filter(
                      (l) =>
                        l.sessionId === active?.id && l.exerciseId === ex.id,
                    )
                    .sort((a, b) => a.index - b.index);
                  const prior = sessions
                    .filter(
                      (s) =>
                        s.status === "complete" &&
                        s.exercises.some((e) => e.exerciseId === ex.id),
                    )
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  const previous = logs.filter(
                    (l) =>
                      l.sessionId === prior?.id &&
                      l.exerciseId === ex.id &&
                      l.done,
                  );
                  return (
                    <section className="card exercise-card" key={ex.id}>
                      <header>
                        <span className="exercise-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="grow">
                          <span className="eyebrow">
                            {ex.muscle} · {ex.equipment}
                          </span>
                          <h3>{ex.name}</h3>
                          <p>
                            {item.sets} sets ·{" "}
                            {ex.tracking === "seconds"
                              ? `${item.reps} sec hold`
                              : `${Math.max(5, item.reps - 4)}–${item.reps} reps`}{" "}
                            · {item.rest}s rest
                          </p>
                        </div>
                        {active && (
                          <button
                            className="icon-button"
                            aria-label={`Replace ${ex.name}`}
                            onClick={() => setReplace(ex.id)}
                          >
                            <RefreshCw size={17} />
                          </button>
                        )}
                      </header>
                      <div className="exercise-help-actions">
                        <button
                          className="button secondary"
                          aria-label={`Instructions for ${ex.name}`}
                          onClick={() => setInfo(ex.id)}
                        >
                          <BookOpen size={16} />
                          How to do it
                        </button>
                        <TutorialLink exercise={ex} />
                      </div>
                      <ExerciseOverview exercise={ex} />
                      {active && (
                        <>
                          <p className="hint">
                            {previous.length
                              ? `Previous: ${previous.map((l) => `${l.weight} kg × ${l.reps}`).join(" · ")}`
                              : "Start with a load you can control; bodyweight or unloaded practice is fine."}
                          </p>
                          <div className="set-table">
                            <div className="set-row set-heading">
                              <span>SET</span>
                              <span>{settings.unit.toUpperCase()}</span>
                              <span>
                                {ex.tracking === "seconds" ? "SECONDS" : "REPS"}
                              </span>
                              <span>RPE /10</span>
                              <span>DONE</span>
                              <span />
                            </div>
                            {sets.map((log, index) => (
                              <div key={log.id}>
                                <div
                                  className={`set-row ${log.done ? "set-done" : ""}`}
                                >
                                  <span>{index + 1}</span>
                                  <input
                                    aria-label={`Set ${index + 1} weight`}
                                    type="number"
                                    min="0"
                                    max="1000"
                                    value={
                                      Math.round(
                                        log.weight *
                                          (settings.unit === "lbs"
                                            ? 2.20462
                                            : 1) *
                                          10,
                                      ) / 10
                                    }
                                    onChange={(e) =>
                                      saveSet(log, {
                                        weight:
                                          Math.max(
                                            0,
                                            Math.min(1000, +e.target.value),
                                          ) /
                                          (settings.unit === "lbs"
                                            ? 2.20462
                                            : 1),
                                      })
                                    }
                                  />
                                  <input
                                    aria-label={`Set ${index + 1} repetitions`}
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={log.reps}
                                    onChange={(e) =>
                                      saveSet(log, {
                                        reps: Math.max(
                                          0,
                                          Math.min(999, +e.target.value),
                                        ),
                                      })
                                    }
                                  />
                                  <input
                                    aria-label={`Set ${index + 1} effort`}
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={log.rpe}
                                    onChange={(e) =>
                                      saveSet(log, {
                                        rpe: Math.max(
                                          1,
                                          Math.min(10, +e.target.value),
                                        ),
                                      })
                                    }
                                  />
                                  <button
                                    aria-label={
                                      log.done
                                        ? "Mark set incomplete"
                                        : "Complete set"
                                    }
                                    className={
                                      log.done
                                        ? "set-check checked"
                                        : "set-check"
                                    }
                                    onClick={() =>
                                      saveSet(log, { done: !log.done })
                                    }
                                  >
                                    <Check size={17} />
                                  </button>
                                  <button
                                    className="icon-button"
                                    aria-label="Delete set"
                                    onClick={() => db.sets.delete(log.id)}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                <div className="set-feedback">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={log.technique}
                                      onChange={(e) =>
                                        saveSet(log, {
                                          technique: e.target.checked,
                                        })
                                      }
                                    />
                                    Good technique
                                  </label>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={log.pain}
                                      onChange={(e) => {
                                        saveSet(log, {
                                          pain: e.target.checked,
                                        });
                                        if (e.target.checked)
                                          notify(
                                            "Stop this painful movement. Reassess and seek guidance if symptoms persist.",
                                          );
                                      }}
                                    />
                                    Pain / discomfort
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="exercise-controls">
                            <button
                              className="text-link"
                              onClick={() =>
                                db.sets.add({
                                  id: uid(),
                                  sessionId: active.id,
                                  exerciseId: ex.id,
                                  index: sets.length
                                    ? Math.max(...sets.map((s) => s.index)) + 1
                                    : 0,
                                  weight: sets.at(-1)?.weight || 0,
                                  reps: item.reps,
                                  done: false,
                                  rpe: 7,
                                  pain: false,
                                  technique: true,
                                })
                              }
                            >
                              <Plus size={15} /> Add set
                            </button>
                            <label>
                              Rest (sec)
                              <input
                                type="number"
                                min="10"
                                max="600"
                                value={item.rest}
                                onChange={(e) =>
                                  db.sessions.update(active.id, {
                                    exercises: active.exercises.map((x) =>
                                      x.exerciseId === ex.id
                                        ? {
                                            ...x,
                                            rest: Math.min(
                                              600,
                                              Math.max(10, +e.target.value),
                                            ),
                                          }
                                        : x,
                                    ),
                                  })
                                }
                              />
                            </label>
                          </div>
                          <p className="coaching">
                            <Trending />{" "}
                            {progression(sessions, logs, ex.id, item.reps)}
                          </p>
                        </>
                      )}
                    </section>
                  );
                })}
                <details className="card instruction">
                  <summary>03 / Recover · 5 minute cool-down</summary>
                  <p>
                    Slow down with gentle walking and easy breathing. Add
                    comfortable static stretching if desired. Never force a
                    stretch or continue through pain.
                  </p>
                </details>
              </>
            )}
          </>
        ))}
      {tab === "library" && (
        <>
          <div className="library-filters">
            <label>
              Muscle
              <select
                value={muscleFilter}
                onChange={(e) => setMuscleFilter(e.target.value)}
              >
                {[
                  "All muscles",
                  ...new Set(exercises.map((e) => e.muscle)),
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Equipment
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
              >
                {[
                  "All equipment",
                  ...new Set(exercises.map((e) => e.equipment)),
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="search-bar">
            <input
              placeholder="Search muscles, movements or exercises…"
              aria-label="Search exercise library"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span>{exercises.length} offline exercises</span>
          </div>
          <div className="library-grid">
            {exercises
              .filter(
                (e) =>
                  (e.name + " " + e.muscle + " " + e.category)
                    .toLowerCase()
                    .includes(search.toLowerCase()) &&
                  (muscleFilter === "All muscles" ||
                    e.muscle === muscleFilter) &&
                  (equipmentFilter === "All equipment" ||
                    e.equipment === equipmentFilter),
              )
              .map((e) => (
                <article className="card library-item" key={e.id}>
                  <button
                    className="exercise-library-open"
                    onClick={() => setInfo(e.id)}
                    aria-label={`Instructions for ${e.name}`}
                  >
                    <div className="exercise-glyph">
                      <Dumbbell size={28} />
                    </div>
                    <span className="eyebrow">
                      {e.muscle} · {e.equipment}
                    </span>
                    <h3>{e.name}</h3>
                    <span className="muted">
                      How to do it <ArrowRight size={16} />
                    </span>
                  </button>
                  <TutorialLink exercise={e} />
                  <ExerciseOverview exercise={e} compact />
                </article>
              ))}
          </div>
          <p className="hint">
            The expanded descriptions come from Free Exercise DB (public-domain
            catalog). Each exercise includes its source where available. These
            are reference instructions, not a professional technique assessment.
          </p>
        </>
      )}
      {tab === "history" &&
        (sessions.length ? (
          <div className="stack">
            {sessions
              .slice()
              .reverse()
              .map((s) => (
                <details className="card instruction" key={s.id}>
                  <summary>
                    {s.date} · {s.focus} <span className="tag">{s.status}</span>
                  </summary>
                  {s.exercises.map((e) => (
                    <div key={e.exerciseId}>
                      <h4>{exerciseById(e.exerciseId).name}</h4>
                      {logs
                        .filter(
                          (l) =>
                            l.sessionId === s.id &&
                            l.exerciseId === e.exerciseId,
                        )
                        .map((l) => (
                          <div className="history-set" key={l.id}>
                            <label>
                              kg
                              <input
                                type="number"
                                min="0"
                                value={l.weight}
                                onChange={(e) =>
                                  saveSet(l, {
                                    weight: Math.max(0, +e.target.value),
                                  })
                                }
                              />
                            </label>
                            <label>
                              reps / seconds
                              <input
                                type="number"
                                min="0"
                                value={l.reps}
                                onChange={(e) =>
                                  saveSet(l, {
                                    reps: Math.max(0, +e.target.value),
                                  })
                                }
                              />
                            </label>
                            <span>{l.done ? "Completed" : "Incomplete"}</span>
                          </div>
                        ))}
                    </div>
                  ))}
                  <label>
                    Session notes
                    <textarea
                      value={s.notes}
                      onChange={(e) =>
                        db.sessions.update(s.id, { notes: e.target.value })
                      }
                    />
                  </label>
                  <button
                    className="button danger-button"
                    onClick={async () => {
                      if (confirm("Delete this workout and all its sets?"))
                        await db.transaction(
                          "rw",
                          [db.sessions, db.sets],
                          async () => {
                            await db.sets
                              .where("sessionId")
                              .equals(s.id)
                              .delete();
                            await db.sessions.delete(s.id);
                          },
                        );
                    }}
                  >
                    <Trash2 size={15} /> Delete workout
                  </button>
                </details>
              ))}
          </div>
        ) : (
          <Empty
            title="Your story starts with one session"
            description="Completed workouts and saved sets will appear here."
          />
        ))}
      {planSettings && p && (
        <PlanSettings profile={p} onClose={() => setPlanSettings(false)} />
      )}
      {info && (
        <Modal title={exerciseById(info).name} onClose={() => setInfo("")}>
          <span className="tag green">
            {exerciseById(info).muscle} · {exerciseById(info).equipment}
          </span>
          <TutorialLink exercise={exerciseById(info)} />
          {exerciseById(info).source && (
            <p className="hint">{exerciseById(info).source}</p>
          )}
          {exerciseById(info).sourceUrl && (
            <a
              className="text-link"
              href={exerciseById(info).sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Read the exercise source (internet required)
            </a>
          )}
          <ExerciseOverview exercise={exerciseById(info)} />
          <h3>How to move</h3>
          <ol>
            {exerciseById(info).instructions.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <h4>Breathing</h4>
          <p>{exerciseById(info).breathing}</p>
          <h4>Common mistakes</h4>
          <p>{exerciseById(info).mistakes}</p>
          <p className="notice">{exerciseById(info).safety}</p>
        </Modal>
      )}
      {replace && p && (
        <Modal title="Choose a replacement" onClose={() => setReplace("")}>
          <p className="hint">
            Your sets for the replaced exercise will be removed. Match the
            movement where possible.
          </p>
          <div className="option-list">
            {eligible(p)
              .filter(
                (e) => !active?.exercises.some((x) => x.exerciseId === e.id),
              )
              .sort(
                (a, b) =>
                  Number(b.pattern === exerciseById(replace).pattern) -
                  Number(a.pattern === exerciseById(replace).pattern),
              )
              .map((e) => (
                <button
                  className="option"
                  key={e.id}
                  onClick={() => {
                    if (
                      confirm("Replace exercise and remove its current sets?")
                    )
                      swap(e.id);
                  }}
                >
                  {e.name}
                  <small>{e.pattern}</small>
                </button>
              ))}
          </div>
        </Modal>
      )}
      {timer > 0 && (
        <div className="rest-timer">
          <Clock size={22} />
          <div>
            <small>REST & RESET</small>
            <strong>
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
            </strong>
          </div>
          <button
            className="icon-button"
            aria-label={paused ? "Resume timer" : "Pause timer"}
            onClick={() => {
              if (paused) setDeadline(Date.now() + timer * 1000);
              setPaused(!paused);
            }}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            className="icon-button"
            aria-label="Stop timer"
            onClick={() => {
              setDeadline(0);
              setTimer(0);
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
function Trending() {
  return <span className="lime">↗</span>;
}
