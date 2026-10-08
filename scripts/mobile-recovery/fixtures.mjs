/** Local SDK fixtures only. No real verification or payment service is called. */
export const SQUARE_SDK = `(() => {
  window.__hfReviewSquareFixture = true;
  window.Square = { payments() { return {
    async card() { return {
      async attach(selector) { const host = document.querySelector(selector); if (!host) throw new Error('Card host not found'); const frame = document.createElement('iframe'); frame.title = 'Square card fixture, no payment service'; frame.style = 'border:1px solid #b6b5a3;width:100%;height:52px;display:block'; frame.srcdoc = '<!doctype html><html><body style="margin:0;padding:12px;font:13px Arial;color:#59594d;background:#fbf8f0">Review fixture: secure card field omitted</body></html>'; host.appendChild(frame); },
      async tokenize() { return window.__hfReviewCardError ? { status: 'INVALID', errors: [{ message: 'Please check your card details and try again.' }] } : { status: 'OK', token: 'HF_REVIEW_NON_PAYMENT_TOKEN' }; }, destroy() {}
    }; }, paymentRequest(req) { return req; },
    async applePay() { throw new Error('Wallet unavailable in review fixture'); },
    async googlePay() { throw new Error('Wallet unavailable in review fixture'); }
  }; } };
})();`;

export const DATE_FIXTURE = Object.freeze({
  iso: '2026-10-08T20:00:00.000Z',
  purpose: 'October 8, 2026 date-validation fixture; browser Date is fixed before navigation, ordinary timers remain real. Actual app options are awaited after hydration; no options or inventory are injected.',
});

export async function installDateFixture(context) {
  await context.addInitScript(({ iso }) => {
    const NativeDate = globalThis.Date;
    const fixed = NativeDate.parse(iso);
    globalThis.Date = new Proxy(NativeDate, {
      apply() { return new NativeDate(fixed).toString(); },
      construct(target, args, newTarget) {
        return Reflect.construct(target, args.length ? args : [fixed], newTarget);
      },
      get(target, property, receiver) {
        return property === 'now' ? () => fixed : Reflect.get(target, property, receiver);
      },
    });
    window.__hfReviewDateFixture = iso;
  }, DATE_FIXTURE);
}
