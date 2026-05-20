// Scrape ALL Google reviews for Highland Farms via Playwright.
//
// Usage:
//   node scripts/scrape-google-reviews.mjs
//   HEADED=1 DEBUG=1 node scripts/scrape-google-reviews.mjs
//
// Output: src/data/google-reviews.json (only overwrites if scrape got
// at least MIN_REVIEWS_TO_WRITE reviews — protects the good snapshot
// from being clobbered by a bad run).

import { chromium as baseChromium } from "playwright";
import { addExtra } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";

const chromium = addExtra(baseChromium);
chromium.use(stealthPlugin());
import fs from "node:fs";
import path from "node:path";

const PLACE_ID = "ChIJF5dVblWLlVQRTa9sDtveCPY";
const SEARCH_URL =
  "https://www.google.com/maps/search/Highland+Farms+21261+E+Little+River+Rd+Brightwood+OR+97011?hl=en";
const OUTPUT = path.join(process.cwd(), "src/data/google-reviews.json");
const MIN_REVIEWS_TO_WRITE = 5;
const DEBUG = !!process.env.DEBUG;

const dbg = (...args) => DEBUG && console.log("[debug]", ...args);

async function snap(page, name) {
  if (!DEBUG) return;
  const file = `/tmp/hf-rev-${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  dbg("screenshot", file);
}

async function dismissConsent(page) {
  try {
    const consent = page.locator(
      'button:has-text("Accept all"), button:has-text("I agree"), form[action*="consent"] button'
    );
    if (await consent.count()) {
      await consent.first().click({ timeout: 3000 });
      await page.waitForTimeout(1500);
    }
  } catch {
    /* ignore */
  }
}

async function openPlaceCard(page) {
  await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await dismissConsent(page);
  await page.waitForTimeout(4000);
  await snap(page, "1-after-search");

  // The search lands on a place chip in the side panel — click it to expand.
  // The chip is typically an <a> with class .hfpxzc.
  const placeLinks = [
    'a.hfpxzc:has-text("Highland Farms")',
    'a[aria-label*="Highland Farms"]',
    'div[role="article"]:has-text("Highland Farms")',
  ];
  for (const sel of placeLinks) {
    const el = page.locator(sel).first();
    if (await el.count()) {
      try {
        await el.click({ timeout: 5000 });
        await page.waitForTimeout(3500);
        dbg(`clicked place via ${sel}`);
        break;
      } catch {
        /* next */
      }
    }
  }
  await snap(page, "2-after-place-click");
}

async function openReviewsTab(page) {
  // The tab strip may be horizontally scrollable — find any element whose
  // visible text is "Reviews" anywhere on the page.
  const found = await page.evaluate(() => {
    const all = document.querySelectorAll("button,div,a,span,li");
    const matches = [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const txt = (el.textContent || "").trim();
      // Look for elements whose own text is exactly "Reviews" (possibly with
      // a numeric count) — must be short (a tab, not a heading paragraph).
      if (/^Reviews(\s+\(?\d|\s*$)/i.test(txt) && txt.length < 40) {
        // Skip if there's a child element with the same text (use innermost)
        const hasChildWithSameText = Array.from(el.children).some(
          (c) => (c.textContent || "").trim() === txt
        );
        if (hasChildWithSameText) continue;
        const r = el.getBoundingClientRect();
        matches.push({
          tag: el.tagName,
          text: txt,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          role: el.getAttribute("role"),
          aria: el.getAttribute("aria-label"),
          ja: el.getAttribute("jsaction"),
        });
      }
    }
    return matches;
  });
  dbg("Reviews candidates:", JSON.stringify(found, null, 2));

  // Click by position — pick the first visible one in the left panel (x < 700)
  const top = found.find((m) => m.rect.x < 700 && m.rect.w > 20);
  if (top) {
    dbg("clicking by position", top.rect);
    await page.mouse.click(
      top.rect.x + top.rect.w / 2,
      top.rect.y + top.rect.h / 2
    );
    await page.waitForTimeout(3500);
    const c = await reviewCount(page);
    dbg(`after position click: ${c} cards`);
    if (c > 0) return;
  }

  // Fallback: click the F7nice rating chip
  const chip = page.locator("div.F7nice").first();
  if (await chip.count()) {
    try {
      await chip.click({ timeout: 3000 });
      await page.waitForTimeout(3000);
      const c = await reviewCount(page);
      dbg(`clicked F7nice chip: ${c} cards`);
      if (c > 0) return;
    } catch {
      /* skip */
    }
  }

  dbg("no reviews tab matched — proceeding anyway");
}

async function totalReviewCount(page) {
  return await page.evaluate(() => {
    // Try multiple patterns. Google's "X reviews" can appear in different places.
    const all = document.querySelectorAll("button,span,div,a");
    for (let i = 0; i < all.length; i++) {
      const t = (all[i].textContent || "").trim();
      const m = /^([\d,]+)\s+reviews?$/i.exec(t);
      if (m) return parseInt(m[1].replace(/,/g, ""), 10);
    }
    // F7nice "(188)" pattern
    const chip = document.querySelector("div.F7nice");
    if (chip) {
      const t = chip.textContent || "";
      const m = /\(([\d,]+)\)/.exec(t);
      if (m) return parseInt(m[1].replace(/,/g, ""), 10);
    }
    return null;
  });
}

async function reviewCount(page) {
  return await page.evaluate(() => {
    const a = document.querySelectorAll("[data-review-id]").length;
    const b = document.querySelectorAll(".jftiEf").length;
    const c = document.querySelectorAll(".jJc9Ad").length;
    return Math.max(a, b, c);
  });
}

async function scrollUntilDone(page, expected) {
  const start = Date.now();
  let lastCount = 0;
  let stableTicks = 0;
  const maxStable = 12;

  while (Date.now() - start < 12 * 60_000) {
    const currentCount = await reviewCount(page);

    if (currentCount === lastCount) stableTicks++;
    else {
      stableTicks = 0;
      lastCount = currentCount;
    }

    process.stdout.write(
      `  loaded ${currentCount}${expected ? "/" + expected : ""} (stable ${stableTicks})\r`
    );

    if (stableTicks >= maxStable) break;
    if (expected !== null && currentCount >= expected) break;

    await page.evaluate(() => {
      // Find the scrollable container with the most review cards
      let best = null;
      let bestCount = -1;
      const divs = document.querySelectorAll("div");
      for (let i = 0; i < divs.length; i++) {
        const el = divs[i];
        const cs = getComputedStyle(el);
        if (
          (cs.overflowY === "auto" || cs.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight + 10
        ) {
          const a = el.querySelectorAll("[data-review-id]").length;
          const b = el.querySelectorAll(".jftiEf").length;
          const c = el.querySelectorAll(".jJc9Ad").length;
          const count = Math.max(a, b, c);
          if (count > bestCount) {
            bestCount = count;
            best = el;
          }
        }
      }
      if (best) best.scrollTop = best.scrollHeight;
      else window.scrollBy(0, 2000);
    });
    await page.waitForTimeout(900);
  }
  process.stdout.write("\n");
}

async function expandAll(page) {
  let clicks = 0;
  for (let i = 0; i < 10; i++) {
    const before = clicks;
    const more = await page
      .locator(
        'button.w8nwRe, button:has-text("More"):not([aria-expanded="true"])'
      )
      .all();
    for (let j = 0; j < more.length; j++) {
      try {
        await more[j].click({ timeout: 700 });
        clicks++;
      } catch {
        /* skip */
      }
    }
    if (clicks === before) break;
    await page.waitForTimeout(120);
  }
  console.log(`  expanded ${clicks} truncated bodies`);
}

async function extractReviews(page) {
  return await page.evaluate(() => {
    const out = [];
    const trim = (s) => (s || "").trim();
    let cards = document.querySelectorAll("[data-review-id]");
    if (cards.length === 0) cards = document.querySelectorAll(".jftiEf");
    if (cards.length === 0) cards = document.querySelectorAll(".jJc9Ad");

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];

      const nameEl =
        card.querySelector(".d4r55") ||
        card.querySelector("[class*='author']") ||
        card.querySelector("a button");
      const author_name = trim(nameEl && nameEl.textContent).split("\n")[0].trim();

      const photoEl = card.querySelector("img");
      const author_photo = photoEl ? photoEl.src : null;

      const linkEl = card.querySelector("a[href*='/contrib/']");
      const author_url = linkEl ? linkEl.href : null;

      const subEl = card.querySelector(".RfnDt");
      const is_local_guide = /local guide/i.test(
        trim(subEl && subEl.textContent)
      );

      let rating = 0;
      const starEl = card.querySelector(
        "span.kvMYJc[role='img'], span[role='img'][aria-label*='star']"
      );
      const lbl = (starEl && starEl.getAttribute("aria-label")) || "";
      const m = /(\d)/.exec(lbl);
      if (m) rating = parseInt(m[1], 10);
      if (!rating) {
        // Count filled-star icons
        rating = card.querySelectorAll(".hCCjke.NhBTye.elGi1d, .vzX5Ic.NhBTye.elGi1d").length;
      }

      const timeEl = card.querySelector(".rsqaWe, .DU9Pgb .xRkPPb");
      const relative_time = trim(timeEl && timeEl.textContent);

      const textEl = card.querySelector(".wiI7pd, .MyEned");
      const text = trim(textEl && textEl.textContent).replace(/\s+\n/g, "\n");

      out.push({
        rating,
        text,
        author_name,
        author_photo,
        author_url,
        relative_time,
        is_local_guide,
      });
    }
    return out;
  });
}

async function aggregateRating(page) {
  return await page.evaluate(() => {
    const ratingEl = document.querySelector(
      "div.F7nice span[aria-hidden='true']"
    );
    return ratingEl ? parseFloat((ratingEl.textContent || "0").trim()) : null;
  });
}

async function main() {
  const browser = await chromium.launch({
    headless: !process.env.HEADED,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log("opening place card...");
  await openPlaceCard(page);
  console.log("opening reviews tab...");
  await openReviewsTab(page);
  await snap(page, "3-after-reviews-tab");
  await page.waitForTimeout(1500);

  const expected = await totalReviewCount(page);
  console.log("expected total:", expected ?? "(unknown)");

  console.log("scrolling reviews list...");
  await scrollUntilDone(page, expected);

  console.log("expanding truncated bodies...");
  await expandAll(page);
  await page.waitForTimeout(400);

  const reviews = await extractReviews(page);
  const rating = await aggregateRating(page);
  console.log(`extracted ${reviews.length} reviews, rating ${rating}`);

  if (reviews.length === 0) {
    await page.screenshot({ path: "/tmp/hf-reviews-debug.png", fullPage: true });
    console.error("0 reviews — screenshot at /tmp/hf-reviews-debug.png");
  }

  const out = {
    place_id: PLACE_ID,
    name: "Highland Farms",
    rating: rating ?? 4.9,
    user_rating_count: expected ?? reviews.length,
    fetched_at: new Date().toISOString().slice(0, 10),
    source: "playwright-maps-scrape",
    reviews,
  };

  if (reviews.length < MIN_REVIEWS_TO_WRITE) {
    console.error(
      `refusing to overwrite: scrape only got ${reviews.length} reviews (min ${MIN_REVIEWS_TO_WRITE}).`
    );
    await browser.close();
    process.exit(2);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2) + "\n");
  console.log("wrote", OUTPUT);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
