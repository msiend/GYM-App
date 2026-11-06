import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const base = "http://localhost:4177";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4177",
  ],
  { stdio: "ignore" },
);
let browser;
const checks = [];
const errors = [];
async function records(page, table) {
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
          tx.onerror = () => reject(tx.error);
        };
      }),
    table,
  );
}
async function audit(page, name) {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    ),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    `${name}: horizontal overflow`,
  );
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
    `${name}: accessibility`,
  );
  await page.screenshot({
    path: `test-results/redesign-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  checks.push(name);
}
async function createProfile(page, duration) {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Create my profile", exact: true })
    .click();
  await page.getByLabel("Full name").fill(`New member ${duration}`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Training goal", { exact: true })
    .selectOption("Muscle building");
  await page
    .getByLabel("Minutes per session", { exact: true })
    .selectOption(String(duration));
  for (const day of ["Tuesday", "Thursday", "Saturday"])
    await page
      .getByRole("dialog")
      .getByRole("button", { name: day, exact: true })
      .click();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Sunday", exact: true })
      .isDisabled(),
    true,
  );
  await audit(page, `setup-training-six-days-${duration}-390`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Equipment", { exact: true })
    .selectOption("Bodyweight");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const preview = page.getByRole("region", { name: "Weekly plan preview" });
  await preview
    .getByText("3 strength · 3 easy activity", { exact: true })
    .waitFor();
  assert.equal(await preview.locator(".preview-day").count(), 6);
  await audit(page, `setup-review-six-days-${duration}-390`);
  await page
    .getByRole("button", { name: "Create my plan", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const [plan] = await records(page, "plans");
  assert.equal(plan.days.length, 6);
  assert.equal(plan.days.filter((d) => d.kind === "strength").length, 3);
  assert.equal(plan.days.filter((d) => d.kind === "light").length, 3);
  assert.ok(plan.days.every((d) => d.estimatedMinutes <= duration));
  assert.equal(
    (await records(page, "profiles"))[0].nutritionGoal,
    "Muscle building",
  );
  return plan;
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
  const guest = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await guest.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByRole("button", { name: "Create my profile", exact: true })
    .waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link")
      .count(),
    5,
  );
  await audit(page, "guest-home-390");
  await page
    .getByRole("button", { name: "Browse exercises", exact: true })
    .click();
  await page.locator(".library-item").first().waitFor();
  assert.equal(await page.locator(".library-item").count(), 132);
  assert.equal((await records(page, "profiles")).length, 0);
  await page
    .getByLabel("Filter library by body part", { exact: true })
    .selectOption("arms");
  assert.ok((await page.locator(".library-item").count()) > 0);
  await audit(page, "guest-library-390");
  await page
    .getByRole("tab", { name: "Exercise library", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await page
    .getByRole("tab", { name: "Yoga", exact: true, selected: true })
    .waitFor();
  assert.equal(await page.locator(".library-item").count(), 8);
  await page
    .locator(".library-item")
    .first()
    .getByRole("button", { name: /About the exercise/ })
    .click();
  await page.getByRole("dialog").waitFor();
  await audit(page, "guest-yoga-about-390");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await guest.setOffline(true);
  await page.goto(`${base}/workout?tab=library`);
  await page.locator(".library-item").first().waitFor();
  assert.equal(await page.locator(".library-item").count(), 132);
  assert.equal((await records(page, "profiles")).length, 0);
  await audit(page, "guest-library-offline-390");
  await guest.close();

  for (const duration of [30, 45]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => errors.push(e.message));
    const plan = await createProfile(p, duration);
    await p.goto(`${base}/workout?day=0`);
    await p
      .getByRole("heading", { name: "Sunday · Recovery day", exact: true })
      .waitFor();
    for (const day of plan.days) {
      await p
        .getByRole("group", { name: "Workout day", exact: true })
        .getByRole("button", {
          name: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][day.day],
          exact: true,
        })
        .click();
      await p
        .getByRole("heading", { name: new RegExp(` · ${day.focus}$`) })
        .waitFor();
      assert.ok(
        await p
          .getByRole("button", { name: "Start workout", exact: true })
          .isEnabled(),
      );
    }
    const easy = plan.days.find((d) => d.kind === "light");
    await p.goto(`${base}/workout?day=${easy.day}`);
    await p.getByRole("button", { name: "Start workout", exact: true }).click();
    const minutes = p
      .getByLabel("Set 1 duration (minutes)", { exact: true })
      .first();
    // Keep a write transaction open to reproduce slow device storage.
    await p.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("form-fitness");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const tx = database.transaction("sets", "readwrite");
            const table = tx.objectStore("sets");
            window.__holdSetWrites = true;
            const deadline = Date.now() + 5000;
            const hold = () => {
              const query = table.get("storage-delay-probe");
              query.onsuccess = () => {
                if (window.__holdSetWrites && Date.now() < deadline) hold();
              };
            };
            hold();
            resolve();
            tx.oncomplete = () => database.close();
          };
        }),
    );
    await minutes.fill("20");
    await minutes.blur();
    await p
      .getByRole("button", { name: "Complete set", exact: true })
      .first()
      .click();
    await p.getByRole("button", { name: "Saving set", exact: true }).waitFor();
    assert.equal(
      await p
        .getByRole("button", { name: "Mark set incomplete", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await p
        .getByRole("button", { name: "Finish workout", exact: true })
        .isDisabled(),
      true,
    );
    await p.evaluate(() => {
      window.__holdSetWrites = false;
    });
    await p
      .getByRole("button", { name: "Mark set incomplete", exact: true })
      .first()
      .waitFor();
    assert.equal(
      await p.getByLabel("Set 1 weight", { exact: true }).first().isVisible(),
      false,
    );
    assert.equal(
      await p.getByLabel("Set 1 effort", { exact: true }).first().inputValue(),
      "3",
    );
    await p.reload();
    assert.equal(await minutes.inputValue(), "20");
    const savedSets = await records(p, "sets");
    assert.ok(savedSets.some((s) => s.reps === 1200 && s.done));
    await audit(p, `easy-session-${duration}-390`);
    await p.goto(`${base}/settings`);
    const downloadEvent = p.waitForEvent("download");
    await p
      .getByRole("button", { name: "Export JSON backup", exact: true })
      .click();
    const download = await downloadEvent;
    p.once("dialog", (d) => d.accept());
    await p.locator('input[type="file"]').setInputFiles(await download.path());
    await p
      .getByRole("status")
      .getByText(/restored|imported/i)
      .waitFor();
    checks.push(`easy-session-${duration}-backup-roundtrip`);
    await p.goto(`${base}/workout`);
    p.once("dialog", (d) => d.accept());
    await p
      .getByRole("button", { name: "Finish workout", exact: true })
      .click();
    await p.getByRole("button", { name: "Change plan", exact: true }).click();
    await p
      .getByLabel("Training experience", { exact: true })
      .selectOption("More than 1 year");
    await p.getByLabel("Equipment", { exact: true }).selectOption("Full gym");
    await p.getByText("Training options", { exact: true }).click();
    await p
      .getByLabel("Plan style", { exact: true })
      .selectOption("Push / pull / legs");
    await p
      .getByRole("region", { name: "Weekly plan preview" })
      .getByText("6 strength", { exact: true })
      .waitFor();
    p.once("dialog", (d) => d.accept());
    await p.getByRole("button", { name: "Save plan", exact: true }).click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(
      (await records(p, "plans"))[0].days.filter((d) => d.kind === "strength")
        .length,
      6,
    );
    assert.equal((await records(p, "sessions")).length, 1);
    await p.goto(`${base}/workout?day=1`);
    await audit(p, `experienced-six-day-${duration}-390`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks, errors }));
} catch (error) {
  const p = browser?.contexts().at(-1)?.pages().at(-1);
  if (p) {
    console.error((await p.locator("body").innerText()).slice(0, 7000));
    await p.screenshot({
      path: "test-results/redesign-failure.png",
      fullPage: true,
    });
  }
  throw error;
} finally {
  await writeFile(
    "test-results/redesign-report.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  await browser?.close();
  server.kill();
}
