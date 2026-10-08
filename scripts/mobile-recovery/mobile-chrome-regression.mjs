import pw from 'playwright';
import { launchReviewBrowser } from './run-options.mjs';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const TELEMETRY = /googletagmanager|google-analytics|analytics\.google|googleadservices|doubleclick|facebook\.com\/tr|connect\.facebook|clarity\.ms|bat\.bing|analytics\.tiktok|segment\.(io|com)|sentry\.io|leadconnector|vercel-insights|\/(?:_vercel\/(?:insights|speed-insights)|(?:api\/)?(?:analytics|track|events|telemetry|beacon|collect))(?:\/|\?|$)/i;
const ACUITY = /(^|\.)(?:acuityscheduling\.com|as\.me|squarespacescheduling\.com)$/i;
const FONT_READS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const API_READS = new Set(['/api/booking/availability']);
const NEUTRAL_FRAME = '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Neutral Acuity review frame</title><body style="margin:0;padding:24px;background:#F2EEE4;color:#4A4943;font:14px/1.6 sans-serif"><p>Acuity contents are excluded from this regression.</p><p>No scheduler request or booking is sent.</p></body></html>';
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Exported for a no-browser safety self-check. There is no write fixture.
export function classifyRequest({ method, url, resourceType, childFrame }, origin) {
  const u = new URL(url);
  if (!['GET', 'HEAD'].includes(method)) return 'blocked-write';
  if (resourceType === 'ping' || TELEMETRY.test(u.href)) return 'blocked-telemetry';
  if (ACUITY.test(u.hostname) && resourceType === 'document' && childFrame) return 'neutral-acuity-frame';
  const fontRead = u.protocol === 'https:' && FONT_READS.has(u.hostname) && ['stylesheet', 'font'].includes(resourceType);
  if (u.origin !== origin && !fontRead) return 'blocked-third-party';
  if (u.origin === origin && u.pathname.startsWith('/api/') && !API_READS.has(u.pathname)) return 'blocked-api-read';
  return 'allowed-read';
}

export function safetySelfCheck() {
  const origin = 'https://highlandfarms.example';
  const request = (method, url, resourceType = 'document', childFrame = false) => classifyRequest({ method, url, resourceType, childFrame }, origin);
  const tests = [
    ['Every POST blocked', request('POST', origin + '/api/booking/checkout') === 'blocked-write'],
    ['PUT blocked', request('PUT', origin + '/anything') === 'blocked-write'],
    ['DELETE blocked', request('DELETE', origin + '/anything') === 'blocked-write'],
    ['PATCH blocked', request('PATCH', origin + '/anything') === 'blocked-write'],
    ['OPTIONS blocked', request('OPTIONS', origin + '/anything') === 'blocked-write'],
    ['Acuity POST never fulfilled', request('POST', 'https://highlandfarms.as.me/schedule/x', 'document', true) === 'blocked-write'],
    ['Telemetry GET blocked', request('GET', 'https://www.google-analytics.com/g/collect') === 'blocked-telemetry'],
    ['Same-origin telemetry GET blocked', request('GET', origin + '/api/events') === 'blocked-telemetry'],
    ['Same-origin collect GET blocked', request('GET', origin + '/collect') === 'blocked-telemetry'],
    ['GET hyperlink auditing ping blocked', request('GET', origin + '/ordinary-path', 'ping') === 'blocked-telemetry'],
    ['Only Acuity child document neutralized', request('GET', 'https://highlandfarms.as.me/schedule/x', 'document', true) === 'neutral-acuity-frame'],
    ['Acuity top navigation blocked', request('GET', 'https://highlandfarms.as.me/schedule/x') === 'blocked-third-party'],
    ['Acuity subresource blocked', request('GET', 'https://highlandfarms.as.me/x.js', 'script', true) === 'blocked-third-party'],
    ['Unknown third-party GET blocked', request('GET', 'https://other.example/pixel') === 'blocked-third-party'],
    ['Google font stylesheet GET allowed', request('GET', 'https://fonts.googleapis.com/css2?family=Inter', 'stylesheet') === 'allowed-read'],
    ['Font host document GET blocked', request('GET', 'https://fonts.googleapis.com/anything') === 'blocked-third-party'],
    ['Cron GET blocked', request('GET', origin + '/api/cron/daily-report') === 'blocked-api-read'],
    ['Admin GET blocked', request('GET', origin + '/api/shop/admin/count') === 'blocked-api-read'],
    ['Known availability GET allowed', request('GET', origin + '/api/booking/availability') === 'allowed-read'],
    ['First-party page GET allowed', request('GET', origin + '/nordic-spa') === 'allowed-read'],
    ['First-party asset HEAD allowed', request('HEAD', origin + '/images/farm/cow.jpg', 'image') === 'allowed-read'],
  ].map(([name, pass]) => ({ name, pass }));
  if (tests.some(t => !t.pass)) throw new Error('Safety classifier self-check failed');
  return tests;
}

