import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const base = "http://localhost:4179";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4179",
  ],
  { stdio: "ignore" },
);
let browser;
const checks = [],
  errors = [];
const profile = {
  id: "me",
  name: "Nutrition member",
  age: 30,
  gender: "Male",
  height: 180,
  weight: 80,
  heightUnit: "ft",
  experience: "Complete beginner",
  goal: "General fitness",
  days: [1, 3, 5],
  duration: 45,
  equipment: "Full gym",
  restrictions: "",
  medical: false,
  diet: "Vegetarian",
  allergies: "",
  dislikes: "",
  meals: 3,
  activity: 1.375,
  proteinMethod: "Body weight",
  nutritionGoal: "General health",
  budget: "Medium",
  nutritionRisk: false,
};
async function read(page, table) {
  return page.evaluate(
    (table) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("form-fitness");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction(table, "readonly");
          const query = tx.objectStore(table).getAll();
          query.onsuccess = () => resolve(query.result);
          tx.oncomplete = () => database.close();
        };
      }),
    table,
  );
}
async function audit(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
    name,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    name + " overflow",
  );
  await page.screenshot({
    path: `test-results/nutrition-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  checks.push(name);
}
async function writeProfile(page, patch) {
  await page.evaluate(
    (patch) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("form-fitness");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction("profiles", "readwrite");
          const table = tx.objectStore("profiles");
          const query = table.get("me");
          query.onsuccess = () => table.put({ ...query.result, ...patch });
          tx.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      }),
    patch,
  );
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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page
    .getByRole("button", { name: "Create my profile", exact: true })
    .waitFor();
  await page.evaluate(
    (profile) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("form-fitness");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction(
            ["profiles", "meals", "intake", "customFoods"],
            "readwrite",
          );
          tx.objectStore("profiles").put(profile);
          const day = new Date().getDay();
          const meal = (id, slot, title, foodId, grams, time) => ({
            id,
            day,
            slot,
            title,
            foodId,
            grams,
            time,
            notes: "Legacy meal",
          });
          for (const item of [
            meal("a-lunch-1", 1, "Lunch", "spinach", 100, "12:00"),
            meal("b-lunch-2", 1, "Lunch", "toor-cooked", 150, "12:00"),
            meal("c-lunch-3", 1, "Lunch", "brown", 180, "12:00"),
            meal("z-breakfast-1", 0, "Breakfast", "oats", 50, "08:00"),
            meal("z-breakfast-2", 0, "Breakfast", "milk", 200, "08:00"),
            meal("d-dinner", 2, "Dinner", "rice", 150, "19:00"),
          ])
            tx.objectStore("meals").put(item);
          const date = new Date().toLocaleDateString("en-CA");
          for (const [id, meal, foodId, grams] of [
            ["snack", "Snack", "peanut", 20],
            ["pre", "Pre-workout", "banana", 100],
            ["custom-meal", "Meal 5", "chana", 100],
          ])
            tx.objectStore("intake").put({ id, date, meal, foodId, grams });
          tx.objectStore("customFoods").put({
            id: "custom-soya",
            name: "My labelled soya",
            kcal: 340,
            protein: 50,
            carbs: 30,
            fat: 1,
            fiber: 10,
            state: "dry, as sold",
            diet: "Vegan",
            allergens: ["soy"],
            source:
              "User-entered label: My packet. Not independently verified.",
            verification: "user-entered",
            servingGrams: 50,
          });
          tx.oncomplete = () => {
            database.close();
            resolve();
          };
        };
      }),
    profile,
  );
  await page.goto(base + "/nutrition?tab=plan");
  await page.locator(".meal-card").first().waitFor();
  assert.deepEqual(await page.locator(".meal-card h3").allTextContents(), [
    "Breakfast · 08:00",
    "Lunch · 12:00",
    "Dinner · 19:00",
  ]);
  const lunch = page
    .locator(".meal-card")
    .filter({ has: page.getByRole("heading", { name: /^Lunch/ }) });
  await lunch.getByText(/426 kcal estimated/).waitFor();
  const styles = await lunch
    .locator(".meal-item")
    .first()
    .evaluate((node) => ({
      bg: getComputedStyle(node).backgroundColor,
      border: getComputedStyle(node).borderTopWidth,
      width: node.getBoundingClientRect().width,
      parent: node.parentElement.getBoundingClientRect().width,
    }));
  assert.equal(styles.bg, "rgba(0, 0, 0, 0)");
  assert.equal(styles.border, "0px");
  assert.ok(Math.abs(styles.width - styles.parent) < 2);
  await audit(page, "legacy-meal-layout-desktop");
  await lunch
    .locator(".meal-item")
    .filter({ hasText: "Toor / arhar dal" })
    .click();
  await page.getByLabel("Portion (g)", { exact: true }).fill("0");
  assert.equal(
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Duplicate", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByLabel("Portion (g)", { exact: true }).fill("150");
  await page.getByLabel("Meal time", { exact: true }).fill("13:30");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const saved = await read(page, "meals");
  assert.ok(
    saved
      .filter((item) => item.slot === 1)
      .every((item) => item.time === "13:30"),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await lunch
    .getByRole("button", { name: "Log for today", exact: true })
    .click();
  await page
    .getByRole("status")
    .getByText("Meal logged for today.", { exact: true })
    .waitFor();
  assert.equal((await read(page, "intake")).length, 6);
  await page.setViewportSize({ width: 320, height: 700 });
  await audit(page, "meal-layout-mobile-320");
  await page.goto(base + "/settings");
  await page.getByLabel("Text size", { exact: true }).selectOption("large");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.goto(base + "/nutrition?tab=plan");
  await page.locator(".meal-card").first().waitFor();
  await audit(page, "meal-layout-large-dark-320");
  await page.goto(base + "/nutrition?tab=protein");
  for (const meal of ["Snack", "Pre-workout", "Meal 5", "Lunch"])
    await page
      .locator(".macro-card")
      .getByText(meal, { exact: true })
      .waitFor();
  await audit(page, "all-meal-protein-320");
  await page.goto(base + "/nutrition?tab=analytics");
  await page
    .getByText(/1 of 7 days logged/)
    .first()
    .waitFor();
  await audit(page, "logged-day-analytics-320");
  await page.goto(base + "/nutrition?tab=foods");
  await page
    .getByLabel("Search foods", { exact: true })
    .fill("My labelled soya");
  await page.getByRole("button", { name: /My labelled soya/ }).click();
  await page
    .getByRole("button", { name: "Edit your saved label values", exact: true })
    .click();
  assert.equal(
    await page
      .getByLabel("Label serving weight (g)", { exact: true })
      .inputValue(),
    "50",
  );
  assert.equal(
    await page
      .getByLabel("Protein (g) per label serving", { exact: true })
      .inputValue(),
    "25",
  );
  assert.equal(
    await page
      .getByLabel("Calories (kcal) per label serving", { exact: true })
      .inputValue(),
    "170",
  );
  await page.getByRole("button", { name: "Save food", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal((await read(page, "customFoods"))[0].protein, 50);
  await writeProfile(page, { allergies: "milk" });
  await page.goto(base + "/nutrition?tab=plan");
  const breakfast = page
    .locator(".meal-card")
    .filter({ has: page.getByRole("heading", { name: /^Breakfast/ }) });
  await breakfast
    .getByText(/outside your current dietary preferences/)
    .waitFor();
  assert.equal(
    await breakfast
      .getByRole("button", { name: "Log for today", exact: true })
      .isDisabled(),
    true,
  );
  await audit(page, "changed-allergy-meal-review-320");
  await writeProfile(page, { allergies: "", meals: 6 });
  await page.goto(base + "/nutrition?tab=plan");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();
  await page
    .getByRole("status")
    .getByText(/Meal ideas saved/)
    .waitFor();
  assert.equal(await page.locator(".meal-card").count(), 6);
  assert.equal((await read(page, "intake")).length, 6);
  await audit(page, "six-meal-ideas-320");
  await page.goto(base + "/nutrition?tab=history");
  await page.getByText("Hydration records", { exact: true }).waitFor();
  await audit(page, "nutrition-history-320");
  await page.goto(base + "/nutrition?tab=learn");
  await page.getByText("Food safety", { exact: true }).click();
  await page.getByText(/Cook sprouts thoroughly/).waitFor();
  await audit(page, "food-safety-guidance-320");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.goto(base + "/nutrition?tab=plan");
  await page.locator(".meal-card").first().waitFor();
  assert.equal(await page.locator(".meal-card").count(), 6);
  await audit(page, "offline-meal-ideas-320");
  await context.setOffline(false);
  await writeProfile(page, { medical: true });
  await page.goto(base + "/nutrition?tab=plan");
  await page
    .getByText(/Your screening needs individualized guidance/)
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Regenerate", exact: true })
      .isDisabled(),
    true,
  );
  checks.push("medical-screening-withholds-regeneration");
  await context.close();
  const guest = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const g = await guest.newPage();
  g.setDefaultTimeout(15000);
  g.on("pageerror", (error) => errors.push(error.message));
  await g.goto(base + "/nutrition?tab=foods");
  await g.locator(".food-card").first().waitFor();
  assert.equal(await g.getByRole("dialog").count(), 0);
  await audit(g, "guest-food-reference-library-390");
  await guest.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks, errors }));
} catch (error) {
  const page = browser?.contexts().at(-1)?.pages().at(-1);
  if (page) {
    console.error((await page.locator("body").innerText()).slice(0, 6500));
    await page.screenshot({
      path: "test-results/nutrition-failure.png",
      fullPage: true,
    });
  }
  throw error;
} finally {
  await writeFile(
    "test-results/nutrition-report.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  await browser?.close();
  server.kill();
}
