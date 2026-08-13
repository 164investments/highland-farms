#!/usr/bin/env python3
"""Read Highland Farms Google Ads state through REST v22; never mutates."""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


CUSTOMER_ID = "9938773372"
LOGIN_CUSTOMER_ID = "9002457484"
API_VERSION = "v22"
DEFAULT_KEY = Path.home() / "Downloads/Financial/google-sa-key-ace-destination.json"


def access_token(key_file: Path) -> str:
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    credentials = service_account.Credentials.from_service_account_file(
        str(key_file), scopes=["https://www.googleapis.com/auth/adwords"]
    )
    credentials.refresh(Request())
    return credentials.token


def search(query: str, token: str, developer_token: str) -> list[dict[str, Any]]:
    url = f"https://googleads.googleapis.com/{API_VERSION}/customers/{CUSTOMER_ID}/googleAds:searchStream"
    request = urllib.request.Request(
        url,
        data=json.dumps({"query": query}).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "developer-token": developer_token,
            "login-customer-id": LOGIN_CUSTOMER_ID,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            batches = json.loads(response.read())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:2000]
        raise RuntimeError(f"Google Ads read failed: HTTP {exc.code}: {detail}") from exc
    return [row for batch in batches for row in batch.get("results", [])]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--service-account-key", type=Path, default=DEFAULT_KEY)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    developer_token = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN", "").strip()
    if not developer_token:
        raise RuntimeError("GOOGLE_ADS_DEVELOPER_TOKEN is required")
    token = access_token(args.service_account_key)
    state = {
        "api_version": API_VERSION,
        "customer_id": CUSTOMER_ID,
        "login_customer_id": LOGIN_CUSTOMER_ID,
        "customer": search(
            "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, "
            "customer.conversion_tracking_setting.accepted_customer_data_terms, "
            "customer.conversion_tracking_setting.enhanced_conversions_for_leads_enabled, "
            "customer.conversion_tracking_setting.google_ads_conversion_customer "
            "FROM customer",
            token,
            developer_token,
        ),
        "conversion_actions": search(
            "SELECT conversion_action.id, conversion_action.name, conversion_action.status, "
            "conversion_action.type, conversion_action.category, conversion_action.primary_for_goal, "
            "conversion_action.include_in_conversions_metric, conversion_action.click_through_lookback_window_days "
            "FROM conversion_action WHERE conversion_action.status != 'REMOVED'",
            token,
            developer_token,
        ),
        "user_lists": search(
            "SELECT user_list.id, user_list.name, user_list.type, "
            "user_list.membership_status, user_list.size_for_search, user_list.size_for_display, "
            "user_list.crm_based_user_list.upload_key_type "
            "FROM user_list",
            token,
            developer_token,
        ),
        "campaigns": search(
            "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, "
            "campaign.bidding_strategy_type FROM campaign "
            "WHERE campaign.status IN ('ENABLED', 'PAUSED')",
            token,
            developer_token,
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n")
    os.chmod(args.output, 0o600)
    print(json.dumps({key: len(value) if isinstance(value, list) else value for key, value in state.items()}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
