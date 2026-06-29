# Instagram Keyword DM Bot

Listens for keyword **DMs** to your Instagram account and automatically runs a DM flow: a follow-prompt with a **Done** button, a follower verification, then a gift link.

A user just sends you a direct message containing the keyword (e.g. "GIFT") and the bot takes over. Multiple keywords are supported via a single account-wide list. All config lives in `campaigns.json` and hot-reloads without a restart.

---

## Is it ready to run?

The code is complete. Before you can start the bot you need three things:

1. A Meta Developer App with the right Instagram permissions
2. Credentials in `.env`
3. A publicly reachable URL for the webhook (ngrok works for local testing)

Steps 1–3 are covered below.

---

## 1. Meta Developer App setup

### 1a. Create the app

https://www.youtube.com/watch?v=SAcXIpE3G_o

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
2. Choose **Business** as the app type
3. Fill in a name and contact email, click **Create App**

### 1b. Add the Instagram product

Inside your new app:

1. Dashboard → **Add Product** → find **Instagram** → click **Set up**
2. Under Instagram → **API Setup with Instagram Login** (the current v25.0 flow)

### 1c. Connect your Instagram Business/Creator account

1. Instagram → **API Setup** → **Generate access tokens** → add your Instagram account
2. Click **Generate** next to your account — copy the token that appears
   - This is a **short-lived token** (1 hour). See section 4 to make it long-lived.

### 1d. Note your credentials

| Value | Where to find it |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | Token you just generated (exchange it for long-lived, see §4) |
| `INSTAGRAM_APP_SECRET` | App Dashboard → **Settings → Basic → App Secret** |
| `INSTAGRAM_ACCOUNT_ID` | Instagram → API Setup → your account row shows the numeric ID |
| `VERIFY_TOKEN` | Any string you invent — you'll paste it again during webhook setup |

---

## 2. Fill in `.env`

```
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here
INSTAGRAM_APP_SECRET=your_app_secret_here
INSTAGRAM_ACCOUNT_ID=your_numeric_ig_account_id
VERIFY_TOKEN=pick_any_string_you_want
PORT=3000
```

---

## 3. Install and run

```bash
npm install
npm start
```

The server starts on `http://localhost:3000`.

For local development, expose it with [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Copy the `https://…ngrok-free.app` URL — you'll need it in the next step.

---

## 4. Register the webhook in Meta Developer Console

1. App Dashboard → **Instagram → Webhooks**
2. Click **Configure** (or **Edit**)
3. **Callback URL**: `https://your-ngrok-url/webhook`
4. **Verify token**: the same string you put in `.env` as `VERIFY_TOKEN`
5. Click **Verify and Save** — the bot must be running for this to succeed
6. After saving, subscribe to this field:
   - `messages`

   (The bot no longer uses `comments` — leave it unsubscribed.)

---

## 5. Make the access token long-lived

Short-lived tokens expire after 1 hour. Exchange it once to get a 60-day token:

```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET
  &access_token=YOUR_SHORT_LIVED_TOKEN
```

You can run this in a browser or with curl. Put the returned `access_token` into `.env`.

To refresh before it expires (60-day window resets):

```
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token=YOUR_LONG_LIVED_TOKEN
```

---

## 6. Configure campaigns

Edit `campaigns.json`. It holds one account-wide list of keywords — no post IDs, since the trigger is a DM rather than a comment on a specific reel:

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

A keyword matches if it appears **anywhere** in the DM (case-insensitive) — so "hey can I get GIFT" matches the `GIFT` keyword.

`campaigns.json` is re-read on every incoming webhook — no restart needed when you add or change keywords.

---

## Bot behaviour

| Situation | What happens |
|---|---|
| User DMs a message containing the keyword (case-insensitive, matched anywhere in the text) | Bot replies with the `greet_message` and a **Done** button |
| User taps **Done** and is confirmed following | Bot sends `success_message` + **Get Gift** button linking to `gift_url` |
| User taps **Done** and is NOT following (or follow status unverifiable) | Bot resends the `greet_message` with the **Done** button again |
| User DMs a message with no matching keyword | Ignored |
| The bot's own outgoing DMs (echoed back by Instagram) | Ignored |

---

## Logs

Every incoming webhook and every outgoing Instagram API call is printed to stdout with a timestamp. Example:

```
[2026-05-28 10:14:22.301] WEBHOOK IN
{ "method": "POST", "url": "/webhook", "body": { ... } }

[2026-05-28 10:14:22.450] API → POST https://graph.instagram.com/v25.0/123/messages
{ "headers": { "Authorization": "Bearer ***" }, "body": { ... } }

[2026-05-28 10:14:22.901] API ← 200 POST https://graph.instagram.com/v25.0/123/messages
{ "body": { "recipient_id": "...", "message_id": "..." } }
```

---

## Permissions note

For testing, add your Instagram account as a **Tester** in App Dashboard → Roles → Testers. The bot will work without Meta's App Review in that mode.

For a public launch (real users, not just testers), you'll need to submit `instagram_manage_messages` for App Review in the Meta Developer Console.
