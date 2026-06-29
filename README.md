# Instagram Keyword DM Bot

Listens for keyword **DMs** to your Instagram account and automatically runs a DM flow: a follow-prompt with a **Done** button, a follower check, then a gift link.

A user sends you a direct message containing a keyword (e.g. "GIFT") and the bot takes over. Multiple keywords are supported via a single account-wide list in `campaigns.json`, which hot-reloads without a restart.

```
User DMs "GIFT"   ─►  bot replies greet_message + [Done] quick-reply button
   user taps Done ─►  bot checks whether they follow you
        following ─►  success_message + [Get Gift] button → gift_url
    not following ─►  re-sends the greet (so they can follow and try again)
```

The trigger is a **DM**, not a comment. Matching is case-insensitive and **substring-based**: a DM that *contains* the keyword anywhere (e.g. "hey can I get GIFT") triggers it.

---

## Requirements

- Node 18+
- A Meta Developer app set up with **Instagram API with Instagram Login**
- An Instagram **Business or Creator** account
- A publicly reachable **HTTPS** URL for the webhook (Render, Fly.io, a VPS… or [ngrok](https://ngrok.com) for local testing)

---

## How delivery actually works (read this first)

Most setup pain comes from the fact that **four independent layers must all line up** before a real DM reaches your server. If any one is wrong you get silence — and confusingly, the dashboard **"Test" button keeps working** because it bypasses all of them.

| # | Layer | Where | Covered in |
|---|---|---|---|
| 1 | **App is Live** (not in Development) | App dashboard toggle | §6 |
| 2 | **App-level** webhook subscription (`instagram` object → `messages` fields → your callback) — **must be set via API** | Graph API call | §5 |
| 3 | **Account-level** subscription (`/me/subscribed_apps`) | Graph API call | §5 |
| 4 | **`INSTAGRAM_APP_SECRET` matches the app that signs the webhooks** | `.env` / host env | §2, Troubleshooting |

Keep these four in mind; the steps below set each one.

---

## 1. Meta Developer app setup

### 1a. Create the app
1. [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
2. Choose **Business**, give it a name + contact email, **Create App**.

### 1b. Add the Instagram product
1. Dashboard → **Add Product** → **Instagram** → **Set up**
2. Use **API Setup with Instagram Login** (the current v25.0 flow this bot uses — it talks to `graph.instagram.com`).

### 1c. Add the messaging permission
Under Instagram → make sure your app requests these permissions:
- `instagram_business_basic`
- `instagram_business_manage_messages` ← **required for DMs**

> If your token was generated before `..._manage_messages` was added (e.g. it was a comments-only setup), you **must regenerate it** so the account consents to message access — otherwise the messaging API returns empty and no message webhooks fire.

### 1d. Connect your account and generate a token
1. Instagram → **API Setup** → **Generate access tokens** → add your Instagram account.
2. Click **Generate** and approve the consent screen (it must include *manage messages*). Copy the token.
   - It's **short-lived** (1 hour) — exchange it for a long-lived one in §7.

### 1e. Note your credentials

| Value | Where to find it |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | The token you just generated (make it long-lived, §7) |
| `INSTAGRAM_APP_SECRET` | App Dashboard → **Settings → Basic → App Secret** of **this exact app** |
| `APP_ID` | App Dashboard → **Settings → Basic → App ID** (needed for the setup API calls) |
| `INSTAGRAM_ACCOUNT_ID` | Instagram → API Setup → your account's numeric ID |
| `VERIFY_TOKEN` | Any string you invent — you'll reuse it during webhook setup |

> ⚠️ If you have **more than one** Meta app, every one of the four layers (token, app secret, webhook subscription, signature) must belong to the **same** app. Mixing apps is the #1 cause of "webhook arrives but signature is rejected."

---

## 2. Fill in `.env`

```
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here
INSTAGRAM_APP_SECRET=your_app_secret_here
INSTAGRAM_ACCOUNT_ID=your_numeric_ig_account_id
APP_ID=your_numeric_app_id
VERIFY_TOKEN=pick_any_string_you_want
PORT=3000
```

Used by the code at runtime: `INSTAGRAM_ACCESS_TOKEN` (sending DMs), `INSTAGRAM_ACCOUNT_ID` (sender), `INSTAGRAM_APP_SECRET` (verifying webhook signatures), `VERIFY_TOKEN` (webhook handshake), `PORT`. `APP_ID` isn't read by the app but is needed for the setup API calls in §5 and the token exchange in §7.

> On hosts like Render, set these as environment variables in the dashboard (and **don't** set `PORT` — the host injects it; the code falls back to 3000 locally). After changing any env var, **redeploy/restart** so the running process picks it up.

---

## 3. Install and run

```bash
npm install
npm start          # or: npm run dev  (auto-restart on change)
```

Server starts on `http://localhost:3000`. For local testing, expose it:

```bash
ngrok http 3000
```

Copy the `https://…ngrok-free.app` URL (or your deployed host URL) — that's your **public URL** for the next steps.

---

## 4. Register the webhook callback (dashboard)

1. App Dashboard → **Instagram → Webhooks** → **Configure**
2. **Callback URL**: `https://YOUR_PUBLIC_URL/webhook` (the bot also answers on `/`, so a bare `https://YOUR_PUBLIC_URL/` works too)
3. **Verify token**: the same string you set as `VERIFY_TOKEN`
4. **Verify and Save** — the bot must be running so it can answer Meta's verification GET.

This registers + verifies the callback URL. It does **not**, by itself, reliably subscribe the message fields — do §5.

---

## 5. Subscribe to the webhook fields (via API — required)

The dashboard toggle is not enough on its own; subscribe both layers explicitly with the Graph API. Run these once (replace the placeholders).

**App-level** — subscribe the app to the `instagram` object's message fields and bind the callback. The access token here is the app token `APP_ID|APP_SECRET`:

```bash
curl -X POST "https://graph.facebook.com/v25.0/<APP_ID>/subscriptions" \
  --data-urlencode "object=instagram" \
  --data-urlencode "callback_url=https://YOUR_PUBLIC_URL/webhook" \
  --data-urlencode "fields=messages,messaging_postbacks" \
  --data-urlencode "verify_token=<VERIFY_TOKEN>" \
  --data-urlencode "access_token=<APP_ID>|<APP_SECRET>"
# → {"success":true}
```

**Account-level** — subscribe your Instagram account to the app (uses the user access token):

```bash
curl -X POST "https://graph.instagram.com/v25.0/me/subscribed_apps" \
  -d "subscribed_fields=messages,messaging_postbacks" \
  -d "access_token=<INSTAGRAM_ACCESS_TOKEN>"
# → {"success":true}
```

**Verify both** (the app-level call should now list a `fields` array, and the account-level should list `subscribed_fields`):

```bash
curl "https://graph.facebook.com/v25.0/<APP_ID>/subscriptions?access_token=<APP_ID>|<APP_SECRET>"
curl "https://graph.instagram.com/v25.0/me/subscribed_apps?access_token=<INSTAGRAM_ACCESS_TOKEN>"
```

If the app-level subscription shows a `callback_url` but **no `fields`**, message webhooks will silently never fire — re-run the app-level POST above.

> The bot uses `messages` (incoming DMs **and** quick-reply taps, including the "Done" button) and `messaging_postbacks` (template/postback buttons). Both are subscribed above. `comments` is **not** used.

---

## 6. Switch the app to Live

In **Development** mode Meta does not reliably deliver real message webhooks and the messaging API returns empty results. Flip the app to **Live** using the toggle at the top of the dashboard (next to the app name).

> Going **Live ≠ App Review.** The Live toggle is instant and free. App Review is a separate process you only need later for *Advanced Access* (serving the general public). In Live mode with Standard Access, your connected account and any **Testers** work immediately.

---

## 7. Make the access token long-lived

Short-lived tokens expire after 1 hour. Exchange once for a ~60-day token:

```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret=<APP_SECRET>
  &access_token=<SHORT_LIVED_TOKEN>
```

Put the returned `access_token` into `.env` (and your host env). Refresh it before it expires (resets the 60-day window):

```
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token=<LONG_LIVED_TOKEN>
```

> There's no auto-refresh in the code — set a reminder, or the bot silently stops sending DMs when the token lapses.

---

## 8. Configure keywords

Edit `campaigns.json` — one account-wide list of keywords (no post IDs, since the trigger is a DM):

```json
{
  "keywords": [
    {
      "word": "GIFT",
      "greet_message": "To get your gift, follow my profile first! Once you're following, tap the Done button below.",
      "success_message": "Welcome! Here's your gift:",
      "gift_url": "https://drive.google.com/your-file"
    },
    {
      "word": "BONUS",
      "greet_message": "Follow me and tap Done to unlock your bonus!",
      "success_message": "Here's your exclusive bonus:",
      "gift_url": "https://notion.so/your-page"
    }
  ]
}
```

A keyword matches if it appears **anywhere** in the DM (case-insensitive). `campaigns.json` is re-read on every webhook — no restart needed when you edit keywords. If two keywords could both match a message, the **first** one in the list wins, so list longer/more-specific words first.

---

## Bot behaviour

| Situation | What happens |
|---|---|
| User DMs a message containing a keyword (case-insensitive, matched anywhere) | Bot replies with `greet_message` + a **Done** button |
| User taps **Done** and is confirmed following | Bot sends `success_message` + a **Get Gift** button linking to `gift_url` |
| User taps **Done** and is NOT following (or follow status unverifiable) | Bot re-sends `greet_message` with the **Done** button |
| User DMs with no matching keyword | Ignored |
| The bot's own outgoing DMs (echoed back by Instagram) | Ignored |

> The **Done** button is sent as a quick reply and renders in the **native Instagram mobile app** (it may not appear in the desktop/web inbox).

---

## Troubleshooting

**"Test button works, but real DMs never reach my server."**
One of the four layers is off. Check, in order: app is **Live** (§6); the **app-level** subscription lists a `fields` array (§5 — re-run the POST if it only shows `callback_url`); the **account-level** `subscribed_apps` lists the fields (§5); the token has `instagram_business_manage_messages` (§1c).

**"Webhook arrives but the log says `Rejected — invalid signature`."**
`INSTAGRAM_APP_SECRET` doesn't match the app that **signed** the webhook. Use the App Secret from **Settings → Basic of the exact app** whose subscription is firing. The failure log prints `secretLen` and `rawBodyLen` to help: `secretLen` ≠ 32 means a stray space/newline in the env value; lengths fine but signatures differ means you're using a **different app's** secret (common if you have two apps). After fixing, redeploy.

**"The messaging API returns empty / no message webhooks, even though everything looks subscribed."**
Usually the app is still in **Development** mode (§6), or the token predates message consent — regenerate it with `instagram_business_manage_messages` (§1c–1d).

**"A stranger's first DM does nothing, but follow-up messages work."**
First-contact DMs from someone you don't follow land in Instagram's **Message Requests** folder, which does **not** fire webhooks until you accept the request. People who already follow you (the common case for a keyword funnel) hit the primary inbox and trigger the bot immediately.

---

## Logs

Every incoming webhook and outgoing Instagram API call is printed to stdout with a timestamp:

```
[2026-06-28 21:48:02.301] WEBHOOK IN
{ "method": "POST", "url": "/", "body": { ... } }

[2026-06-28 21:48:02.450] API → POST https://graph.instagram.com/v25.0/<id>/messages
{ "headers": { "Authorization": "Bearer ***" }, "body": { ... } }

[2026-06-28 21:48:02.901] API ← 200 POST https://graph.instagram.com/v25.0/<id>/messages
{ "body": { "recipient_id": "...", "message_id": "..." } }
```

---

## Going public

For testing, add accounts as **Testers** (App Dashboard → Roles → Testers); they work in Live mode without App Review. To serve the general public you'll need **Advanced Access** for `instagram_business_manage_messages` via App Review.
