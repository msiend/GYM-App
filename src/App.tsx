import { useEffect, useState, lazy, Suspense } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Heart,
  LayoutDashboard,
  Leaf,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Target,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { db, defaults } from "./data/db";
import { useUI } from "./store";
import { localDate, nutrition } from "./domain/engine";
import { foods } from "./data/foods";
import { days } from "./domain/calendar";
const Onboarding = lazy(() => import("./components/Onboarding"));
import { Empty, Heading, Ring, SectionTitle } from "./components/ui";
import Workout from "./Workout";
const Nutrition = lazy(() => import("./Nutrition"));
const Progress = lazy(() => import("./Progress"));
const Settings = lazy(() => import("./Settings"));
import type { Profile } from "./domain/types";
export default function App() {
  const profile = useLiveQuery(() => db.profiles.get("me"));
  const settings = useLiveQuery(() => db.settings.get("preferences"));
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
      .catch(() =>
        notify(
          "Device storage is unavailable. Enable IndexedDB in your browser.",
        ),
      );
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    const error = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      notify("Unable to save this change. Check device storage and try again.");
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
    document.documentElement.dataset.theme = settings?.theme || "dark";
    document.documentElement.lang = settings?.language === "hi" ? "hi" : "en";
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
          {!loaded ? (
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
  const sessions = useLiveQuery(() => db.sessions.toArray()) || [];
  const weights =
    useLiveQuery(() => db.weights.orderBy("date").toArray()) || [];
  const intake =
    useLiveQuery(() => db.intake.where("date").equals(localDate()).toArray()) ||
    [];
  const water =
    useLiveQuery(() => db.water.where("date").equals(localDate()).toArray()) ||
    [];
  const settings = useLiveQuery(() => db.settings.get("preferences"));
  const complete = sessions.filter((s) => s.status === "complete");
  const today = new Date();
  const day = plan?.days.find((d) => d.day === today.getDay());
  const next = day || plan?.days[0];
  const n = p ? nutrition(p) : null;
  const consumed = intake.reduce(
    (a, l) =>
      a + ((foods.find((f) => f.id === l.foodId)?.kcal || 0) * l.grams) / 100,
    0,
  );
  const protein = intake.reduce(
    (a, l) =>
      a +
      ((foods.find((f) => f.id === l.foodId)?.protein || 0) * l.grams) / 100,
    0,
  );
  const hi = settings?.language === "hi";
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekCount = complete.filter(
    (s) => s.date >= localDate(weekStart),
  ).length;
  return (
    <>
      <Heading
        eyebrow={today
          .toLocaleDateString(hi ? "hi-IN" : "en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
          .toUpperCase()}
        title={
          hi
            ? `नमस्ते${p ? ", " + p.name.split(" ")[0] : ""}`
            : `Let’s make it count${p ? ", " + p.name.split(" ")[0] : ""}`
        }
        description={
          hi
            ? "आपकी यात्रा। आपकी गति। हर दिन थोड़ा बेहतर।"
            : "Your pace. Your progress. A little stronger, every day."
        }
        action={
          <button
            className="button secondary"
            onClick={() => navigate("/progress")}
          >
            <Plus size={16} />
            {hi ? "प्रगति दर्ज करें" : "Log progress"}
          </button>
        }
      />
      <div className="dashboard-top">
        <section className="hero">
          <div className="hero-copy">
            <span className="pill">
              <span className="pulse" /> YOUR NEXT CHAPTER STARTS HERE
            </span>
            <h2>
              Build your
              <br />
              everyday <em>strong.</em>
            </h2>
            <p>
              A plan that moves with you.
              <br />
              One workout, one good habit at a time.
            </p>
            <button
              className="button"
              onClick={() => (p ? navigate("/workout") : onSetup())}
            >
              {p ? "Let’s get moving" : "Build my personal plan"}
              <ArrowUpRight size={18} />
            </button>
            <div className="hero-caption">
              <ShieldCheck size={13} /> 100% on-device. Always yours.
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit o1" />
            <div className="art-orbit o2" />
            <div className="art-orbit o3" />
            <div className="dumbbell-art">
              <div className="bar" />
              <div className="plate p1" />
              <div className="plate p2" />
              <div className="plate p3" />
              <div className="plate p4" />
            </div>
            <span className="art-label">
              <Zap size={13} /> MADE FOR THE LONG RUN
            </span>
            <span className="art-cross c1">+</span>
            <span className="art-cross c2">+</span>
          </div>
        </section>
        <section className="card weekly-card">
          <div className="card-top">
            <span className="eyebrow">THIS WEEK</span>
            <Activity size={18} className="lime" />
          </div>
          <h3>Show up for yourself.</h3>
          <p className="muted">Consistency is your superpower.</p>
          <div className="weekly-ring">
            <Ring value={weekCount} total={plan?.days.length || 3} size={132}>
              <strong>
                {weekCount}
                <span> / {plan?.days.length || "—"}</span>
              </strong>
              <small>workouts complete</small>
            </Ring>
          </div>
          <div className="mini-days">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + i);
              const done = complete.some((s) => s.date === localDate(d));
              return (
                <div key={i}>
                  <span>{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                  <i
                    className={
                      done
                        ? "done"
                        : localDate(d) === localDate()
                          ? "today"
                          : ""
                    }
                  >
                    {done ? <Check size={13} /> : <span />}
                  </i>
                </div>
              );
            })}
          </div>
          <div className="card-bottom">
            <span>A fresh week. New possibilities.</span>
            <TrendingUp size={16} />
          </div>
        </section>
      </div>
      <div className="stat-grid">
        {[
          {
            label: "WORKOUTS COMPLETED",
            value: String(complete.length),
            unit: "sessions",
            icon: Dumbbell,
            detail: complete.length
              ? "Every session adds up"
              : "Your first rep starts a habit",
          },
          {
            label: "CURRENT WEIGHT",
            value: String(weights.at(-1)?.weight || p?.weight || "—"),
            unit: "kg",
            icon: Activity,
            detail: p
              ? `Starting weight: ${weights[0]?.weight || p.weight} kg`
              : "Track your personal trend",
          },
          {
            label: "TODAY’S ENERGY",
            value: String(Math.round(consumed)),
            unit: "kcal",
            icon: Flame,
            detail:
              n && !n.blocked
                ? `of ~${n.kcal.toLocaleString()} kcal estimated target`
                : "Fuel your day, your way",
          },
          {
            label: "TODAY’S PROTEIN",
            value: String(Math.round(protein)),
            unit: "g",
            icon: Target,
            detail:
              n && !n.blocked
                ? `of ~${n.protein} g reference target`
                : "Small habits. Better recovery.",
          },
        ].map(({ label, value, unit, icon: Icon, detail }) => (
          <section className="card stat" key={label}>
            <div>
              <span className="eyebrow">{label}</span>
              <span className="stat-icon">
                <Icon size={17} />
              </span>
            </div>
            <strong>
              {value}
              <small>{unit}</small>
            </strong>
            <p>
              <span className="tiny-dot" />
              {detail}
            </p>
          </section>
        ))}
      </div>
      <div className="dashboard-bottom">
        <div>
          <SectionTitle
            title="Your training week"
            detail="A little structure. Room for real life."
            action={
              <button
                className="text-link"
                onClick={() => navigate("/workout")}
              >
                View plan <ArrowUpRight size={15} />
              </button>
            }
          />
          <section className="card schedule">
            <div className="schedule-week">
              <button className="icon-button" aria-label="Current week">
                <ChevronLeft size={16} />
              </button>
              <strong>
                {weekStart.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                –{" "}
                {new Date(
                  weekStart.getFullYear(),
                  weekStart.getMonth(),
                  weekStart.getDate() + 6,
                ).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </strong>
              <span className="tag">THIS WEEK</span>
            </div>
            <div className="week-strip">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                const scheduled = plan?.days.some((x) => x.day === d.getDay());
                return (
                  <button
                    key={i}
                    className={localDate(d) === localDate() ? "current" : ""}
                    onClick={() => navigate("/workout")}
                  >
                    <small>{days[d.getDay()].slice(0, 3)}</small>
                    <strong>{d.getDate()}</strong>
                    <i className={scheduled ? "scheduled" : ""} />
                  </button>
                );
              })}
            </div>
            <div className="today-plan">
              <span className="workout-symbol">
                <Dumbbell size={23} />
              </span>
              <div>
                <span className="eyebrow">
                  {day
                    ? "TODAY’S WORKOUT"
                    : next
                      ? "NEXT IN YOUR PLAN"
                      : "YOUR PERSONAL PLAN"}
                </span>
                <h3>{next?.focus || "Your starting line"}</h3>
                <p>
                  {next
                    ? `${next.exercises.length} exercises · ${p?.duration} min · ${plan?.split}`
                    : "Tell us about you. We’ll take it from there."}
                </p>
              </div>
              <button
                className="round-button"
                aria-label="Open workout"
                onClick={() => (p ? navigate("/workout") : onSetup())}
              >
                <ArrowUpRight size={21} />
              </button>
            </div>
          </section>
        </div>
        <div>
          <SectionTitle
            title="Fuel & recover"
            detail="Good training starts with taking care of you."
          />
          <section className="card fuel">
            <div className="fuel-row">
              <div>
                <span className="tag green">NUTRITION</span>
                <h3>Make every bite count.</h3>
                <p>Balanced meals. No complicated rules.</p>
                <button
                  className="text-link"
                  onClick={() => navigate("/nutrition")}
                >
                  Your nutrition space <ArrowRight size={15} />
                </button>
              </div>
              <div className="nutrition-art">
                <Leaf size={42} strokeWidth={1} />
              </div>
            </div>
            <div className="hydration">
              <div>
                <span className="water-icon">◒</span>
                <strong>Stay hydrated</strong>
                <small>
                  {water.reduce((s, w) => s + w.ml, 0)} /{" "}
                  {settings?.hydration || 2000} ml
                </small>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${Math.min(100, (water.reduce((s, w) => s + w.ml, 0) / (settings?.hydration || 2000)) * 100)}%`,
                  }}
                />
              </div>
              <button
                className="text-link"
                onClick={() => navigate("/nutrition?tab=dashboard")}
              >
                Log water <Plus size={14} />
              </button>
            </div>
          </section>
        </div>
      </div>
      <div className="quote-strip">
        <span>
          <Heart size={17} /> A reminder for your journey
        </span>
        <p>“You don’t have to be perfect. You just have to keep going.”</p>
        <ArrowDown size={17} />
      </div>
    </>
  );
}
