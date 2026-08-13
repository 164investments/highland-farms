import csv
import importlib.util
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("build-booked-wedding-ad-feeds.py")
sys.path.insert(0, str(MODULE_PATH.parent))
SPEC = importlib.util.spec_from_file_location("feed", MODULE_PATH)
feed = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = feed
SPEC.loader.exec_module(feed)


class FeedTests(unittest.TestCase):
    def test_platform_phone_normalizers_are_distinct(self):
        self.assertEqual(feed.meta_phone("(503) 555-1212"), "15035551212")
        self.assertEqual(feed.google_phone("(503) 555-1212"), "+15035551212")

    def test_sheet_filters_total_and_sent(self):
        sheet = {
            "Confirmed weddings 2025": [["Name"], ["Total"], ["A Person", "", "", 100]],
            "Confirmed Weddings 2026": [["", "Name"], ["", "B Person", "", "", "", 200]],
            "Confirmed Weddings 2027": [["Status", "Name"], ["Sent", "C Person"], ["Confirmed/CM", "D Person", "", "", "", 300]],
        }
        rows, excluded = feed.parse_sheet(sheet)
        self.assertEqual([row.name for row in rows], ["A Person", "B Person", "D Person"])
        self.assertEqual({row["reason"] for row in excluded}, {"total_row", "not_confirmed:Sent"})

    def test_google_and_meta_hash_different_phone_inputs(self):
        identity = feed.Identity(contact_id="1", name="A Person", email="a@example.com", phone="5035551212")
        self.assertNotEqual(feed.meta_row(identity, 100)["PHONE"], feed.google_match_row(identity)["hashed_phone_number"])

    def test_invalid_meta_row_rejects_entire_batch(self):
        row = {key: "" for key in feed.META_AUDIENCE_SCHEMA}
        row["LOOKALIKE_VALUE"] = "100.00"
        with self.assertRaisesRegex(RuntimeError, "no email or phone"):
            feed.validate_rows([row], [])

    def test_payment_requires_id_join_and_dedupes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "payments.csv"
            fields = ["opportunity_id", "contact_id", "amount_collected", "currency", "payment_date", "payment_status", "source", "source_id"]
            with path.open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerow({"opportunity_id": "opp", "amount_collected": "100", "currency": "USD", "payment_date": "2026-08-01T10:00:00-07:00", "payment_status": "deposit_paid", "source": "Square", "source_id": "pay1"})
                writer.writerow({"opportunity_id": "opp", "amount_collected": "200", "currency": "USD", "payment_date": "2026-08-02T10:00:00-07:00", "payment_status": "paid", "source": "Square", "source_id": "pay1"})
            with self.assertRaisesRegex(RuntimeError, "conflicting duplicate"):
                feed.load_payments(path)

    def test_exact_duplicate_payment_is_collapsed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "payments.csv"
            fields = ["opportunity_id", "contact_id", "amount_collected", "amount_refunded", "currency", "payment_date", "payment_status", "source", "source_id"]
            payment = {"opportunity_id": "opp", "amount_collected": "100", "amount_refunded": "10", "currency": "USD", "payment_date": "2026-08-01T10:00:00-07:00", "payment_status": "deposit_paid", "source": "Square", "source_id": "pay1"}
            with path.open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerow(payment)
                writer.writerow(payment)
            rows = feed.load_payments(path)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["net_collected"], 90)

    def test_payment_value_uses_only_settled_net_collected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "payments.csv"
            fields = ["opportunity_id", "contact_id", "amount_collected", "amount_refunded", "currency", "payment_date", "payment_status", "source", "source_id"]
            rows = [
                {"opportunity_id": "opp", "amount_collected": "2500", "amount_refunded": "0", "currency": "USD", "payment_date": "2026-08-01T10:00:00Z", "payment_status": "deposit_paid", "source": "Square", "source_id": "deposit"},
                {"opportunity_id": "opp", "amount_collected": "1000", "amount_refunded": "250", "currency": "USD", "payment_date": "2026-08-02T10:00:00Z", "payment_status": "partially_paid", "source": "Square", "source_id": "partial"},
                {"opportunity_id": "opp", "amount_collected": "500", "amount_refunded": "0", "currency": "USD", "payment_date": "2026-08-03T10:00:00Z", "payment_status": "pending", "source": "Square", "source_id": "pending"},
                {"opportunity_id": "opp", "amount_collected": "100", "amount_refunded": "100", "currency": "USD", "payment_date": "2026-08-04T10:00:00Z", "payment_status": "paid", "source": "Square", "source_id": "refunded"},
            ]
            with path.open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerows(rows)
            payments = feed.load_payments(path)
            booked = feed.BookedWedding(
                "opp", "Alex", 20000,
                feed.Identity("contact", "Alex", "alex@example.com", ""),
            )
            self.assertEqual(feed.attach_payments([booked], payments), [])
            self.assertEqual(booked.collected_value, 3250)
            self.assertEqual(feed.meta_row(booked.identity, booked.collected_value)["LOOKALIKE_VALUE"], "3250.00")

    def test_payment_rejects_non_usd_and_invalid_refund(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "payments.csv"
            fields = ["opportunity_id", "contact_id", "amount_collected", "amount_refunded", "currency", "payment_date", "payment_status", "source", "source_id"]
            base = {"opportunity_id": "opp", "amount_collected": "100", "amount_refunded": "0", "currency": "CAD", "payment_date": "2026-08-01T10:00:00Z", "payment_status": "paid", "source": "Square", "source_id": "payment"}
            with path.open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerow(base)
            with self.assertRaisesRegex(RuntimeError, "USD"):
                feed.load_payments(path)
            base.update(currency="USD", amount_refunded="101")
            with path.open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerow(base)
            with self.assertRaisesRegex(RuntimeError, "invalid collected/refunded"):
                feed.load_payments(path)

    def test_supplied_payment_ids_must_agree(self):
        booked = feed.BookedWedding(
            "opp", "Alex", 100,
            feed.Identity("contact", "Alex", "alex@example.com", ""),
        )
        payment = {"opportunity_id": "wrong", "contact_id": "contact", "source": "Square", "source_id": "payment", "net_collected": 100}
        self.assertEqual(feed.attach_payments([booked], [payment])[0]["reason"], "unknown_supplied_opportunity_id")
        self.assertEqual(booked.payments, [])

    def test_installments_build_one_booking_conversion_with_collected_total(self):
        now = datetime(2026, 8, 13, 12, tzinfo=timezone.utc)
        identity = feed.Identity(
            "contact", "Alex", "alex@example.com", "5035551212",
            click_time=(now - timedelta(days=40)).isoformat(),
        )
        booked = feed.BookedWedding("opp", "Alex", 20000, identity, won_at=(now - timedelta(days=10)).isoformat())
        booked.payments = [
            {"net_collected": 2500},
            {"net_collected": 7500},
        ]
        google, meta, adjustments, diagnostics = feed.conversion_candidates(booked, now)
        self.assertEqual(len(google), 1)
        self.assertEqual(len(meta), 1)
        self.assertEqual(adjustments, [])
        self.assertEqual(diagnostics, [])
        self.assertEqual(google[0]["order_id"], "BookedIQ:opp")
        self.assertEqual(google[0]["conversion_value"], 10000)
        self.assertEqual(meta[0]["custom_data"]["value"], 10000)

    def test_google_conversion_requires_click_within_90_days_of_booking(self):
        now = datetime(2026, 8, 13, 12, tzinfo=timezone.utc)
        identity = feed.Identity(
            "contact", "Alex", "alex@example.com", "5035551212",
            click_time=(now - timedelta(days=200)).isoformat(),
        )
        booked = feed.BookedWedding("opp", "Alex", 20000, identity, won_at=(now - timedelta(days=10)).isoformat())
        booked.payments = [{"net_collected": 2500}]
        google, meta, adjustments, diagnostics = feed.conversion_candidates(booked, now)
        self.assertEqual(google, [])
        self.assertEqual(len(meta), 1)
        self.assertEqual(adjustments, [])
        self.assertEqual(diagnostics, [])

    def test_hashed_only_google_candidate_uses_lead_capture_prefilter(self):
        now = datetime(2026, 8, 13, 12, tzinfo=timezone.utc)
        identity = feed.Identity(
            "contact", "Alex", "alex@example.com", "",
            click_time=(now - timedelta(days=40)).isoformat(),
        )
        booked = feed.BookedWedding("opp", "Alex", 20000, identity, won_at=(now - timedelta(days=10)).isoformat())
        booked.payments = [{"net_collected": 2500}]
        google, _, _, _ = feed.conversion_candidates(booked, now)
        self.assertEqual(len(google), 1)
        self.assertEqual(google[0]["eligibility_basis"], "lead_capture_time_prefilter_google_final_match_required")

    def test_prior_upload_generates_google_restatement_and_blocks_meta_reupload(self):
        now = datetime(2026, 8, 13, 12, tzinfo=timezone.utc)
        identity = feed.Identity("contact", "Alex", "alex@example.com", "", click_time=(now - timedelta(days=40)).isoformat())
        booked = feed.BookedWedding("opp", "Alex", 20000, identity, won_at=(now - timedelta(days=10)).isoformat())
        booked.payments = [{"net_collected": 10000}]
        google, meta, adjustments, diagnostics = feed.conversion_candidates(
            booked, now, {"google": {"value": 2500}, "meta": {"value": 2500}},
        )
        self.assertEqual(google, [])
        self.assertEqual(meta, [])
        self.assertEqual(adjustments[0]["restatement_value"], 10000)
        self.assertIn("meta_prior_event_value_changed_no_safe_capi_reupload", diagnostics)

    def test_unresolved_contract_is_hard_blocked(self):
        row = feed.SheetWedding("Emma Williams & Partner", 2026, "", 100)
        self.assertTrue(row.unresolved_contract)

    def test_opportunity_date_suffix_does_not_break_sheet_drift_match(self):
        identity = feed.Identity(contact_id="1", name="Makayla", email="m@example.com", phone="")
        booked = feed.BookedWedding("opp", "Makayla Martinez & Sostenes Segura — 7/1/27", 6500, identity)
        sheet = feed.SheetWedding("Makayla Martinez & Sostenes Segura", 2027, "", 6500)
        match, drift = feed.deterministic_sheet_match(booked, [sheet])
        self.assertIs(match, sheet)
        self.assertEqual(drift, [])

    def test_first_name_plus_exact_value_can_reconcile_drift_only(self):
        identity = feed.Identity(contact_id="1", name="Brianna", email="b@example.com", phone="")
        booked = feed.BookedWedding("opp", "Brianna", 26000, identity)
        sheet = feed.SheetWedding("Brianna Diaz & Heath Harshman", 2027, "", 26000)
        match, drift = feed.deterministic_sheet_match(booked, [sheet])
        self.assertIs(match, sheet)
        self.assertEqual(drift, [])

    def test_invalid_meta_event_rejects_whole_batch(self):
        bad_event = {
            "event_time": int(datetime.now(timezone.utc).timestamp()),
            "action_source": "physical_store",
            "event_id": "payment-1",
            "user_data": {"em": ["not-a-hash"], "country": []},
            "custom_data": {"value": 100},
        }
        with self.assertRaisesRegex(RuntimeError, "event-batch validation"):
            feed.validate_event_candidates([], [bad_event], datetime.now(timezone.utc))

    def test_event_windows_accept_exact_cutoffs_and_reject_outside_or_future(self):
        now = datetime(2026, 8, 13, 12, tzinfo=timezone.utc)
        hashed = feed.sha256("person@example.com")
        country = feed.sha256("us")

        def google(at: datetime) -> dict:
            return {"order_id": "payment", "conversion_date_time": at.isoformat(), "attribution_date_time": (at - timedelta(days=feed.GOOGLE_CLICK_LOOKBACK_DAYS)).isoformat(), "conversion_value": 100, "hashed_email": hashed, "hashed_phone_number": "", "gclid": "", "gbraid": "", "wbraid": ""}

        def meta(at: datetime) -> dict:
            return {"event_name": "Purchase", "event_time": int(at.timestamp()), "action_source": "physical_store", "event_id": "payment", "user_data": {"em": [hashed], "ph": [], "country": [country]}, "custom_data": {"value": 100, "currency": "USD"}}

        feed.validate_event_candidates(
            [google(now - timedelta(days=feed.GOOGLE_CLICK_LOOKBACK_DAYS))],
            [meta(now - timedelta(days=feed.META_OFFLINE_BACKDATE_DAYS))],
            now,
        )
        invalid_google = google(now)
        invalid_google["attribution_date_time"] = (now - timedelta(days=feed.GOOGLE_CLICK_LOOKBACK_DAYS, seconds=1)).isoformat()
        with self.assertRaisesRegex(RuntimeError, "Google conversion"):
            feed.validate_event_candidates([invalid_google], [], now)
        for invalid in (now + timedelta(seconds=1),):
            with self.assertRaisesRegex(RuntimeError, "Google conversion"):
                feed.validate_event_candidates([google(invalid)], [], now)
        for invalid in (now - timedelta(days=feed.META_OFFLINE_BACKDATE_DAYS, seconds=1), now + timedelta(seconds=1)):
            with self.assertRaisesRegex(RuntimeError, "Meta event"):
                feed.validate_event_candidates([], [meta(invalid)], now)

    def test_meta_event_rejects_malformed_fbc(self):
        now = datetime(2026, 8, 13, 12, tzinfo=timezone.utc)
        event = {
            "event_name": "Purchase", "event_time": int(now.timestamp()),
            "action_source": "physical_store", "event_id": "payment",
            "user_data": {"em": [feed.sha256("person@example.com")], "country": [feed.sha256("us")], "fbc": "not-an-fbc"},
            "custom_data": {"value": 100, "currency": "USD"},
        }
        with self.assertRaisesRegex(RuntimeError, "invalid fbc"):
            feed.validate_event_candidates([], [event], now)

    def test_person_dedupe_uses_phone_when_contact_and_email_differ(self):
        first = feed.BookedWedding(
            "opp-1", "Alex & Sam", 100,
            feed.Identity("contact-1", "Alex", "alex@example.com", "503-555-1212"),
        )
        second = feed.BookedWedding(
            "opp-2", "Alex & Sam", 100,
            feed.Identity("contact-2", "Sam", "sam@example.com", "+1 503 555 1212"),
        )
        keys = feed.person_keys([first, second])
        self.assertEqual(keys["opp-1"], keys["opp-2"])

    def test_person_dedupe_keeps_unrelated_people_separate(self):
        first = feed.BookedWedding(
            "opp-1", "Alex", 100,
            feed.Identity("contact-1", "Alex", "alex@example.com", "503-555-1212"),
        )
        second = feed.BookedWedding(
            "opp-2", "Taylor", 100,
            feed.Identity("contact-2", "Taylor", "taylor@example.com", "503-555-9999"),
        )
        keys = feed.person_keys([first, second])
        self.assertNotEqual(keys["opp-1"], keys["opp-2"])

    def test_ambiguous_identifier_enrichment_does_not_mix_people(self):
        opportunity = {"id": "opp", "contactId": "contact", "contact": {"name": "Alex", "email": "shared@example.com"}}
        index = {
            "e:shared@example.com": [
                {"source": "HubSpot", "email": "shared@example.com", "first_name": "Alex", "city": "Portland"},
                {"source": "Supabase event_inquiries", "email": "shared@example.com", "first_name": "Sam", "city": "Salem"},
            ]
        }
        identity = feed.build_identity(opportunity, index)
        self.assertEqual(identity.first_name, "Alex")
        self.assertEqual(identity.city, "")

    def test_person_identity_merge_is_order_independent_and_keeps_richer_geo(self):
        sparse = feed.Identity("contact-a", "Alex", "alex@example.com", "5035551212")
        rich = feed.Identity("contact-b", "Alex", "alex@example.com", "5035551212", city="Portland", state="OR", zip="97205")
        forward = feed.merge_identities(sparse, rich)
        reverse = feed.merge_identities(rich, sparse)
        self.assertEqual((forward.email, forward.phone, forward.city, forward.state, forward.zip), (reverse.email, reverse.phone, reverse.city, reverse.state, reverse.zip))
        self.assertEqual(forward.city, "Portland")

    def test_equal_score_conflicting_geo_is_order_independent_and_cleared(self):
        left = feed.Identity("contact", "Alex", "alex@example.com", "5035551212", city="Portland")
        right = feed.Identity("contact", "Alex", "alex@example.com", "5035551212", city="Salem")
        forward = feed.merge_identities(left, right)
        reverse = feed.merge_identities(right, left)
        self.assertEqual(forward.city, "")
        self.assertEqual(reverse.city, "")


if __name__ == "__main__":
    unittest.main()
