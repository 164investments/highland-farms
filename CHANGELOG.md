# Changelog

All notable changes to Highland Farms are documented here.

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
