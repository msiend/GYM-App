import { useEffect, useState, lazy, Suspense } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
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
} from "lucide-react";
import HydrationCard from "./features/hydration/HydrationCard";
import { useHydrationReminders } from "./features/hydration/useHydrationReminders";
import { saveErrorMessage } from "./data/errors";
import { db, defaults } from "./data/db";
import { useUI } from "./store";
import { localDate, nutrition } from "./domain/engine";
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
export default function App() {
  const profile = useLiveQuery(() => db.profiles.get("me"));
  const settings = useLiveQuery(() => db.settings.get("preferences"));
  useHydrationReminders({ ...defaults, ...settings });
  const [loadError, setLoadError] = useState("");
  const [wizard, setWizard] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const { toast, notify } = useUI();
  useEffect(() => {
    db.profiles
      .get("me")
      .then((p) => {
        setLoaded(true);
        if (!p) setWizard(true);
      })
      .catch((error) => {
        setLoadError(saveErrorMessage(error, "the local database"));
      });
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
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">F</span>FORM
          <span className="brand-dot">®</span>
        </NavLink>
        <div className="sidebar-label">YOUR EVERYDAY STRONG</div>
        <nav>
          {links.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <ShieldCheck size={23} />
            <strong>Your data. Your device.</strong>
            <p>
              Made for you.
              <br />
              Built to work offline.
            </p>
            <span>
              <i /> On-device storage
            </span>
          </div>
          <button className="profile-button" onClick={() => setWizard(true)}>
            <span className="avatar">
              {profile?.name[0]?.toUpperCase() || "Y"}
            </span>
            <span>
              <strong>{profile?.name || "Your profile"}</strong>
              <small>{profile ? "Keep showing up" : "Let’s get started"}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Your space <span>/</span>{" "}
            <strong>Every day is a fresh start</strong>
          </div>
          <div className="top-actions">
            <span className="connection">
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{online ? "On-device data" : "You’re offline"}</span>
            </span>
            <button
              className="icon-button"
              aria-label="Reminder settings"
              onClick={() => (location.hash = "")}
              style={{ display: "none" }}
            >
              <Bell size={18} />
            </button>
            <NavLink
              to="/settings"
              className="icon-button"
              aria-label="Open settings"
            >
              <Bell size={18} />
            </NavLink>
            <button
              className="avatar small"
              onClick={() => setWizard(true)}
              aria-label="Edit profile"
            >
              {profile?.name[0]?.toUpperCase() || "Y"}
            </button>
          </div>
        </header>
        <main>
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
            <span>SMALL STEPS. STRONGER YOU.</span>
            <span>
              <ShieldCheck size={12} /> Private by design · *Offline after first
              cache
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
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
  const day = plan?.days.find((d) => d.day === new Date().getDay());
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
        description="Your workout, meals and progress in one place."
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
      {!p && (
        <Empty
          title="Let’s set up your plan"
          description="Tell us your goal, experience, schedule and equipment. You can change everything later."
        >
          <button className="button" onClick={onSetup}>
            Create my profile
            <ArrowRight size={16} />
          </button>
        </Empty>
      )}
      <div className="simple-today-grid">
        <section className="card today-workout">
          <span className="eyebrow">TODAY’S WORKOUT</span>
          <h2>{active ? active.focus : day ? day.focus : "Rest & recovery"}</h2>
          <p>
            {active
              ? "Your last saved session is ready to continue."
              : day
                ? `${day.exercises.length} exercises · about ${p?.duration} min`
                : "No resistance workout scheduled today. Gentle movement is optional."}
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
        detail={plan?.split || "Set up a profile to create your weekly plan."}
        action={
          <button className="text-link" onClick={() => navigate("/workout")}>
            View or change plan <ArrowRight size={15} />
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
              onClick={() => navigate("/workout")}
            >
              <span>
                {days[d]}
                {d === new Date().getDay() && <small>Today</small>}
              </span>
              <strong>{training?.focus || "Rest day"}</strong>
              <small>
                {training
                  ? `${training.exercises.length} exercises`
                  : "Recover / gentle movement"}
              </small>
            </button>
          );
        })}
      </div>
      {plan?.rationale && (
        <details className="card instruction">
          <summary>Why this plan?</summary>
          <p>{plan.rationale}</p>
        </details>
      )}
      <div className="simple-links">
        <button
          className="card"
          onClick={() => navigate("/nutrition?tab=foods")}
        >
          <Leaf size={22} />
          <strong>Indian foods & your own labels</strong>
          <p>Moong, dal, roti, peanut butter and more.</p>
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
