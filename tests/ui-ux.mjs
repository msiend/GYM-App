import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = "http://127.0.0.1:4176";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4176",
  ],
  { stdio: "ignore" },
);
const results = [];
const errors = [];
let browser;
const profile = {
  id: "me",
  name: "Meera Test",
  age: 35,
  gender: "Female",
  height: 160,
  heightUnit: "ft",
  weight: 68,
  experience: "Complete beginner",
  goal: "Fat loss",
  days: [1, 3, 5],
  duration: 45,
  equipment: "Full gym",
  restrictions: "",
  medical: false,
  diet: "Vegetarian",
  allergies: "peanuts",
  dislikes: "",
  meals: 3,
  activity: 1.375,
  proteinMethod: "Body weight",
  nutritionGoal: "Fat loss",
  budget: "Medium",
  nutritionRisk: false,
};
const settings = {
  id: "preferences",
  theme: "light",
  textSize: "normal",
  language: "en",
  unit: "kg",
  rest: 90,
  hydration: 2000,
  reminders: false,
  reminderTime: "18:00",
  reminderDays: [1, 3, 5],
  reminderMessage: "Time to move.",
  lastUpdate: "",
};
async function seed(page, patch = {}, preferences = {}) {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Create my profile", exact: true })
    .waitFor();
  await page.evaluate(
    async ({ profile, settings }) => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("form-fitness");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction(
            ["profiles", "settings", "weights", "intake", "sessions", "sets"],
            "readwrite",
          );
          tx.objectStore("profiles").put(profile);
          tx.objectStore("settings").put(settings);
          for (const [index, offset] of [14, 7, 0].entries()) {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            const day = date.toISOString().slice(0, 10);
            tx.objectStore("weights").put({
              id: `fixture-weight-${index}`,
              date: day,
              weight: profile.weight + [0.4, 0, 0.2][index],
              notes: "UI test fixture",
            });
            tx.objectStore("intake").put({
              id: `fixture-intake-${index}`,
              date: day,
              foodId: "moong-cooked",
              grams: 150,
              meal: "Lunch",
            });
          }
          for (const [index, offset] of [8, 2].entries()) {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            const id = `zz-fixture-session-${index}`;
            tx.objectStore("sessions").put({
              id,
              date: date.toISOString().slice(0, 10),
              focus: "Earlier full body",
              status: "complete",
              notes: "UI test fixture",
              exercises: [{ exerciseId: "squat", sets: 2, reps: 12, rest: 90 }],
            });
            for (const set of [0, 1])
              tx.objectStore("sets").put({
                id: `fixture-set-${index}-${set}`,
                sessionId: id,
                exerciseId: "squat",
                index: set,
                weight: 30 + index * 5,
                reps: 12,
                done: true,
                rpe: 7,
                pain: false,
                technique: true,
              });
          }
          tx.oncomplete = () => {
            database.close();
            resolve();
          };
          tx.onerror = () => {
            database.close();
            reject(tx.error);
          };
        };
      });
    },
    {
      profile: { ...profile, ...patch },
      settings: { ...settings, ...preferences },
    },
  );
  await page.reload();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}
