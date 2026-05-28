'use strict';

const { findByPostAndKeyword } = require('../services/campaigns');
const { sendMessage, checkIsFollowing } = require('../services/instagram');
const { buildFollowPromptPayload, buildSuccessTextPayload, buildGiftButtonPayload } = require('../messages');

// Handles both postback buttons and quick replies — both carry a DONE:postId:keyword payload.
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

  // Payload format: DONE:{postId}:{keyword}
  const rest = payload.slice('DONE:'.length);
  const colonIdx = rest.indexOf(':');
  if (colonIdx === -1) return;

  const postId = rest.slice(0, colonIdx);
  const keyword = rest.slice(colonIdx + 1);

  const match = findByPostAndKeyword(postId, keyword);
  if (!match) {
    console.warn(`[messaging] No campaign match — postId=${postId} keyword=${keyword}`);
    return;
  }

  const { keywordConfig } = match;
  console.log(`[messaging] Done button tapped by ${userId} — checking follow status`);

  const isFollowing = await checkIsFollowing(userId);

  if (isFollowing !== true) {
    const reason = isFollowing === null ? 'follow status unverifiable' : 'not following';
    console.log(`[messaging] ${userId} — ${reason}, resending greet`);
    await sendMessage(userId, buildFollowPromptPayload(postId, keyword, keywordConfig.greet_message));
    return;
  }

  console.log(`[messaging] ${userId} confirmed following — sending gift`);
  await sendMessage(userId, buildSuccessTextPayload(keywordConfig.success_message));
  await sendMessage(userId, buildGiftButtonPayload(keywordConfig.gift_url));
}

module.exports = { handleMessaging };
