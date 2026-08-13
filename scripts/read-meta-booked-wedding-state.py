#!/usr/bin/env python3
"""Read Highland Farms Meta account state; never mutates."""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from ad_feed_utils import parse_env


ACCOUNT_ID = "act_688940352529497"
GRAPH_VERSION = "v25.0"


def get(path: str, token: str, fields: str, limit: int | None = None) -> Any:
    query = {"access_token": token, "fields": fields}
    if limit:
        query["limit"] = str(limit)
    url = f"https://graph.facebook.com/{GRAPH_VERSION}/{path}?{urllib.parse.urlencode(query)}"
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            payload = json.loads(response.read())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:2000]
        raise RuntimeError(f"Meta read failed: HTTP {exc.code}: {detail}") from exc
    if isinstance(payload, dict) and "paging" in payload:
        payload.pop("paging", None)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, default=Path.home() / "projects/highland-farms/.env.prod")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    env = parse_env(args.env_file)
    token = os.environ.get("ACCESS_TOKEN", "").strip() or env.get("META_CAPI_TOKEN", "")
    if not token:
        raise RuntimeError("META_CAPI_TOKEN is missing")
    state = {
        "graph_version": GRAPH_VERSION,
        "account": get(ACCOUNT_ID, token, "id,name,account_status,currency,timezone_name"),
        "pixel_id": env.get("META_PIXEL_ID"),
        "custom_audiences": get(
            f"{ACCOUNT_ID}/customaudiences", token,
            "id,name,subtype,is_value_based,customer_file_source,approximate_count_lower_bound,approximate_count_upper_bound,operation_status",
            500,
        ).get("data", []),
        "campaigns": get(
            f"{ACCOUNT_ID}/campaigns", token,
            "id,name,status,effective_status,objective,bid_strategy,daily_budget,lifetime_budget",
            500,
        ).get("data", []),
        "adsets": get(
            f"{ACCOUNT_ID}/adsets", token,
            "id,name,campaign_id,status,effective_status,optimization_goal,billing_event,bid_strategy,daily_budget,lifetime_budget",
            500,
        ).get("data", []),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n")
    os.chmod(args.output, 0o600)
    print(json.dumps({
        "account": state["account"].get("name"),
        "custom_audiences": len(state["custom_audiences"]),
        "campaigns": len(state["campaigns"]),
        "adsets": len(state["adsets"]),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
