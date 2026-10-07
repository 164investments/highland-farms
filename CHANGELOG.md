# Changelog

All notable changes to Highland Farms are documented here.

## [0.3.2.1] - 2026-10-07

### Changed

- Replace the old overhead drone photo (red roof, bare yard, taken before the patio, lawn and gardens were built) with Connor's current-layout aerial at dusk on /about, /celebrations and the Whole Farm stay pages. The new image is a ChatGPT render approved by Hayden; its alt text says "Styled" and AGENTS.md records it as the one exception to the real-photos rule.

## [0.3.3.0] - 2026-10-07

### Changed

- Phone menu, the Weddings block: add the two-night price ("Two-night weddings from $13,000") and "Every September 2026 Saturday sold out", both from the farm's confirmed-weddings record; "See four real weddings" counts the confirmed couples; the look book reads "Free 20-page PDF".
- Phone menu: the call, directions and Instagram buttons match; the short links sit on one aligned line; captions are at least 12px; the page behind the open menu can no longer be reached by keyboard or screen reader.

## [0.3.2.0] - 2026-10-07

### Changed

- Rebuild the phone menu as a sidebar that slides in from the left over the dimmed page, with the farm's own photos: Weddings as a photo of a couple between two coos with the Google review count, the coos line and three steps (real weddings, the look book, a free 45-minute call with Connor); farm tours, the Nordic spa, stays, gift certificates and the farm shop as photo rows with their price or detail; quick buttons to call, get directions or open Instagram; and a mark on the page you are on. Tap the page, swipe left or press close to dismiss it.

## [0.3.1.0] - 2026-10-07

### Changed

- Calm the phone menu: Weddings is the one large line with a single note ("Up to 125 guests, plus the coos") and its three steps beneath it (real weddings, the look book, a free 45-minute call with Connor), then the visits as plain rows and the short links on one line. The grey hint beside every row, the phone line, Instagram and the address are gone from the menu (they stay in the footer and on Contact), and the whole menu now fits an Instagram-browser phone screen without scrolling.

## [0.3.0.0] - 2026-10-07

### Changed

- Redesign every page in the Field Guide style, led by weddings: the name "Highland Farms, Brightwood, Oregon" in words at the top of every page, a paper masthead, menu and footer, and one bottom action on phones that never covers a picker or a form.
- Rebuild the wedding and contact forms: date and guest count first, month and year with "We're flexible", guest bands that match the venue, and text consent shown only after a phone number is typed.
- Rebuild home, weddings, the real-weddings journal and its couple pages, farm tours, the Nordic spa, the sauna page, stays and each stay, celebrations, gifts, about, contact, the legal pages, the 404 and every shop page.
- Bring the Thanksgiving page (0.2.1.0) onto the shared FAQ, quote and sticky-bar parts, keeping its content and click tracking.
- Use only facts the farm has confirmed: unanswered details stay hidden, every guest quote is word for word from Google, and the one public phone line is (971) 236-2551.

### Added

- A gifts page that links each gift to its own Acuity certificate.
- Field-guide drawings of the herd and the buildings, used as decoration beside real photos.

### Fixed

- Count each website lead once in GA4 (`generate_lead` was sent by both GTM and the server).
- Send old `/shop/p/` product links to the matching product instead of the expired Squarespace store.

## [0.2.1.0] - 2026-10-06

### Changed

- Rebuild the Thanksgiving page in the Field Guide style: paper ground, framed photos, ruled lists and one "Check availability" action, with the whole offer readable on a phone's first screen.
- Spell out what the package includes, using the farm team's details: the chef-cooked dinner with a menu you shape, dishes and leftovers handled, a 1-hour welcome farm tour, a 1-hour photoshoot with 35 edited photos, 1 or 2 spa sessions (16+, not on Thanksgiving Day), eggs and sausage in the fridge, and an itinerary planned before you arrive.
- Offer one optional upgrade, a chef-cooked Friday country breakfast, and drop the wine pairing and spa charcuterie.
- Compare the two packages side by side, with per-guest pricing and the only two differences (where you sleep, spa sessions).
- Answer breakfast, spa, kids, meals, pets and packing questions plainly, and prefill the inquiry email with the guest split and allergies the team needs.

## [0.2.0.1] - 2026-10-06

### Changed

- Show the actual Lodge dining room styled for Thanksgiving in the page hero and social previews.
- Show the Lodge, Cottage and Camp up close in the whole-farm package, and use clearer Lodge-interior and sauna photos.

## [0.2.0.0] - 2026-10-06

### Added

- Compare the two four-night Thanksgiving 2026 stay packages, see meals and experiences included, and email the farm with the selected package and guest count.
- Find the Thanksgiving offer in the Stays menu and on the farm-stays page, with an illustrated holiday hero alongside real farm photography.

## [0.1.1.0] - 2026-08-27

### Changed

- Make daily operational emails distinguish scheduled value, active appointments, canceled records, future appointments, and Acuity order sales instead of implying unverified revenue or delivery.
- Compare monthly pacing over equal elapsed service-date periods and keep January comparisons connected to the prior December.
- Use one shared HTML-escaping utility across daily reports, wedding reports, inquiry notifications, and shop order emails.

### Fixed

- Count bookings by Highland Farms Pacific day, including canceled bookings and appointments scheduled into the next year.
- Keep December 31 activity in the January 1 report and January appointments in late-December seven-day schedules without contaminating current-year totals.
- Fetch complete Acuity appointment ranges without silent 500-record truncation, reject incomplete order totals, and de-duplicate overlapping appointment IDs.
- Run 14 daily-report regression tests through the standard `npm test` command, covering timezone, year-boundary, escaping, filter, pagination, and overflow behavior.

## [0.1.0.0] - 2026-08-13

### Added

- Build locally validated, person-deduped booked-wedding suppression and revenue files for Meta and Google without writing to either ad account.
- Reconcile BookedIQ won opportunities against the confirmed-weddings Sheet and settled payment records, with fail-closed drift, consent, timestamp, currency, and identifier gates.
- Read current Google Ads and Meta account state through mutation-free scripts and document the exact approval sequence for future live-account writes.
- Disclose hashed customer-list advertising, measurement, suppression, and audience use in the Highland Farms privacy policy.

### Changed

- Keep wedding campaigns lead-optimized while booked-wedding data accrues for suppression and measurement only.