async function run(baseArg, outputArg) {
  if (!baseArg || !outputArg) throw new Error('Usage: node mobile-chrome-regression.mjs <base-url> <output-directory> | --self-check');
  if (process.env.CODEX_SANDBOX) throw new Error('Browser launch refused while CODEX_SANDBOX is set. Run this script in an unsandboxed execution context.');
  const base = new URL(baseArg);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('Use an HTTP(S) base URL without credentials, query or fragment.');
  const out = path.resolve(outputArg), reportPath = path.join(out, 'report.json');
  if (existsSync(out)) throw new Error('This output directory already exists; use a fresh evidence directory.');
  mkdirSync(out, { recursive: true });
  const report = { schema: 1, base: base.origin, started: new Date().toISOString(), finished: null, checks: [], scenarios: [], safety: {}, source: {}, limitations: [
    'The real app handlers run. Only a remote Acuity child-frame document is locally fulfilled.',
    'Acuity interior, real bookings, native checkout, payments, form submissions and third-party services are not exercised.',
    'No exclusive FAQ behavior is asserted. The current source FAQ allows multiple disclosures open.',
  ] };
  report.safetyClassifier = safetySelfCheck();
  const sourceFiles = ['src/components/layout/MobileMenu.tsx', 'src/components/layout/chrome.ts', 'src/components/field/StickyShell.tsx', 'src/components/shared/BookingButton.tsx', 'src/components/layout/EmailPopup.tsx', 'src/components/shared/VisitPickers.tsx', 'src/app/gift-certificates/StaticGifts.tsx', 'src/app/gift-certificates/GiftChooser.tsx', 'src/components/field/PriceRows.tsx', 'src/app/globals.css', 'src/lib/booking/tracking.ts', 'src/data/farm-tours.ts', 'src/data/nordic-spa.ts', 'src/data/gift-certificates.ts'];
  for (const file of sourceFiles) report.source[file] = createHash('sha256').update(readFileSync(path.join(REPO, file))).digest('hex');
  const menuSource = readFileSync(path.join(REPO, sourceFiles[0]), 'utf8');
  const backInSource = /popstate|history\.(?:pushState|replaceState|back)|router\.back/.test(menuSource);
  const persist = () => writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const check = (scenario, name, pass, actual = null, reason = null) => report.checks.push({ scenario, name, status: pass === null ? 'not-applicable' : pass ? 'pass' : 'fail', applicable: pass !== null, actual, reason });
  const sizes = [
    ['14pro', { ...pw.devices['iPhone 14 Pro'], viewport: { width: 393, height: 852 } }],
    ['inapp', { ...pw.devices['iPhone 14 Pro'], viewport: { width: 393, height: 660 } }],
    ['se', { ...pw.devices['iPhone SE'], viewport: { width: 320, height: 568 } }],
  ];
  report.devices = sizes.map(([name, d]) => ({ name, viewport: d.viewport, isMobile: d.isMobile, hasTouch: d.hasTouch, deviceScaleFactor: d.deviceScaleFactor, userAgent: d.userAgent }));
  const browser = await launchReviewBrowser(pw.chromium);
  let shotSequence = 0;
  async function scenario(size, device, label, time, fn) {
    const id = size + '/' + label, state = { id, images: [], pageErrors: [], safety: {}, status: 'running' };
    report.scenarios.push(state);
    const context = await browser.newContext({ ...device, serviceWorkers: 'block' });
    const tally = key => { state.safety[key] = (state.safety[key] || 0) + 1; report.safety[key] = (report.safety[key] || 0) + 1; };
    try {
      if (typeof context.routeWebSocket !== 'function') throw new Error('WebSocket interception is unavailable; refusing unsafe navigation.');
      await context.routeWebSocket('**/*', ws => { tally('blockedWebSockets'); ws.close(); });
      await context.route('**/*', async route => {
        const r = route.request(); let childFrame = false;
        try { childFrame = Boolean(r.frame().parentFrame()); } catch {}
        try {
          const decision = classifyRequest({ method: r.method(), url: r.url(), resourceType: r.resourceType(), childFrame }, base.origin);
          tally(decision);
          if (decision === 'neutral-acuity-frame') return await route.fulfill({ status: 200, contentType: 'text/html', body: NEUTRAL_FRAME });
          if (decision !== 'allowed-read') return await route.abort();
          // This branch is reachable only for GET/HEAD after classification.
          if (!['GET', 'HEAD'].includes(r.method())) throw new Error('Non-read request reached continue branch');
          return await route.continue();
        } catch (e) { tally('guardErrors'); state.pageErrors.push('Guard: ' + String(e).slice(0, 180)); try { await route.abort(); } catch {} }
      });
      await context.addInitScript(() => {
        window.__hfChromeRegression = { beaconsBlocked: 0, guardInstalled: false };
        Object.defineProperty(Navigator.prototype, 'sendBeacon', { configurable: true, value: function () { window.__hfChromeRegression.beaconsBlocked++; return false; } });
        sessionStorage.setItem('hf-popup-shown', '1');
        window.__hfChromeRegression.guardInstalled = true;
      });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.on('pageerror', e => state.pageErrors.push(String(e).slice(0, 220)));
      // Fixed browser Date, with ordinary timers retained, exercises the app's own season scripts/effects.
      if (time) { if (!page.clock?.setFixedTime) throw new Error('Browser clock API unavailable; no season DOM substitution is allowed.'); await page.clock.setFixedTime(new Date(time + 'T20:00:00Z')); }
      const goto = async route => {
        const response = await page.goto(new URL(route, base).href, { waitUntil: 'load', timeout: 30000 });
        check(id, 'GET page loads: ' + route, Boolean(response?.ok()), response?.status());
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);
        const guard = await page.evaluate(() => ({ installed: window.__hfChromeRegression?.guardInstalled === true, popup: sessionStorage.getItem('hf-popup-shown') }));
        check(id, 'Pre-navigation beacon guard and actual popup flag: ' + route, guard.installed && guard.popup === '1', guard);
      };
      const shot = async name => {
        const file = String(++shotSequence).padStart(3, '0') + '-' + size + '-' + label.replaceAll('/', '-') + '-' + name + '.png';
        await page.screenshot({ path: path.join(out, file) }); state.images.push(file);
      };
      await fn({ page, goto, shot, id, state });
      const beacons = await page.evaluate(() => window.__hfChromeRegression?.beaconsBlocked || 0).catch(() => 0);
      state.safety.beaconsBlocked = beacons; report.safety.beaconsBlocked = (report.safety.beaconsBlocked || 0) + beacons;
      check(id, 'No request guard exception', !(state.safety.guardErrors > 0), state.safety.guardErrors || 0);
      check(id, 'No app JavaScript exception', state.pageErrors.length === 0, state.pageErrors);
      state.status = 'completed';
    } catch (e) { state.status = 'error'; state.error = String(e).slice(0, 400); check(id, 'Scenario completed', false, state.error); }
    finally { await context.close(); persist(); console.log('[mobile-chrome] ' + id + ': ' + state.status); }
  }
  const menuDialog = p => p.getByRole('dialog', { name: 'Menu', exact: true });
  async function waitMenuClosed(p) { await menuDialog(p).waitFor({ state: 'detached' }); await p.waitForTimeout(350); }
  async function scrollState(p) { return p.evaluate(() => ({
    y: window.scrollY, overflow: document.body.style.overflow, sheet: document.documentElement.hasAttribute('data-sheet-open'),
    scrollingElement: document.scrollingElement?.tagName, rootScrollTop: document.scrollingElement?.scrollTop,
    htmlOverflowY: getComputedStyle(document.documentElement).overflowY, bodyOverflowY: getComputedStyle(document.body).overflowY,
  })); }
  async function openerFocus(trigger) { return trigger.evaluate(el => {
    const active = document.activeElement;
    return { restored: el === active, active: active ? { tag: active.tagName, role: active.getAttribute('role'), label: active.getAttribute('aria-label'), text: active.textContent?.trim().slice(0, 100) } : null };
  }); }
  try {
    for (const [size, device] of sizes) {
      await scenario(size, device, 'menu', null, async ({ page, goto, shot, id }) => {
        await goto('/nordic-spa'); await page.evaluate(() => window.scrollTo(0, 450)); await page.waitForTimeout(350);
        const trigger = page.getByRole('button', { name: 'Open menu', exact: true }), before = await scrollState(page);
        await trigger.click(); await menuDialog(page).waitFor(); await page.waitForTimeout(350);
        const opened = await scrollState(page);
        check(id, 'Opening menu preserves page scroll', Math.abs(opened.y - before.y) <= 2, { before, opened });
        check(id, 'Menu opens, is modal and locks body', opened.sheet && opened.overflow === 'hidden' && await menuDialog(page).getAttribute('aria-modal') === 'true', opened);
        check(id, 'Menu initially focuses Close', await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close menu'));
        const links = await menuDialog(page).locator('nav a').evaluateAll(as => as.map(a => ({ href: a.getAttribute('href'), current: a.getAttribute('aria-current'), height: Math.round(a.getBoundingClientRect().height) })));
        check(id, 'Current Nordic spa menu destination is marked', links.some(a => a.href === '/nordic-spa' && a.current === 'page'), links.filter(a => a.current));
        const focusable = menuDialog(page).locator(FOCUSABLE), last = focusable.last(), first = focusable.first();
        await last.focus(); await page.keyboard.press('Tab');
        check(id, 'Tab wraps last menu control to first', await first.evaluate(el => el === document.activeElement));
        await first.focus(); await page.keyboard.press('Shift+Tab');
        check(id, 'Shift+Tab wraps first menu control to last', await last.evaluate(el => el === document.activeElement));
        const beforeWheel = await scrollState(page);
        check(id, 'Menu focus traversal preserves background scroll', Math.abs(beforeWheel.y - opened.y) <= 2, { opened, afterTraversal: beforeWheel });
        // Preserve the real wheel event over the exposed backdrop. Record a checkpoint
        // after focus traversal so a focus-induced scroll cannot masquerade as wheel leakage.
        const wheelPoint = { x: device.viewport.width - 3, y: device.viewport.height / 2 };
        const wheelTarget = await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el ? { tag: el.tagName, role: el.getAttribute('role'), className: el.className } : null; }, wheelPoint);
        await page.mouse.move(wheelPoint.x, wheelPoint.y); await page.mouse.wheel(0, 350); await page.waitForTimeout(200);
        const afterWheel = await scrollState(page);
        check(id, 'Background wheel does not scroll locked page', Math.abs(afterWheel.y - before.y) <= 2 && Math.abs(afterWheel.y - beforeWheel.y) <= 2, { beforeOpening: before, beforeWheel, afterWheel, wheelPoint, wheelTarget });
        await shot('open'); await page.keyboard.press('Escape'); await waitMenuClosed(page);
        const afterEscape = await scrollState(page);
        check(id, 'Escape closes menu and restores body state/scroll', !afterEscape.sheet && afterEscape.overflow === before.overflow && Math.abs(afterEscape.y - before.y) <= 2, { before, after: afterEscape });
        check(id, 'Escape restores focus to actual opener', await trigger.evaluate(el => el === document.activeElement));
        await trigger.click(); await menuDialog(page).getByRole('button', { name: 'Close menu', exact: true }).click(); await waitMenuClosed(page);
        check(id, 'Close button restores opener focus', await trigger.evaluate(el => el === document.activeElement));
        const afterClose = await scrollState(page);
        check(id, 'Close button restores body state/scroll', !afterClose.sheet && afterClose.overflow === before.overflow && Math.abs(afterClose.y - before.y) <= 2, { before, after: afterClose });
        const historyBefore = await page.evaluate(() => ({ length: history.length, state: JSON.stringify(history.state), url: location.href }));
        await trigger.click(); await page.waitForTimeout(350);
        const historyOpened = await page.evaluate(() => ({ length: history.length, state: JSON.stringify(history.state), url: location.href }));
        const backApplies = backInSource || historyOpened.length > historyBefore.length || historyOpened.state !== historyBefore.state || historyOpened.url !== historyBefore.url;
        if (backApplies) { await page.goBack({ waitUntil: 'domcontentloaded' }); await waitMenuClosed(page); check(id, 'Browser Back closes implemented menu history state', await menuDialog(page).count() === 0); await goto('/nordic-spa'); }
        else { check(id, 'Browser Back menu dismissal', null, { backInSource, historyOpened }, 'No Back/popstate implementation or menu history entry observed.'); await page.keyboard.press('Escape'); await waitMenuClosed(page); }
        await page.getByRole('button', { name: 'Open menu', exact: true }).click();
        await menuDialog(page).locator('a[href="/farm-tours"]').first().click(); await page.waitForURL(u => u.pathname === '/farm-tours'); await waitMenuClosed(page);
        check(id, 'Actual menu navigation arrives and closes menu', new URL(page.url()).pathname === '/farm-tours' && !(await scrollState(page)).sheet, await scrollState(page));
        check(id, 'Navigation releases body lock', (await scrollState(page)).overflow !== 'hidden'); await shot('navigated');
      });
      const seasons = [
        ['gift-before', '/farm-tours', '2026-10-31', 'gift', false], ['gift-start', '/farm-tours', '2026-11-01', 'gift', true],
        ['gift-last', '/farm-tours', '2026-12-24', 'gift', true], ['gift-after', '/farm-tours', '2026-12-25', 'gift', false],
        ['thanksgiving-last', '/stay', '2026-11-23', 'thanksgiving-bar', true], ['thanksgiving-after', '/stay', '2026-11-24', 'thanksgiving-bar', false],
      ];
      for (const [label, route, date, season, expected] of seasons) await scenario(size, device, label, date, async ({ page, goto, shot, id }) => {
        await goto(route); const actual = await page.evaluate(() => ({ seasons: (document.documentElement.dataset.season || '').split(' '), hidden: document.documentElement.hasAttribute('data-bar-hidden'), bar: Boolean(document.querySelector('[data-announcement-bar]')), height: document.querySelector('[data-announcement-bar]')?.getBoundingClientRect().height || 0 }));
        check(id, 'Actual clock sets ' + season + ' at boundary', actual.seasons.includes(season) === expected, actual);
        check(id, 'Season announcement visibility matches boundary', actual.bar && actual.hidden === !expected && (expected ? actual.height >= 44 : actual.height === 0), actual);
        if (expected) {
          const link = page.locator('[data-announcement-bar] a').first(), box = await link.boundingBox(), href = await link.getAttribute('href');
          check(id, 'Season bar retains its actual destination and touch control', href === (season === 'gift' ? '/gift-certificates' : '/thanksgiving#packages') && Boolean(box && box.height >= 44), { href, box });
        }
        await shot('initial');
        if (expected) { await page.evaluate(() => window.scrollTo(0, 200)); await page.waitForTimeout(400); const r = await page.locator('[data-announcement-bar]').boundingBox(); check(id, 'Actual header scrolls seasonal bar away', Boolean(r && r.y + r.height <= 3), r); await shot('scrolled'); }
      });
      for (const route of ['/farm-tours', '/nordic-spa', '/sauna-near-portland', '/gift-certificates']) await scenario(size, device, 'sticky-' + route.slice(1), '2026-10-07', async ({ page, goto, shot, id }) => {
        await goto(route); const sticky = page.locator('[data-sticky-bar]');
        if (!await sticky.count()) { check(id, 'Sticky behavior', null, null, 'No sticky shell rendered on this route/runtime.'); return; }
        const targetSelector = route === '/farm-tours' ? '#choose' : route === '/nordic-spa' ? '#availability' : route === '/gift-certificates' ? '#choose' : '#book';
        const geometry = await page.evaluate(selector => {
          const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
          const rects = s => [...document.querySelectorAll(s)].map(el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height, width: r.width }; });
          return { max, height: innerHeight, heroes: rects('[data-hero-cta]'), stops: rects(selector + ',[data-sticky-stop]') };
        }, targetSelector);
        const candidates = new Set([450, 650, geometry.max]);
        for (let y = 450; y <= geometry.max; y += Math.max(100, Math.floor(geometry.height / 2))) candidates.add(y);
        for (const r of [...geometry.heroes, ...geometry.stops]) candidates.add(Math.min(geometry.max, r.bottom + 30));
        const observed = [];
        for (const y of [...candidates].filter(y => y <= geometry.max).sort((a, b) => a - b)) {
          const stopsVisible = geometry.stops.some(r => r.width > 0 && r.height > 0 && r.bottom > y && r.top < y + geometry.height * 1.15);
          const heroIn = geometry.heroes.some(r => r.width > 0 && r.height > 0 && Math.max(0, Math.min(r.bottom, y + geometry.height) - Math.max(r.top, y)) / r.height >= 0.5);
          if (stopsVisible || heroIn) continue;
          await page.evaluate(y => window.scrollTo(0, y), y); await page.waitForTimeout(350);
          const actual = await page.evaluate(() => scrollY), a = await sticky.first().getAttribute('aria-hidden'); observed.push({ requestedY: y, actualY: actual, ariaHidden: a }); if (a === 'false') break;
        }
        check(id, 'Sticky becomes available in an eligible scrolled region', observed.length ? observed.some(x => x.ariaHidden === 'false') : null, { observed, geometry }, observed.length ? null : 'Page geometry has no scrolled region outside the hero and all actual suppression targets.');
        if (observed.some(x => x.ariaHidden === 'false')) { const box = await sticky.first().boundingBox(); check(id, 'Sticky is within viewport', Boolean(box && box.y >= 0 && box.y + box.height <= device.viewport.height + 1), box); await shot('shown'); }
        const target = page.locator(targetSelector);
        if (await target.count()) { await target.first().scrollIntoViewIfNeeded(); await page.waitForTimeout(400); check(id, 'Sticky hides while actual booking target is visible', await sticky.first().getAttribute('aria-hidden') === 'true'); }
        else check(id, 'Sticky target suppression', null, null, 'Current route target is absent; native/runtime target may differ.');
      });
      await scenario(size, device, 'booking-wrappers', '2026-10-07', async ({ page, goto, shot, id }) => {
        const cases = [
          ...[2, 3, 4, 5, 6].map(n => ({ route: '/farm-tours', selector: '#choose', name: new RegExp('\\b' + n + ' guests\\b'), type: { 2: '48403186', 3: '48403269', 4: '48403283', 5: '48403306', 6: '64217701' }[n], quantity: null, tracking: { booking_type: 'farm_tour', party_size: n, value: n * 75, currency: 'USD' }, label: 'tour-' + n })),
          ...['/nordic-spa', '/sauna-near-portland'].flatMap(route => [
            { name: /1 person/, quantity: '1', label: '1' }, { name: /2 people/, quantity: '2', label: '2' }, { name: /3 to 5 people/, quantity: null, label: '3to5' }, { name: /All six spots/, quantity: '6', label: '6' },
          ].map(r => ({ ...r, route, selector: route === '/nordic-spa' ? '#availability' : '#book', type: '85942611', tracking: r.quantity === null ? { booking_type: 'nordic_spa', party_size: '3-5' } : { booking_type: 'nordic_spa', party_size: Number(r.quantity), value: Number(r.quantity) * 75, currency: 'USD' }, label: route.slice(1) + '-' + r.label }))),
          ...[['Farm tour', '1701258', 'farm_tour', 2, 150], ['Nordic spa', '2114519', 'nordic_spa', 1, 75], ['Highland Day', '2116463', 'highland_day', 2, 300]].map(([giftName, productId, gift_product, party_size, value]) => ({ route: '/gift-certificates', selector: '#choose', giftName, productId, tracking: { booking_type: 'gift_certificate', gift_product, party_size, value, currency: 'USD' }, label: 'gift-' + productId })),
        ];
        let current = null;
        for (const c of cases) {
          const sub = id + '/' + c.label;
          try {
            if (current !== c.route) { await goto(c.route); current = c.route; }
            let region = page.locator(c.selector).first(), trigger;
            if (c.productId) {
              // Current gift flow: a family tile reveals its size ladder; only a
              // ladder row invokes the actual BookingTextLink/modal handler.
              if (await page.getByRole('button', { name: /Add to cart/i }).count()) {
                check(sub, 'Acuity wrapper applicable', null, { nativeObserved: true }, 'Actual native gift checkout replaces this legacy wrapper; native checkout is outside this suite.');
                continue;
              }
              const family = region.getByRole('button', { name: new RegExp('^' + c.giftName + '\\b') }).first();
              const beforeFamily = await page.evaluate(() => (window.dataLayer || []).filter(x => x.event === 'booking_start').length);
              await family.click();
              region = page.getByRole('region', { name: c.giftName + ' group sizes', exact: true });
              await region.waitFor({ state: 'visible' });
              // GiftChooser's own smooth scroll completes before measuring the opener.
              await page.waitForTimeout(500);
              const afterFamily = await page.evaluate(() => (window.dataLayer || []).filter(x => x.event === 'booking_start').length);
              check(sub, 'Gift family reveals its own ladder without opening or tracking a booking', await family.getAttribute('aria-pressed') === 'true' && await page.getByRole('dialog').count() === 0 && afterFamily === beforeFamily, { giftName: c.giftName, countBefore: beforeFamily, countAfter: afterFamily });
              const sizeLabel = c.tracking.party_size + (c.tracking.party_size === 1 ? ' person' : ' guests');
              trigger = region.getByRole('button', { name: new RegExp('^' + sizeLabel + '\\b') }).first();
            } else trigger = region.getByRole('button', { name: c.name }).first();
            if (!await region.count() || !await trigger.count()) {
              const native = await page.locator('#book button[aria-label="More guests"]').count() > 0 || (c.route === '/gift-certificates' && await page.getByRole('button', { name: /Add to cart/i }).count() > 0);
              check(sub, 'Acuity wrapper applicable', native ? null : false, { nativeObserved: native }, native ? 'Actual native controls replace this legacy wrapper entry; native checkout is outside this suite.' : 'Expected actual legacy booking control is absent.'); continue;
            }
            await trigger.scrollIntoViewIfNeeded(); await trigger.focus(); const before = await scrollState(page);
            const focusBefore = await openerFocus(trigger);
            check(sub, 'Actual opener is focused before booking click', focusBefore.restored, focusBefore);
            const eventCount = await page.evaluate(() => (window.dataLayer || []).filter(x => x.event === 'booking_start').length);
            await trigger.click(); const dialog = page.getByRole('dialog').filter({ has: page.locator('iframe') }).first(); await dialog.waitFor();
            const frame = dialog.locator('iframe'), src = await frame.getAttribute('src'), u = new URL(src);
            check(sub, 'Actual handler opens contextual Acuity wrapper', ACUITY.test(u.hostname) && await dialog.getAttribute('aria-modal') === 'true', { title: await dialog.getAttribute('aria-label'), host: u.hostname, path: u.pathname });
            check(sub, 'Written appointment/product and Quantity preserved', c.productId ? u.searchParams.get('productId') === c.productId : u.pathname.includes('/appointment/' + c.type + '/') && u.searchParams.get('quantity') === c.quantity && (c.type !== '85942611' || c.quantity !== null || u.searchParams.get('hf_range') === '3-5'), { type: c.type, productId: u.searchParams.get('productId'), quantity: u.searchParams.get('quantity'), range: u.searchParams.get('hf_range') });
            check(sub, 'Only neutral frame content loaded', await frame.contentFrame().locator('body').innerText().then(t => t.includes('Acuity contents are excluded')));
            if (c.type === '85942611') { const t = await dialog.innerText(); check(sub, 'Contextual Quantity instruction matches actual link', c.quantity === '1' ? !t.includes('Set Quantity') && !t.includes('Quantity is set') : c.quantity === null ? t.includes('Set Quantity to 3, 4 or 5.') : c.quantity === '6' ? t.includes('Quantity is set to 6 for the whole session: 6 × $75 = $450.') : t.includes('Quantity is set to 2: 2 × $75 = $150.'), t.slice(0, 350)); }
            const events = await page.evaluate(() => (window.dataLayer || []).filter(x => x.event === 'booking_start'));
            const event = events.at(-1);
            check(sub, 'Actual click emits its own local booking_start while telemetry is blocked', events.length === eventCount + 1 && Object.entries(c.tracking).every(([k, v]) => event?.[k] === v) && (c.quantity !== null || c.type !== '85942611' || event?.value === undefined), { countBefore: eventCount, countAfter: events.length, expected: c.tracking, observed: event ? { booking_type: event.booking_type, party_size: event.party_size, gift_product: event.gift_product, value: event.value, currency: event.currency } : null });
            check(sub, 'Wrapper locks body', (await scrollState(page)).overflow === 'hidden');
            if (c.label === 'tour-2' || c.label === 'nordic-spa-6') {
              const focusInside = () => dialog.evaluate(el => el.contains(document.activeElement));
              check(sub, 'Wrapper initially focuses a control inside its dialog', await focusInside(), await page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') })));
              // The iframe is a parent-document focus stop. Its neutral document has
              // no controls; this does not inspect or assume Acuity's real interior.
              const controls = dialog.locator(FOCUSABLE + ', iframe'), first = controls.first(), last = controls.last();
              await last.focus(); await page.keyboard.press('Tab');
              check(sub, 'Tab wraps last wrapper focus stop to first', await first.evaluate(el => el === document.activeElement));
              await first.focus(); await page.keyboard.press('Shift+Tab');
              check(sub, 'Shift+Tab wraps first wrapper control to last focus stop', await last.evaluate(el => el === document.activeElement));
              // Deliberately attempt real DOM focus on the existing background
              // opener. Containment must keep the active element in the dialog.
              await trigger.evaluate(el => el.focus({ preventScroll: true }));
              check(sub, 'Background focus cannot escape the open wrapper', await focusInside(), await page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') })));
            }
            if (c.label === 'tour-2' || c.quantity === '6' || c.productId === '2116463') await shot(c.label);
            await dialog.getByRole('button', { name: 'Close', exact: true }).focus();
            await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
            const after = await scrollState(page); check(sub, 'Escape restores scroll and body overflow', after.overflow === before.overflow && Math.abs(after.y - before.y) <= 2, { before, after });
            const escapeFocus = await openerFocus(trigger);
            check(sub, 'Escape restores actual trigger focus', escapeFocus.restored, escapeFocus);
            await trigger.focus(); await trigger.click(); await dialog.waitFor(); await dialog.getByRole('button', { name: 'Close', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
            const closeFocus = await openerFocus(trigger);
            check(sub, 'Close button restores actual trigger focus', closeFocus.restored, closeFocus);
            const afterClose = await scrollState(page);
            check(sub, 'Close button restores scroll and body overflow', afterClose.overflow === before.overflow && Math.abs(afterClose.y - before.y) <= 2, { before, after: afterClose });
          } catch (e) { check(sub, 'Booking case completed', false, String(e).slice(0, 350)); await page.keyboard.press('Escape').catch(() => {}); current = null; }
        }
      });
    }
  } finally { await browser.close(); report.finished = new Date().toISOString(); report.summary = { passed: report.checks.filter(c => c.status === 'pass').length, failed: report.checks.filter(c => c.status === 'fail').length, notApplicable: report.checks.filter(c => c.status === 'not-applicable').length, scenarios: report.scenarios.length }; report.pass = report.summary.failed === 0; persist(); }
  console.log(JSON.stringify({ report: reportPath, ...report.summary, pass: report.pass }));
  process.exitCode = report.pass ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv[2] === '--self-check') console.log(JSON.stringify({ browserLaunched: false, checks: safetySelfCheck() }, null, 2));
  else await run(...process.argv.slice(2));
}
