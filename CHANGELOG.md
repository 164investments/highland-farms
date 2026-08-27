# Changelog

All notable changes to Highland Farms are documented here.

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
