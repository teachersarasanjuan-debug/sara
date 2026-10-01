#!/usr/bin/env python3
"""Read-only verification for Teacher Sara social credentials."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request


META_VERSION = os.getenv("META_GRAPH_VERSION", "v26.0")
META_BASE = f"https://graph.facebook.com/{META_VERSION}"
TIKTOK_BASE = "https://open.tiktokapis.com/v2"


def request(url: str, method="GET", data=None, headers=None):
    req_headers = {"User-Agent": "Teacher-Sara-Social-Verifier/1.0"}
    if headers:
        req_headers.update(headers)
    body = None
    if isinstance(data, dict):
        body = urllib.parse.urlencode(data).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    elif data is not None:
        body = data

    req = urllib.request.Request(url, data=body, method=method, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc}") from exc


def need(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing GitHub Secret: {name}")
    return value


def main():
    failures = []

    meta_token = os.getenv("META_PAGE_ACCESS_TOKEN")
    page_id = os.getenv("META_PAGE_ID")
    ig_id = os.getenv("INSTAGRAM_USER_ID")

    if meta_token and page_id:
        try:
            page = request(
                f"{META_BASE}/{page_id}",
                data={
                    "fields": "id,name,instagram_business_account",
                    "access_token": meta_token,
                },
            )
            print(f"FACEBOOK OK: {page.get('name', 'Teacher Sara Page')} ({page.get('id', page_id)})")
            linked = page.get("instagram_business_account", {}).get("id") if isinstance(page.get("instagram_business_account"), dict) else None
            if linked and ig_id and linked != ig_id:
                failures.append(f"Instagram ID mismatch: Page links {linked} but secret contains {ig_id}")
        except Exception as exc:
            failures.append(f"Facebook verification failed: {exc}")
    else:
        failures.append("Facebook verification skipped: META_PAGE_ID or META_PAGE_ACCESS_TOKEN missing")

    if meta_token and ig_id:
        try:
            ig = request(
                f"{META_BASE}/{ig_id}",
                data={
                    "fields": "id,username,account_type",
                    "access_token": meta_token,
                },
            )
            print(f"INSTAGRAM OK: @{ig.get('username', ig_id)} ({ig.get('account_type', 'Professional')})")
        except Exception as exc:
            failures.append(f"Instagram verification failed: {exc}")
    else:
        failures.append("Instagram verification skipped: INSTAGRAM_USER_ID or Meta token missing")

    tiktok_key = os.getenv("TIKTOK_CLIENT_KEY")
    tiktok_secret = os.getenv("TIKTOK_CLIENT_SECRET")
    tiktok_refresh = os.getenv("TIKTOK_REFRESH_TOKEN")

    if tiktok_key and tiktok_secret and tiktok_refresh:
        try:
            token = request(
                f"{TIKTOK_BASE}/oauth/token/",
                method="POST",
                data={
                    "client_key": tiktok_key,
                    "client_secret": tiktok_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": tiktok_refresh,
                },
            ).get("access_token")
            if not token:
                raise RuntimeError("No access_token returned by TikTok")
            creator = request(
                f"{TIKTOK_BASE}/post/publish/creator_info/query/",
                method="POST",
                data=b"{}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json; charset=UTF-8",
                },
            )
            name = creator.get("data", {}).get("creator_username", "TikTok account")
            print(f"TIKTOK OK: @{name}")
        except Exception as exc:
            failures.append(f"TikTok verification failed: {exc}")
    else:
        failures.append("TikTok verification skipped: one or more TikTok secrets are missing")

    if failures:
        for item in failures:
            print(f"ERROR: {item}")
        raise SystemExit(1)

    print("All configured social credentials verified. No content was published.")


if __name__ == "__main__":
    main()
