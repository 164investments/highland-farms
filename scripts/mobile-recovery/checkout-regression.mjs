import pw from 'playwright';
import {writeFileSync} from 'node:fs';
import { launchReviewBrowser, prepareRun } from './run-options.mjs';
import { SQUARE_SDK as sdk } from './fixtures.mjs';
import path from 'node:path';
const { base, out } = prepareRun('checkout-regression.mjs');
const sdkWithRejection=sdk.replace('async tokenize() { return', 'async tokenize() { if(window.__hfReviewTokenReject) throw new Error("Synthetic tokenizer rejection"); return');
if(sdkWithRejection===sdk)throw Error('Square fixture tokenize hook not found');
const browser = await launchReviewBrowser(pw.chromium);
const report = {base, started:new Date().toISOString(), checks:[], blockedWrites:0, mockedWrites:0, checkoutRequests:[]};
try {
  const ctx = await browser.newContext({...pw.devices['iPhone SE'], viewport:{width:320,height:568}, deviceScaleFactor:1, serviceWorkers:'block'});
  await ctx.route('**/*', async route => {
    const req=route.request(), url=new URL(req.url());
    if (/googletagmanager|google-analytics|facebook\.com|clarity\.ms|doubleclick|leadconnector/i.test(url.href)) return route.abort();
    if (!['GET','HEAD'].includes(req.method())) {
      if (url.origin===new URL(base).origin && url.pathname==='/api/shop/cart/save') { report.mockedWrites++; return route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'}); }
      if (url.origin===new URL(base).origin && url.pathname==='/api/shop/checkout') {
        report.mockedWrites++;
        const data=req.postDataJSON();
        report.checkoutRequests.push({fixtureToken:data.sourceId==='HF_REVIEW_NON_PAYMENT_TOKEN',key:data.idempotencyKey});
        await new Promise(resolve=>setTimeout(resolve,850));
        return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:"We couldn't reach the farm. Please try again.",reuseIdempotencyKey:true})});
      }
      report.blockedWrites++; return route.abort();
    }
    if (/squarecdn\.com$/.test(url.hostname) && url.pathname.endsWith('/square.js')) return route.fulfill({contentType:'application/javascript',body:sdkWithRejection});
    return route.continue();
  });
  await ctx.routeWebSocket('**/*', ws=>ws.close());
  await ctx.addInitScript({content:sdkWithRejection});
  await ctx.addInitScript(()=>{
    navigator.sendBeacon=()=>false;
    localStorage.setItem('hf-cart-v1',JSON.stringify([{variantId:'SQ6898162',quantity:2},{variantId:'SQ9271455',quantity:1}]));
    sessionStorage.setItem('hf-popup-shown','1');
  });
  const page=await ctx.newPage();
  await page.goto(new URL('/shop/checkout',base).href,{waitUntil:'load'});
  const form=page.locator('form:has(#co-name)'), pay=form.locator('button[type="submit"]');
  await pay.waitFor(); await page.waitForFunction(()=>!document.querySelector('form button[type="submit"]')?.disabled);
  await pay.click(); await page.waitForTimeout(250);
  const emptyFocus=await page.evaluate(()=>document.activeElement?.id);
  report.checks.push({name:'Empty checkout focuses first missing detail',pass:emptyFocus==='co-name',actual:emptyFocus});
  await page.screenshot({path:path.join(out,'empty-validation.png')});
  await page.locator('#co-name').fill('Alex Review');
  await page.locator('#co-email').fill('mobile-review@example.invalid');
  await page.locator('#co-phone').fill('5035550100');
  await page.waitForTimeout(250);
  const stale=await page.getByText('Add your name, email and phone first, then pay.',{exact:true}).count();
  report.checks.push({name:'Corrected contact details clear obsolete validation',pass:stale===0,actual:stale});
  report.checks.push({name:'No invalid checkout sent to payment endpoint',pass:report.checkoutRequests.length===0,actual:report.checkoutRequests.length});
  await page.locator('#co-email').focus(); await page.screenshot({path:path.join(out,'corrected-contact.png')});
  await form.evaluate(el=>{el.requestSubmit();el.requestSubmit()});
  await page.waitForTimeout(350);
  report.checks.push({name:'Adversarial concurrent submits send at most one payment attempt',pass:report.checkoutRequests.length===1,actual:report.checkoutRequests.length});
  const alert=page.locator('#card-alert');await alert.waitFor();await page.waitForTimeout(200);
  const paymentFocus=await page.evaluate(()=>document.activeElement?.id);
  report.checks.push({name:'Actual payment failure keeps alert focus',pass:paymentFocus==='card-alert',actual:paymentFocus});
  await page.locator('#co-name').fill('Alex Review Updated');
  report.checks.push({name:'Editing contact does not hide actual payment failure',pass:await alert.count()===1,actual:await alert.count()});
  await page.screenshot({path:path.join(out,'retained-payment-error.png')});
  const firstKey=report.checkoutRequests[0]?.key;const countBefore=report.checkoutRequests.length;
  await pay.click();await page.waitForTimeout(1100);
  report.checks.push({name:'Retry makes one attempt and retains unknown-outcome idempotency key',pass:report.checkoutRequests.length===countBefore+1&&report.checkoutRequests.at(-1)?.key===firstKey,actual:{retryAttempts:report.checkoutRequests.length-countBefore,sameKey:report.checkoutRequests.at(-1)?.key===firstKey}});
  report.checks.push({name:'Every mocked payment uses the non-payment fixture token',pass:report.checkoutRequests.every(r=>r.fixtureToken),actual:report.checkoutRequests.map(r=>r.fixtureToken)});
  const beforeReject=report.checkoutRequests.length;
  await page.evaluate(()=>window.__hfReviewTokenReject=true);
  await pay.click();await page.waitForTimeout(350);
  report.checks.push({name:'Rejected SDK tokenization leaves a retryable visible card error',pass:!(await pay.isDisabled())&&await alert.count()===1,actual:{payDisabled:await pay.isDisabled(),cardAlertCount:await alert.count()}});
  report.checks.push({name:'Rejected tokenization never reaches payment endpoint',pass:report.checkoutRequests.length===beforeReject,actual:report.checkoutRequests.length-beforeReject});
  await page.screenshot({path:path.join(out,'tokenizer-rejection.png')});
  await ctx.close();
} finally { await browser.close(); }
report.completed=new Date().toISOString(); report.pass=report.checks.every(c=>c.pass);
report.checkoutRequests=report.checkoutRequests.map(({fixtureToken})=>({fixtureToken}));
writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
process.exitCode=report.pass?0:1;
