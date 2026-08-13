# Meta + Google booked-wedding value feeds

This is a local, fail-closed builder for Highland Farms' booked-wedding suppression and measurement feeds. It contains no Meta or Google Ads write path.

## What it pulls

- Won opportunities in BookedIQ pipeline `AG5AUUANW3EbKoFkzgZb`, stage `7. Event Booked`, including `monetaryValue` and the linked contact.
- Confirmed wedding rows and contracted prices from the Sheet, strictly for drift and value reconciliation.
- Optional identity enrichment from HubSpot and Supabase `event_inquiries`, joined only by exact email or phone.
- Optional collected-value records from a payment export CSV.

The builder filters `Total` rows and requires the 2027 status to begin with `Confirmed` (including `Confirmed/CM`); `Sent` is excluded. It hard-blocks the unresolved Emma Williams, Molly Celente, and Chloe Hoyer contract rows. BookedIQ identity is never joined by name.

Sheet drift matching may use an incomplete BookedIQ first name only when the Sheet partner's first name and contracted value both match uniquely. That reconciliation never supplies platform identity; email and phone still come only from the linked BookedIQ contact and exact identifier enrichment.

## Payment CSV contract

The value gate is intentionally strict. Supply a CSV with these columns:

```text
opportunity_id,contact_id,amount_collected,amount_refunded,currency,payment_date,payment_status,source,source_id
```

At least one of `opportunity_id` or `contact_id` is required; no payment is joined by name. `amount_collected` is the settled amount and `amount_refunded` is optional. A deposit contributes only its net collected amount, never the full contract. Each `source` + `source_id` pair must be unique; conflicting duplicates abort. BookedIQ `monetaryValue` and the Sheet price are reconciliation fields only and are never substituted for a payment record.

Currency must be `USD`; negative collections/refunds and refunds larger than the collection abort. If both opportunity and contact IDs are present, both must identify the same booking. Conversion candidates aggregate settled net collections into one stable event per BookedIQ booking, rather than treating each installment as another purchase.

## Run

```bash
python3 scripts/build-booked-wedding-ad-feeds.py \
  --payments-csv /path/to/square-payment-export.csv \
  --output-dir ~/claude-checkups/highland-farms-booked-wedding-feed
```

Without `--payments-csv`, the script still builds identity coverage, a fully hashed candidate file, and the value-free Google Customer Match suppression file. Payment reconciliation keeps Meta value rows and both platforms' conversion-event files empty.

## Outputs

- `booked-wedding-candidates.full.csv` — full hashed review file, including blockers.
- `meta-value-audience-upload.csv` — only payment-verified, locally validated upload rows.
- `google-customer-match-upload.csv` — separately normalized suppression-list rows.
- Token-free Meta audience, Google Customer Match, Google offline conversion, and 62-day Meta CAPI payload drafts.
- `drift-report.csv` — BookedIQ↔Sheet missing/value/contract-status drift.
- `coverage-report.md` and `.json` — source and wedding-level coverage.

All output files are mode `0600`. No raw email or phone is written.

## Platform constraints

- Historical bookings belong in a value-based customer-list Custom Audience.
- Future Meta offline conversions may be sent only when the verified BookedIQ booked-stage time is within 62 days. Their value still comes only from settled payment records.
- Google offline conversions use `UPLOAD_CLICKS` enhanced conversions for leads, only within the click lookback window, and the action must remain Secondary.
- Google eligibility is measured from a captured ad-click timestamp to the BookedIQ won timestamp. A recent payment alone never makes an old lead eligible. Missing click time fails closed.
- Where no click ID survives, the captured web-lead time is only a conservative local lag prefilter; Google performs the final enhanced-conversions-for-leads match and can still reject the conversion.
- `lastStatusChangeAt` is the only accepted BookedIQ booking timestamp. Generic record `updatedAt` is never substituted.
- Repeated runs require `--prior-upload-state` recorded only after confirmed successful uploads, including the original order ID, conversion action, conversion time, platform-recorded time, and success status. Google value changes become `RESTATEMENT` candidates only inside Google's 55-day adjustment window; an already-uploaded Meta booking with changed collected value is blocked from unsafe CAPI re-upload and reported for review.
- `HF — Leads — Weddings` must remain optimized for leads. This feed must never be connected to a value-based bid strategy.
- `fbp` and `fbc` are not customer-list upload columns. They are retained only for eligible future CAPI events.
- The 34-person seed is too small for a Meta lookalike or a serving Google Customer Match list. Do not create a booked-wedding lookalike.
- Audience/list creation, each upload, conversion-action creation, conversion upload, and each campaign exclusion are separate live-account writes requiring separate approved plans.
- The Google payload draft does not assert `GRANTED` consent. Lawful Customer Match consent/status must be verified before an upload job is constructed.
