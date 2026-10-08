/** Actual checkout recovery contract. All payments and responses are local fixtures. */
import pw from 'playwright';
import { writeFileSync } from 'node:fs';
import { launchReviewBrowser, prepareRun } from './run-options.mjs';
import { SQUARE_SDK as sdk } from './fixtures.mjs';
const { base, out } = prepareRun('checkout-retry-contract.mjs');
const origin = new URL(base).origin;
const report = { base, started: new Date().toISOString(), checks: [], errors: [], safety: { blockedWrites: 0, mockedCheckouts: 0, mockedCartSaves: 0, blockedTelemetry: 0 }, fixture: 'Synthetic cart/customer, non-payment token, intercepted local responses. No real payments, inquiries or external writes.' };
const browser = await launchReviewBrowser(pw.chromium);
try {
  for (const scenario of ['malformed', 'missing-flag', 'unknown', 'declined', 'saved-analytics-throws']) {
    const ctx = await browser.newContext({ ...pw.devices['iPhone SE'], deviceScaleFactor: 1, serviceWorkers: 'block' });
    const requests = [];
    await ctx.route('**/*', async route => {
      const q = route.request(), u = new URL(q.url());
      if (/googletagmanager|google-analytics|facebook|clarity|leadconnector|doubleclick|_vercel\/(insights|speed-insights)/i.test(u.href)) { report.safety.blockedTelemetry++; return route.abort(); }
      if (!['GET', 'HEAD'].includes(q.method())) {
        if (q.method() === 'POST' && u.origin === origin && u.pathname === '/api/shop/cart/save') { report.safety.mockedCartSaves++; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }); }
        if (q.method() === 'POST' && u.origin === origin && u.pathname === '/api/shop/checkout') {
          const data = q.postDataJSON();
          requests.push({ key: data.idempotencyKey, fixtureToken: data.sourceId === 'HF_REVIEW_NON_PAYMENT_TOKEN' });
          report.safety.mockedCheckouts++;
          if (scenario === 'saved-analytics-throws') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"orderNumber":"HF-REVIEW-RETRY"}' });
          if (requests.length === 1 && scenario === 'malformed') return route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Fixture gateway response</h1>' });
          const body = { success: false, error: 'Synthetic recovery check. Please try again.' };
          if (scenario !== 'missing-flag' || requests.length > 1) body.reuseIdempotencyKey = scenario !== 'declined' || requests.length > 1;
          return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify(body) });
        }
        report.safety.blockedWrites++; return route.abort();
      }
      if (u.hostname.endsWith('squarecdn.com') && u.pathname.endsWith('/square.js')) return route.fulfill({ contentType: 'application/javascript', body: sdk });
      if (u.origin === origin && u.pathname.startsWith('/api/')) return route.abort();
      return route.continue();
    });
    await ctx.routeWebSocket('**/*', ws => ws.close());
    await ctx.addInitScript({ content: sdk });
    await ctx.addInitScript(() => {
      navigator.sendBeacon = () => false;
      localStorage.setItem('hf-cart-v1', JSON.stringify([{ variantId: 'SQ6898162', quantity: 2 }, { variantId: 'SQ9271455', quantity: 1 }]));
      sessionStorage.setItem('hf-popup-shown', '1');
    });
    const page = await ctx.newPage();
    try {
      await page.goto(new URL('/shop/checkout', base).href, { waitUntil: 'load' });
      const pay = page.locator('form:has(#co-name) button[type="submit"]');
      await pay.waitFor();
      await page.waitForFunction(() => window.Square && document.querySelector('#square-card iframe'));
      await page.locator('#co-name').fill('Alex Review');
      await page.locator('#co-email').fill('mobile-review@example.invalid');
      await page.locator('#co-phone').fill('5035550100');
      if (scenario === 'saved-analytics-throws') {
        await page.evaluate(() => {
          window.__hfPurchasePushAttempted = false;
          window.dataLayer ||= [];
          const original = window.dataLayer.push.bind(window.dataLayer);
          window.dataLayer.push = (...items) => {
            if (items.some(item => item?.event === 'purchase')) { window.__hfPurchasePushAttempted = true; throw new Error('Synthetic analytics failure'); }
            return original(...items);
          };
        });
      }
      await pay.click();
      if (scenario === 'saved-analytics-throws') {
        await page.waitForTimeout(700);
        const state = await page.evaluate(() => ({ pathname: location.pathname, cart: JSON.parse(localStorage.getItem('hf-cart-v1') || '[]'), analyticsAttempted: window.__hfPurchasePushAttempted }));
        report.checks.push({ scenario, name: 'Accepted order remains successful when purchase analytics throws', pass: state.pathname === '/shop/thank-you' && state.cart.length === 0 && state.analyticsAttempted === true, actual: { pathname: state.pathname, cartLineCount: state.cart.length, analyticsAttempted: state.analyticsAttempted, checkoutRequests: requests.length } });
      } else {
        await page.locator('#card-alert').waitFor();
        await page.waitForTimeout(100);
        await pay.click();
        await page.waitForFunction(() => !document.querySelector('form button[type="submit"]')?.disabled);
        await page.waitForTimeout(100);
        const same = requests.length === 2 && requests[0].key === requests[1].key;
        report.checks.push({ scenario, name: scenario === 'declined' ? 'Explicit definitive decline rotates the retry key' : 'Uncertain outcome retains the retry key', pass: requests.length === 2 && (scenario === 'declined' ? !same : same), actual: { requests: requests.length, sameKey: same } });
      }
      report.checks.push({ scenario, name: 'Only non-payment fixture tokens used', pass: requests.length > 0 && requests.every(r => r.fixtureToken), actual: requests.map(r => r.fixtureToken) });
      await page.screenshot({ path: `${out}/${scenario}.png` });
    } catch (error) { report.errors.push({ scenario, error: String(error).slice(0, 500) }); }
    finally { await ctx.close(); writeFileSync(out + '/report.json', JSON.stringify(report, null, 2)); }
  }
} finally { await browser.close(); }
report.completed = new Date().toISOString();
report.pass = !report.errors.length && report.checks.every(c => c.pass);
writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checks: report.checks.length, failed: report.checks.filter(c => !c.pass), errors: report.errors, safety: report.safety }));
process.exitCode = report.pass ? 0 : 1;
