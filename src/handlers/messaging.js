'use strict';

const { findByKeyword } = require('../services/campaigns');
const { sendMessage, checkIsFollowing } = require('../services/instagram');
const { buildTextPayload, buildDoneButtonPayload, buildGiftButtonPayload } = require('../messages');

// Handles both postback buttons and quick replies — both carry a DONE:keyword payload.
async function handleMessaging(messaging) {
  const userId = messaging.sender?.id;

  let payload;
  if (messaging.postback?.payload) {
    payload = messaging.postback.payload;
  } else if (messaging.message?.quick_reply?.payload) {
    payload = messaging.message.quick_reply.payload;
  } else {
    return;
  }

  if (!payload.startsWith('DONE:')) return;

  // Payload format: DONE:{keyword}
  const keyword = payload.slice('DONE:'.length);
  if (!keyword) return;

  const match = findByKeyword(keyword);
  if (!match) {
    console.warn(`[messaging] No keyword match — keyword=${keyword}`);
    return;
  }

  const { keywordConfig } = match;
  console.log(`[messaging] Done button tapped by ${userId} — checking follow status`);

  const isFollowing = await checkIsFollowing(userId);

  if (isFollowing !== true) {
    const reason = isFollowing === null ? 'follow status unverifiable' : 'not following';
    console.log(`[messaging] ${userId} — ${reason}, resending greet`);
    await sendMessage(userId, buildTextPayload(keywordConfig.greet_message));
    await sendMessage(userId, buildDoneButtonPayload(keyword));
    return;
  }

  console.log(`[messaging] ${userId} confirmed following — sending gift`);
  await sendMessage(userId, buildTextPayload(keywordConfig.success_message));
  await sendMessage(userId, buildGiftButtonPayload(keywordConfig.gift_url));
}

module.exports = { handleMessaging };
