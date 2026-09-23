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
  await page.waitForSelector('[data-phase="greeting"][data-scene="ready"]');
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: "instant" }));
  assert.equal(await page.evaluate(() =>
    Math.abs(document.querySelector(".coffee-canvas").getBoundingClientRect().top + scrollY) < 2,
  ), true, "Greeting beans must scroll with their page anchor");
  await page.screenshot({ path: ".artifacts/17-scrolled-greeting.png" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForSelector('[data-phase="flowing"][data-scene="ready"]');
  await page.waitForTimeout(4800);
  await page.evaluate(() => window.scrollTo(0, 580));
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => {
    const canvas = document.querySelector(".coffee-canvas");
    return Math.abs(canvas.getBoundingClientRect().top + scrollY) < 2;
  }), true, "The coffee canvas must scroll with the page, without frame lag");
  await page.screenshot({ path: ".artifacts/13-y-overflow-desktop.png" });
  assert.equal(
    await page.locator("canvas").getAttribute("data-pouring"),
    "true",
  );
  await page.waitForFunction(
    () => document.querySelectorAll(".coffee-ink").length > 0,
    null,
    { timeout: 60000 },
  );
  const partialInk = page.locator(".coffee-ink").first();
  assert.match(await partialInk.evaluate((node) =>
    getComputedStyle(node).backgroundImage), /linear-gradient/);
  const inkNode = await partialInk.elementHandle();
  await page.waitForFunction((node) => {
    const level = Number(document.querySelector("canvas").dataset.floodLevel);
    const waterY = document.documentElement.scrollHeight * (1 - level) - 12 * level - scrollY;
    return waterY + 12 < node.getBoundingClientRect().top;
  }, inkNode, { timeout: 60000 });
  assert.equal(await inkNode.evaluate((node) => node.classList.contains("coffee-ink")), true,
    "Ink must remain light after the whole line is submerged");
  await partialInk.scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".artifacts/15-partial-ink.png" });
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
    "PASS: filled overflow rendered on desktop/mobile, partial ink, continuous pour, filtering, empty state cleanup, reduced motion, no browser errors.",
  );
} finally {
  await browser.close();
}
