/** Exercise the actual React wrapper with a neutral provider document. No reservation requests. */
import pw from 'playwright';
import { writeFileSync } from 'node:fs';
import { launchReviewBrowser, prepareRun } from './run-options.mjs';
const { base, out } = prepareRun('stay-widget-regression.mjs');
const browser = await launchReviewBrowser(pw.chromium);
const cases = [];
let blockedWrites = 0, blockedTelemetry = 0, mockedProviderDocuments = 0;
const neutral = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f6f3ec;font:16px system-ui;color:#232a20"><p style="padding:24px">Provider frame isolated for wrapper verification. No dates, customer details or reservation.</p></body></html>';
try {
  for (const [size, device] of [
    ['inapp', { ...pw.devices['iPhone 14 Pro'], viewport: { width: 393, height: 660 } }],
    ['se', { ...pw.devices['iPhone SE'], viewport: { width: 320, height: 568 } }],
  ]) {
    const ctx = await browser.newContext({ ...device, deviceScaleFactor: 1, serviceWorkers: 'block' });
    await ctx.route('**/*', route => {
      const request = route.request();
      if (!['GET', 'HEAD'].includes(request.method())) { blockedWrites++; return route.abort(); }
      if (/googletagmanager|google-analytics|analytics\.google|facebook|clarity|leadconnector|bookediq|doubleclick|_vercel\/(insights|speed-insights)/i.test(request.url()) || request.resourceType() === 'eventsource') { blockedTelemetry++; return route.abort(); }
      const url = new URL(request.url());
      if (request.isNavigationRequest() && (url.hostname === 'hospitable.com' || url.hostname.endsWith('.hospitable.com') || url.hostname === 'hf-review-untrusted.invalid')) {
        mockedProviderDocuments++;
        return route.fulfill({ status: 200, contentType: 'text/html', body: neutral });
      }
      return route.continue();
    });
    await ctx.routeWebSocket('**/*', socket => socket.close());
    await ctx.addInitScript(() => { navigator.sendBeacon = () => false; sessionStorage.setItem('hf-popup-shown', '1'); });
    for (const slug of ['lodge', 'cottage', 'camp', 'whole-farm']) {
      const page = await ctx.newPage();
      page.setDefaultTimeout(8000);
      const record = { slug, size, checks: [], fixture: 'Neutral documents exercise the actual React message handler. 280px reproduces the earlier observed wrapper gap; 520px initial fallback; 777px stress fixture. No claim about current provider internals. Additional hidden neutral frames are explicitly message-source fixtures, not application state.' };
      try {
        await page.goto(new URL('/stay/' + slug, base).href, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const iframe = page.locator('#book iframe');
        await iframe.waitFor();
        const provider = await (await iframe.elementHandle()).contentFrame();
        await provider.waitForLoadState('domcontentloaded');
        record.source = { actualIframeSrc: await iframe.getAttribute('src'), actualFrameUrl: provider.url() };
        const trustedOrigin = new URL(provider.url()).origin;
        const trustedHost = new URL(provider.url()).hostname;
        record.checks.push({ name: 'Message sender is the actual booking iframe at a trusted provider origin', pass: trustedHost === 'hospitable.com' || trustedHost.endsWith('.hospitable.com'), actual: record.source });
        if (trustedHost !== 'hospitable.com' && !trustedHost.endsWith('.hospitable.com')) throw new Error('Actual provider iframe is not at an expected trusted origin.');
        const measure = () => page.evaluate(() => {
          const iframe = document.querySelector('#book iframe');
          const parent = iframe.parentElement;
          const ir = iframe.getBoundingClientRect(), pr = parent.getBoundingClientRect();
          return { iframe: ir.height, wrapper: pr.height, reservedGap: pr.height - ir.height, minHeight: getComputedStyle(parent).minHeight, overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        const initial = await measure();
        record.initial = initial;
        record.checks.push({ name: 'Initial fallback reserves 520px', pass: Math.abs(initial.iframe - 520) < 1 && Math.abs(initial.wrapper - 520) < 1 });
        for (const height of [280, 520, 777, '280']) {
          await provider.evaluate(h => parent.postMessage({ iframeHeight: h }, '*'), height);
          await page.waitForTimeout(80);
          const geometry = await measure();
          record.checks.push({ name: `Actual trusted iframe ${typeof height} ${height}px resizes frame and wrapper together`, pass: Math.abs(geometry.iframe - Number(height)) < 1 && Math.abs(geometry.wrapper - Number(height)) < 1 && Math.abs(geometry.reservedGap) < 1, ...geometry });
          if (height === 777) { await page.locator('#book').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/${slug}-${size}-777-stress.png` }); }
        }
        for (const [label, payload] of [
          ['NaN', {iframeHeight: NaN}], ['Infinity', {iframeHeight: Infinity}],
          ['negative Infinity', {iframeHeight: -Infinity}], ['nonnumeric string', {iframeHeight: 'not-height'}],
          ['Infinity string', {iframeHeight: 'Infinity'}], ['zero', {iframeHeight: 0}],
          ['negative', {iframeHeight: -280}], ['empty string', {iframeHeight: ''}],
          ['null', {iframeHeight: null}], ['boolean', {iframeHeight: true}],
          ['array', {iframeHeight: [280]}], ['object', {iframeHeight: {height: 280}}],
          ['missing height', {}], ['nonnumeric message body', 'height'],
        ]) {
          const before = await measure();
          await provider.evaluate(value => parent.postMessage(value, '*'), payload);
          await page.waitForTimeout(80);
          const after = await measure();
          record.checks.push({ name: `Actual trusted iframe malformed ${label} is ignored`, pass: after.iframe === before.iframe && after.wrapper === before.wrapper && after.minHeight === before.minHeight, before, after });
        }
        const beforeUntrusted = await measure();
        await page.evaluate(() => window.postMessage({ iframeHeight: 300 }, '*'));
        await page.waitForTimeout(80);
        const afterUntrusted = await measure();
        record.checks.push({ name: 'Main page origin cannot resize provider frame', pass: afterUntrusted.iframe === beforeUntrusted.iframe && afterUntrusted.wrapper === beforeUntrusted.wrapper });
        // Real postMessage sources/origins: isolated neutral fixture frames, never synthetic MessageEvent.
        for (const [label, fixtureOrigin] of [['second-trusted', trustedOrigin], ['untrusted-origin', 'https://hf-review-untrusted.invalid']]) {
          const fixtureId = `hf-review-${label}-message-fixture`;
          await page.evaluate(({id, src}) => { const frame = document.createElement('iframe'); frame.id = id; frame.title = 'Isolated neutral postMessage source fixture'; frame.hidden = true; frame.src = src; frame.setAttribute('sandbox', 'allow-scripts allow-same-origin'); document.body.appendChild(frame); }, {id: fixtureId, src: fixtureOrigin + '/__hf-review-message-fixture__'});
          const fixtureElement = page.locator('#' + fixtureId);
          const fixtureFrame = await (await fixtureElement.elementHandle()).contentFrame();
          await fixtureFrame.waitForURL(fixtureOrigin + '/__hf-review-message-fixture__');
          await fixtureFrame.waitForLoadState('domcontentloaded');
          const fixtureActualOrigin = new URL(fixtureFrame.url()).origin;
          record.checks.push({name: `${label} message fixture has intended origin and differs from actual booking frame`, pass: fixtureActualOrigin === fixtureOrigin && fixtureFrame !== provider, actual: {origin: fixtureActualOrigin, distinctFrame: fixtureFrame !== provider}});
          const before = await measure();
          await fixtureFrame.evaluate(() => parent.postMessage({iframeHeight: 999}, '*'));
          await page.waitForTimeout(80);
          const after = await measure();
          record.checks.push({name: `${label} frame cannot resize actual booking frame`, pass: before.iframe === after.iframe && before.wrapper === after.wrapper && before.minHeight === after.minHeight, before, after});
          await fixtureElement.evaluate(el => el.remove());
        }
        record.checks.push({ name: 'No horizontal mobile overflow', pass: !(await measure()).overflowX });
        await page.locator('#book').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${out}/${slug}-${size}.png` });
      } catch (error) { record.error = String(error).slice(0, 500); }
      finally { cases.push(record); await page.close(); }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  const checks = cases.flatMap(c => c.checks);
  const report = { base, cases, counts: { checks: checks.length, failed: checks.filter(c => !c.pass).length, errors: cases.filter(c => c.error).length, blockedWrites, blockedTelemetry, mockedProviderDocuments }, safety: 'All non-GET/HEAD requests, telemetry, EventSource, beacons, websockets and service workers blocked before navigation. Actual React message handler; neutral documents at original provider and explicit fixture origins. No provider controls or reservations. Fresh output directory required.' };
  writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.counts));
  if (report.counts.failed || report.counts.errors) process.exitCode = 1;
}
