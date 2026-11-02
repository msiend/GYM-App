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
import { foods, allowedFoods } from "./data/foods";
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
  "My diet plan",
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
  const tab = params.get("tab") || "dashboard";
  const [search, setSearch] = useState("");
  const [food, setFood] = useState<Food>();
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState("Breakfast");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [editMeal, setEditMeal] = useState<MealPlan>();
  const [waterSize, setWaterSize] = useState(250);
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
  const totals = todayLogs.reduce(
    (s, l) => {
      const f = foods.find((f) => f.id === l.foodId);
      if (f)
        for (const key of ["kcal", "protein", "carbs", "fat", "fiber"] as const)
          s[key] += (f[key] * l.grams) / 100;
      return s;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  const waterToday = water
    .filter((w) => w.date === localDate())
    .reduce((s, w) => s + w.ml, 0);
  const safe = p ? allowedFoods(p.diet, p.allergies, p.dislikes) : foods;
  async function generate() {
    if (!p || !n || n.blocked) return;
    if (
      plans.length &&
      !confirm(
        "Replace your saved seven-day meal suggestions? Your food intake history will stay unchanged.",
      )
    )
      return;
    const protein = safe.filter((f) => f.protein >= 8);
    const carb = safe.filter((f) => f.carbs >= 15 && f.fat < 10);
    const veg = safe.filter((f) =>
      ["spinach", "carrot", "apple", "banana"].includes(f.id),
    );
    if (!protein.length || !carb.length || !veg.length) {
      notify(
        "Your exclusions leave too few foods for a varied plan. Add foods manually or review your preferences.",
      );
      return;
    }
    const suggestions: MealPlan[] = [];
    for (let d = 0; d < 7; d++)
      for (let slot = 0; slot < p.meals; slot++) {
        const pool = [protein, carb, veg];
        pool.forEach((list, j) => {
          const f = list[(d + slot) % list.length];
          suggestions.push({
            id: uid(),
            day: d,
            slot,
            title:
              p.meals === 3
                ? ["Breakfast", "Lunch", "Dinner"][slot]
                : `Meal ${slot + 1}`,
            foodId: f.id,
            grams: j === 0 ? 150 : j === 1 ? 180 : 100,
            notes:
              "Starter portions, not a nutritionally complete prescription. Adjust for your appetite and needs.",
            time: `${String(8 + slot * Math.floor(12 / p.meals)).padStart(2, "0")}:00`,
          });
        });
      }
    await db.transaction("rw", db.meals, async () => {
      await db.meals.clear();
      await db.meals.bulkAdd(suggestions);
    });
    notify(
      "Seven-day starter meal suggestions saved. Review portions and nutritional balance.",
    );
  }
  const chart = Array.from({ length: range }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - range + 1 + i);
    const key = localDate(d);
    return {
      date: key.slice(5),
      protein: Math.round(
        logs
          .filter((l) => l.date === key)
          .reduce(
            (s, l) =>
              s +
              ((foods.find((f) => f.id === l.foodId)?.protein || 0) * l.grams) /
                100,
            0,
          ),
      ),
      calories: Math.round(
        logs
          .filter((l) => l.date === key)
          .reduce(
            (s, l) =>
              s +
              ((foods.find((f) => f.id === l.foodId)?.kcal || 0) * l.grams) /
                100,
            0,
          ),
      ),
    };
  });
  function foodList() {
    const list = safe.filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <>
        <div className="search-bar">
          <input
            aria-label="Search foods"
            placeholder="Search rice, dal, tofu, eggs…"
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
                setFood(f);
                setGrams(100);
              }}
            >
              <span className="food-icon">
                <Leaf size={22} />
              </span>
              <div>
                <h3>{f.name}</h3>
                <small>{f.state} · per 100 g</small>
                <p>
                  <strong>{f.kcal}</strong> kcal <span>·</span>{" "}
                  <strong>{f.protein}</strong> g protein
                </p>
              </div>
              <Plus size={17} />
            </button>
          ))}
        </div>
        {!list.length && (
          <Empty
            title="No matching foods"
            description="Try a different search. Foods matching your dietary exclusions are hidden."
          />
        )}
        <p className="hint">
          Generic reference values per 100 g from USDA FoodData Central SR
          Legacy. Recipes, brands and preparation change values. Verify labels
          and ingredients, especially for allergies. Prices and unverified
          Indian mixed dishes are not estimated.
        </p>
      </>
    );
  }
  return (
    <>
      <Heading
        eyebrow="FUEL YOUR EVERYDAY"
        title="Good food. Better energy"
        description="Build balanced habits, one meal at a time."
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
      {!p ? (
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
              Personal calorie and protein targets are withheld based on your
              screening. A qualified dietitian or clinician can help you choose
              suitable targets. Food and hydration logging remain available.
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
                <section className="card hydration-card">
                  <Droplets className="blue" />
                  <h3>A moment to hydrate.</h3>
                  <strong>
                    {waterToday}
                    <small> / {settings.hydration} ml</small>
                  </strong>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${Math.min(100, (waterToday / settings.hydration) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="inline-form">
                    <input
                      type="number"
                      aria-label="Water serving ml"
                      min="10"
                      max="2000"
                      value={waterSize}
                      onChange={(e) => setWaterSize(+e.target.value)}
                    />
                    <button
                      className="button secondary"
                      onClick={() => {
                        if (waterSize > 0 && waterSize <= 2000)
                          db.water.add({
                            id: uid(),
                            date: localDate(),
                            ml: waterSize,
                          });
                      }}
                    >
                      <Plus size={15} />
                      ml
                    </button>
                  </div>
                  <small>
                    Needs vary with climate, activity and health. Set your own
                    target in Settings.
                  </small>
                </section>
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
                    const f = foods.find((f) => f.id === l.foodId)!;
                    return (
                      <div className="list-row" key={l.id}>
                        <span className="food-icon">
                          <Leaf size={19} />
                        </span>
                        <div className="grow">
                          <strong>{f.name}</strong>
                          <small>
                            {l.meal} · {l.grams} g · {f.state}
                          </small>
                        </div>
                        <strong>
                          {Math.round((f.kcal * l.grams) / 100)}{" "}
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
              <p className="hint">
                Targets use a Mifflin–St Jeor estimate and a self-selected
                activity multiplier. If gender is omitted, the midpoint of
                equation constants is used; uncertainty is greater. Estimates
                are not metabolic measurements.
              </p>
            </>
          )}
          {tab === "foods" && foodList()}
          {tab === "plan" && (
            <>
              <div className="section-title">
                <div>
                  <h2>Your seven-day meal inspiration</h2>
                  <p>
                    Simple starter portions. Review balance and suitability.
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={n?.blocked}
                  onClick={generate}
                >
                  <RefreshCw size={16} />
                  {plans.length ? "Regenerate" : "Generate suggestions"}
                </button>
              </div>
              <div className="day-picker">
                {days.map((d, i) => (
                  <button
                    key={d}
                    className={selectedDay === i ? "selected" : ""}
                    onClick={() => setSelectedDay(i)}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
              {!plans.length ? (
                <Empty
                  title="Make room for good food"
                  description="Generate meal inspiration using your dietary preferences and exclusions. This starter planner is not a complete, target-optimized diet prescription."
                />
              ) : (
                Array.from(
                  new Set(
                    plans
                      .filter((m) => m.day === selectedDay)
                      .map((m) => m.slot),
                  ),
                ).map((slot) => {
                  const items = plans.filter(
                    (m) => m.day === selectedDay && m.slot === slot,
                  );
                  return (
                    <section className="card meal-card" key={slot}>
                      <div className="section-title">
                        <h3>
                          {items[0]?.title}
                          <small> · {items[0]?.time}</small>
                        </h3>
                        <button
                          className="text-link"
                          onClick={async () => {
                            if (
                              !confirm("Log every food in this meal for today?")
                            )
                              return;
                            await db.intake.bulkAdd(
                              items.map((m) => ({
                                id: uid(),
                                date: localDate(),
                                foodId: m.foodId,
                                grams: m.grams,
                                meal: m.title,
                              })),
                            );
                            notify("Meal logged for today.");
                          }}
                        >
                          <Plus size={15} />
                          Log meal
                        </button>
                      </div>
                      {items.map((m) => {
                        const f = foods.find((f) => f.id === m.foodId)!;
                        return (
                          <button
                            className="meal-item"
                            key={m.id}
                            onClick={() => setEditMeal(m)}
                          >
                            <span>
                              {f.name}
                              <small>
                                {m.grams} g · {f.state}
                              </small>
                            </span>
                            <span>
                              {Math.round((f.kcal * m.grams) / 100)} kcal ·{" "}
                              {Math.round((f.protein * m.grams) / 100)} g
                              protein
                              <ArrowRight size={14} />
                            </span>
                          </button>
                        );
                      })}
                      <p className="hint">
                        {Math.round(
                          items.reduce(
                            (s, m) =>
                              s +
                              (foods.find((f) => f.id === m.foodId)!.kcal *
                                m.grams) /
                                100,
                            0,
                          ),
                        )}{" "}
                        kcal · Tap a food to edit portions, time or notes.
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
                      ? `~${n.protein} g reference · ~${n.perMeal} g per meal across ${p.meals} meals`
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
                    range {n.min}–{n.max} g/day. The selected goal uses{" "}
                    {n.factor} g/kg as a starting reference. Discuss a suitable
                    reference weight if you have substantial excess body fat.
                  </p>
                  <p>
                    {n.lean
                      ? `Estimated lean mass: ${n.lean} kg · Estimated fat mass: ${n.fatMass?.toFixed(1)} kg. Consumer body-fat measurements may be inaccurate.`
                      : "No body-fat measurement provided. Lean body mass is not assumed."}
                  </p>
                  <button className="text-link" onClick={onSetup}>
                    Review profile and estimates <ArrowRight size={14} />
                  </button>
                </section>
              )}
              <div className="macro-grid">
                {["Breakfast", "Lunch", "Dinner"].map((m) => (
                  <div className="card macro-card" key={m}>
                    <span className="eyebrow">{m}</span>
                    <strong>
                      {Math.round(
                        todayLogs
                          .filter((l) => l.meal === m)
                          .reduce(
                            (s, l) =>
                              s +
                              ((foods.find((f) => f.id === l.foodId)?.protein ||
                                0) *
                                l.grams) /
                                100,
                            0,
                          ),
                      )}
                      <small> g</small>
                    </strong>
                  </div>
                ))}
              </div>
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
                          tick={{ fill: "#92959d", fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#92959d", fontSize: 11 }}
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
                          fill={key === "protein" ? "#b8f34a" : "#93b7fd"}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="hint">
                      Daily average across this period:{" "}
                      {Math.round(
                        chart.reduce((s, d) => s + d[key], 0) / range,
                      )}{" "}
                      {key === "protein" ? "g" : "kcal"}. Unlogged days count as
                      zero, not as confirmed intake.
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
                  "Your nutrition journey",
                  "Month 1: establish regular meals, learn portions and record hydration. Month 2: review consistency and meal quality. Month 3: review performance and multiweek weight trends. Month 4 and beyond: revisit habits and targets as circumstances change. No compulsory supplement cycles or automatic monthly protein increases.",
                ],
                [
                  "Sources & limitations",
                  "Energy: Mifflin et al., 1990, resting energy estimation. Protein: ACSM/Academy of Nutrition and Dietetics/Dietitians of Canada position statement, Nutrition and Athletic Performance (2016). Foods: USDA FoodData Central SR Legacy generic entries, per 100 g. These references do not replace individualized care.",
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
              {[
                "Breakfast",
                "Lunch",
                "Dinner",
                "Snack",
                "Pre-workout",
                "Post-workout",
              ].map((m) => (
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
          <button
            className="button"
            disabled={grams <= 0 || grams > 2000}
            onClick={async () => {
              await db.intake.add({
                id: uid(),
                date: localDate(),
                foodId: food.id,
                grams,
                meal,
              });
              setFood(undefined);
              notify("Food saved to your day.");
            }}
          >
            <Plus size={16} />
            Log food
          </button>
        </Modal>
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
          <div className="inline-form">
            <button
              className="button"
              disabled={editMeal.grams <= 0 || editMeal.grams > 2000}
              onClick={async () => {
                await db.meals.put(editMeal);
                setEditMeal(undefined);
              }}
            >
              Save changes
            </button>
            <button
              className="button secondary"
              onClick={async () => {
                await db.meals.add({ ...editMeal, id: uid() });
                setEditMeal(undefined);
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
