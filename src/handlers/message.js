'use strict';

const { findKeywordMatch } = require('../services/campaigns');
const { sendMessage } = require('../services/instagram');
const { buildFollowPromptPayload } = require('../messages');

// Handles an incoming text DM — the keyword trigger.
async function handleIncomingMessage(messaging) {
  const userId = messaging.sender?.id;
  const text = messaging.message?.text;

  // Skip messages the bot itself sent (echoed back by Instagram)
  if (messaging.message?.is_echo) return;

  // Skip quick replies / buttons — those are handled by handleMessaging
  if (messaging.message?.quick_reply || messaging.postback) return;

  // Skip messages from our own account and anything without text
  if (!userId || userId === process.env.INSTAGRAM_ACCOUNT_ID) return;
  if (!text) return;

  const match = findKeywordMatch(text);
  if (!match) return;

  const { keywordConfig } = match;
  console.log(`[message] Keyword "${keywordConfig.word}" matched in DM from user ${userId}`);

  await sendMessage(userId, buildFollowPromptPayload(keywordConfig.word, keywordConfig.greet_message));
  console.log(`[message] Follow prompt DM sent to ${userId}`);
}

module.exports = { handleIncomingMessage };
