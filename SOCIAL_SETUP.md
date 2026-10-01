# Teacher Sara social publishing setup

This repository now contains a small first-party social publishing system.

## What it does

The GitHub Action checks the content queue every 15 minutes. It only processes entries when:

1. The post is present in social/queue.json.
2. status is exactly approved.
3. publish_at has passed.
4. The required platform credentials exist as GitHub Secrets.

A result is recorded separately for each platform. This prevents a temporary failure on one network from causing successful posts on the other networks to be published a second time.

Nothing is published while a post is still draft.

## Your only credentials

Never put tokens or client secrets into website files, this queue, ChatGPT messages, or GitHub issues.

Put them in:

GitHub repository -> Settings -> Secrets and variables -> Actions -> New repository secret

Required secret names:

### Meta
- META_PAGE_ID
- META_PAGE_ACCESS_TOKEN
- INSTAGRAM_USER_ID

### TikTok
- TIKTOK_CLIENT_KEY
- TIKTOK_CLIENT_SECRET
- TIKTOK_REFRESH_TOKEN

There is also a normal repository variable in the workflow for Meta API version, currently set to v26.0. It can be changed later without exposing a secret.

## Meta authorization

Use Meta for Developers and create a Business app for Teacher Sara.

The Instagram account should be a Professional account (Business or Creator) and, for the Facebook-login route used by this publisher, it should be linked to the Teacher Sara Facebook Page.

The permissions needed for organic publishing are:

- pages_show_list
- pages_read_engagement
- pages_manage_posts
- instagram_basic
- instagram_content_publish

Meta's current documentation shows that Page access tokens are obtained from the user token through the /me/accounts endpoint, and the response can also expose the linked Instagram Business account ID. Meta's current Instagram publishing documentation also uses the Instagram Professional account plus the Instagram content publishing permission. 

Create a user access token in Meta's Graph API Explorer with the permissions above. Then request:

GET /me/accounts?fields=name,access_token,tasks,instagram_business_account

using that user token.

From the returned Teacher Sara Page record:

- copy id into META_PAGE_ID
- copy access_token into META_PAGE_ACCESS_TOKEN
- copy instagram_business_account.id into INSTAGRAM_USER_ID

Do not store the temporary user token in GitHub for this publisher; we use the Page access token.

Depending on Meta's current app status and permissions, Meta may ask for additional review/verification. Complete it only for the Teacher Sara assets.

## TikTok authorization

TikTok currently supports direct photo and video posting through the Content Posting API.

Set up a TikTok for Developers app and add the Content Posting API. Configure Direct Post and request the video.publish scope.

Also verify the domain used for media pulled from URLs. Our publisher uses teachersara.es so that media can be hosted on the Teacher Sara site.

TikTok requires the target account to authorize the app. The current API returns an access token valid for 24 hours and a refresh token typically valid for 365 days; the refresh token is used to obtain a new access token without asking the user to sign in again. TikTok may rotate the refresh token, so replace the GitHub Secret if TikTok returns a new one.

Important: TikTok states that unaudited clients are restricted to private viewing for direct posts, and production/public direct posting requires the required approval/audit. The publisher therefore refuses to enable TikTok direct posting until you explicitly turn on the repository setting TIKTOK_DIRECT_POST_ENABLED=true after the TikTok app has the required production approval/audit.

When the TikTok app is approved, authorize the Teacher Sara TikTok account for video.publish and obtain the resulting refresh token securely. Store that refresh token only as the GitHub Secret TIKTOK_REFRESH_TOKEN.

## Website requirements for TikTok

TikTok's app review guidance requires a valid Privacy Policy and Terms of Service to be visible on the official website.

Teacher Sara now has:

- https://www.teachersara.es/privacy.html
- https://www.teachersara.es/terms.html

## Creating a scheduled post

Example:

{
  "posts": [
    {
      "id": "teacher-sara-001",
      "publish_at": "2026-10-05T18:30:00+02:00",
      "status": "draft",
      "platforms": ["instagram", "facebook"],
      "type": "image",
      "media_url": "https://www.teachersara.es/assets/teacher-sara-logo.webp",
      "caption": "Ejemplo de publicación de Teacher Sara."
    }
  ]
}

Change status to approved only when the content is ready to publish.

For TikTok, use type=image or type=video and a publicly accessible media URL on the verified Teacher Sara domain.

## TikTok direct publishing switch

The GitHub workflow intentionally does not enable TikTok direct posting by default.

After TikTok has approved/audited the app for public direct posting, add this repository variable:

TIKTOK_DIRECT_POST_ENABLED = true

Do not put it in Secrets; it is only a feature switch, not a credential.

## Security

Never paste:
- Meta access tokens
- TikTok client secrets
- TikTok refresh tokens
- GitHub personal access tokens

into ChatGPT.

Use GitHub repository Secrets for credentials.

## Current state

The social queue is empty.

The social publishing workflow is installed but harmless until credentials are added and a post is marked approved.

