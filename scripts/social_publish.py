#!/usr/bin/env python3
"""
Teacher Sara social publisher.

Only entries with status="approved" and publish_at <= now are processed.

Platform credentials are read only from environment variables supplied by
GitHub Actions Secrets. Secrets never belong in repository files.

Current publishing targets:
- Facebook Page
- Instagram Professional account
- TikTok direct photo/video posting after the TikTok app has the required
  production approval/audit

The queue records a result per platform so a temporary failure on one platform
does not cause successful posts on the other platforms to be duplicated.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


QUEUE_PATH = Path("social/queue.json")
META_VERSION = os.getenv("META_GRAPH_VERSION", "v26.0")
META_BASE = f"https://graph.facebook.com/{META_VERSION}"
TIKTOK_BASE = "https://open.tiktokapis.com/v2"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_dt(value: str) -> datetime:
    value = value.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        raise ValueError("publish_at must include a timezone offset, e.g. +02:00")
    return dt.astimezone(timezone.utc)


def http_json(url: str, method: str = "GET", data=None, headers=None):
    body = None
    req_headers = {"User-Agent": "Teacher-Sara-Social-Publisher/1.0"}
    if headers:
        req_headers.update(headers)

    if data is not None:
        if isinstance(data, dict):
            body = urllib.parse.urlencode(data).encode("utf-8")
            req_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
        else:
            body = data

    request = urllib.request.Request(
        url, data=body, method=method, headers=req_headers
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc}") from exc


def require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"Missing required GitHub secret/environment variable: {name}"
        )
    return value


def publish_facebook(post: dict) -> str:
    token = require("META_PAGE_ACCESS_TOKEN")
    page_id = require("META_PAGE_ID")
    caption = post.get("caption", "")
    media_url = post.get("media_url")
    link = post.get("link")

    if media_url:
        result = http_json(
            f"{META_BASE}/{page_id}/photos",
            method="POST",
            data={
                "url": media_url,
                "caption": caption,
                "access_token": token,
            },
        )
    else:
        payload = {
            "message": caption,
            "access_token": token,
        }
        if link:
            payload["link"] = link
        result = http_json(
            f"{META_BASE}/{page_id}/feed",
            method="POST",
            data=payload,
        )

    post_id = result.get("id")
    if not post_id:
        raise RuntimeError(f"Facebook publish returned no id: {result}")
    return str(post_id)


def wait_for_instagram_container(
    creation_id: str, token: str, attempts: int = 12
) -> None:
    for _ in range(attempts):
        query = urllib.parse.urlencode(
            {"fields": "status_code,status", "access_token": token}
        )
        result = http_json(f"{META_BASE}/{creation_id}?{query}")
        status = result.get("status_code")
        if status == "FINISHED":
            return
        if status in {"ERROR", "EXPIRED"}:
            raise RuntimeError(f"Instagram media container failed: {result}")
        time.sleep(5)

    raise RuntimeError("Instagram media container did not finish in time")


def publish_instagram(post: dict) -> str:
    token = require("META_PAGE_ACCESS_TOKEN")
    ig_user_id = require("INSTAGRAM_USER_ID")
    media_url = post.get("media_url")
    caption = post.get("caption", "")

    if not media_url:
        raise RuntimeError("Instagram posts require media_url")

    media_type = post.get("type", "image").lower()
    params = {
        "caption": caption,
        "access_token": token,
    }

    if media_type == "video":
        params.update({
            "media_type": "REELS",
            "video_url": media_url,
        })
    else:
        params.update({"image_url": media_url})

    created = http_json(
        f"{META_BASE}/{ig_user_id}/media",
        method="POST",
        data=params,
    )
    creation_id = created.get("id")
    if not creation_id:
        raise RuntimeError(
            f"Instagram container creation failed: {created}"
        )

    wait_for_instagram_container(creation_id, token)

    published = http_json(
        f"{META_BASE}/{ig_user_id}/media_publish",
        method="POST",
        data={
            "creation_id": creation_id,
            "access_token": token,
        },
    )
    post_id = published.get("id")
    if not post_id:
        raise RuntimeError(f"Instagram publish failed: {published}")
    return str(post_id)


def refresh_tiktok_token() -> str:
    client_key = require("TIKTOK_CLIENT_KEY")
    client_secret = require("TIKTOK_CLIENT_SECRET")
    refresh_token = require("TIKTOK_REFRESH_TOKEN")

    result = http_json(
        f"{TIKTOK_BASE}/oauth/token/",
        method="POST",
        data={
            "client_key": client_key,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
    )

    access_token = result.get("access_token")
    if not access_token:
        raise RuntimeError(f"TikTok token refresh failed: {result}")

    rotated = result.get("refresh_token")
    if rotated and rotated != refresh_token:
        raise RuntimeError(
            "TikTok rotated the refresh token. Replace the "
            "TIKTOK_REFRESH_TOKEN GitHub Secret with the new refresh token."
        )

    return access_token


def tiktok_creator_info(access_token: str) -> dict:
    return http_json(
        f"{TIKTOK_BASE}/post/publish/creator_info/query/",
        method="POST",
        data=b"{}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
    )


def publish_tiktok(post: dict) -> str:
    if os.getenv("TIKTOK_DIRECT_POST_ENABLED", "").lower() != "true":
        raise RuntimeError(
            "TikTok direct posting is disabled until the TikTok app has "
            "production approval/audit. Set TIKTOK_DIRECT_POST_ENABLED=true "
            "only after that approval."
        )

    token = refresh_tiktok_token()
    creator = tiktok_creator_info(token)
    options = creator.get("data", {}).get("privacy_level_options", [])
    privacy = post.get("privacy_level", "PUBLIC_TO_EVERYONE")

    if privacy not in options:
        raise RuntimeError(
            f"TikTok privacy level {privacy!r} is not available. "
            f"Available: {options}"
        )

    media_url = post.get("media_url")
    if not media_url:
        raise RuntimeError("TikTok posts require media_url")

    media_type = post.get("type", "video").lower()
    is_aigc = bool(post.get("is_aigc", False))
    if media_type == "image":
        payload = {
            "post_info": {
                "title": post.get(
                    "title", post.get("caption", "")[:90]
                ),
                "description": post.get("caption", ""),
                "privacy_level": privacy,
                "disable_comment": False,
                "brand_organic_toggle": True,
                "auto_add_music": bool(
                    post.get("auto_add_music", False)
                ),
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "photo_cover_index": 0,
                "photo_images": [media_url],
            },
            "post_mode": "DIRECT_POST",
            "media_type": "PHOTO",
            "is_aigc": is_aigc,
        }
        endpoint = f"{TIKTOK_BASE}/post/publish/content/init/"
    else:
        payload = {
            "post_info": {
                "title": post.get("caption", "")[:2200],
                "privacy_level": privacy,
                "disable_comment": False,
                "disable_duet": False,
                "disable_stitch": False,
                "brand_organic_toggle": True,
                "is_aigc": is_aigc,
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "video_url": media_url,
            },
        }
        endpoint = f"{TIKTOK_BASE}/post/publish/video/init/"

    result = http_json(
        endpoint,
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
    )

    error_code = result.get("error", {}).get("code")
    if error_code not in (None, "ok"):
        raise RuntimeError(f"TikTok publish failed: {result}")

    publish_id = result.get("data", {}).get("publish_id")
    if not publish_id:
        raise RuntimeError(f"TikTok publish returned no publish_id: {result}")

    return str(publish_id)


def main() -> int:
    if not QUEUE_PATH.exists():
        print(f"No queue file found at {QUEUE_PATH}")
        return 0

    data = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
    posts = data.get("posts", [])
    current = now_utc()
    changed = False
    failures = []

    for post in posts:
        if post.get("status") != "approved":
            continue

        try:
            publish_at = parse_dt(post["publish_at"])
        except Exception as exc:
            failures.append(
                f"{post.get('id', 'unknown')}: invalid publish_at: {exc}"
            )
            continue

        if publish_at > current:
            continue

        platforms = post.get("platforms", [])
        results = post.setdefault("platform_results", {})

        for platform in platforms:
            if platform in results:
                continue

            try:
                if platform == "facebook":
                    results[platform] = publish_facebook(post)
                elif platform == "instagram":
                    results[platform] = publish_instagram(post)
                elif platform == "tiktok":
                    results[platform] = publish_tiktok(post)
                else:
                    raise RuntimeError(
                        f"Unsupported platform: {platform}"
                    )
                changed = True
                print(
                    f"Published {post.get('id')} to {platform}"
                )
            except Exception as exc:
                failures.append(
                    f"{post.get('id', 'unknown')} / {platform}: {exc}"
                )

        if platforms and all(platform in results for platform in platforms):
            post["status"] = "published"
            post["published_at"] = current.isoformat()
            changed = True

    if changed:
        QUEUE_PATH.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    if failures:
        for failure in failures:
            print(f"ERROR: {failure}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
