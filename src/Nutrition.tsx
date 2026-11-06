import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowRight,
  BookOpen,
  Droplets,
  Leaf,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { db, defaults } from "./data/db";
import { foods as baseFoods, allowedFoods } from "./data/foods";
import { indianMeals, labelTemplates } from "./data/recipes";
import HydrationCard from "./features/hydration/HydrationCard";
import CustomFood from "./components/CustomFood";
import FitnessDisclaimer from "./components/FitnessDisclaimer";
import { buildMealIdeas } from "./features/nutrition/meal-ideas";
import { saveMealItem, validPortion } from "./features/nutrition/repository";
import {
  groupMealItems,
  proteinByMeal,
  totalNutrients,
  nutritionSeries,
} from "./domain/nutrition";
import { saveErrorMessage } from "./data/errors";
import { localDate, nutrition, uid } from "./domain/engine";
import type { Profile, Food, MealPlan } from "./domain/types";
import { Empty, Heading, Modal, Ring } from "./components/ui";
import { useUI } from "./store";
import { days } from "./domain/calendar";
const tabs = [
  "dashboard",
  "plan",
  "foods",
  "protein",
  "analytics",
  "history",
  "learn",
];
const names = [
  "Overview",
  "Meal ideas",
  "Food database",
  "Protein tracker",
  "Analytics",
  "Diet history",
  "Learn",
];
export default function Nutrition({
  profile: p,
  onSetup,
}: {
  profile?: Profile;
  onSetup: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const tab = tabs.includes(params.get("tab") || "")
    ? params.get("tab")!
    : "dashboard";
  const [search, setSearch] = useState("");
  const customFoods = useLiveQuery(() => db.customFoods.toArray()) || [];
  const foods = [...baseFoods, ...indianMeals, ...customFoods];
  const [customOpen, setCustomOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loggingMeal, setLoggingMeal] = useState<number>();
  const [customTemplate, setCustomTemplate] =
    useState<(typeof labelTemplates)[number]>();
  const [customEdit, setCustomEdit] = useState<Food>();
  const [foodFilter, setFoodFilter] = useState("all");
  const [food, setFood] = useState<Food>();
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState("Breakfast");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [editMeal, setEditMeal] = useState<MealPlan>();
  const [range, setRange] = useState(7);
  const [date, setDate] = useState(localDate());
  const settings =
    useLiveQuery(() => db.settings.get("preferences")) || defaults;
  const logs = useLiveQuery(() => db.intake.toArray()) || [];
  const water = useLiveQuery(() => db.water.toArray()) || [];
  const plans = useLiveQuery(() => db.meals.toArray()) || [];
  const { notify } = useUI();
  const n = p ? nutrition(p) : null;
  const todayLogs = logs.filter((l) => l.date === localDate());
  const totals = totalNutrients(todayLogs, foods);
  const safe = p ? allowedFoods(p.diet, p.allergies, p.dislikes, foods) : foods;
  async function generate() {
    if (!p || !n || n.blocked || busy) return;
    if (
      plans.length &&
      !confirm(
        "Replace your saved seven-day meal suggestions? Your food intake history will stay unchanged.",
      )
    )
      return;
    setBusy(true);
    try {
      const suggestions = buildMealIdeas(p, safe, uid);
      if (!suggestions.length) {
        notify(
          "Your exclusions leave too few options. Add foods manually or review preferences.",
        );
        return;
      }
      await db.transaction("rw", db.meals, async () => {
        await db.meals.clear();
        await db.meals.bulkAdd(suggestions);
      });
      notify(
        "Meal ideas saved. Review portions and add foods to suit your needs.",
      );
    } finally {
      setBusy(false);
    }
  }
  const mealGroups = groupMealItems(plans, selectedDay);
  const dayPlanTotals = totalNutrients(
    mealGroups.flatMap((group) => group.items),
    foods,
  );
  const safeIds = new Set(safe.map((food) => food.id));
  const mealNames = [
    ...new Set([
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snack",
      "Pre-workout",
      "Post-workout",
      ...plans.map((item) => item.title),
      ...todayLogs.map((item) => item.meal),
    ]),
  ];
  const mealProtein = proteinByMeal(todayLogs, foods);
  async function logMeal(items: MealPlan[], slot: number) {
    if (
      loggingMeal !== undefined ||
      items.some((item) => !safeIds.has(item.foodId))
    )
      return;
    if (!confirm("Log every food in this meal for today?")) return;
    setLoggingMeal(slot);
    try {
      await db.intake.bulkAdd(
        items.map((item) => ({
          id: uid(),
          date: localDate(),
          foodId: item.foodId,
          grams: item.grams,
          meal: item.title,
        })),
      );
      notify("Meal logged for today.");
    } catch (error) {
      notify(saveErrorMessage(error, "this meal"));
    } finally {
      setLoggingMeal(undefined);
    }
  }
  const chart = nutritionSeries(
    Array.from({ length: range }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - range + 1 + i);
      return localDate(day);
    }),
    logs,
    foods,
  );
  const loggedDays = chart.filter((day) => day.logged);
  function foodList() {
    const list = safe.filter(
      (f) =>
        `${f.name} ${f.aliases?.join(" ") || ""} ${f.state}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (foodFilter === "all" ||
          (foodFilter === "meals" && f.recipe) ||
          (foodFilter === "mine" && f.verification === "user-entered") ||
          (foodFilter === "ingredients" && !f.recipe)),
    );
    return (
      <>
        <div className="section-title">
          <div>
            <h2>Find a food or Indian meal</h2>
            <p>Weigh the food in the preparation state shown below.</p>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              setCustomEdit(undefined);
              setCustomTemplate(undefined);
              setCustomOpen(true);
            }}
          >
            <Plus size={15} />
            Add your own food
          </button>
        </div>
        <div className="tabs food-filters">
          {[
            ["all", "All foods"],
            ["ingredients", "Ingredients"],
            ["meals", "Indian meals"],
            ["mine", "My foods"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={foodFilter === id ? "active" : ""}
              onClick={() => setFoodFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-bar">
          <input
            aria-label="Search foods"
            placeholder="Search moong, sprouts, dal, roti, peanut butter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>{list.length} foods</span>
        </div>
        <div className="food-grid">
          {list.map((f) => (
            <button
              className="card food-card"
              key={f.id}
              onClick={() => {
                setError("");
                setFood(f);
                setGrams(f.servingGrams || 100);
              }}
            >
              <span className="food-icon">
                <Leaf size={22} />
              </span>
              <div>
                <h3>{f.name}</h3>
                <small>{f.state} · per 100 g</small>
                <span className="food-kind">
                  {f.verification === "user-entered"
                    ? "Your label"
                    : f.recipe
                      ? "Recipe estimate"
                      : "Food reference"}
                </span>
                <p>
                  <strong>{f.kcal}</strong> kcal <span>·</span>{" "}
                  <strong>{f.protein}</strong> g protein
                </p>
              </div>
              <Plus size={17} />
            </button>
          ))}
        </div>
        {(foodFilter === "all" || foodFilter === "mine") && (
          <section className="card label-shortcuts">
            <h3>Use your brand’s label</h3>
            <p>
              Soya chunks, paneer and poha vary by brand and preparation. Add
              the packet values once, then log them offline.
            </p>
            {labelTemplates
              .filter(
                (t) =>
                  !search ||
                  `${t.name} ${t.aliases}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .map((t) => (
                <button
                  key={t.name}
                  className="button secondary"
                  onClick={() => {
                    setCustomEdit(undefined);
                    setCustomTemplate(t);
                    setCustomOpen(true);
                  }}
                >
                  <Plus size={14} />
                  {t.name}
                </button>
              ))}
          </section>
        )}
        {!list.length && (
          <Empty
            title="No matching foods"
            description="Try a different search. Foods matching your dietary exclusions are hidden."
          />
        )}
        <p className="hint">
          Values are per 100 g, from USDA SR references or your saved label.
          Indian meal estimates are calculated from listed ingredients, not
          presented as measured restaurant nutrition. Recipes, cooking water and
          added oil change values. Check ingredients for allergies; raw sprouts
          can carry harmful bacteria. Cook sprouts thoroughly, especially for
          higher-risk people.
        </p>
      </>
    );
  }
  return (
    <>
      <Heading
        title="Nutrition"
        action={
          <button
            className="button"
            onClick={() => setParams({ tab: "foods" })}
          >
            <Plus size={16} />
            Log a meal
          </button>
        }
      />
      <FitnessDisclaimer />
      <div className="tabs scroll-tabs">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setParams({ tab: t })}
          >
            {names[i]}
          </button>
        ))}
      </div>
      {!p && !["foods", "learn"].includes(tab) ? (
        <Empty
          title="Nutrition that fits you"
          description="Set up your profile and dietary preferences for personalized estimates."
        >
          <button className="button" onClick={onSetup}>
            Create profile
            <ArrowRight size={16} />
          </button>
        </Empty>
      ) : (
        <>
          {n?.blocked && (
            <div className="notice">
              {n.blockReason} A qualified dietitian or clinician can help you
              choose suitable targets. Food and hydration logging remain
              available.
            </div>
          )}
          {tab === "dashboard" && (
            <>
              <div className="nutrition-overview">
                <section className="card calorie-card">
                  <div>
                    <span className="eyebrow">TODAY’S ENERGY</span>
                    <h2>
                      {Math.round(totals.kcal).toLocaleString()}{" "}
                      <small>kcal</small>
                    </h2>
                    <p>
                      {n && !n.blocked
                        ? `~${Math.max(0, n.kcal - totals.kcal).toFixed(0)} kcal remaining of ${n.kcal}`
                        : "Logged energy today"}
                    </p>
                    <span className="tag green">NOURISH. DON’T RESTRICT.</span>
                  </div>
                  <Ring
                    value={totals.kcal}
                    total={n && !n.blocked ? n.kcal : 0}
                    size={130}
                  >
                    <Leaf size={32} className="lime" />
                  </Ring>
                </section>
                <HydrationCard />
              </div>
              <div className="macro-grid">
                {(["protein", "carbs", "fat"] as const).map((key, i) => (
                  <section className="card macro-card" key={key}>
                    <span className="eyebrow">
                      {["PROTEIN", "CARBOHYDRATES", "FATS"][i]}
                    </span>
                    <strong>
                      {Math.round(totals[key])}
                      <small> / {n && !n.blocked ? n[key] : "—"} g</small>
                    </strong>
                    <div className={`progress-track macro-${i}`}>
                      <span
                        style={{
                          width: `${n && !n.blocked ? Math.min(100, (totals[key] / n[key]) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <p>
                      {n && !n.blocked
                        ? `${Math.max(0, Math.round(n[key] - totals[key]))} g remaining`
                        : "No target set"}
                    </p>
                  </section>
                ))}
              </div>
              <div className="section-title">
                <h2>On your plate today</h2>
                <span className="muted">
                  {todayLogs.length} foods logged · {Math.round(totals.fiber)} g
                  fiber
                </span>
              </div>
              {todayLogs.length ? (
                <div className="card">
                  {todayLogs.map((l) => {
                    const f = foods.find((f) => f.id === l.foodId);
                    return (
                      <div className="list-row" key={l.id}>
                        <span className="food-icon">
                          <Leaf size={19} />
                        </span>
                        <div className="grow">
                          <strong>{f?.name || "Food unavailable"}</strong>
                          <small>
                            {l.meal} · {l.grams} g · {f?.state}
                          </small>
                        </div>
                        <strong>
                          {Math.round(((f?.kcal || 0) * l.grams) / 100)}{" "}
                          <small>kcal</small>
                        </strong>
                        <button
                          className="icon-button"
                          aria-label="Remove food entry"
                          onClick={() => db.intake.delete(l.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  title="A fresh plate"
                  description="Log your first food to see your daily nutrition here."
                >
                  <button
                    className="button secondary"
                    onClick={() => setParams({ tab: "foods" })}
                  >
                    <Plus size={15} />
                    Add food
                  </button>
                </Empty>
              )}
              <details className="card instruction">
                <summary>About these estimates</summary>
                <p>
                  Targets use a Mifflin–St Jeor estimate and a self-selected
                  activity multiplier. If gender is omitted, the midpoint of
                  equation constants is used; uncertainty is greater. Estimates
                  are not metabolic measurements. Carbohydrate and fat amounts
                  are an illustrative split, not independently measured needs.
                </p>
                {n && n.energyRange && (
                  <p>
                    Illustrative energy range: {n.energyRange.min}–
                    {n.energyRange.max} kcal/day.
                  </p>
                )}
                {n?.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </details>
            </>
          )}
          {tab === "foods" && foodList()}
          {tab === "plan" && (
            <>
              <div className="section-title meal-plan-heading">
                <div>
                  <h2>Your meal ideas</h2>
                  <p>Editable portions, not a complete diet prescription.</p>
                </div>
                <button
                  className="button secondary"
                  disabled={n?.blocked || busy}
                  onClick={() =>
                    void generate().catch((error) =>
                      notify(saveErrorMessage(error, "your meal ideas")),
                    )
                  }
                >
                  <RefreshCw size={16} />
                  {busy
                    ? "Saving…"
                    : plans.length
                      ? "Regenerate"
                      : "Generate suggestions"}
                </button>
              </div>
              <div className="day-picker" role="group" aria-label="Meal day">
                {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                  const d = days[i];
                  return (
                    <button
                      key={d}
                      className={selectedDay === i ? "selected" : ""}
                      aria-pressed={selectedDay === i}
                      onClick={() => setSelectedDay(i)}
                    >
                      <span aria-hidden="true">{d.slice(0, 3)}</span>
                      <span className="sr-only">{d}</span>
                    </button>
                  );
                })}
              </div>
              {mealGroups.length > 0 && (
                <section
                  className="card plan-day-summary"
                  aria-label="Daily meal estimate"
                >
                  <h3>{days[selectedDay]} · suggested portions</h3>
                  <p>
                    <strong>{Math.round(dayPlanTotals.kcal)} kcal</strong>
                    <span>
                      {" "}
                      · {Math.round(dayPlanTotals.protein)} g protein ·{" "}
                      {mealGroups.length} meals
                    </span>
                  </p>
                  <p className="hint">
                    {n && !n.blocked
                      ? `Estimated energy reference: ~${n.kcal} kcal/day. `
                      : ""}
                    Example portions are not matched to your individual needs.
                  </p>
                </section>
              )}
              {!plans.length ? (
                <Empty
                  title="Make room for good food"
                  description="Generate meal inspiration using your dietary preferences and exclusions. This starter planner is not a complete, target-optimized diet prescription."
                />
              ) : (
                mealGroups.map(({ slot, items }) => {
                  const reviewNeeded = items.some(
                    (item) => !safeIds.has(item.foodId),
                  );
                  return (
                    <section className="card meal-card" key={slot}>
                      <div className="section-title">
                        <h3>
                          {items[0]?.title}
                          {items[0]?.time && <small> · {items[0].time}</small>}
                        </h3>
                        <button
                          className="text-link"
                          disabled={reviewNeeded || loggingMeal !== undefined}
                          onClick={() => void logMeal(items, slot)}
                        >
                          <Plus size={15} />
                          {loggingMeal === slot ? "Saving…" : "Log for today"}
                        </button>
                      </div>
                      {reviewNeeded && (
                        <p className="notice">
                          Review this meal: a food is unavailable or outside
                          your current dietary preferences. Edit it before
                          logging.
                        </p>
                      )}
                      <div className="meal-items">
                        {items.map((m) => {
                          const f = foods.find((f) => f.id === m.foodId);
                          return (
                            <button
                              className="meal-item"
                              key={m.id}
                              onClick={() => {
                                setError("");
                                setEditMeal(m);
                              }}
                            >
                              <span className="meal-item-info">
                                <strong>{f?.name || "Food unavailable"}</strong>
                                <small>
                                  {m.grams} g · {f?.state}
                                </small>
                              </span>
                              <span className="meal-item-nutrients">
                                <span>
                                  {Math.round(((f?.kcal || 0) * m.grams) / 100)}{" "}
                                  kcal
                                </span>
                                <small>
                                  {Math.round(
                                    ((f?.protein || 0) * m.grams) / 100,
                                  )}{" "}
                                  g protein
                                </small>
                              </span>
                              <ArrowRight
                                className="meal-item-arrow"
                                size={17}
                                aria-hidden="true"
                              />
                            </button>
                          );
                        })}
                      </div>
                      <p className="hint meal-total">
                        {Math.round(totalNutrients(items, foods).kcal)} kcal
                        estimated
                      </p>
                    </section>
                  );
                })
              )}
            </>
          )}
          {tab === "protein" && (
            <>
              <section className="card protein-card">
                <div>
                  <span className="eyebrow">PROTEIN, IN PERSPECTIVE</span>
                  <h2>
                    {Math.round(totals.protein)} <small>g today</small>
                  </h2>
                  <p>
                    {n && !n.blocked
                      ? `~${n.protein} g reference · ~${n.perMeal} g per meal across ${p?.meals || 3} meals`
                      : "Your clinician can help set a suitable personal target."}
                  </p>
                </div>
                <Ring
                  value={totals.protein}
                  total={n && !n.blocked ? n.protein : 0}
                  size={120}
                />
              </section>
              {n && !n.blocked && (
                <section className="card instruction">
                  <h3>Your calculation</h3>
                  <p>
                    {n.method}: {n.reference.toFixed(1)} kg. Current reference
                    range for active adults: {n.min}–{n.max} g/day. The selected
                    goal uses {n.factor} g/kg as a starting reference. Discuss a
                    suitable reference weight if you have substantial excess
                    body fat.
                  </p>
                  <p>
                    {n.lean
                      ? `Estimated lean mass: ${n.lean} kg · Estimated fat mass: ${n.fatMass?.toFixed(1)} kg. Consumer body-fat measurements may be inaccurate.`
                      : "No body-fat measurement provided. Lean body mass is not assumed."}
                  </p>
                  {n.warnings.map((warning) => (
                    <p className="hint" key={warning}>
                      {warning}
                    </p>
                  ))}
                  <button className="text-link" onClick={onSetup}>
                    Review profile and estimates <ArrowRight size={14} />
                  </button>
                </section>
              )}
              {mealProtein.length > 0 ? (
                <div className="macro-grid">
                  {mealProtein.map(({ meal, protein }) => (
                    <section className="card macro-card" key={meal}>
                      <span className="eyebrow">{meal}</span>
                      <strong>
                        {Math.round(protein)}
                        <small> g</small>
                      </strong>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="muted">Log foods to see protein by meal.</p>
              )}
              <div className="notice">
                <BookOpen />
                <p>
                  Protein powder is optional. Ordinary foods can meet your
                  needs. Whey and casein contain milk; soy and plant blends have
                  their own allergen considerations. Read product labels and
                  look for independent quality testing.
                </p>
              </div>
            </>
          )}
          {tab === "analytics" && (
            <>
              <div className="tabs">
                {[7, 30, 90].map((r) => (
                  <button
                    key={r}
                    className={r === range ? "active" : ""}
                    onClick={() => setRange(r)}
                  >
                    Last {r} days
                  </button>
                ))}
              </div>
              <div className="chart-grid">
                {(["protein", "calories"] as const).map((key) => (
                  <section className="card chart-card" key={key}>
                    <h3>
                      Daily {key}{" "}
                      <small>({key === "protein" ? "g" : "kcal"})</small>
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chart}>
                        <CartesianGrid
                          stroke="var(--border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "var(--muted)", fontSize: 12 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "var(--muted)", fontSize: 12 }}
                          width={42}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                          }}
                        />
                        <Bar
                          dataKey={key}
                          fill={
                            key === "protein"
                              ? "var(--chart-green)"
                              : "var(--chart-blue)"
                          }
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="hint">
                      Average on logged days:{" "}
                      {loggedDays.length
                        ? Math.round(
                            loggedDays.reduce(
                              (sum, day) => sum + (day[key] || 0),
                              0,
                            ) / loggedDays.length,
                          )
                        : "—"}{" "}
                      {key === "protein" ? "g" : "kcal"}. {loggedDays.length} of{" "}
                      {range} days logged. Missing days are not assumed to be
                      zero intake.
                    </p>
                  </section>
                ))}
              </div>
              <div className="notice">
                Review patterns across several weeks, including weight, recovery
                and workout performance. Do not change calories in response to a
                single daily fluctuation.
              </div>
            </>
          )}
          {tab === "history" && (
            <>
              <label className="date-filter">
                View food records for
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              {logs.filter((l) => l.date === date).length ? (
                logs
                  .filter((l) => l.date === date)
                  .map((l) => (
                    <section className="card list-row" key={l.id}>
                      <div className="grow">
                        <strong>
                          {foods.find((f) => f.id === l.foodId)?.name}
                        </strong>
                        <small>
                          {l.meal} · {l.grams} g
                        </small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Delete diet record"
                        onClick={() => {
                          if (confirm("Delete this food record?"))
                            db.intake.delete(l.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </section>
                  ))
              ) : (
                <Empty
                  title="No food records on this date"
                  description="Your logged meals stay on this device, even when your goals change."
                />
              )}
              <h3>Hydration records</h3>
              {water
                .filter((w) => w.date === date)
                .map((w) => (
                  <div className="list-row" key={w.id}>
                    <Droplets size={17} />
                    <span className="grow">{w.ml} ml</span>
                    <button
                      className="icon-button"
                      aria-label="Delete water record"
                      onClick={() => db.water.delete(w.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
            </>
          )}
          {tab === "learn" && (
            <div className="stack">
              {[
                [
                  "Understand protein",
                  "Protein supplies amino acids used to build and repair tissues, including muscle. Resistance training and adequate overall energy help the body adapt. Essential amino acids must come from food. Leucine helps signal muscle protein synthesis, but the full amino acid supply and total diet matter.",
                ],
                [
                  "Quality, variety & timing",
                  "Protein quality reflects amino acid composition and digestibility. Plant foods can provide high-quality protein; varied foods across the day help meet needs. Spread protein across meals if convenient. Daily intake matters more than a narrow post-workout window.",
                ],
                [
                  "Supplements explained",
                  "Whey concentrate and isolate are milk-derived; isolate typically contains less lactose but is not suitable for milk allergy. Casein is also milk-derived. Soy, pea and rice proteins or blends offer alternatives. Egg protein contains egg allergens. Serving sizes and protein amounts depend on the label. A serving with 24 g protein adds 24 g, regardless of marketing claims.",
                ],
                [
                  "Before & after training",
                  "Before training, choose familiar carbohydrate foods and a protein-containing meal if comfortable: oats and curd, or rice and dal. Allow digestion time. After training, a normal balanced meal can support recovery. Shakes are convenient, never compulsory.",
                ],
                [
                  "Build sustainable habits",
                  "Establish regular meals, learn portions and review meal quality, recovery and multiweek trends. Adjust habits as your circumstances change. There are no compulsory supplement cycles, automatic monthly protein increases or guaranteed transformation timelines.",
                ],
                [
                  "Food safety",
                  "Raw or lightly cooked sprouts can carry harmful bacteria. Cook sprouts thoroughly; pregnant people, older adults and people with weakened immunity should avoid raw sprouts. Cook dried kidney beans thoroughly. Check packaged-food ingredient and allergen labels; app filters cannot assess cross-contact or guarantee safety.",
                ],
                [
                  "Sources & limitations",
                  "Energy: Mifflin et al., 1990, resting energy estimation. Protein: ACSM/Academy of Nutrition and Dietetics/Dietitians of Canada position statement, Nutrition and Athletic Performance (2016). Foods: the historical USDA SR28 (2015) dataset, per 100 g; 100 food references were checked against its published files. Recipe values are calculated estimates and product labels may differ. These references do not replace individualized care.",
                ],
              ].map(([title, text]) => (
                <details className="card instruction" key={title}>
                  <summary>{title}</summary>
                  <p>{text}</p>
                </details>
              ))}
            </div>
          )}
        </>
      )}
      {food && (
        <Modal title={`Log ${food.name}`} onClose={() => setFood(undefined)}>
          <p className="hint">
            {food.state} · {food.source}
          </p>
          {food.recipe && (
            <details className="recipe-ingredients">
              <summary>See ingredients and portions</summary>
              {food.recipe.map((i) => (
                <p key={i.foodId}>
                  {foods.find((f) => f.id === i.foodId)?.name}: {i.grams} g
                </p>
              ))}
            </details>
          )}
          {food.sourceUrl && (
            <a
              className="text-link"
              target="_blank"
              rel="noreferrer"
              href={food.sourceUrl}
            >
              View source (internet required)
            </a>
          )}
          {food.verification === "user-entered" && (
            <button
              className="text-link"
              onClick={() => {
                setCustomEdit(food);
                setFood(undefined);
                setCustomOpen(true);
              }}
            >
              Edit your saved label values
            </button>
          )}
          <label>
            Portion in grams
            <input
              type="number"
              min="1"
              max="2000"
              value={grams}
              onChange={(e) => setGrams(+e.target.value)}
            />
          </label>
          <label>
            Meal
            <select value={meal} onChange={(e) => setMeal(e.target.value)}>
              {mealNames.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <div className="review-grid">
            {(["kcal", "protein", "carbs", "fat", "fiber"] as const).map(
              (k) => (
                <div key={k}>
                  <small>{k}</small>
                  <strong>
                    {Math.round((food[k] * grams) / 100)}{" "}
                    {k === "kcal" ? "kcal" : "g"}
                  </strong>
                </div>
              ),
            )}
          </div>
          {food.allergens.length > 0 && (
            <p className="notice">
              Contains: {food.allergens.join(", ")}. Check actual product
              ingredients.
            </p>
          )}
          {error && (
            <p role="alert" className="danger">
              {error}
            </p>
          )}
          <button
            className="button"
            disabled={!validPortion(grams) || busy}
            onClick={async () => {
              if (!validPortion(grams) || busy) return;
              setBusy(true);
              setError("");
              try {
                await db.intake.add({
                  id: uid(),
                  date: localDate(),
                  foodId: food.id,
                  grams,
                  meal,
                });
                setFood(undefined);
                notify("Food saved to your day.");
              } catch (error) {
                setError(saveErrorMessage(error, "your food entry"));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Plus size={16} />
            {busy ? "Saving…" : "Log food"}
          </button>
        </Modal>
      )}
      {customOpen && (
        <CustomFood
          food={customEdit}
          template={customTemplate}
          onClose={() => setCustomOpen(false)}
          onSaved={() =>
            notify(
              "Your food is saved. Search it in My foods and log any portion.",
            )
          }
        />
      )}
      {editMeal && (
        <Modal title="Edit your meal" onClose={() => setEditMeal(undefined)}>
          <label>
            Food
            <select
              value={editMeal.foodId}
              onChange={(e) =>
                setEditMeal({ ...editMeal, foodId: e.target.value })
              }
            >
              {safe.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.state}
                </option>
              ))}
            </select>
          </label>
          <label>
            Portion (g)
            <input
              type="number"
              min="1"
              max="2000"
              value={editMeal.grams}
              onChange={(e) =>
                setEditMeal({ ...editMeal, grams: +e.target.value })
              }
            />
          </label>
          <label>
            Meal time
            <input
              type="time"
              value={editMeal.time}
              onChange={(e) =>
                setEditMeal({ ...editMeal, time: e.target.value })
              }
            />
          </label>
          <label>
            Notes
            <textarea
              value={editMeal.notes}
              onChange={(e) =>
                setEditMeal({ ...editMeal, notes: e.target.value })
              }
            />
          </label>
          {error && (
            <p role="alert" className="danger">
              {error}
            </p>
          )}
          <div className="inline-form">
            <button
              className="button"
              disabled={!validPortion(editMeal.grams) || busy}
              onClick={async () => {
                if (!validPortion(editMeal.grams) || busy) return;
                setBusy(true);
                setError("");
                try {
                  await saveMealItem(editMeal);
                  setEditMeal(undefined);
                } catch (error) {
                  setError(saveErrorMessage(error, "this meal"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save changes
            </button>
            <button
              className="button secondary"
              disabled={!validPortion(editMeal.grams) || busy}
              onClick={async () => {
                if (!validPortion(editMeal.grams) || busy) return;
                setBusy(true);
                setError("");
                try {
                  await saveMealItem({
                    ...editMeal,
                    id: uid(),
                    position:
                      Math.max(
                        -1,
                        ...plans
                          .filter(
                            (item) =>
                              item.day === editMeal.day &&
                              item.slot === editMeal.slot,
                          )
                          .map((item) => item.position || 0),
                      ) + 1,
                  });
                  setEditMeal(undefined);
                } catch (error) {
                  setError(saveErrorMessage(error, "this meal"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Duplicate
            </button>
            <button
              className="icon-button danger"
              aria-label="Remove meal item"
              onClick={async () => {
                await db.meals.delete(editMeal.id);
                setEditMeal(undefined);
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
