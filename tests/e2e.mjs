import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4175",
  ],
  { stdio: "ignore" },
);
let browser;
const swPath = "dist/sw.js";
const originalSW = await readFile(swPath, "utf8");
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://localhost:4175")).ok) break;
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
    viewport: { width: 1440, height: 1100 },
  });
  // Simulate the existing v2 IndexedDB before the new app opens it.
  const legacyContext = await browser.newContext();
  const legacyPage = await legacyContext.newPage();
  await legacyPage.goto("http://localhost:4175/icon.svg");
  await legacyPage.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("form-fitness", 20);
      request.onupgradeneeded = () => {
        const database = request.result;
        for (const [name, indexes] of Object.entries({
          profiles: [],
          plans: [],
          sessions: ["date", "status"],
          sets: ["sessionId", "exerciseId"],
          weights: ["date"],
          cardio: ["date"],
          settings: [],
          intake: ["date", "foodId"],
          water: ["date"],
          meals: ["day", "slot"],
        })) {
          const table = database.createObjectStore(name, { keyPath: "id" });
          for (const index of indexes) table.createIndex(index, index);
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        const tx = database.transaction("weights", "readwrite");
        tx.objectStore("weights").put({
          id: "legacy",
          date: "2026-01-01",
          weight: 71,
          notes: "v2 record",
        });
        tx.oncomplete = () => {
          database.close();
          resolve();
        };
        tx.onerror = reject;
      };
      request.onerror = reject;
    });
  });
  await legacyPage.goto("http://localhost:4175");
  await legacyPage.getByRole("dialog").waitFor();
  const migrated = await legacyPage.evaluate(
    () =>
      new Promise((resolve) => {
        const request = indexedDB.open("form-fitness");
        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction("weights", "readonly");
          const query = tx.objectStore("weights").get("legacy");
          query.onsuccess = () =>
            resolve(
              query.result?.weight === 71 &&
                database.objectStoreNames.contains("customFoods"),
            );
          tx.oncomplete = () => database.close();
        };
      }),
  );
  if (!migrated) throw new Error("v2 to v3 migration lost existing data");
  await legacyContext.close();
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:4175");
  await page.getByRole("dialog").waitFor();
  if (
    (await page.evaluate(() => document.documentElement.dataset.theme)) !==
    "light"
  )
    throw new Error("Light theme should be the default");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create my profile" }).click();
  await page.getByLabel("Full name").fill("Alex Morgan");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Muscle building" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Bodyweight", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create my plan", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto("http://localhost:4175/workout");
  await page
    .getByRole("button", { name: "Change plan", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Training experience", { exact: true })
    .selectOption("More than 1 year");
  await page.getByLabel("Equipment", { exact: true }).selectOption("Full gym");
  await page
    .getByLabel("Plan style", { exact: true })
    .selectOption("Body-part split (6 days)");
  for (const day of ["Tue", "Thu", "Sat"])
    await page
      .getByRole("dialog")
      .getByRole("button", { name: day, exact: true })
      .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /Monday Chest & triceps/ }).waitFor();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page.getByLabel("Set 1 weight", { exact: true }).first().fill("12");
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  await page.waitForTimeout(300);
  console.log("sets saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Mark set incomplete" })
    .first()
    .waitFor();
  if (
    (await page
      .getByLabel("Set 1 weight", { exact: true })
      .first()
      .inputValue()) !== "12"
  )
    throw new Error("Saved weight missing");
  await page.goto("http://localhost:4175/nutrition?tab=foods");
  await page.getByRole("button", { name: /White rice cooked/ }).click();
  await page.getByLabel("Portion in grams").fill("150");
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto("http://localhost:4175/nutrition");
  await page.getByText("195", { exact: false }).first().waitFor();
  await page.goto("http://localhost:4175/nutrition?tab=foods");
  await page
    .getByRole("button", { name: "Add your own food", exact: true })
    .click();
  await page.getByLabel("Food name", { exact: true }).fill("My Soya Chunks");
  await page.getByLabel("Label serving weight (g)").fill("50");
  for (const [label, value] of [
    ["Calories (kcal) per label serving", "170"],
    ["Protein (g) per label serving", "25"],
    ["Carbs (g) per label serving", "15"],
    ["Fat (g) per label serving", "0.5"],
    ["Fiber (g) per label serving", "5"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Dietary type").selectOption("Vegan");
  await page.getByLabel("Allergens (comma separated)").fill("soy");
  await page.getByRole("button", { name: "Save food", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /My Soya Chunks/ }).click();
  await page.getByLabel("Portion in grams").fill("50");
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto("http://localhost:4175/nutrition");
  await page.getByText("365", { exact: false }).first().waitFor();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.goto("http://localhost:4175/workout");
  await page
    .getByRole("button", { name: "Mark set incomplete" })
    .first()
    .waitFor();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByRole("heading", { name: /Hello/ }).waitFor();
  await page.getByText("365", { exact: false }).first().waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error("Mobile horizontal overflow");
  await page.goto("http://localhost:4175/nutrition");
  await page
    .getByRole("heading", { name: "Good food. Better energy." })
    .waitFor();
  await page.screenshot({
    path: "test-results/nutrition-mobile.png",
    fullPage: true,
  });
  await context.setOffline(false);
  await page.goto("http://localhost:4175/settings");
  await page
    .getByRole("button", { name: "Check for updates", exact: true })
    .click();
  await page
    .getByText("You are using the latest version.", { exact: true })
    .waitFor();
  await writeFile(swPath, originalSW + "\n// e2e update probe " + Date.now());
  await page
    .getByRole("button", { name: "Check for updates", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Install update", exact: true })
    .waitFor();
  if (
    await page
      .getByRole("button", { name: "Install update", exact: true })
      .isEnabled()
  )
    throw new Error("Active session must block update activation");
  await page.goto("http://localhost:4175/workout");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .waitFor();
  await page.goto("http://localhost:4175/settings");
  await page
    .getByRole("button", { name: "Install update", exact: true })
    .waitFor();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Install update", exact: true })
    .click();
  await page.waitForTimeout(1000);
  await page.getByRole("heading", { name: "Your preferences." }).waitFor();
  await page.goto("http://localhost:4175/workout");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByText("complete", { exact: true }).waitFor();
  console.log(
    JSON.stringify({
      passed: [
        "onboarding",
        "v2 database migration preserves existing records",
        "set write and reload",
        "food portion logging",
        "service worker offline deep route",
        "mobile width",
        "real no-update check",
        "six-day plan selection with preview",
        "custom food label normalization and logging",
        "controlled update detection",
        "active workout update guard",
        "approved activation and preserved history",
      ],
      errors,
    }),
  );
  if (errors.length) throw new Error("Browser errors");
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    console.error((await page.locator("body").innerText()).slice(-3000));
    await page.screenshot({ path: "test-results/failure.png", fullPage: true });
  }
  throw error;
} finally {
  await writeFile(swPath, originalSW);
  await browser?.close();
  server.kill();
}
