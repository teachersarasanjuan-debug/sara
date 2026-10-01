# Teacher Sara social publishing setup

This repository now contains a small first-party social publishing system.

## What it does

The GitHub Action checks the content queue every 15 minutes. It only publishes a post when:

1. The post is present in social/queue.json.
2. status is exactly approved.
3. publish_at has passed.
4. The required platform credentials exist as GitHub Secrets.

After a successful publish to every requested platform, the post is marked published.

Nothing is published while a post is still draft.

## Platforms

### Facebook + Instagram

The Meta Graph API can publish to a Facebook Page and to an Instagram Professional account. Instagram publishing requires a Professional account and the appropriate Meta permissions.

Required GitHub Secrets:

- META_PAGE_ID
- META_PAGE_ACCESS_TOKEN
- INSTAGRAM_USER_ID

The Instagram account must be the Teacher Sara professional account.

### TikTok

TikTok's current Content Posting API supports direct photo/video posting, but it requires:

- a TikTok for Developers app
- Content Posting API enabled
- Direct Post configured
- approval for the video.publish scope
- the Teacher Sara TikTok account authorizing the app
- URL/domain verification for media pulled from teachersara.es
- production approval/audit before public direct posting for an unaudited client

Required GitHub Secrets:

- TIKTOK_CLIENT_KEY
- TIKTOK_CLIENT_SECRET
- TIKTOK_REFRESH_TOKEN

TikTok access tokens expire after 24 hours; the refresh token is used to obtain a fresh access token. TikTok says refresh tokens are typically valid for 365 days and can rotate, so if the platform returns a new refresh token the GitHub Secret must be updated.

## Important security rule

Never paste access tokens, client secrets, refresh tokens, or GitHub secrets into ChatGPT messages, source code, social/queue.json, or a public issue.

Store them only in:

GitHub repository -> Settings -> Secrets and variables -> Actions

Use Repository secrets.

## How we will use the queue

Example:

{
  "posts": [
    {
      "id": "teacher-sara-001",
      "publish_at": "2026-10-05T18:30:00+02:00",
      "status": "draft",
      "platforms": ["instagram", "facebook", "tiktok"],
      "type": "image",
      "media_url": "https://www.teachersara.es/assets/teacher-sara-logo.webp",
      "caption": "Ejemplo de publicación de Teacher Sara.",
      "title": "Teacher Sara",
      "privacy_level": "PUBLIC_TO_EVERYONE"
    }
  ]
}

Change status to approved only when the content is ready to publish.

## Current deliberate limitation

This version uses the existing teachersara.es site as the public media host. That keeps media URLs under the business domain and avoids adding another storage service.

TikTok requires the media URL/domain to be verified in the TikTok Developer app before PULL_FROM_URL publishing can be used.

