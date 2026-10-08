# Mobile recovery regression checks

These checks exercise the running application's actual React controls and handlers. They cover inquiry validation and retry, checkout concurrency and recovery, trusted stay-widget messages, and mobile menu/booking chrome. They use the repository's existing `playwright` dependency. They never install dependencies or browsers, build the app, or start a server.

Supply an explicit HTTP(S) base URL for an already running server and a **new output directory for each command**. Existing output directories are refused, including empty ones, so earlier screenshots and reports cannot be replaced. Run browser checks outside `CODEX_SANDBOX`; the scripts refuse browser launch when it is set. Use an environment with Playwright and its Chromium browser already available. The fallback browser channel is `chromium`.

To select a different browser already installed on the execution host, explicitly set `HF_REVIEW_BROWSER_EXECUTABLE` to its absolute executable-file path before running a command. The shared launcher validates that path and passes it directly to Playwright; it does not install a browser, search caches or fall back from an explicitly selected executable. Without the variable, the normal Playwright launch and `chromium` channel fallback remain. A browser version different from Playwright's bundled version needs an actual successful run before compatibility can be claimed; record the versions used with the resulting evidence.

From the repository root, replace `BASE_URL` and each output path below with the intended existing server and fresh evidence destination:

```sh
node scripts/mobile-recovery/forms-regression.mjs BASE_URL NEW_OUTPUT/forms
node scripts/mobile-recovery/checkout-regression.mjs BASE_URL NEW_OUTPUT/checkout
node scripts/mobile-recovery/checkout-retry-contract.mjs BASE_URL NEW_OUTPUT/checkout-retry
node scripts/mobile-recovery/stay-widget-regression.mjs BASE_URL NEW_OUTPUT/stay
node scripts/mobile-recovery/mobile-chrome-regression.mjs BASE_URL NEW_OUTPUT/chrome
```

Each command writes `report.json` and screenshots, and returns a nonzero exit code for a failed check or scenario. Review the reported assertions and applicability, rather than treating a screenshot or an HTTP response alone as a pass. The served app must correspond to the intended checkout. Chrome's source hashes come from this repository, derived from the script's own location; they do not prove which commit the supplied server runs.

| Runner | Actual behavior exercised |
| --- | --- |
| `forms-regression.mjs` | Wedding/contact forms at touch in-app and SE sizes: dependent date errors clear, invalid data never submits, concurrent native submits do not duplicate an in-flight inquiry, failure preserves answers and independent SMS choices, fresh synthetic verification token enables one retry, success receives focus, and accepted success survives throwing analytics |
| `checkout-regression.mjs` | SE checkout: first missing field receives focus, corrected details clear stale validation, concurrent native submits produce one payment attempt, genuine payment error remains while editing, uncertain retry retains its key, and rejected SDK tokenization remains retryable without reaching payment |
| `checkout-retry-contract.mjs` | Malformed gateway response, missing outcome flag and explicitly unknown outcome retain the retry key; explicit definitive decline rotates it; accepted order clears cart and navigates to confirmation even if purchase analytics throws |
| `stay-widget-regression.mjs` | Four actual stay wrappers at in-app and SE sizes: trusted iframe height messages resize frame and wrapper together, malformed payloads are ignored, and main-page/second-provider/untrusted-frame messages cannot resize the booking frame |
| `mobile-chrome-regression.mjs` | iPhone 14 Pro, in-app and SE menu focus/scroll locks, seasonal boundaries, sticky suppression, actual booking party/gift controls and tracking, modal close/focus behavior, and current disclosure behavior. Unsupported menu Back behavior is explicitly inapplicable |

Before navigation, every browser context installs request interception, disables beacons, blocks service workers and closes WebSockets. Non-read requests are either aborted or fulfilled locally at the runner's narrow same-origin fixture endpoints. Telemetry is blocked. The chrome runner has no write fixtures and also blocks unknown external requests and sensitive API reads; only its named availability read is allowed. Provider documents used by stay and Acuity checks are labelled neutral local responses. None of these commands sends real inquiries, reservations, payments, cart saves, email or other external writes.

`fixtures.mjs` contains the neutral Square SDK fixture extracted from the review tooling. It returns `HF_REVIEW_NON_PAYMENT_TOKEN`; it cannot charge a card. The forms runner's synthetic Turnstile SDK invokes the actual registered application callbacks, including resets. Real payment tokenization, wallet services, Cloudflare verification, server-side business integrations and provider internals remain untested. The application still needs its own relevant public payment configuration to mount its payment component; the fixture does not fabricate missing configuration.

The forms runner installs a deterministic **browser Date fixture at 2026-10-08T20:00:00Z before navigation**, retaining ordinary timers. It waits for the application's real hydrated 2026/2027 options, then checks January 2026 as past and 2027 as future. No select options are injected. Chrome's seasonal scenarios use explicit browser clock fixtures already defined in that runner. Reports label these fixtures. Cart lines use synthetic local storage; product prices and inventory are never overwritten or invented.

The scripts use true Playwright touch/mobile device contexts. Chromium does not reproduce iOS software keyboard or native picker pixels. Adversarial `requestSubmit()` cases deliberately test a concurrency boundary separately from ordinary taps.

A no-browser classifier check is available and may run under `CODEX_SANDBOX`:

```sh
node scripts/mobile-recovery/mobile-chrome-regression.mjs --self-check
```

It evaluates 21 safety decisions without launching a browser. Syntax checks and this classifier check do not establish that the application behavior passes; run the relevant browser checks against the intended existing server for that evidence. There are no environment-specific paths, automatic deployments or live-account operations in these scripts.
