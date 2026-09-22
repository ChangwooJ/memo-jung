import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

await mkdir(".artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const page = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
try {
  await page.goto("http://127.0.0.1:5173");
  await page.waitForSelector('[data-scene="ready"]', { timeout: 30000 });
  await page.waitForSelector('[data-phase="greeting"]', { timeout: 30000 });
  assert.equal(
    await page.locator("canvas").getAttribute("data-greeting"),
    "coffee-beans",
  );
  assert.ok(
    Number(await page.locator("canvas").getAttribute("data-greeting-drops")) >
      200,
  );
  assert.equal(
    await page
      .locator(".hero h1")
      .evaluate((el) => Number(getComputedStyle(el).opacity) < 0.01),
    true,
    "Static title must not overlap the liquid greeting",
  );
  await page.screenshot({ path: ".artifacts/01-greeting.png" });
  await page.waitForSelector('[data-phase="falling"]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: ".artifacts/02-melting.png" });
  await page.waitForSelector('[data-phase="gathering"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".artifacts/03-gathering.png" });
  await page.waitForSelector('[data-phase="pouring"]');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: ".artifacts/04-pouring.png" });
  await page.waitForSelector('[data-phase="flowing"]');
  await page.waitForTimeout(8000);
  await page.screenshot({ path: ".artifacts/05-desktop.png" });
  assert.equal(
    await page.locator("canvas").getAttribute("data-pouring"),
    "true",
  );
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await page.screenshot({ path: ".artifacts/10-floor-filling.png" });
  await page.waitForFunction(
    () => Number(document.querySelector("canvas").dataset.floodLevel) >= 1,
    {},
    { timeout: 90000 },
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".artifacts/11-full-coffee.png" });
  assert.equal(
    await page
      .locator(".site-header")
      .evaluate((el) => el.classList.contains("under-coffee")),
    true,
  );
  await page.getByRole("button", { name: "흐름 멈추기", exact: true }).click();
  await page.getByRole("button", { name: "커피 비우기", exact: true }).click();
  await page.waitForFunction(
    () => Number(document.querySelector("canvas").dataset.floodLevel) === 0,
  );
  await page
    .getByRole("button", { name: "흐름 계속하기", exact: true })
    .click();
  assert.equal(await page.locator(".post-row").count(), 3);
  await page
    .getByRole("button", { name: "Development 03", exact: true })
    .click();
  assert.equal(await page.locator(".post-row").count(), 3);
  assert.equal(
    await page.locator(".site-shell").getAttribute("data-phase"),
    "flowing",
  );
  await page.getByRole("button", { name: "글 검색 열기" }).click();
  await page
    .getByRole("textbox", { name: "글 검색", exact: true })
    .fill("react");
  assert.equal(await page.locator(".post-row").count(), 1);
  await page
    .getByRole("textbox", { name: "글 검색", exact: true })
    .fill("zzzz-no-result");
  await page
    .getByRole("heading", { name: "아직 이 잔은 비어 있네요." })
    .waitFor();
  await page.getByRole("button", { name: "검색 닫기" }).click();
  await page.getByRole("button", { name: "All notes 06", exact: true }).click();
  await page
    .getByRole("combobox", { name: "정렬 순서" })
    .selectOption("oldest");
  assert.match(
    await page.locator(".post-row h3").first().textContent(),
    /오래 쓰고 싶은/,
  );
  await page
    .getByRole("combobox", { name: "정렬 순서" })
    .selectOption("newest");
  await page.locator(".post-link").first().click();
  await page
    .getByRole("heading", { name: "기록은 생각보다 오래 남으니까", level: 1 })
    .waitFor();
  await page.screenshot({ path: ".artifacts/06-article.png" });
  await page.getByRole("button", { name: "모든 기록으로" }).click();
  await page.waitForSelector('[data-phase="flowing"]');
  await page.getByRole("button", { name: "About", exact: true }).click();
  assert.equal(await page.locator("dialog").evaluate((el) => el.open), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").count(), 0);
  await page.getByRole("button", { name: "2 페이지", exact: true }).click();
  assert.equal(await page.locator(".post-row").count(), 3);
  assert.equal(await page.locator(".cup-number").first().textContent(), "04");
  assert.match(
    await page.locator(".post-row h3").first().textContent(),
    /웹에 작은/,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "다음 페이지", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "이전 페이지", exact: true }).click();
  assert.equal(await page.locator(".cup-number").first().textContent(), "01");
  await page.getByRole("button", { name: "커피 애니메이션 일시정지" }).click();
  await page
    .getByRole("button", { name: "커피 애니메이션 재생", exact: true })
    .waitFor();
  await page.screenshot({ path: ".artifacts/07-paused.png" });
  await page.getByRole("button", { name: "커피 인트로 다시 보기" }).click();
  await page.waitForSelector('[data-phase="writing"]');
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector('[data-scene="static"][data-phase="flowing"]');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: ".artifacts/08-mobile.png" });
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(350);
  await page.screenshot({ path: ".artifacts/09-mobile-scroll.png" });
  const noWebGL = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await noWebGL.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).includes("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  await noWebGL.goto("http://127.0.0.1:5173");
  await noWebGL.waitForSelector('[data-scene="unavailable"]');
  assert.equal(await noWebGL.locator(".post-row").count(), 3);
  assert.equal(
    await noWebGL.locator(".cup-fallback").first().isVisible(),
    true,
  );
  await noWebGL.close();
  assert.deepEqual(
    errors,
    [],
    "The normal WebGL session has no console or page errors",
  );
  console.log(
    "PASS: animated phases, one-time intro, filters, search, empty state, sorting, article navigation, dialog, pagination, persistent pouring, whole-page flood, drain, pause/replay, mobile, reduced motion, and WebGL fallback.",
  );
  console.log(
    "Screenshots: .artifacts/01-greeting.png through 09-mobile-scroll.png",
  );
} finally {
  await browser.close();
}
