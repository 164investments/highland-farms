#!/usr/bin/env python3
"""Build fail-closed Highland Farms booked-wedding feeds for Meta and Google.

This program performs read-only source pulls and writes local artifacts. It has
no Meta or Google Ads mutation endpoints. BookedIQ won opportunities are the
booked-wedding source of truth. The team Sheet is a required drift check, and
settled payment records are the only source of upload value.
"""

from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

from ad_feed_utils import parse_env


SHEET_ID = "1lnRqTooOnajLDcubUG_qzK34BFY14XN6zDZJANo2Ct8"
PIPELINE_ID = "AG5AUUANW3EbKoFkzgZb"
BOOKED_STAGE_ID = "c17fada6-fd1b-4119-9a85-fdf5551df358"
GOOGLE_CUSTOMER_ID = "9938773372"
GOOGLE_LOGIN_CUSTOMER_ID = "9002457484"
GOOGLE_API_VERSION = "v22"
GOOGLE_TOKEN_DEFAULT = Path.home() / "Downloads/Code-and-Text/gmail_token.json"
DEFAULT_ENV_FILE = Path.home() / "projects/highland-farms/.env.prod"
GOOGLE_CLICK_LOOKBACK_DAYS = 90
META_OFFLINE_BACKDATE_DAYS = 62
MONEY_TOLERANCE = 0.01

META_AUDIENCE_SCHEMA = [
    "EMAIL", "PHONE", "FN", "LN", "CT", "ST", "ZIP", "COUNTRY",
    "EXTERN_ID", "LOOKALIKE_VALUE",
]
GOOGLE_CUSTOMER_MATCH_SCHEMA = [
    "hashed_email", "hashed_phone_number", "hashed_first_name",
    "hashed_last_name", "country_code", "postal_code",
]
UNRESOLVED_CONTRACT_NAMES = {
    "emmawilliams", "mollycelente", "chloehoyer",
}
SETTLED_STATUSES = {
    "paid", "paid_in_full", "collected", "settled", "completed",
    "succeeded", "deposit_paid", "partially_paid", "partial",
    "payment_plan_current",
}


def as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def ascii_fold(value: Any) -> str:
    return unicodedata.normalize("NFKD", as_text(value)).encode("ascii", "ignore").decode()


