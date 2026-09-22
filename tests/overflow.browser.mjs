import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir(".artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("http://127.0.0.1:5173");
  await page.waitForSelector('[data-phase="flowing"][data-scene="ready"]');
  await page.waitForTimeout(4800);
  await page.evaluate(() => window.scrollTo(0, 580));
  await page.waitForTimeout(300);
  await page.screenshot({ path: ".artifacts/13-y-overflow-desktop.png" });
  assert.equal(
    await page.locator("canvas").getAttribute("data-pouring"),
    "true",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: ".artifacts/14-y-overflow-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "Design 01", exact: true }).click();
  assert.equal(await page.locator(".post-row").count(), 1);
  await page.getByRole("button", { name: "목록 검색", exact: true }).click();
  await page
    .getByRole("textbox", { name: "글 검색", exact: true })
    .fill("no-result-please");
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".post-row").count(), 0);
  assert.equal(
    await page.locator("canvas").getAttribute("data-pouring"),
    "false",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector('[data-scene="static"]');
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Y overflow rendered on desktop/mobile, continuous pour, filtering, empty state cleanup, reduced motion, no browser errors.",
  );
} finally {
  await browser.close();
}
