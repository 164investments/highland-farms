# Highland Farms booked-wedding feeds — staged live-account plan

No approval is requested while the privacy, payment, drift, and full-file review gates are blocked. Each numbered write is atomic and requires its own exact approval. A general approval does not authorize any step.

## Read-only current state — 2026-08-13

- Meta `act_688940352529497`: two existing non-value audiences. `HF — Leads — Weddings` (`120215277429750106`) is ACTIVE, `OUTCOME_LEADS`, `LOWEST_COST_WITHOUT_CAP`, $215/day. Its four ad sets optimize for `LEAD_GENERATION` (three active, one paused).
- Google `9938773372` via MCC `9002457484`, REST v22: Customer Match terms accepted and enhanced conversions for leads enabled. No `UPLOAD_CLICKS` conversion action and no `CRM_BASED` list exist.
- No campaign, ad set, ad, keyword, audience, budget, bid, target, conversion action, user list, or status was changed.

## Preconditions for any write

1. Deploy and verify the privacy-policy disclosure.
2. Join unique settled Square/payment records by BookedIQ opportunity or contact ID.
3. Resolve the two current BookedIQ↔Sheet drift blockers: Chloe Hoyer's contract status and the $0.50 Lilian Tang/Rishi Thakkar value difference.
4. Regenerate and show the complete non-empty hashed transmission files.
5. Verify the lawful Google Customer Match consent/status for every included record; do not infer `GRANTED` from publication of the privacy policy.

## Write 1 — Meta audience shell

Plan ID: `ADS-20260813-HF-META-BOOKED-AUDIENCE-CREATE`

After the preconditions, make exactly one POST to `/v25.0/act_688940352529497/customaudiences`:

- `name`: `HF — Booked Weddings — Suppression + Value Seed`
- `description`: `Payment-verified booked-wedding customers. Suppression and measurement only; never a bidding event. Refreshed from BookedIQ plus settled payment records.`
- `subtype`: `CUSTOM`
- `customer_file_source`: `USER_PROVIDED_ONLY`
- `is_value_based`: `true`

Do not upload users, create a lookalike, attach an exclusion, or modify delivery in this write. Execute only after Hayden replies exactly:

`APPROVE LIVE ADS PLAN ADS-20260813-HF-META-BOOKED-AUDIENCE-CREATE`

## Write 2 — Meta audience upload

This plan ID and exact row/value totals will be written only after Write 1 succeeds and the complete payment-verified file has been shown. It will upload one locally validated batch to the created audience, then poll operation status and report Meta's actual matched range. No CAPI event is part of the audience upload.

## Write 3 — Google suppression-list shell

Plan ID: `ADS-20260813-HF-GOOGLE-BOOKED-LIST-CREATE`

After Meta matching is reviewed, make exactly one REST v22 `userLists:mutate` create operation in customer `9938773372` through MCC `9002457484`:

- `name`: `HF — Booked Weddings — Suppression`
- `description`: `Payment-verified booked-wedding customers. Suppression only; not a bidding signal.`
- `membership_status`: `OPEN`
- `membership_life_span`: `540`
- `crm_based_user_list.upload_key_type`: `CONTACT_INFO`
- `crm_based_user_list.data_source_type`: `FIRST_PARTY`

Do not upload users, attach exclusions, or change campaign goals in this write. Execute only after Hayden replies exactly:

`APPROVE LIVE ADS PLAN ADS-20260813-HF-GOOGLE-BOOKED-LIST-CREATE`

## Write 4 — Google Customer Match upload

This plan ID and exact row total will be written only after Write 3 succeeds, the complete Google-normalized file has been shown, and the lawful consent status is verified. It will use one `OfflineUserDataJob` with accurate consent metadata, then report the real list size/match diagnostics. It will not attach the list to campaigns.

## Write 5 — secondary Google revenue action

Plan ID: `ADS-20260813-HF-GOOGLE-BOOKED-CONVERSION-CREATE`

After list matching is reviewed, create exactly one conversion action:

- `name`: `HF — Booked Wedding Revenue — Offline (Secondary)`
- `type`: `UPLOAD_CLICKS`
- `category`: `PURCHASE`
- `status`: `ENABLED`
- `primary_for_goal`: `false`
- `counting_type`: `ONE_PER_CLICK`
- `click_through_lookback_window_days`: `90`
- `value_settings.default_currency_code`: `USD`
- `value_settings.default_value`: `0`
- `value_settings.always_use_default_value`: `false`

Do not upload conversions or change any campaign goal/bidding settings in this write. Execute only after Hayden replies exactly:

`APPROVE LIVE ADS PLAN ADS-20260813-HF-GOOGLE-BOOKED-CONVERSION-CREATE`

## Write 6 — eligible conversion uploads

This plan ID will be written after the new action propagates and a `validateOnly` check passes. It will list every exact order ID, true payment time, collected value, identifier coverage, and local 90-day eligibility result. `partialFailure` will be enabled and success counts will exclude empty result objects. No conversion older than the permitted window will be described as an upload defect.

## Exclusion recommendation — discuss after real match rates

- Meta: exclude only from all four ad sets in `HF — Leads — Weddings` (`120215277429750106`), including the paused ad set so it is safe if re-enabled.
- Google: exclude from active `MDS - Wedding Venue - Local (OR) - Search` (`23010024446`). Add the same exclusion to `MDS - Wedding Venue - Out of State - Search` (`23968224158`) and older paused wedding Search/PMax campaigns only if they are reactivated.
- Do not exclude from Farm Tours, Stay, spa, or general brand/cross-sell campaigns.
- Do not create a booked-wedding lookalike and do not change bidding, budgets, optimization goals, primary goals, targeting, ads, keywords, or statuses.