def normalize_name(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", ascii_fold(value).lower())


def normalize_email(value: Any) -> str:
    return as_text(value).strip().lower()


def meta_phone(value: Any) -> str:
    digits = re.sub(r"\D", "", as_text(value))
    return "1" + digits if len(digits) == 10 else digits


def google_phone(value: Any) -> str:
    digits = meta_phone(value)
    return "+" + digits if digits else ""


def normalize_person(value: Any) -> str:
    return re.sub(r"[^a-z]", "", ascii_fold(value).lower())


def normalize_city(value: Any) -> str:
    return re.sub(r"[^a-z]", "", ascii_fold(value).lower())


def normalize_state(value: Any) -> str:
    return re.sub(r"[^a-z]", "", ascii_fold(value).lower())[:2]


def normalize_zip(value: Any) -> str:
    match = re.search(r"\d{5}", as_text(value))
    return match.group(0) if match else ""


def normalize_country(value: Any) -> str:
    raw = re.sub(r"[^a-z]", "", ascii_fold(value).lower())
    if raw in {"usa", "unitedstates", "unitedstatesofamerica"}:
        return "us"
    return raw[:2] or "us"


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest() if value else ""


def valid_hash(value: Any) -> bool:
    return not as_text(value) or bool(re.fullmatch(r"[0-9a-f]{64}", as_text(value)))


def money(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    cleaned = re.sub(r"[^0-9.()-]", "", as_text(value)).replace("(", "-").replace(")", "")
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


def parse_datetime(value: Any) -> datetime | None:
    text = as_text(value)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def split_names(value: str) -> list[str]:
    return [part.strip() for part in re.split(r"\s+(?:&|and)\s+", value, flags=re.I) if normalize_name(part)]


def first_last(value: str) -> tuple[str, str]:
    parts = [part for part in value.split() if part]
    return (parts[0], parts[-1] if len(parts) > 1 else "") if parts else ("", "")


def api_json(
    url: str,
    *,
    headers: dict[str, str],
    method: str = "GET",
    body: Any | None = None,
) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Accept": "application/json", **headers, **({"Content-Type": "application/json"} if body is not None else {})},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read().decode()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:1000]
        raise RuntimeError(f"{method} {url} failed: HTTP {exc.code}: {detail}") from exc
    return json.loads(payload) if payload else {}


def write_csv(path: Path, fields: list[str], rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    os.chmod(path, 0o600)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    os.chmod(path, 0o600)


@dataclass
class SheetWedding:
    name: str
    book: int
    event_date: str
    price: float | None
    deposit: Any = ""
    invoice_remaining: Any = ""
    paid_in_full: Any = ""
    contract_sent: Any = ""
    contract_signed: Any = ""
    row: int = 0

    @property
    def unresolved_contract(self) -> bool:
        partner_keys = {normalize_name(part) for part in split_names(self.name)}
        return bool(partner_keys & UNRESOLVED_CONTRACT_NAMES)


@dataclass
class Identity:
    contact_id: str
    name: str
    email: str
    phone: str
    first_name: str = ""
    last_name: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""
    country: str = "us"
    external_id: str = ""
    fbp: str = ""
    fbc: str = ""
    gclid: str = ""
    gbraid: str = ""
    wbraid: str = ""
    click_time: str = ""
    enrichment_sources: set[str] = field(default_factory=set)


@dataclass
class BookedWedding:
    opportunity_id: str
    name: str
    monetary_value: float | None
    identity: Identity
    won_at: str = ""
    sheet: SheetWedding | None = None
    drift: list[str] = field(default_factory=list)
    payments: list[dict[str, Any]] = field(default_factory=list)

    @property
    def collected_value(self) -> float:
        return round(sum(payment["net_collected"] for payment in self.payments), 2)


def google_sheets_service(token_path: Path) -> Any:
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise RuntimeError("google-api-python-client is required") from exc
    credentials = Credentials.from_authorized_user_file(str(token_path))
    return build("sheets", "v4", credentials=credentials, cache_discovery=False)


def pull_sheet(service: Any) -> dict[str, list[list[Any]]]:
    ranges = [
        "'Confirmed weddings 2025'!A1:AD",
        "'Confirmed Weddings 2026'!A1:AD",
        "'Confirmed Weddings 2027'!A1:AD",
    ]
    response = service.spreadsheets().values().batchGet(
        spreadsheetId=SHEET_ID,
        ranges=ranges,
        valueRenderOption="UNFORMATTED_VALUE",
        dateTimeRenderOption="FORMATTED_STRING",
    ).execute()
    result: dict[str, list[list[Any]]] = {}
    for item in response.get("valueRanges", []):
        tab = re.match(r"'?([^']+)'?!", item["range"]).group(1)
        result[tab] = item.get("values", [])
    return result


def parse_sheet(data: dict[str, list[list[Any]]]) -> tuple[list[SheetWedding], list[dict[str, Any]]]:
    layouts = {
        "Confirmed weddings 2025": dict(book=2025, name=0, date=1, price=3, status=None, deposit=17, remaining=20, paid=None, sent=22, signed=23),
        "Confirmed Weddings 2026": dict(book=2026, name=1, date=2, price=5, status=None, deposit=22, remaining=24, paid=26, sent=27, signed=28),
        "Confirmed Weddings 2027": dict(book=2027, name=1, date=2, price=5, status=0, deposit=20, remaining=22, paid=24, sent=25, signed=26),
    }
    weddings: list[SheetWedding] = []
    excluded: list[dict[str, Any]] = []
    for tab, layout in layouts.items():
        for row_number, row in enumerate(data.get(tab, [])[1:], start=2):
            cell = lambda index: row[index] if index is not None and index < len(row) else ""
            name = as_text(cell(layout["name"]))
            status = as_text(cell(layout["status"]))
            if not name:
                continue
            if normalize_name(name) == "total":
                excluded.append({"tab": tab, "row": row_number, "name": name, "reason": "total_row"})
                continue
            if layout["book"] == 2027 and not status.lower().startswith("confirmed"):
                excluded.append({"tab": tab, "row": row_number, "name": name, "reason": f"not_confirmed:{status or 'blank'}"})
                continue
            weddings.append(SheetWedding(
                name=name,
                book=layout["book"],
                event_date=as_text(cell(layout["date"])),
                price=money(cell(layout["price"])),
                deposit=cell(layout["deposit"]),
                invoice_remaining=cell(layout["remaining"]),
                paid_in_full=cell(layout["paid"]),
                contract_sent=cell(layout["sent"]),
                contract_signed=cell(layout["signed"]),
                row=row_number,
            ))
    return weddings, excluded


def pull_bookediq_opportunities(location_id: str, token: str) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}", "Version": "v3", "User-Agent": "Mozilla/5.0"}
    rows: list[dict[str, Any]] = []
    page = 1
    while True:
        payload = api_json(
            "https://services.leadconnectorhq.com/opportunities/search",
            headers=headers,
            method="POST",
            body={
                "locationId": location_id,
                "filters": [
                    {"field": "pipeline_id", "operator": "eq", "value": PIPELINE_ID},
                    {"field": "pipeline_stage_id", "operator": "eq", "value": BOOKED_STAGE_ID},
                    {"field": "status", "operator": "eq", "value": "won"},
                ],
                "page": page,
                "limit": 100,
            },
        )
        batch = payload.get("opportunities", [])
        rows.extend(batch)
        if len(rows) >= int(payload.get("total", len(rows))) or len(batch) < 100:
            break
        page += 1
    invalid = [row.get("id") for row in rows if row.get("pipelineId") != PIPELINE_ID or row.get("pipelineStageId") != BOOKED_STAGE_ID or row.get("status") != "won"]
    if invalid:
        raise RuntimeError(f"BookedIQ returned {len(invalid)} out-of-scope opportunities")
    return rows


def pull_hubspot(token: str) -> list[dict[str, Any]]:
    properties = "email,phone,firstname,lastname,city,state,zip,country,square_email,square_phone"
    rows: list[dict[str, Any]] = []
    after = ""
    while True:
        query = {"limit": "100", "properties": properties, "archived": "false"}
        if after:
            query["after"] = after
        payload = api_json(
            "https://api.hubapi.com/crm/v3/objects/contacts?" + urllib.parse.urlencode(query),
            headers={"Authorization": f"Bearer {token}"},
        )
        rows.extend(payload.get("results", []))
        after = as_text(payload.get("paging", {}).get("next", {}).get("after"))
        if not after:
            return rows


def pull_supabase(base_url: str, key: str) -> list[dict[str, Any]]:
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        query = urllib.parse.urlencode({"select": "*", "order": "created_at.asc", "limit": "1000", "offset": str(offset)})
        batch = api_json(f"{base_url.rstrip('/')}/rest/v1/event_inquiries?{query}", headers=headers)
        rows.extend(batch)
        if len(batch) < 1000:
            return rows
        offset += len(batch)


def strong_keys(email: Any, phone: Any) -> set[str]:
    result = set()
    if normalize_email(email):
        result.add("e:" + normalize_email(email))
    if meta_phone(phone):
        result.add("p:" + meta_phone(phone))
    return result


def person_keys(booked: list[BookedWedding]) -> dict[str, str]:
    """Return a stable person key per opportunity using all strong identifiers.

    A contact ID alone is not a safe dedupe key because the same person can be
    represented by multiple contacts. Email and phone form connected components,
    so rows sharing either identifier collapse even when the other identifier or
    contact ID differs.
    """
    parent: dict[str, str] = {}

    def find(key: str) -> str:
        parent.setdefault(key, key)
        while parent[key] != key:
            parent[key] = parent[parent[key]]
            key = parent[key]
        return key

    def union(left: str, right: str) -> None:
        left_root, right_root = find(left), find(right)
        if left_root == right_root:
            return
        first, second = sorted((left_root, right_root))
        parent[second] = first

    row_keys: dict[str, list[str]] = {}
    for row in booked:
        keys = sorted(strong_keys(row.identity.email, row.identity.phone))
        if row.identity.contact_id:
            keys.append("c:" + row.identity.contact_id)
        if not keys:
            keys.append("o:" + row.opportunity_id)
        row_keys[row.opportunity_id] = keys
        for key in keys[1:]:
            union(keys[0], key)
        find(keys[0])

    return {
        opportunity_id: find(keys[0])
        for opportunity_id, keys in row_keys.items()
    }


def merge_identities(left: Identity | None, right: Identity) -> Identity:
    if left is None:
        return copy.deepcopy(right)
    attrs = (
        "email", "phone", "first_name", "last_name", "city", "state", "zip", "country",
        "external_id", "fbp", "fbc", "gclid", "gbraid", "wbraid", "click_time",
    )

    def score(identity: Identity) -> tuple[Any, ...]:
        return (
            sum(bool(as_text(getattr(identity, attr))) for attr in attrs),
            *(as_text(getattr(identity, attr)).lower() for attr in attrs),
            identity.contact_id,
        )

    primary, secondary = (left, right) if score(left) >= score(right) else (right, left)
    merged = copy.deepcopy(primary)
    conflict_sensitive = {"city", "state", "zip", "country", "external_id", "fbp", "fbc", "gclid", "gbraid", "wbraid", "click_time"}
    for attr in attrs:
        primary_value = as_text(getattr(merged, attr))
        secondary_value = as_text(getattr(secondary, attr))
        if not primary_value and secondary_value:
            setattr(merged, attr, getattr(secondary, attr))
        elif primary_value and secondary_value and primary_value.lower() != secondary_value.lower() and attr in conflict_sensitive:
            setattr(merged, attr, "")
    merged.enrichment_sources |= secondary.enrichment_sources
    return merged


def derive_fbc(attribution: dict[str, Any]) -> str:
    if as_text(attribution.get("fbc")):
        return as_text(attribution["fbc"])
    fbclid = as_text(attribution.get("fbclid"))
    captured = parse_datetime(attribution.get("captured_at"))
    return f"fb.1.{int(captured.timestamp())}.{fbclid}" if fbclid and captured else ""


def build_enrichment_index(hubspot: list[dict[str, Any]], inquiries: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    index: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in hubspot:
        props = row.get("properties", {})
        item = {
            "source": "HubSpot",
            "email": props.get("email") or props.get("square_email"),
            "phone": props.get("phone") or props.get("square_phone"),
            "first_name": props.get("firstname"), "last_name": props.get("lastname"),
            "city": props.get("city"), "state": props.get("state"),
            "zip": props.get("zip"), "country": props.get("country"),
        }
        for key in strong_keys(item["email"], item["phone"]):
            index[key].append(item)
    for row in inquiries:
        attribution = row.get("attribution") if isinstance(row.get("attribution"), dict) else {}
        first, last = first_last(as_text(row.get("name")))
        item = {
            "source": "Supabase event_inquiries", "email": row.get("email"), "phone": row.get("phone"),
            "first_name": row.get("first_name") or first, "last_name": row.get("last_name") or last,
            "city": row.get("city"), "state": row.get("state"), "zip": row.get("zip") or row.get("postal_code"),
            "country": row.get("country"), "external_id": attribution.get("external_id"),
            "fbp": attribution.get("fbp"), "fbc": derive_fbc(attribution),
            "gclid": attribution.get("gclid"), "gbraid": attribution.get("gbraid"), "wbraid": attribution.get("wbraid"),
            # With a surviving click ID this is the captured click time. Without
            # one it is the web-lead capture time, used only as a conservative
            # local prefilter before Google's final enhanced-lead match.
            "click_time": attribution.get("captured_at"),
        }
        for key in strong_keys(item["email"], item["phone"]):
            index[key].append(item)
    return index


def build_identity(opportunity: dict[str, Any], index: dict[str, list[dict[str, Any]]]) -> Identity:
    contact = opportunity.get("contact") or {}
    name = as_text(contact.get("name") or opportunity.get("name"))
    first, last = first_last(name)
    identity = Identity(
        contact_id=as_text(opportunity.get("contactId") or contact.get("id")),
        name=name,
        email=as_text(contact.get("email")),
        phone=as_text(contact.get("phone")),
        first_name=first,
        last_name=last,
        enrichment_sources={"BookedIQ opportunity contact"},
    )
    matches: list[dict[str, Any]] = []
    seen_matches: set[int] = set()
    for key in strong_keys(identity.email, identity.phone):
        for item in index.get(key, []):
            if id(item) not in seen_matches:
                seen_matches.add(id(item))
                matches.append(item)
    for item in matches:
        identity.enrichment_sources.add(item["source"])
    for attr in ("first_name", "last_name", "city", "state", "zip", "country", "external_id", "fbp", "fbc", "gclid", "gbraid", "wbraid", "click_time"):
        if getattr(identity, attr):
            continue
        values = {as_text(item.get(attr)) for item in matches if as_text(item.get(attr))}
        if len(values) == 1:
            setattr(identity, attr, values.pop())
    return identity


def deterministic_sheet_match(booked: BookedWedding, sheet_rows: list[SheetWedding]) -> tuple[SheetWedding | None, list[str]]:
    opportunity_couple = re.split(r"\s+[—–-]\s+(?=\d)", booked.name, maxsplit=1)[0]
    aliases = {
        normalize_name(booked.identity.name),
        normalize_name(booked.name),
        normalize_name(opportunity_couple),
    } - {""}
    scored: list[tuple[int, SheetWedding]] = []
    for sheet in sheet_rows:
        sheet_full = normalize_name(sheet.name)
        partners = {normalize_name(part) for part in split_names(sheet.name)}
        score = 0
        if aliases & ({sheet_full} | partners):
            score = 3
        else:
            booked_tokens = set(re.findall(r"[a-z]+", ascii_fold(booked.identity.name).lower()))
            sheet_tokens = set(re.findall(r"[a-z]+", ascii_fold(sheet.name).lower()))
            if len(booked_tokens) >= 2 and booked_tokens <= sheet_tokens:
                score = 2
            elif (
                len(booked_tokens) == 1
                and any(booked_tokens == set(re.findall(r"[a-z]+", ascii_fold(part).lower())[:1]) for part in split_names(sheet.name))
                and booked.monetary_value is not None
                and sheet.price is not None
                and abs(booked.monetary_value - sheet.price) <= MONEY_TOLERANCE
            ):
                # Drift reconciliation only: an incomplete one-word BookedIQ
                # label may be corroborated by the exact contracted value. The
                # Sheet is never used as a platform-identity source.
                score = 1
        if score:
            scored.append((score, sheet))
    if not scored:
        return None, ["missing_from_sheet"]
    top_score = max(score for score, _ in scored)
    top = [row for score, row in scored if score == top_score]
    if len(top) != 1:
        return None, ["ambiguous_sheet_match"]
    match = top[0]
    drift = []
    if match.price is None or booked.monetary_value is None:
        drift.append("missing_contract_value")
    elif abs(match.price - booked.monetary_value) > MONEY_TOLERANCE:
        drift.append("contract_value_mismatch")
    if match.unresolved_contract:
        drift.append("unresolved_contract_status")
    return match, drift


def load_payments(path: Path | None) -> list[dict[str, Any]]:
    if path is None or not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    required = {"opportunity_id", "contact_id", "amount_collected", "currency", "payment_date", "payment_status", "source", "source_id"}
    missing = required - set(rows[0].keys() if rows else [])
    if missing:
        raise RuntimeError(f"payment CSV missing columns: {sorted(missing)}")
    deduped: dict[tuple[str, str], dict[str, Any]] = {}
    for number, row in enumerate(rows, start=2):
        source, source_id = as_text(row.get("source")), as_text(row.get("source_id"))
        if not source or not source_id:
            raise RuntimeError(f"payment row {number} requires source and source_id")
        if not as_text(row.get("opportunity_id")) and not as_text(row.get("contact_id")):
            raise RuntimeError(f"payment row {number} requires opportunity_id or contact_id")
        key = (source.lower(), source_id)
        if key in deduped:
            prior = {field: value for field, value in deduped[key].items() if field != "net_collected"}
            if row != prior:
                raise RuntimeError(f"conflicting duplicate payment {source}:{source_id}")
            continue
        status = as_text(row.get("payment_status")).lower().replace(" ", "_")
        currency = as_text(row.get("currency")).upper()
        if currency != "USD":
            raise RuntimeError(f"payment row {number} must use USD currency")
        try:
            collected = Decimal(as_text(row.get("amount_collected")) or "0").quantize(Decimal("0.01"))
            refunded = Decimal(as_text(row.get("amount_refunded")) or "0").quantize(Decimal("0.01"))
        except InvalidOperation as exc:
            raise RuntimeError(f"payment row {number} has invalid money") from exc
        if collected < 0 or refunded < 0 or refunded > collected:
            raise RuntimeError(f"payment row {number} has invalid collected/refunded amounts")
        if status not in SETTLED_STATUSES or collected - refunded <= 0:
            continue
        if not parse_datetime(row.get("payment_date")):
            raise RuntimeError(f"payment row {number} has invalid payment_date")
        row["currency"] = currency
        row["net_collected"] = float(collected - refunded)
        deduped[key] = row
    return list(deduped.values())


def attach_payments(booked: list[BookedWedding], payments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unmatched = []
    by_opportunity = {row.opportunity_id: row for row in booked}
    by_contact: dict[str, list[BookedWedding]] = defaultdict(list)
    for row in booked:
        by_contact[row.identity.contact_id].append(row)
    for payment in payments:
        supplied_opportunity_id = as_text(payment.get("opportunity_id"))
        supplied_contact_id = as_text(payment.get("contact_id"))
        target = by_opportunity.get(supplied_opportunity_id) if supplied_opportunity_id else None
        if supplied_opportunity_id and not target:
            unmatched.append({"source": payment["source"], "source_id": payment["source_id"], "reason": "unknown_supplied_opportunity_id"})
            continue
        if target and supplied_contact_id and target.identity.contact_id != supplied_contact_id:
            unmatched.append({"source": payment["source"], "source_id": payment["source_id"], "reason": "opportunity_contact_mismatch"})
            continue
        if not target and not supplied_opportunity_id:
            contact_matches = by_contact.get(supplied_contact_id, [])
            target = contact_matches[0] if len(contact_matches) == 1 else None
        if target:
            target.payments.append(payment)
        else:
            unmatched.append({"source": payment["source"], "source_id": payment["source_id"], "reason": "no_unique_booked_opportunity"})
    return unmatched


def blockers_for(row: BookedWedding) -> list[str]:
    blockers = list(row.drift)
    if not normalize_email(row.identity.email) and not meta_phone(row.identity.phone):
        blockers.append("no_usable_identifier")
    if not row.payments:
        blockers.append("missing_settled_payment_record")
    if row.collected_value <= 0:
        blockers.append("nonpositive_collected_value")
    if row.monetary_value and row.collected_value > row.monetary_value + MONEY_TOLERANCE:
        blockers.append("collected_exceeds_contract_value")
    return sorted(set(blockers))


def meta_row(identity: Identity, value: float | None) -> dict[str, Any]:
    first = normalize_person(identity.first_name)
    last = normalize_person(identity.last_name)
    return {
        "EMAIL": sha256(normalize_email(identity.email)),
        "PHONE": sha256(meta_phone(identity.phone)),
        "FN": sha256(first), "LN": sha256(last),
        "CT": sha256(normalize_city(identity.city)),
        "ST": sha256(normalize_state(identity.state)),
        "ZIP": sha256(normalize_zip(identity.zip)),
        "COUNTRY": sha256(normalize_country(identity.country)),
        "EXTERN_ID": sha256(as_text(identity.external_id)),
        "LOOKALIKE_VALUE": f"{value:.2f}" if value and value > 0 else "",
    }


def google_match_row(identity: Identity) -> dict[str, Any]:
    return {
        "hashed_email": sha256(normalize_email(identity.email)),
        "hashed_phone_number": sha256(google_phone(identity.phone)),
        "hashed_first_name": sha256(normalize_person(identity.first_name)),
        "hashed_last_name": sha256(normalize_person(identity.last_name)),
        "country_code": normalize_country(identity.country).upper(),
        "postal_code": normalize_zip(identity.zip),
    }


def conversion_candidates(
    row: BookedWedding,
    now: datetime,
    prior_upload: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    identity = row.identity
    booking_time = parse_datetime(row.won_at)
    click_time = parse_datetime(identity.click_time)
    if not booking_time:
        return [], [], [], ["missing_verified_booked_stage_time"]
    common = {
        "opportunity_id": row.opportunity_id,
        "order_id": f"BookedIQ:{row.opportunity_id}",
        "conversion_date_time": booking_time.isoformat(),
        "conversion_value": row.collected_value,
        "currency_code": "USD",
        "hashed_email": sha256(normalize_email(identity.email)),
        "hashed_phone_number": sha256(google_phone(identity.phone)),
        "attribution_date_time": click_time.isoformat() if click_time else "",
        "gclid": identity.gclid, "gbraid": identity.gbraid, "wbraid": identity.wbraid,
    }
    google = []
    google_adjustments = []
    diagnostics = []
    prior_google = (prior_upload or {}).get("google")
    google_locally_eligible = click_time and timedelta(0) <= booking_time - click_time <= timedelta(days=GOOGLE_CLICK_LOOKBACK_DAYS) and booking_time <= now
    if google_locally_eligible and not prior_google:
        common["eligibility_basis"] = "captured_click_time" if any((identity.gclid, identity.gbraid, identity.wbraid)) else "lead_capture_time_prefilter_google_final_match_required"
        google.append(common)
    elif prior_google and abs(float(prior_google.get("value", 0)) - row.collected_value) > MONEY_TOLERANCE:
        google_adjustments.append({
            "order_id": common["order_id"],
            "adjustment_type": "RESTATEMENT",
            "adjustment_date_time": now.isoformat(),
            "restatement_value": row.collected_value,
            "currency_code": "USD",
        })
    elif not click_time:
        diagnostics.append("missing_click_or_lead_capture_time")
    meta = []
    prior_meta = (prior_upload or {}).get("meta")
    if prior_meta:
        if abs(float(prior_meta.get("value", 0)) - row.collected_value) > MONEY_TOLERANCE:
            diagnostics.append("meta_prior_event_value_changed_no_safe_capi_reupload")
    elif now - timedelta(days=META_OFFLINE_BACKDATE_DAYS) <= booking_time <= now:
        meta.append({
            "event_name": "Purchase", "event_time": int(booking_time.timestamp()),
            "action_source": "physical_store", "event_id": common["order_id"],
            "user_data": {
                "em": [sha256(normalize_email(identity.email))] if identity.email else [],
                "ph": [sha256(meta_phone(identity.phone))] if identity.phone else [],
                "fn": [sha256(normalize_person(identity.first_name))] if identity.first_name else [],
                "ln": [sha256(normalize_person(identity.last_name))] if identity.last_name else [],
                "ct": [sha256(normalize_city(identity.city))] if identity.city else [],
                "st": [sha256(normalize_state(identity.state))] if identity.state else [],
                "zp": [sha256(normalize_zip(identity.zip))] if identity.zip else [],
                "country": [sha256(normalize_country(identity.country))],
                **({"external_id": [sha256(identity.external_id)]} if identity.external_id else {}),
                **({"fbp": identity.fbp} if identity.fbp else {}),
                **({"fbc": identity.fbc} if identity.fbc else {}),
            },
            "custom_data": {"value": row.collected_value, "currency": "USD", "content_name": "Booked Wedding"},
        })
    return google, meta, google_adjustments, diagnostics


def load_upload_state(path: Path | None) -> dict[str, Any]:
    if path is None:
        return {}
    payload = json.loads(path.read_text())
    if not isinstance(payload, dict) or any(not isinstance(payload.get(key, {}), dict) for key in ("google", "meta")):
        raise RuntimeError("prior upload state must contain google/meta objects")
    return payload


def validate_rows(meta_rows: list[dict[str, Any]], google_rows: list[dict[str, Any]]) -> None:
    errors = []
    for number, row in enumerate(meta_rows, start=2):
        if list(row) != META_AUDIENCE_SCHEMA:
            errors.append(f"Meta row {number}: schema mismatch")
        if not row["EMAIL"] and not row["PHONE"]:
            errors.append(f"Meta row {number}: no email or phone")
        if any(not valid_hash(row[key]) for key in META_AUDIENCE_SCHEMA[:-1]):
            errors.append(f"Meta row {number}: invalid hash")
        if (money(row["LOOKALIKE_VALUE"]) or 0) <= 0:
            errors.append(f"Meta row {number}: nonpositive value")
    for number, row in enumerate(google_rows, start=2):
        if not row["hashed_email"] and not row["hashed_phone_number"]:
            errors.append(f"Google row {number}: no email or phone")
        for key in ("hashed_email", "hashed_phone_number", "hashed_first_name", "hashed_last_name"):
            if not valid_hash(row[key]):
                errors.append(f"Google row {number}: invalid {key}")
    if errors:
        raise RuntimeError("local batch validation failed:\n" + "\n".join(errors))


def validate_event_candidates(
    google_rows: list[dict[str, Any]], meta_rows: list[dict[str, Any]], now: datetime
) -> None:
    errors = []
    for number, row in enumerate(google_rows, start=1):
        event_time = parse_datetime(row.get("conversion_date_time"))
        attribution_time = parse_datetime(row.get("attribution_date_time"))
        if not row.get("order_id") or (money(row.get("conversion_value")) or 0) <= 0:
            errors.append(f"Google conversion {number}: missing order ID or positive value")
        if not event_time or not attribution_time or event_time > now or not timedelta(0) <= event_time - attribution_time <= timedelta(days=GOOGLE_CLICK_LOOKBACK_DAYS):
            errors.append(f"Google conversion {number}: outside local click-to-booking 90-day gate")
        if not row.get("hashed_email") and not row.get("hashed_phone_number"):
            errors.append(f"Google conversion {number}: no hashed identifier")
        if any(not valid_hash(row.get(key)) for key in ("hashed_email", "hashed_phone_number")):
            errors.append(f"Google conversion {number}: invalid identifier hash")
        if sum(bool(row.get(key)) for key in ("gclid", "gbraid", "wbraid")) > 1:
            errors.append(f"Google conversion {number}: multiple click IDs")
    for number, row in enumerate(meta_rows, start=1):
        user_data = row.get("user_data", {})
        try:
            event_time = datetime.fromtimestamp(int(row.get("event_time", 0)), tz=timezone.utc)
        except (TypeError, ValueError, OverflowError):
            event_time = datetime.fromtimestamp(0, tz=timezone.utc)
        identifiers = [*user_data.get("em", []), *user_data.get("ph", [])] if isinstance(user_data, dict) else []
        if row.get("event_name") != "Purchase":
            errors.append(f"Meta event {number}: event name invalid")
        if row.get("action_source") != "physical_store" or not as_text(row.get("event_id")):
            errors.append(f"Meta event {number}: action source or event ID invalid")
        if event_time < now - timedelta(days=META_OFFLINE_BACKDATE_DAYS) or event_time > now:
            errors.append(f"Meta event {number}: outside local 62-day gate")
        if not identifiers or any(not valid_hash(value) for value in identifiers):
            errors.append(f"Meta event {number}: missing or invalid strong identifier")
        hash_fields = ("em", "ph", "fn", "ln", "ct", "st", "zp", "country", "external_id")
        if not isinstance(user_data, dict) or any(
            not isinstance(user_data.get(key, []), list)
            or any(not valid_hash(value) or not value for value in user_data.get(key, []))
            for key in hash_fields
        ):
            errors.append(f"Meta event {number}: invalid user-data shape or hash")
        if not user_data.get("country") or any(not valid_hash(value) for value in user_data["country"]):
            errors.append(f"Meta event {number}: missing or invalid country")
        fbp = as_text(user_data.get("fbp"))
        fbc = as_text(user_data.get("fbc"))
        if fbp and not re.fullmatch(r"fb\.1\.\d{10,13}\.\d+", fbp):
            errors.append(f"Meta event {number}: invalid fbp")
        if fbc and not re.fullmatch(r"fb\.1\.\d{10,13}\.[A-Za-z0-9_-]+", fbc):
            errors.append(f"Meta event {number}: invalid fbc")
        custom_data = row.get("custom_data", {})
        if not isinstance(custom_data, dict) or (money(custom_data.get("value")) or 0) <= 0:
            errors.append(f"Meta event {number}: nonpositive value")
        if as_text(custom_data.get("currency")).upper() != "USD":
            errors.append(f"Meta event {number}: currency must be USD")
    if errors:
        raise RuntimeError("local event-batch validation failed:\n" + "\n".join(errors))


def build(args: argparse.Namespace) -> int:
    env = parse_env(args.env_file)
    required = ["BOOKEDIQ_LOCATION_ID", "BOOKEDIQ_PIT", "HUBSPOT_ACCESS_TOKEN", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise RuntimeError(f"missing environment values: {missing}")

    sheet_rows, sheet_exclusions = parse_sheet(pull_sheet(google_sheets_service(args.google_token)))
    opportunities = pull_bookediq_opportunities(env["BOOKEDIQ_LOCATION_ID"], env["BOOKEDIQ_PIT"])
    hubspot = pull_hubspot(env["HUBSPOT_ACCESS_TOKEN"])
    inquiries = pull_supabase(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    enrichment_index = build_enrichment_index(hubspot, inquiries)

    booked: list[BookedWedding] = []
    for opportunity in opportunities:
        row = BookedWedding(
            opportunity_id=as_text(opportunity.get("id")),
            name=as_text(opportunity.get("name")),
            monetary_value=money(opportunity.get("monetaryValue")),
            identity=build_identity(opportunity, enrichment_index),
            won_at=as_text(opportunity.get("lastStatusChangeAt")),
        )
        row.sheet, row.drift = deterministic_sheet_match(row, sheet_rows)
        booked.append(row)

    payments = load_payments(args.payments_csv)
    upload_state = load_upload_state(args.prior_upload_state)
    unmatched_payments = attach_payments(booked, payments)
    payment_reconciliation_ok = not unmatched_payments
    now = datetime.now(timezone.utc)

    candidate_fields = [
        "opportunity_id", "contact_id", "opportunity_name", "contracted_value_bookediq",
        "sheet_name", "sheet_event_date", "contracted_value_sheet", "collected_value", "identity_sources",
        "sheet_deposit", "sheet_invoice_remaining", "sheet_paid_in_full",
        "sheet_contract_sent", "sheet_contract_signed",
        "email_present", "phone_present", "city_present", "state_present", "zip_present",
        "country_present", "fbp_present", "fbc_present", "external_id_present", "gclid_present",
        "click_time_present", "booking_time_present",
        "suppression_eligible", "value_eligible", "suppression_blockers", "value_blockers",
        *META_AUDIENCE_SCHEMA,
    ]
    candidates = []
    meta_upload: list[dict[str, Any]] = []
    google_match_upload: list[dict[str, Any]] = []
    google_conversion_candidates = []
    google_conversion_adjustments = []
    meta_capi_candidates = []
    conversion_diagnostics = []
    drift_rows = []
    wedding_reports = []
    meta_people: dict[str, dict[str, Any]] = {}
    google_people: dict[str, Identity] = {}
    dedupe_keys = person_keys(booked)

    for row in booked:
        value_blockers = blockers_for(row)
        if not payment_reconciliation_ok:
            value_blockers.append("unmatched_payment_records")
            value_blockers = sorted(set(value_blockers))
        identity = row.identity
        person_key = dedupe_keys[row.opportunity_id]
        suppression_blockers = [] if (normalize_email(identity.email) or meta_phone(identity.phone)) else ["no_usable_identifier"]
        hashed_meta = meta_row(identity, row.collected_value if not value_blockers else None)
        candidate = {
            "opportunity_id": row.opportunity_id, "contact_id": identity.contact_id,
            "opportunity_name": row.name, "contracted_value_bookediq": row.monetary_value,
            "sheet_name": row.sheet.name if row.sheet else "",
            "sheet_event_date": row.sheet.event_date if row.sheet else "",
            "contracted_value_sheet": row.sheet.price if row.sheet else "",
            "collected_value": row.collected_value if row.payments else "",
            "sheet_deposit": as_text(row.sheet.deposit) if row.sheet else "",
            "sheet_invoice_remaining": as_text(row.sheet.invoice_remaining) if row.sheet else "",
            "sheet_paid_in_full": as_text(row.sheet.paid_in_full) if row.sheet else "",
            "sheet_contract_sent": as_text(row.sheet.contract_sent) if row.sheet else "",
            "sheet_contract_signed": as_text(row.sheet.contract_signed) if row.sheet else "",
            "identity_sources": ";".join(sorted(identity.enrichment_sources)),
            "email_present": bool(normalize_email(identity.email)), "phone_present": bool(meta_phone(identity.phone)),
            "city_present": bool(identity.city), "state_present": bool(identity.state), "zip_present": bool(identity.zip),
            "country_present": bool(normalize_country(identity.country)), "fbp_present": bool(identity.fbp),
            "fbc_present": bool(identity.fbc), "external_id_present": bool(identity.external_id),
            "gclid_present": bool(identity.gclid), "click_time_present": bool(parse_datetime(identity.click_time)),
            "booking_time_present": bool(parse_datetime(row.won_at)), "suppression_eligible": not suppression_blockers,
            "value_eligible": not value_blockers, "suppression_blockers": ";".join(suppression_blockers),
            "value_blockers": ";".join(value_blockers), **hashed_meta,
        }
        candidates.append(candidate)
        if row.drift:
            drift_rows.append({
                "bookediq_opportunity_id": row.opportunity_id, "bookediq_name": row.name,
                "bookediq_value": row.monetary_value, "sheet_name": row.sheet.name if row.sheet else "",
                "sheet_value": row.sheet.price if row.sheet else "", "issues": ";".join(row.drift),
            })
        if not suppression_blockers:
            google_people[person_key] = merge_identities(google_people.get(person_key), identity)
        if not value_blockers:
            if person_key in meta_people:
                meta_people[person_key]["value"] += row.collected_value
                meta_people[person_key]["identity"] = merge_identities(meta_people[person_key]["identity"], identity)
            else:
                meta_people[person_key] = {"identity": copy.deepcopy(identity), "value": row.collected_value}
            prior_upload = {
                "google": upload_state.get("google", {}).get(row.opportunity_id),
                "meta": upload_state.get("meta", {}).get(row.opportunity_id),
            }
            google_rows, meta_rows, adjustments, diagnostics = conversion_candidates(row, now, prior_upload)
            google_conversion_candidates.extend(google_rows)
            google_conversion_adjustments.extend(adjustments)
            meta_capi_candidates.extend(meta_rows)
            conversion_diagnostics.extend({"opportunity_id": row.opportunity_id, "issue": issue} for issue in diagnostics)
        wedding_reports.append({
            "opportunity_id": row.opportunity_id, "name": row.name,
            "contracted_value": row.monetary_value, "sheet_match": row.sheet.name if row.sheet else None,
            "sheet_value": row.sheet.price if row.sheet else None, "collected_value": row.collected_value,
            "sheet_payment_fields": {
                "deposit": as_text(row.sheet.deposit) if row.sheet else "",
                "invoice_remaining": as_text(row.sheet.invoice_remaining) if row.sheet else "",
                "paid_in_full": as_text(row.sheet.paid_in_full) if row.sheet else "",
            },
            "email": bool(normalize_email(identity.email)), "phone": bool(meta_phone(identity.phone)),
            "geo": bool(identity.city and identity.state and identity.zip),
            "sources": sorted(identity.enrichment_sources), "value_blockers": value_blockers,
            "suppression_blockers": suppression_blockers,
        })

    for data in meta_people.values():
        meta_upload.append(meta_row(data["identity"], data["value"]))
    for identity in google_people.values():
        google_match_upload.append(google_match_row(identity))
    validate_rows(meta_upload, google_match_upload)
    validate_event_candidates(google_conversion_candidates, meta_capi_candidates, now)

    sheet_matched_ids = {id(row.sheet) for row in booked if row.sheet}
    sheet_only = [row for row in sheet_rows if id(row) not in sheet_matched_ids]
    for row in sheet_only:
        drift_rows.append({
            "bookediq_opportunity_id": "", "bookediq_name": "", "bookediq_value": "",
            "sheet_name": row.name, "sheet_value": row.price,
            "issues": "missing_from_bookediq" + (";unresolved_contract_status" if row.unresolved_contract else ""),
        })

    args.output_dir.mkdir(parents=True, exist_ok=True)
    legacy_candidate = args.output_dir / "meta-value-audience-candidates.full.csv"
    if legacy_candidate.exists():
        legacy_candidate.unlink()
    write_csv(args.output_dir / "booked-wedding-candidates.full.csv", candidate_fields, candidates)
    write_csv(args.output_dir / "meta-value-audience-upload.csv", META_AUDIENCE_SCHEMA, meta_upload)
    write_csv(args.output_dir / "google-customer-match-upload.csv", GOOGLE_CUSTOMER_MATCH_SCHEMA, google_match_upload)
    write_csv(args.output_dir / "drift-report.csv", ["bookediq_opportunity_id", "bookediq_name", "bookediq_value", "sheet_name", "sheet_value", "issues"], drift_rows)
    write_json(args.output_dir / "google-offline-conversion-candidates.json", {
        "customer_id": GOOGLE_CUSTOMER_ID, "login_customer_id": GOOGLE_LOGIN_CUSTOMER_ID,
        "api_version": GOOGLE_API_VERSION, "conversion_action": "PENDING_APPROVED_SECONDARY_UPLOAD_CLICKS_ACTION",
        "conversions": google_conversion_candidates,
        "adjustments": google_conversion_adjustments,
    })
    write_json(args.output_dir / "meta-capi-62-day-candidates.json", {"data": meta_capi_candidates})
    write_json(args.output_dir / "meta-value-audience-payload.json", {
        "payload": {"schema": META_AUDIENCE_SCHEMA, "is_raw": False, "data": [[row[key] for key in META_AUDIENCE_SCHEMA] for row in meta_upload]},
    })
    write_json(args.output_dir / "google-customer-match-payload.json", {
        "customer_id": GOOGLE_CUSTOMER_ID,
        "consent_gate": "PENDING_VERIFICATION_DO_NOT_UPLOAD",
        "operations": [{"create": {"user_identifiers": [
            *([{"hashed_email": row["hashed_email"]}] if row["hashed_email"] else []),
            *([{"hashed_phone_number": row["hashed_phone_number"]}] if row["hashed_phone_number"] else []),
            *([{"address_info": {
                "hashed_first_name": row["hashed_first_name"], "hashed_last_name": row["hashed_last_name"],
                "country_code": row["country_code"], "postal_code": row["postal_code"],
            }}] if all(row[key] for key in ("hashed_first_name", "hashed_last_name", "country_code", "postal_code")) else []),
        ]}} for row in google_match_upload],
    })

    report = {
        "built_at": now.isoformat(),
        "no_platform_write_performed": True,
        "source_counts": {
            "bookediq_won_opportunities": len(booked),
            "bookediq_contracted_value": round(sum(row.monetary_value or 0 for row in booked), 2),
            "sheet_confirmed_rows": len(sheet_rows), "sheet_exclusions": len(sheet_exclusions),
            "hubspot_contacts": len(hubspot), "supabase_event_inquiries": len(inquiries),
            "settled_payment_records": len(payments),
        },
        "coverage": {
            "email": sum(bool(normalize_email(row.identity.email)) for row in booked),
            "phone": sum(bool(meta_phone(row.identity.phone)) for row in booked),
            "email_or_phone": sum(bool(normalize_email(row.identity.email) or meta_phone(row.identity.phone)) for row in booked),
            "city": sum(bool(row.identity.city) for row in booked), "state": sum(bool(row.identity.state) for row in booked),
            "zip": sum(bool(row.identity.zip) for row in booked), "country": len(booked),
            "fbp": sum(bool(row.identity.fbp) for row in booked), "fbc": sum(bool(row.identity.fbc) for row in booked),
            "external_id": sum(bool(row.identity.external_id) for row in booked), "gclid": sum(bool(row.identity.gclid) for row in booked),
        },
        "drift": {
            "matched": sum(bool(row.sheet) for row in booked),
            "bookediq_rows_with_issues": sum(bool(row.drift) for row in booked),
            "sheet_only": len(sheet_only), "rows": drift_rows,
        },
        "upload": {
            "value_eligible_weddings": sum(bool(row["value_eligible"]) for row in candidates),
            "google_suppression_eligible_weddings": sum(bool(normalize_email(row.identity.email) or meta_phone(row.identity.phone)) for row in booked),
            "meta_audience_people": len(meta_upload), "google_customer_match_people": len(google_match_upload),
            "google_conversion_rows_within_90_days": len(google_conversion_candidates),
            "google_conversion_adjustments": len(google_conversion_adjustments),
            "meta_capi_rows_within_62_days": len(meta_capi_candidates),
        },
        "hard_gates": {
            "privacy_policy_live_and_sufficient": False,
            "settled_payment_reconciliation_complete": bool(payments) and payment_reconciliation_ok and all(row.payments for row in booked),
            "unresolved_contract_rows_cleared": not any("unresolved_contract_status" in row.drift for row in booked),
            "meta_write_performed": False, "google_write_performed": False,
        },
        "sheet_exclusions": sheet_exclusions, "unmatched_payments": unmatched_payments,
        "conversion_diagnostics": conversion_diagnostics,
        "weddings": wedding_reports,
    }
    write_json(args.output_dir / "coverage-report.json", report)
    render_report(args.output_dir / "coverage-report.md", report)
    print(json.dumps({
        "output_dir": str(args.output_dir), "booked_weddings": len(booked),
        "contracted_value": report["source_counts"]["bookediq_contracted_value"],
        "usable_identifier": report["coverage"]["email_or_phone"],
        "meta_upload_rows": len(meta_upload), "google_match_rows": len(google_match_upload),
        "privacy_gate": "BLOCKED", "payment_gate": "BLOCKED" if not payments else "PARTIAL",
    }, indent=2))
    return 0


def render_report(path: Path, report: dict[str, Any]) -> None:
    c, coverage, drift, upload = report["source_counts"], report["coverage"], report["drift"], report["upload"]
    lines = [
        "# Highland Farms booked-wedding ad feeds — coverage report", "",
        f"Built: {report['built_at']}", "",
        "**No data has been transmitted to Meta or Google Ads.** The privacy-policy and settled-payment gates remain blocked.", "",
        "## Source truth and identity coverage", "",
        f"BookedIQ returned **{c['bookediq_won_opportunities']}** won opportunities totaling **${c['bookediq_contracted_value']:,.2f}**.", "",
        "| Field | Coverage |", "|---|---:|",
        f"| Email | {coverage['email']} / {c['bookediq_won_opportunities']} |",
        f"| Phone | {coverage['phone']} / {c['bookediq_won_opportunities']} |",
        f"| Email or phone | {coverage['email_or_phone']} / {c['bookediq_won_opportunities']} |",
        f"| City / state / ZIP | {coverage['city']} / {coverage['state']} / {coverage['zip']} |",
        f"| Country | {coverage['country']} / {c['bookediq_won_opportunities']} |",
        f"| fbp / fbc / external_id | {coverage['fbp']} / {coverage['fbc']} / {coverage['external_id']} |",
        f"| gclid | {coverage['gclid']} / {c['bookediq_won_opportunities']} |", "",
        "Identity comes from each opportunity's linked BookedIQ contact. HubSpot and Supabase enrich only on exact email/phone; no name-based identity join is used.", "",
        "## Sheet drift", "",
        f"- BookedIQ rows matched to Sheet: **{drift['matched']} / {c['bookediq_won_opportunities']}**",
        f"- BookedIQ rows with a missing, ambiguous, value, or contract-status issue: **{drift['bookediq_rows_with_issues']}**",
        f"- Confirmed Sheet rows missing from BookedIQ: **{drift['sheet_only']}**",
        f"- Sheet Total/Sent rows excluded: **{c['sheet_exclusions']}**", "",
        "## Upload gate", "",
        f"- Settled payment records supplied: **{c['settled_payment_records']}**",
        f"- Payment/value-eligible weddings: **{upload['value_eligible_weddings']}**",
        f"- Google suppression-eligible weddings: **{upload['google_suppression_eligible_weddings']}**",
        f"- Meta value-audience people: **{upload['meta_audience_people']}**",
        f"- Google Customer Match people: **{upload['google_customer_match_people']}**",
        f"- Google conversion candidates within 90 days: **{upload['google_conversion_rows_within_90_days']}**",
        f"- Google value-restatement candidates: **{upload['google_conversion_adjustments']}**",
        f"- Meta physical-store candidates within 62 days: **{upload['meta_capi_rows_within_62_days']}**", "",
        "Contracted value is retained for reconciliation only. Every transmitted value must come from a unique, settled payment record. Deposits contribute only the amount actually collected.", "",
        "## Local validation", "",
        "- Meta phone is normalized to digits only; Google phone is independently normalized to E.164 with `+` before hashing.",
        "- Total and Sent rows are filtered; Emma Williams, Molly Celente, and Chloe Hoyer are hard-blocked until contract status is resolved.",
        "- Any duplicate payment ID, invalid date/hash, missing strong identifier, or reconciliation issue aborts or blocks the affected record.",
        "- `HF — Leads — Weddings` remains lead-optimized. No output in this package can change bidding.", "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")
    os.chmod(path, 0o600)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)
    parser.add_argument("--google-token", type=Path, default=GOOGLE_TOKEN_DEFAULT)
    parser.add_argument("--payments-csv", type=Path)
    parser.add_argument("--prior-upload-state", type=Path, help="State recorded only after confirmed successful platform uploads")
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


if __name__ == "__main__":
    try:
        raise SystemExit(build(parse_args()))
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