async function scan(page, name) {
  // Complete CSS motion before inspecting the visible result.
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    ),
  );
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    offenders: Array.from(document.querySelectorAll("main *"))
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 15)
      .map((e) => ({
        tag: e.tagName,
        class: e.className,
        text: e.textContent?.slice(0, 65),
        right: e.getBoundingClientRect().right,
      })),
    modalOverflow: Array.from(
      document.querySelectorAll('[role="dialog"]'),
    ).some((e) => e.scrollWidth > e.clientWidth + 1),
  }));
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  // Axe cannot infer SVG chart backgrounds. Check our opaque chart surfaces explicitly.
  const chartTextContrast = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--surface)";
    document.body.append(probe);
    const rgb = (value) =>
      (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (channels) =>
      channels
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const background = luminance(rgb(getComputedStyle(probe).color));
    probe.remove();
    const ratios = Array.from(
      document.querySelectorAll(".recharts-wrapper text"),
    )
      .filter((e) => e.getClientRects().length)
      .map((e) => {
        const color = rgb(getComputedStyle(e).fill);
        if (color.length !== 3) return null;
        const text = luminance(color);
        return (
          (Math.max(text, background) + 0.05) /
          (Math.min(text, background) + 0.05)
        );
      })
      .filter((value) => value !== null);
    return ratios.length ? Math.min(...ratios) : null;
  });
  results.push({
    name,
    ...layout,
    chartTextContrast,
    violations: audit.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    needsManualReview: audit.incomplete.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        html: n.html,
        summary: n.failureSummary,
      })),
    })),
  });
  await page.screenshot({
    path: `test-results/ux-${name.replace(/[^a-z0-9._-]/gi, "-")}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
async function fresh(
  patch = {},
  preferences = {},
  viewport = { width: 390, height: 844 },
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, patch, preferences);
  return { context, page };
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir("test-results", { recursive: true });
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const { context, page } = await fresh();
  await scan(page, "fat-loss-home-light-390");
  await page.goto(`${base}/workout`);
  await page
    .getByRole("button", { name: "Change plan", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Equipment", { exact: true })
    .selectOption("Partial gym");
  await page.getByLabel("Dumbbells", { exact: true }).check();
  await page.getByLabel("Lat pulldown machine", { exact: true }).check();
  await page.getByLabel("Leg press machine", { exact: true }).check();
  await page.getByLabel("A stable exercise bench", { exact: true }).check();
  await scan(page, "partial-gym-form-light-390");
  for (let i = 0; i < 35; i++) {
    await page.keyboard.press("Tab");
    if (
      !(await page.evaluate(
        () => !!document.activeElement?.closest('[role="dialog"]'),
      ))
    )
      throw new Error("Dialog focus escaped while using the keyboard");
  }
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", {
      name: "Explore body-part exercises",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("group", { name: "Workout day", exact: true })
    .getByRole("button", { name: "Monday", exact: true })
    .click();
  const allExercises = await page.locator(".exercise-card").count();
  await page
    .getByLabel("Filter workout by body part", { exact: true })
    .selectOption("arms");
  if ((await page.locator(".exercise-card").count()) > allExercises)
    throw new Error("Workout filter increased the plan");
  await page
    .getByRole("button", { name: "Show all workout exercises", exact: true })
    .click();
  if ((await page.locator(".exercise-card").count()) !== allExercises)
    throw new Error("Resetting a workout filter lost exercises");
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page.getByLabel("Set 1 weight", { exact: true }).first().fill("10");
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  await page.getByLabel("Pain / discomfort", { exact: true }).first().check();
  await page
    .getByText(
      "Stop painful movements and seek appropriate guidance before resuming.",
      { exact: true },
    )
    .first()
    .waitFor();
  await scan(page, "active-workout-pain-light-390");
  await page.reload();
  if (
    (await page
      .getByLabel("Set 1 weight", { exact: true })
      .first()
      .inputValue()) !== "10"
  )
    throw new Error("Workout change was not saved");
  // A failed local write must restore the saved value and show an accurate error.
  await page.evaluate(() => {
    window.__savedIdbMethods = {
      put: IDBObjectStore.prototype.put,
      update: IDBCursor.prototype.update,
    };
    const fail = () => {
      throw new DOMException("Test device storage full", "QuotaExceededError");
    };
    IDBObjectStore.prototype.put = fail;
    IDBCursor.prototype.update = fail;
  });
  await page.getByLabel("Set 1 weight", { exact: true }).first().fill("11");
  await page
    .getByRole("status")
    .getByText(/Could not save this set: device storage is full/)
    .waitFor();
  if (
    (await page
      .getByLabel("Set 1 weight", { exact: true })
      .first()
      .inputValue()) !== "10"
  )
    throw new Error("A failed write replaced the saved weight");
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = window.__savedIdbMethods.put;
    IDBCursor.prototype.update = window.__savedIdbMethods.update;
  });
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore body-part exercises", exact: true })
    .click();
  await page
    .getByLabel("Filter library by body part", { exact: true })
    .selectOption("arms");
  if (!(await page.locator(".library-item").count()))
    throw new Error("Body-part library has no arm exercises");
  await scan(page, "fat-loss-body-part-library-390");
  await page
    .getByLabel("Search exercise library", { exact: true })
    .fill("no-such-exercise-987");
  await page
    .getByRole("heading", {
      name: "No exercises match these filters",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", { name: "Reset exercise filters", exact: true })
    .click();
  if ((await page.locator(".library-item").count()) !== 132)
    throw new Error("Reset filters did not restore the catalog");
  await page.goto(`${base}/settings`);
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export JSON backup", exact: true })
    .click();
  const download = await downloadEvent;
  const backup = JSON.parse(await readFile(await download.path(), "utf8"));
  if (
    backup.data.profiles[0].equipment !== "Partial gym" ||
    !backup.data.profiles[0].equipmentInventory.includes("pulldown")
  )
    throw new Error("Backup lost partial gym equipment");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.getByLabel("Text size", { exact: true }).selectOption("large");
  await page.getByLabel("App language", { exact: true }).selectOption("hi");
  await page.getByLabel("Weight unit", { exact: true }).selectOption("lbs");
  await page.setViewportSize({ width: 360, height: 800 });
  for (const [route, name] of [
    ["/", "home"],
    ["/workout", "workout"],
    ["/nutrition", "nutrition"],
    ["/nutrition?tab=analytics", "nutrition-analytics"],
    ["/progress", "progress"],
    ["/settings", "settings"],
  ]) {
    await page.goto(base + route);
    await page.locator("main h1").waitFor();
    await scan(page, `${name}-dark-large-hi-360`);
  }
  await page.goto(`${base}/workout`);
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page.locator(".instruction > summary").first().click();
  if (
    Number(
      await page.getByLabel("LBS", { exact: true }).first().inputValue(),
    ) !== 22.05
  )
    throw new Error("History did not use the selected pounds unit");
  await page.getByLabel("LBS", { exact: true }).first().fill("24");
  await page.reload();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page.locator(".instruction > summary").first().click();
  if (
    Number(
      await page.getByLabel("LBS", { exact: true }).first().inputValue(),
    ) !== 24
  )
    throw new Error("Pound-based history edit did not persist");
  await scan(page, "history-pounds-edit-dark-360");
  await page.getByRole("tab", { name: "Yoga", exact: true }).click();
  await page
    .getByRole("tab", { name: "Yoga", exact: true, selected: true })
    .waitFor();
  if ((await page.locator(".library-item").count()) !== 8)
    throw new Error("Yoga section is incomplete");
  await page
    .getByLabel("Search exercise library", { exact: true })
    .fill("ताड़ासन");
  await page
    .locator(".library-item")
    .getByRole("button", { name: /About the exercise/ })
    .click();
  await page
    .getByRole("dialog")
    .getByText(/योग किसी एक हिस्से की चर्बी/)
    .waitFor();
  await scan(page, "yoga-hindi-details-dark-360");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("tab", { name: "Yoga", exact: true }).click();
  await page
    .getByRole("tab", { name: "Yoga", exact: true, selected: true })
    .waitFor();
  if ((await page.locator(".library-item").count()) !== 8)
    throw new Error("Yoga is not available offline");
  await scan(page, "yoga-offline-dark-360");
  await context.setOffline(false);
  await page.goto(`${base}/settings`);
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 640 });
  await scan(page, "profile-feet-keyboard-small-320");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await context.addInitScript(() =>
    Object.defineProperty(navigator, "storage", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto(`${base}/settings`);
  await page
    .getByRole("button", { name: "Request persistent storage", exact: true })
    .click();
  await page
    .getByText(
      "This browser does not support persistent-storage requests. Export regular backups.",
      { exact: true },
    )
    .waitFor();
  await scan(page, "storage-api-unavailable-320");
  await context.close();
  for (const persona of [
    { name: "teenager", patch: { age: 16, gender: "Male" } },
    { name: "medical-restriction", patch: { medical: true } },
    { name: "pregnancy-dietary-screening", patch: { nutritionRisk: true } },
    {
      name: "senior-recovery",
      patch: {
        age: 78,
        recovery: "Limited recovery",
        experience: "More than 1 year",
        equipment: "Bodyweight",
      },
    },
  ]) {
    const next = await fresh(persona.patch);
    await next.page.goto(`${base}/workout`);
    if (persona.name !== "senior-recovery") {
      await next.page
        .getByRole("heading", {
          name: "Let’s put your health first",
          exact: true,
        })
        .waitFor();
      if (
        await next.page
          .getByRole("button", { name: "Start workout", exact: true })
          .count()
      )
        throw new Error(`${persona.name} received an unrestricted workout`);
      await next.page
        .getByRole("tab", { name: "Exercise library", exact: true })
        .click();
      await next.page.locator(".library-item").first().waitFor();
      if (!(await next.page.locator(".library-item").count()))
        throw new Error("Educational library is blocked");
    }
    await scan(next.page, `${persona.name}-light-390`);
    await next.context.close();
  }
  const desktop = await fresh({}, {}, { width: 1440, height: 1000 });
  for (const route of [
    "/",
    "/nutrition",
    "/nutrition?tab=analytics",
    "/progress",
    "/settings",
  ]) {
    await desktop.page.goto(base + route);
    await desktop.page.locator("main h1").waitFor();
    await scan(desktop.page, `desktop-${route.slice(1) || "home"}-1440`);
  }
  await desktop.context.close();
  const failures = results.filter(
    (r) =>
      r.overflow ||
      r.modalOverflow ||
      r.violations.length ||
      (r.chartTextContrast !== null && r.chartTextContrast < 4.5),
  );
  await writeFile(
    "test-results/ui-ux-report.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      screens: results.length,
      failures: failures.map(
        ({ name, overflow, modalOverflow, violations }) => ({
          name,
          overflow,
          modalOverflow,
          violations: violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.length,
          })),
        }),
      ),
      errors,
    }),
  );
  if (failures.length || errors.length)
    throw new Error(
      "UI/UX audit found issues; see test-results/ui-ux-report.json",
    );
} catch (error) {
  const page = browser?.contexts().at(-1)?.pages().at(-1);
  if (page)
    await page.screenshot({
      path: "test-results/ux-failure.png",
      fullPage: true,
      animations: "disabled",
    });
  throw error;
} finally {
  await writeFile(
    "test-results/ui-ux-report.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser?.close();
  server.kill();
}
