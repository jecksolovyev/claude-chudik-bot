'use strict';

const crypto = require('crypto');
const { handleComment } = require('./handlers/comment');
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
    // Comment events
    for (const change of entry.changes ?? []) {
      if (change.field === 'comments') {
        await handleComment(change.value).catch(e =>
          console.error('[webhook] comment handler error:', e),
        );
      }
    }

    // Messaging events (quick replies and postback buttons)
    for (const messaging of entry.messaging ?? []) {
      if (messaging.postback || messaging.message?.quick_reply) {
        await handleMessaging(messaging).catch(e =>
          console.error('[webhook] messaging handler error:', e),
        );
      }
    }
  }
}

function setupWebhook(app) {
  // Meta sends a GET to verify the webhook URL during setup
  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('[webhook] Verified by Meta');
      return res.status(200).send(challenge);
    }
    res.sendStatus(403);
  });

  // Incoming events
  app.post('/webhook', (req, res) => {
    logWebhookIn(req);
    // Must respond 200 quickly so Meta doesn't retry
    res.sendStatus(200);

    if (!verifySignature(req)) {
      console.warn('[webhook] Rejected — invalid signature');
      return;
    }

    processWebhook(req.body).catch(e => console.error('[webhook] processWebhook error:', e));
  });
}

module.exports = { setupWebhook };
