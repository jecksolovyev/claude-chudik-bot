'use strict';

const { findKeywordMatch } = require('../services/campaigns');
const { sendMessage, replyToComment } = require('../services/instagram');
const { buildFollowPromptPayload } = require('../messages');

const PRIVATE_PROFILE_REPLY =
  'Your profile is private, so I am unable to DM you your gift. ' +
  'Please open your profile and comment the keyword again.';

async function handleComment(value) {
  const commentId = value.id;
  const userId = value.from?.id;
  const text = value.text;
  const postId = value.media?.id;

  // Skip replies to other comments
  if (value.parent_id) return;

  // Skip comments from our own account
  if (!userId || userId === process.env.INSTAGRAM_ACCOUNT_ID) return;

  if (!text || !postId) return;

  const match = findKeywordMatch(postId, text);
  if (!match) return;

  const { keywordConfig } = match;
  console.log(`[comment] Keyword "${keywordConfig.word}" matched for user ${userId} on post ${postId}`);

  try {
    await sendMessage(userId, buildFollowPromptPayload(postId, keywordConfig.word, keywordConfig.greet_message));
    console.log(`[comment] Follow prompt DM sent to ${userId}`);
  } catch (err) {
    console.log(`[comment] DM failed (likely private profile): ${err.response?.data?.error?.message ?? err.message}`);
    try {
      await replyToComment(commentId, PRIVATE_PROFILE_REPLY);
      console.log(`[comment] Public reply sent to comment ${commentId}`);
    } catch (replyErr) {
      console.error(`[comment] Comment reply also failed: ${replyErr.response?.data?.error?.message ?? replyErr.message}`);
    }
  }
}

module.exports = { handleComment };
