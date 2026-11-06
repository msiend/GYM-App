import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  Check,
  Clock,
  Dumbbell,
  Flower2,
  TrendingUp,
  BookOpen,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import AboutExercise from "./components/AboutExercise";
import { TutorialLink } from "./components/ExerciseGuide";
import { bodyPartLabel } from "./domain/exercise-guide";
import PlanSettings from "./components/PlanSettings";
import { db, defaults } from "./data/db";
import { exercises, exerciseById } from "./data/exercises";
import {
  localDate,
  progression,
  uid,
  needsTrainingGuidance,
  PROGRAM_VERSION,
  replacementOptions,
  prescribeExercise,
} from "./domain/engine";
import type { Profile, Session, SetLog } from "./domain/types";
import { Empty, Heading, Modal, Ring } from "./components/ui";
import { days } from "./domain/calendar";
import { useUI } from "./store";
import { saveErrorMessage } from "./data/errors";
import { displayedLoad, storedLoad } from "./domain/weight";
import {
  bodyParts,
  matchesBodyPart,
  matchesExerciseSearch,
} from "./domain/body-parts";
import FitnessDisclaimer from "./components/FitnessDisclaimer";
export default function Workout({
  profile: p,
  onSetup,
}: {
  profile?: Profile;
  onSetup: () => void;
}) {
  const plan = useLiveQuery(() => db.plans.get("current"));
  const sessions = useLiveQuery(() => db.sessions.toArray()) || [];
  const storedLogs = useLiveQuery(() => db.sets.toArray());
  const [pendingSets, setPendingSets] = useState<
    Record<string, Partial<SetLog>>
  >({});
  const logs = (storedLogs || []).map((log) => ({
    ...log,
    ...pendingSets[log.id],
  }));
  const settings =
    useLiveQuery(() => db.settings.get("preferences")) || defaults;
  const [planSettings, setPlanSettings] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState("All muscles");
  const [bodyFilter, setBodyFilter] = useState("all");
  const [workoutBodyFilter, setWorkoutBodyFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("All activities");
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
  const day = plan?.days.find((d) => d.day === selected);
  const nextDay = plan?.days
    .slice()
    .sort(
      (a, b) =>
        ((a.day - selected + 7) % 7 || 7) - ((b.day - selected + 7) % 7 || 7),
    )[0];
  const done = active
    ? logs.filter((l) => l.sessionId === active.id && l.done).length
    : 0;
  const total = active
    ? logs.filter((l) => l.sessionId === active.id).length
    : 0;
  const scheduledExercises = active?.exercises || day?.exercises || [];
  const visibleExercises = scheduledExercises.filter((item) =>
    matchesBodyPart(exerciseById(item.exerciseId), workoutBodyFilter),
  );
  const libraryExercises = exercises.filter(
    (e) =>
      matchesExerciseSearch(e, search) &&
      (muscleFilter === "All muscles" ||
        [e.muscle, ...e.secondary].includes(muscleFilter)) &&
      matchesBodyPart(e, bodyFilter) &&
      (equipmentFilter === "All equipment" ||
        e.equipment === equipmentFilter) &&
      (tab === "yoga"
        ? e.category === "Yoga"
        : activityFilter === "All activities" ||
          (activityFilter === "Strength"
            ? !["Yoga", "Cardio", "Mobility", "Stretching"].includes(e.category)
            : e.category === activityFilter)),
  );
  useEffect(() => {
    if (!storedLogs) return;
    setPendingSets((current) => {
      let changed = false;
      const next = { ...current };
      for (const [id, patch] of Object.entries(current)) {
        const saved = storedLogs.find((log) => log.id === id);
        if (
          !saved ||
          Object.entries(patch).every(
            ([key, value]) => saved[key as keyof SetLog] === value,
          )
        ) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [storedLogs]);
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
    if (
      !day ||
      starting ||
      !p ||
      needsTrainingGuidance(p) ||
      plan?.version !== PROGRAM_VERSION
    )
      return;
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
              technique: false,
            })),
          );
      });
      setTab("plan");
    } finally {
      setStarting(false);
    }
  }
  async function saveSet(log: SetLog, patch: Partial<SetLog>) {
    setPendingSets((current) => ({
      ...current,
      [log.id]: { ...current[log.id], ...patch },
    }));
    try {
      if (!(await db.sets.update(log.id, patch)))
        throw new Error("SetNotFound");
    } catch (error) {
      setPendingSets((current) => {
        const remaining = { ...current[log.id] };
        for (const [key, value] of Object.entries(patch))
          if (remaining[key as keyof SetLog] === value)
            delete remaining[key as keyof SetLog];
        const next = { ...current };
        if (Object.keys(remaining).length) next[log.id] = remaining;
        else delete next[log.id];
        return next;
      });
      notify(saveErrorMessage(error, "this set", { savedValueRestored: true }));
      return;
    }
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
    if (
      !active ||
      !p ||
      !replacementOptions(p, exerciseById(replace)).some((e) => e.id === id)
    )
      return;
    const old = active.exercises.find((e) => e.exerciseId === replace)!;
    const prescription = {
      ...prescribeExercise(p, exerciseById(id)),
      sets: Math.min(old.sets, prescribeExercise(p, exerciseById(id)).sets),
    };
    await db.transaction("rw", [db.sessions, db.sets], async () => {
      await db.sets
        .where("sessionId")
        .equals(active.id)
        .filter((l) => l.exerciseId === replace)
        .delete();
      await db.sessions.update(active.id, {
        exercises: active.exercises.map((e) =>
          e.exerciseId === replace ? prescription : e,
        ),
      });
      await db.sets.bulkAdd(
        Array.from({ length: prescription.sets }, (_, i) => ({
          id: uid(),
          sessionId: active.id,
          exerciseId: id,
          index: i,
          weight: 0,
          reps: prescription.reps,
          done: false,
          rpe: 7,
          pain: false,
          technique: false,
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
      <FitnessDisclaimer />
      <div className="tabs workout-tabs">
        {["plan", "library", "yoga", "history"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              setTab(t);
              if (t === "yoga") {
                setBodyFilter("all");
                setMuscleFilter("All muscles");
                setEquipmentFilter("All equipment");
                setSearch("");
              }
            }}
          >
            {t === "plan"
              ? "My workout"
              : t === "library"
                ? "Exercise library"
                : t === "yoga"
                  ? "Yoga"
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
        ) : needsTrainingGuidance(p) ? (
          <Empty
            title="Let’s put your health first"
            description="Your age or reported health restrictions need qualified guidance before using an unrestricted adult plan. The exercise library is available for educational reference."
          />
        ) : (
          <>
            {!plan && !active && (
              <Empty
                title="Create your weekly plan"
                description="Your profile is saved. Choose your available days and equipment to preview a weekly plan."
              >
                <button
                  className="button"
                  onClick={() => setPlanSettings(true)}
                >
                  Create weekly plan <ArrowRight size={16} />
                </button>
              </Empty>
            )}
            {p.goal === "Fat loss" && (
              <section className="card fat-loss-guide">
                <h2>Fat loss & body-part strength</h2>
                <p>
                  Train the whole body and build comfortable activity gradually.
                  Choose a body part to learn strengthening exercises; these do
                  not selectively burn fat from that area. Sustainable
                  nutrition, recovery and consistency matter.
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setTab("library");
                    setBodyFilter("all");
                    setMuscleFilter("All muscles");
                    setActivityFilter("Strength");
                    setEquipmentFilter("All equipment");
                    setSearch("");
                  }}
                >
                  Explore body-part exercises <ArrowRight size={16} />
                </button>
              </section>
            )}
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
                {plan.version !== PROGRAM_VERSION && (
                  <p className="notice">
                    This saved plan predates the technique and programming
                    audit. Use Change plan to review and save the updated
                    preview before starting. Your history is preserved.
                  </p>
                )}
                {plan.split === "Full body" && (
                  <p className="hint">
                    Full-body sessions train several muscle groups on each
                    training day. A repeated focus is intentional; recovery days
                    are separate.
                  </p>
                )}
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
            {!active && plan && (
              <div className="day-picker" role="group" aria-label="Workout day">
                {days.map((d, i) => (
                  <button
                    key={d}
                    className={selected === i ? "selected" : ""}
                    aria-pressed={selected === i}
                    title={`${d}: ${plan?.days.find((x) => x.day === i)?.focus || "Recovery day"}`}
                    onClick={() => {
                      setSelected(i);
                      setWorkoutBodyFilter("all");
                    }}
                  >
                    {d.slice(0, 3)}
                    {plan?.days.some((x) => x.day === i) && (
                      <span className="tiny-dot" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {!active && plan && !day && (
              <section className="card recovery-day">
                <h2>{days[selected]} · Recovery day</h2>
                <p>
                  No workout is scheduled for {days[selected]}. Rest, or choose
                  gentle walking or comfortable mobility if you feel ready.
                </p>
                {nextDay && (
                  <>
                    <p className="hint">
                      Next scheduled workout: {days[nextDay.day]} ·{" "}
                      {nextDay.focus}
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => setSelected(nextDay.day)}
                    >
                      View {days[nextDay.day]} workout <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </section>
            )}
            {active && (
              <p className="notice">
                Your workout from {active.date} is in progress. Finish this
                workout to browse other days. Your sets are saved as you go.
              </p>
            )}
            {(active || day) && (
              <>
                <section className="card workout-summary">
                  <div>
                    <span className="tag green">
                      {active ? "WORKOUT IN PROGRESS" : plan?.split}
                    </span>
                    <h2>
                      {active
                        ? active.focus
                        : `${days[selected]} · ${day?.focus}`}
                    </h2>
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
                      Up to {p.duration} min <span>•</span>{" "}
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
                      disabled={starting || plan?.version !== PROGRAM_VERSION}
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
                {active && (
                  <details className="card instruction">
                    <summary>How to record sets, load & effort</summary>
                    <p>
                      Record what you actually performed. For paired dumbbells,
                      record one dumbbell's weight; for a single dumbbell,
                      record that weight. Barbell load includes the bar.
                      Bodyweight practice can use zero external load. Check
                      technique only when the set felt controlled.
                    </p>
                    <p>
                      RPE is your perceived effort from 1 (very easy) to 10
                      (maximum). Edit it for each set. Start with manageable
                      effort and finish with about 2–3 repetitions still
                      possible. Stop painful movements.
                    </p>
                  </details>
                )}
                <div className="workout-body-filter">
                  <label>
                    Filter workout by body part
                    <select
                      aria-label="Filter workout by body part"
                      value={workoutBodyFilter}
                      onChange={(e) => setWorkoutBodyFilter(e.target.value)}
                    >
                      {bodyParts.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="hint" role="status">
                    Showing {visibleExercises.length} of{" "}
                    {scheduledExercises.length} exercises. Filtering changes
                    only the view; all scheduled sets stay saved.
                  </p>
                  {workoutBodyFilter !== "all" && (
                    <button
                      className="text-link"
                      onClick={() => setWorkoutBodyFilter("all")}
                    >
                      Show all workout exercises
                    </button>
                  )}
                </div>
                {!visibleExercises.length && (
                  <Empty
                    title="No matching exercises in this session"
                    description="Choose another body part or show the full workout. The exercise library includes other muscle groups."
                  />
                )}
                {visibleExercises.map((item) => {
                  const i = scheduledExercises.indexOf(item);
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
                              ? `${item.reps} sec`
                              : `${Math.max(5, item.reps - 4)}–${item.reps} reps`}{" "}
                            {ex.unilateral ? "each side · " : ""}· {item.rest}s
                            rest
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
                          aria-label={`About the exercise: ${ex.name}`}
                          onClick={() => setInfo(ex.id)}
                        >
                          <BookOpen size={16} />
                          About the exercise
                        </button>
                        <TutorialLink exercise={ex} />
                      </div>
                      {active && (
                        <>
                          <p className="hint">
                            {previous.length
                              ? `Previous: ${previous.map((l) => `${displayedLoad(l.weight, settings.unit)} ${settings.unit} × ${l.reps}`).join(" · ")}`
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
                                    step="any"
                                    value={displayedLoad(
                                      log.weight,
                                      settings.unit,
                                    )}
                                    onChange={(e) =>
                                      saveSet(log, {
                                        weight: storedLoad(
                                          +e.target.value,
                                          settings.unit,
                                        ),
                                      })
                                    }
                                  />
                                  <input
                                    aria-label={`Set ${index + 1} ${ex.tracking === "seconds" ? "seconds" : "repetitions"}`}
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
                                {log.pain && (
                                  <p role="alert" className="notice danger">
                                    Stop painful movements and seek appropriate
                                    guidance before resuming.
                                  </p>
                                )}
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
                                  technique: false,
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
                            {progression(sessions, logs, ex.id, item.reps, {
                              recoveryLimited:
                                p.recovery === "Limited recovery",
                              prescribedSets: item.sets,
                            })}
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
      {(tab === "library" || tab === "yoga") && (
        <>
          {tab === "yoga" ? (
            <section className="card yoga-intro">
              <h2>Gentle yoga · learn at your pace</h2>
              <p>
                Eight gentle guides for comfortable movement and relaxed
                breathing. Stay within a pain-free range.
              </p>
              <details className="yoga-practice-notes">
                <summary>Practice guidelines & limitations</summary>
                <p>
                  Start with a few easy breaths, adapt positions to your
                  ability, and use a qualified instructor for unfamiliar poses.
                  Skip painful positions, forced stretches, headstands, shoulder
                  stands and breath holds. These guides do not prescribe
                  treatment or replace strength/cardio training.
                </p>
              </details>
            </section>
          ) : (
            <section className="card fat-loss-guide">
              <h2>Choose a body part to strengthen</h2>
              <p>
                Body-part filters include primary and supporting muscles. Core,
                arm or thigh exercises build muscle function; fat loss happens
                across the body and cannot be targeted to one area.
              </p>
            </section>
          )}
          <div
            className={`body-part-shortcuts ${tab === "yoga" ? "yoga-shortcuts" : ""}`}
            role="group"
            aria-label="Body-part exercise choices"
          >
            {bodyParts.map((part) => (
              <button
                className={bodyFilter === part.id ? "selected" : ""}
                aria-pressed={bodyFilter === part.id}
                key={part.id}
                onClick={() => {
                  setBodyFilter(part.id);
                  setMuscleFilter("All muscles");
                }}
              >
                {part.label}
              </button>
            ))}
          </div>
          <div
            className={`library-main-filter ${tab === "yoga" ? "yoga-body-filter" : ""}`}
          >
            <label>
              Body part
              <select
                aria-label="Filter library by body part"
                value={bodyFilter}
                onChange={(e) => setBodyFilter(e.target.value)}
              >
                {bodyParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <details className="library-advanced-filters">
            <summary>
              More filters: muscle, equipment & activity
              {muscleFilter !== "All muscles" ||
              equipmentFilter !== "All equipment" ||
              (tab !== "yoga" && activityFilter !== "All activities")
                ? " · filter active"
                : ""}
            </summary>
            <div className="library-filters">
              <label>
                Specific muscle
                <select
                  aria-label="Filter by specific muscle"
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
                  aria-label="Filter library by equipment"
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
              {tab !== "yoga" && (
                <label>
                  Activity type
                  <select
                    aria-label="Filter by activity type"
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                  >
                    {[
                      "All activities",
                      "Strength",
                      "Yoga",
                      "Cardio",
                      "Mobility",
                      "Stretching",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </details>
          <div className="search-bar">
            <input
              placeholder="Search muscles, movements or exercises…"
              aria-label="Search exercise library"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span role="status">
              {libraryExercises.length} matching · {exercises.length} offline
              exercises
            </span>
          </div>
          <div className="library-grid">
            {libraryExercises.map((e) => (
              <article className="card library-item" key={e.id}>
                <button
                  className="exercise-library-open"
                  onClick={() => setInfo(e.id)}
                >
                  <div className="exercise-glyph">
                    {e.category === "Yoga" ? (
                      <Flower2 size={28} />
                    ) : (
                      <Dumbbell size={28} />
                    )}
                  </div>
                  <span className="eyebrow">
                    {e.muscle} · {e.equipment}
                  </span>
                  <h3>{e.name}</h3>
                  <span className="muted">
                    About the exercise <ArrowRight size={16} />
                  </span>
                </button>
                <TutorialLink exercise={e} />
              </article>
            ))}
          </div>
          {!libraryExercises.length && (
            <Empty
              title="No exercises match these filters"
              description="Try a different body part, equipment choice or search."
            >
              <button
                className="button secondary"
                onClick={() => {
                  setBodyFilter("all");
                  setMuscleFilter("All muscles");
                  setEquipmentFilter("All equipment");
                  setActivityFilter("All activities");
                  setSearch("");
                }}
              >
                Reset exercise filters
              </button>
            </Empty>
          )}
          <p className="hint">
            This library combines adapted Free Exercise DB references with
            app-authored introductory exercise and yoga guides. Each entry
            states its provenance. Official-source verification remains
            incomplete; these guides are not a professional technique
            assessment.
          </p>
        </>
      )}
      {tab === "history" &&
        (sessions.length ? (
          <div className="stack">
            {sessions
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
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
                        .sort((a, b) => a.index - b.index)
                        .map((l) => (
                          <div className="history-set" key={l.id}>
                            <label>
                              {settings.unit.toUpperCase()}
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                step="any"
                                value={displayedLoad(l.weight, settings.unit)}
                                onChange={(e) =>
                                  saveSet(l, {
                                    weight: storedLoad(
                                      +e.target.value,
                                      settings.unit,
                                    ),
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
        <AboutExercise
          exercise={exerciseById(info)}
          onClose={() => setInfo("")}
        />
      )}
      {replace && p && (
        <Modal title="Choose a replacement" onClose={() => setReplace("")}>
          <p className="hint">
            Choose a matching movement for the same muscle focus and your
            confirmed equipment. Current sets for the replaced exercise will be
            removed and conservative targets reset.
          </p>
          <div className="option-list">
            {replacementOptions(p, exerciseById(replace))
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
            {!replacementOptions(p, exerciseById(replace)).some(
              (e) => !active?.exercises.some((x) => x.exerciseId === e.id),
            ) && (
              <p>
                No matching replacement is available with your equipment and
                restrictions. Skip the painful or unsuitable movement and ask a
                qualified trainer for an alternative.
              </p>
            )}
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
  return <TrendingUp className="lime" size={16} aria-hidden="true" />;
}
