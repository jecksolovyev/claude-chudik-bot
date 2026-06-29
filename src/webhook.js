'use strict';

const crypto = require('crypto');
const { handleIncomingMessage } = require('./handlers/message');
const { handleMessaging } = require('./handlers/messaging');
const { logWebhookIn } = require('./logger');

function verifySignature(req) {
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appSecret) return true; // skip verification if secret not configured

  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function processWebhook(body) {
  if (body.object !== 'instagram') return;

  for (const entry of body.entry ?? []) {
    // Messaging events — DMs, quick replies, and postback buttons
    for (const messaging of entry.messaging ?? []) {
      if (messaging.postback || messaging.message?.quick_reply) {
        // "Done" button tap → follow check
        await handleMessaging(messaging).catch(e =>
          console.error('[webhook] messaging handler error:', e),
        );
      } else if (messaging.message && !messaging.message.is_echo) {
        // Incoming text DM → keyword trigger
        await handleIncomingMessage(messaging).catch(e =>
          console.error('[webhook] message handler error:', e),
        );
      }
    }
  }
}

function setupWebhook(app) {
  // Log every incoming request before routing so nothing arrives silently
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString().replace('T', ' ').slice(0, 23)}] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Meta sends a GET to verify the webhook URL during setup.
  // Handles both /webhook and / in case the callback URL was registered without the path.
  function handleVerification(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('[webhook] Verified by Meta');
      return res.status(200).send(challenge);
    }

    logWebhookIn(req);
    console.warn(`[webhook] GET 403 — mode="${mode}" token_received="${token}" token_expected="${process.env.VERIFY_TOKEN}"`);
    res.sendStatus(403);
  }

  app.get('/', handleVerification);
  app.get('/webhook', handleVerification);

  // Incoming events — handle both / and /webhook
  function handleEvent(req, res) {
    logWebhookIn(req);
    // Must respond 200 quickly so Meta doesn't retry
    res.sendStatus(200);

    if (!verifySignature(req)) {
      console.warn('[webhook] Rejected — invalid signature');
      return;
    }

    processWebhook(req.body).catch(e => console.error('[webhook] processWebhook error:', e));
  }

  app.post('/', handleEvent);
  app.post('/webhook', handleEvent);
}

module.exports = { setupWebhook };
