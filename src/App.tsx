import { useEffect, useState, lazy, Suspense } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Dumbbell,
  LayoutDashboard,
  Leaf,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  TrendingUp,
  Wifi,
  WifiOff,
  UserRound,
} from "lucide-react";
import HydrationCard from "./features/hydration/HydrationCard";
import { useHydrationReminders } from "./features/hydration/useHydrationReminders";
import { saveErrorMessage } from "./data/errors";
import { db, defaults } from "./data/db";
import { useUI } from "./store";
import { localDate, nutrition, needsTrainingGuidance } from "./domain/engine";
import { foods as baseFoods } from "./data/foods";
import { indianMeals } from "./data/recipes";
import { days } from "./domain/calendar";
const Onboarding = lazy(() => import("./components/Onboarding"));
import { Empty, Heading, SectionTitle } from "./components/ui";
const Workout = lazy(() => import("./Workout"));
const Nutrition = lazy(() => import("./Nutrition"));
const Progress = lazy(() => import("./Progress"));
const Settings = lazy(() => import("./Settings"));
import type { Profile } from "./domain/types";
import Brand from "./components/Brand";
import { scheduleCounts } from "./domain/engine";
export default function App() {
  const account = useLiveQuery(async () => {
    try {
      return { profile: await db.profiles.get("me"), error: "" };
    } catch (error) {
      return {
        profile: undefined,
        error: saveErrorMessage(error, "the local database"),
      };
    }
  });
  const profile = account?.profile;
  const loaded = account !== undefined;
  const loadError = account?.error || "";
  const settings = useLiveQuery(() =>
    db.settings.get("preferences").catch(() => undefined),
  );
  useHydrationReminders({ ...defaults, ...settings });
  const [wizard, setWizard] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const { toast, notify } = useUI();
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    const error = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      notify(saveErrorMessage(e.reason));
      console.error(e.reason);
    };
    window.addEventListener("unhandledrejection", error);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("unhandledrejection", error);
    };
  }, [notify]);
  useEffect(() => {
    document.documentElement.dataset.theme = settings?.theme || "light";
    document.documentElement.lang = settings?.language === "hi" ? "hi" : "en";
    document.documentElement.dataset.textSize = settings?.textSize || "normal";
  }, [settings]);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() =>
        notify(
          "Offline cache could not be installed. Try reopening while online.",
        ),
      );
  }, [notify]);
  useEffect(() => {
    if (!settings?.reminders) return;
    const tick = setInterval(() => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (
        settings.reminderDays.includes(now.getDay()) &&
        time === settings.reminderTime &&
        sessionStorage.getItem("reminded") !== localDate()
      ) {
        sessionStorage.setItem("reminded", localDate());
        if ("Notification" in window && Notification.permission === "granted")
          navigator.serviceWorker.ready.then((r) =>
            r.showNotification("FORM · Time for you", {
              body: settings.reminderMessage,
              icon: "/icon-192.png",
            }),
          );
      }
    }, 30000);
    return () => clearInterval(tick);
  }, [settings]);
  const hi = settings?.language === "hi";
  const links = [
    ["/", hi ? "होम" : "Overview", LayoutDashboard],
    ["/workout", hi ? "वर्कआउट" : "Workout", Dumbbell],
    ["/nutrition", hi ? "पोषण" : "Nutrition", Leaf],
    ["/progress", hi ? "प्रगति" : "Progress", TrendingUp],
    ["/settings", hi ? "सेटिंग्स" : "Settings", SettingsIcon],
  ] as const;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation">
          {links.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="device-note">
            <ShieldCheck size={16} /> Stored on this device
          </p>
          <button
            className="profile-button"
            disabled={!loaded || !!loadError}
            onClick={() => setWizard(true)}
          >
            <span className="avatar">
              <UserRound size={18} aria-hidden="true" />
            </span>
            <span>
              <strong>{profile?.name || "Your profile"}</strong>
              <small>{profile ? "Edit profile" : "Create a plan"}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Brand />
          <span className="topbar-date">
            {new Date().toLocaleDateString(hi ? "hi-IN" : "en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
          <div className="top-actions">
            <span className="connection">
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{online ? "On device" : "Offline"}</span>
            </span>
            <button
              className="avatar small"
              onClick={() => setWizard(true)}
              aria-label={profile ? "Open profile" : "Create profile"}
              disabled={!loaded || !!loadError}
            >
              <UserRound size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {loadError ? (
            <Empty title="Local storage unavailable" description={loadError}>
              <button className="button" onClick={() => location.reload()}>
                Try again
              </button>
            </Empty>
          ) : !loaded ? (
            <Empty
              title="Preparing your space"
              description="Opening your on-device database…"
            />
          ) : (
            <Suspense fallback={<p className="muted">Opening your space…</p>}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Home profile={profile} onSetup={() => setWizard(true)} />
                  }
                />
                <Route
                  path="/workout"
                  element={
                    <Workout
                      profile={profile}
                      onSetup={() => setWizard(true)}
                    />
                  }
                />
                <Route
                  path="/nutrition"
                  element={
                    <Nutrition
                      profile={profile}
                      onSetup={() => setWizard(true)}
                    />
                  }
                />
                <Route
                  path="/progress"
                  element={<Progress profile={profile} />}
                />
                <Route
                  path="/settings"
                  element={
                    <Settings
                      profile={profile}
                      settings={settings || defaults}
                      onEdit={() => setWizard(true)}
                    />
                  }
                />
                <Route
                  path="*"
                  element={
                    <Empty
                      title="Page not found"
                      description="Use the navigation to return to your space."
                    />
                  }
                />
              </Routes>
            </Suspense>
          )}
          <footer className="app-footer">
            <span>
              <ShieldCheck size={14} /> Private on your device
            </span>
            <NavLink to="/settings">Backup & settings</NavLink>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([path, label, Icon]) => (
          <NavLink key={path} end={path === "/"} to={path}>
            <Icon size={21} />
            <span>{label === "Overview" ? "Home" : label}</span>
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={null}>
        {wizard && (
          <Onboarding profile={profile} onClose={() => setWizard(false)} />
        )}
      </Suspense>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Home({
  profile: p,
  onSetup,
}: {
  profile?: Profile;
  onSetup: () => void;
}) {
  const navigate = useNavigate();
  const plan = useLiveQuery(() => db.plans.get("current"));
  const custom = useLiveQuery(() => db.customFoods.toArray()) || [];
  const foods = [...baseFoods, ...indianMeals, ...custom];
  const sessions = useLiveQuery(() => db.sessions.toArray()) || [];
  const intake =
    useLiveQuery(() => db.intake.where("date").equals(localDate()).toArray()) ||
    [];
  const settings =
    useLiveQuery(() => db.settings.get("preferences")) || defaults;
  const n = p ? nutrition(p) : null;
  const trainingGuidance = p ? needsTrainingGuidance(p) : false;
  const day = trainingGuidance
    ? undefined
    : plan?.days.find((d) => d.day === new Date().getDay());
  const active = sessions.find((s) => s.status === "active");
  const calories = intake.reduce(
    (s, l) =>
      s + ((foods.find((f) => f.id === l.foodId)?.kcal || 0) * l.grams) / 100,
    0,
  );
  const protein = intake.reduce(
    (s, l) =>
      s +
      ((foods.find((f) => f.id === l.foodId)?.protein || 0) * l.grams) / 100,
    0,
  );
  if (!p)
    return (
      <>
        <Heading
          title="Your fitness, simplified"
          description="Create a plan or explore the library first."
        />
        <section className="welcome-panel">
          <div>
            <span className="eyebrow">WELCOME TO FORM</span>
            <h2>A routine that fits your life.</h2>
            <p>
              Choose your days, your goal and your equipment. Keep everything on
              your device.
            </p>
            <div className="welcome-actions">
              <button className="button" onClick={onSetup}>
                Create my profile <ArrowRight size={17} />
              </button>
              <button
                className="button secondary"
                onClick={() => navigate("/workout?tab=library")}
              >
                Browse exercises
              </button>
            </div>
            <div className="welcome-facts">
              <span>No account needed</span>
              <span>Offline after setup</span>
            </div>
          </div>
          <img
            className="welcome-logo"
            src="/icon-192.png"
            alt=""
            width="132"
            height="132"
          />
        </section>
        <div className="quick-start-grid">
          <button
            className="card quick-start"
            onClick={() => navigate("/workout?tab=library")}
          >
            <Dumbbell />
            <div>
              <h3>Exercise library</h3>
              <p>132 guides. Browse without a profile.</p>
            </div>
            <ArrowRight size={18} />
          </button>
          <button
            className="card quick-start"
            onClick={() => navigate("/workout?tab=yoga")}
          >
            <Leaf />
            <div>
              <h3>Gentle yoga</h3>
              <p>Movement, balance and easy breathing.</p>
            </div>
            <ArrowRight size={18} />
          </button>
        </div>
      </>
    );
  const counts = plan ? scheduleCounts(plan) : null;
  return (
    <>
      <Heading
        eyebrow={new Date().toLocaleDateString(
          settings.language === "hi" ? "hi-IN" : "en-IN",
          { weekday: "long", day: "numeric", month: "long" },
        )}
        title={
          settings.language === "hi"
            ? `नमस्ते${p ? ", " + p.name.split(" ")[0] : ""}`
            : `Hello${p ? ", " + p.name.split(" ")[0] : ""}`
        }
        action={
          <button
            className="button secondary"
            onClick={() => navigate("/progress")}
          >
            <Plus size={16} />
            Log progress
          </button>
        }
      />
      <div className="simple-today-grid">
        <section className="card today-workout">
          <span className="eyebrow">TODAY’S WORKOUT</span>
          <h2>
            {trainingGuidance
              ? "Professional guidance first"
              : active
                ? active.focus
                : day
                  ? day.focus
                  : !plan
                    ? "Set up your week"
                    : "Rest & recovery"}
          </h2>
          <p>
            {trainingGuidance
              ? "Your age or reported restrictions need qualified guidance before using an automatic adult workout plan."
              : active
                ? "Your last saved session is ready to continue."
                : day
                  ? `${day.exercises.length} exercises · up to ${p?.duration} min`
                  : !plan
                    ? "Choose your training days, time and equipment."
                    : "No workout scheduled today. Gentle movement is optional."}
          </p>
          <button
            className="button"
            onClick={() => (p ? navigate("/workout") : onSetup())}
          >
            <Dumbbell size={17} />
            {active
              ? "Continue workout"
              : day
                ? "Open today’s workout"
                : "View my weekly plan"}
          </button>
        </section>
        <section className="card today-food">
          <span className="eyebrow">TODAY’S FOOD</span>
          <div className="today-macros">
            <div>
              <strong>
                {Math.round(calories)}
                <small> kcal</small>
              </strong>
              <p>
                {n && !n.blocked
                  ? `~${n.kcal} estimated target`
                  : "Energy logged"}
              </p>
            </div>
            <div>
              <strong>
                {Math.round(protein)}
                <small> g</small>
              </strong>
              <p>
                {n && !n.blocked
                  ? `~${n.protein} g protein reference`
                  : "Protein logged"}
              </p>
            </div>
          </div>
          <button
            className="button secondary"
            onClick={() => navigate("/nutrition?tab=foods")}
          >
            <Plus size={16} />
            Add food or Indian meal
          </button>
        </section>
      </div>
      <HydrationCard />
      <SectionTitle
        title="Your week"
        detail={
          counts
            ? counts.total +
              " scheduled · " +
              counts.strength +
              " strength" +
              (counts.light ? " · " + counts.light + " easy" : "")
            : "Create a weekly plan to get started."
        }
        action={
          <button className="text-link" onClick={() => navigate("/workout")}>
            View week <ArrowRight size={15} />
          </button>
        }
      />
      <div className="home-week-list">
        {Array.from({ length: 7 }, (_, i) => {
          const d = (i + 1) % 7;
          const training = plan?.days.find((x) => x.day === d);
          return (
            <button
              className={`card week-item ${d === new Date().getDay() ? "is-today" : ""}`}
              key={d}
              onClick={() => navigate("/workout?day=" + d)}
              title={days[d] + ": " + (training?.focus || "Rest day")}
            >
              <span>
                <span aria-hidden="true">{days[d].slice(0, 3)}</span>
                <span className="sr-only">{days[d]} </span>
              </span>
              <span
                className={
                  "week-dot " +
                  (training?.kind === "light"
                    ? "light"
                    : training
                      ? "strength"
                      : "rest")
                }
              />
              <small>
                {training
                  ? training.kind === "light"
                    ? "Easy"
                    : "Strength"
                  : "Rest"}
              </small>
            </button>
          );
        })}
      </div>
      {plan?.rationale && (
        <details className="card instruction">
          <summary>Plan details</summary>
          <p>{plan.rationale}</p>
        </details>
      )}
      <div className="simple-links">
        <button
          className="card"
          onClick={() => navigate("/nutrition?tab=foods")}
        >
          <Leaf size={22} />
          <strong>Food library</strong>
          <p>Indian foods, meals and your own entries.</p>
          <ArrowUpRight size={17} />
        </button>
        <button className="card" onClick={() => navigate("/progress")}>
          <TrendingUp size={22} />
          <strong>Your progress</strong>
          <p>
            {sessions.filter((s) => s.status === "complete").length} workouts
            completed. Log weight and measurements.
          </p>
          <ArrowUpRight size={17} />
        </button>
      </div>
    </>
  );
}
