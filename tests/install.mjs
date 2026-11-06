import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const base = "http://localhost:4178";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4178",
  ],
  {
    stdio: "ignore",
    env: {
      ...process.env,
      __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: "form.test",
    },
  },
);
const checks = [],
  errors = [];
let browser;
let persistent;
let profileDirectory;
async function fresh(options = {}, init) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ...options,
  });
  await context.addInitScript(() =>
    window.addEventListener(
      "beforeinstallprompt",
      (event) => {
        // Native browser UI is not automated here; explicitly test the event contract below.
        if (event.isTrusted) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    ),
  );
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page
    .getByRole("button", { name: "Create my profile", exact: true })
    .waitFor();
  return { context, page };
}
async function settings(page) {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await page.getByRole("region", { name: "App installation" }).waitFor();
  return page.getByRole("region", { name: "App installation" });
}
async function fakePrompt(page, outcome) {
  return page.evaluate((outcome) => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    window.__promptCalls = 0;
    event.prompt = async () => {
      window.__promptCalls++;
      if (outcome === "error") throw new Error("Test rejected prompt");
    };
    event.userChoice = Promise.resolve({ outcome });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }, outcome);
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
    `${name} overflow`,
  );
  await page.screenshot({
    path: `test-results/install-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  checks.push(name);
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
    args: [
      "--no-sandbox",
      "--no-proxy-server",
      "--host-resolver-rules=MAP form.test 127.0.0.1",
    ],
  });
  // Incognito contexts are intentionally not installable in Chromium.
  // Use a fresh normal browser profile for the actual installability check.
  profileDirectory = await mkdtemp(join(tmpdir(), "form-install-test-"));
  persistent = await chromium.launchPersistentContext(profileDirectory, {
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    viewport: { width: 1440, height: 1000 },
    args: ["--no-sandbox"],
  });
  await persistent.addInitScript(() =>
    window.addEventListener(
      "beforeinstallprompt",
      (event) => {
        if (event.isTrusted) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    ),
  );
  const desktopPage = await persistent.newPage();
  desktopPage.on("pageerror", (error) => errors.push(error.message));
  await desktopPage.goto(base);
  await desktopPage
    .getByRole("button", { name: "Create my profile", exact: true })
    .waitFor();
  const desktop = { context: persistent, page: desktopPage };
  await desktop.page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await desktop.context.newCDPSession(desktop.page);
  const manifest = await cdp.send("Page.getAppManifest");
  assert.equal(manifest.errors.length, 0);
  const data = JSON.parse(manifest.data);
  assert.equal(data.id, "/");
  assert.equal(data.display, "standalone");
  assert.equal(data.start_url, "/");
  assert.ok(
    data.icons.some((i) => i.sizes === "192x192" && i.purpose === "any"),
  );
  assert.ok(
    data.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable"),
  );
  for (const icon of data.icons) {
    const response = await desktop.page.request.get(base + icon.src);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /image\/png/);
  }
  const installability = await cdp.send("Page.getInstallabilityErrors");
  assert.deepEqual(
    installability.installabilityErrors,
    [],
    "Chromium installability requirements",
  );
  checks.push("actual-manifest-icons-worker-and-chromium-installability");
  await desktop.page
    .locator(".topbar")
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await desktop.page.getByRole("dialog", { name: "Install FORM" }).waitFor();
  await audit(desktop.page, "desktop-browser-guidance");
  await desktop.context.close();

  const native = await fresh();
  assert.equal(await fakePrompt(native.page, "dismissed"), true);
  const region = await settings(native.page);
  await region
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await region
    .getByRole("button", { name: "Install app", exact: true })
    .waitFor({ state: "visible" });
  assert.equal(
    await native.page.evaluate(() => window.__promptCalls),
    1,
    "Prompt captured before Settings mounted",
  );
  await region
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await native.page.getByRole("dialog", { name: "Install FORM" }).waitFor();
  assert.equal(
    await native.page.evaluate(() => window.__promptCalls),
    1,
    "Dismissed prompt cannot be reused",
  );
  await native.page
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await fakePrompt(native.page, "accepted");
  await region
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  assert.equal(
    await region.getByText("Installed on this device", { exact: true }).count(),
    0,
    "Accepted is not installed",
  );
  await native.page.evaluate(() =>
    window.dispatchEvent(new Event("appinstalled")),
  );
  await region.getByText("Installed on this device", { exact: true }).waitFor();
  assert.equal(
    await native.page
      .getByRole("button", { name: "Install app", exact: true })
      .count(),
    0,
  );
  await audit(native.page, "native-event-installed-state");
  await native.context.close();

  const failed = await fresh();
  await fakePrompt(failed.page, "error");
  await failed.page
    .locator(".topbar")
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await failed.page
    .getByRole("alert")
    .getByText(/Installation could not start/)
    .waitFor();
  await audit(failed.page, "failed-prompt-fallback");
  await failed.context.close();

  const ios = await fresh({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  await ios.page
    .locator(".topbar")
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await ios.page
    .getByRole("heading", { name: "On iPhone or iPad", exact: true })
    .waitFor();
  await ios.page
    .getByRole("dialog")
    .getByText("Add to Home Screen", { exact: true })
    .waitFor();
  await audit(ios.page, "iphone-share-guidance");
  await ios.context.close();

  const ipad = await fresh({}, () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel" });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5 });
  });
  await ipad.page
    .locator(".topbar")
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await ipad.page
    .getByRole("heading", { name: "On iPhone or iPad", exact: true })
    .waitFor();
  checks.push("ipad-desktop-user-agent-detection");
  await ipad.context.close();

  const android = await fresh({
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    viewport: { width: 320, height: 700 },
  });
  await android.page
    .locator(".topbar")
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await android.page
    .getByRole("heading", { name: "On Android", exact: true })
    .waitFor();
  await audit(android.page, "android-menu-guidance-320");
  await android.page
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await android.page.evaluate(() => navigator.serviceWorker.ready);
  await android.page.reload();
  await android.page.waitForFunction(
    () => !!navigator.serviceWorker.controller,
  );
  await android.context.setOffline(true);
  await android.page.goto(base + "/workout?tab=library");
  await android.page.locator(".library-item").first().waitFor();
  assert.equal(await android.page.locator(".library-item").count(), 132);
  await android.page
    .locator(".topbar")
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await android.page
    .getByRole("dialog")
    .getByText("Ready to use offline.", { exact: true })
    .waitFor();
  await audit(android.page, "offline-install-help-320");
  await android.context.close();

  const standalone = await fresh({}, () => {
    const match = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = match(query);
      if (query === "(display-mode: standalone)")
        Object.defineProperty(result, "matches", { value: true });
      return result;
    };
  });
  assert.equal(
    await standalone.page
      .getByRole("button", { name: "Install app", exact: true })
      .count(),
    0,
  );
  await (await settings(standalone.page))
    .getByText("Installed on this device", { exact: true })
    .waitFor();
  checks.push("standalone-launch-hides-install-controls");
  await standalone.context.close();

  const insecure = await fresh();
  await insecure.page.goto("http://form.test:4178");
  await insecure.page
    .getByRole("button", { name: "Create my profile", exact: true })
    .waitFor();
  assert.equal(
    await insecure.page.evaluate(() => window.isSecureContext),
    false,
  );
  await insecure.page
    .locator(".topbar")
    .getByRole("button", { name: "Install app", exact: true })
    .click();
  await insecure.page
    .getByRole("heading", {
      name: "Open an HTTPS website to install",
      exact: true,
    })
    .waitFor();
  await audit(insecure.page, "real-insecure-http-guidance");
  await insecure.context.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks, errors }));
} catch (error) {
  const page = browser?.contexts().at(-1)?.pages().at(-1);
  if (page) {
    console.error((await page.locator("body").innerText()).slice(0, 5000));
    await page.screenshot({
      path: "test-results/install-failure.png",
      fullPage: true,
    });
  }
  throw error;
} finally {
  await writeFile(
    "test-results/install-report.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  await browser?.close();
  await persistent?.close();
  if (profileDirectory)
    await rm(profileDirectory, { recursive: true, force: true });
  server.kill();
}
