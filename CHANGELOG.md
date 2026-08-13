# Changelog

All notable changes to Highland Farms are documented here.

## [0.1.0.0] - 2026-08-13

### Added

- Build locally validated, person-deduped booked-wedding suppression and revenue files for Meta and Google without writing to either ad account.
- Reconcile BookedIQ won opportunities against the confirmed-weddings Sheet and settled payment records, with fail-closed drift, consent, timestamp, currency, and identifier gates.
- Read current Google Ads and Meta account state through mutation-free scripts and document the exact approval sequence for future live-account writes.
- Disclose hashed customer-list advertising, measurement, suppression, and audience use in the Highland Farms privacy policy.

### Changed

- Keep wedding campaigns lead-optimized while booked-wedding data accrues for suppression and measurement only.
