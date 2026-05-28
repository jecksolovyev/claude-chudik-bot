'use strict';

const axios = require('axios');
const { logApiRequest, logApiResponse, logApiError } = require('../logger');

const BASE = 'https://graph.instagram.com/v25.0';

// Axios instance with request/response logging interceptors.
const api = axios.create();

api.interceptors.request.use(config => {
  logApiRequest(config.method, config.url, config.headers, config.data ?? config.params);
  return config;
});

api.interceptors.response.use(
  res => {
    logApiResponse(res.config.method, res.config.url, res.status, res.data);
    return res;
  },
  err => {
    logApiError(err.config?.method ?? '?', err.config?.url ?? '?', err);
    throw err;
  },
);

function token() {
  return process.env.INSTAGRAM_ACCESS_TOKEN;
}

function accountId() {
  return process.env.INSTAGRAM_ACCOUNT_ID;
}

// Send a DM to an Instagram user (identified by their IGSID).
// messagePayload is the `message` object: { text } or { attachment: {...} } or { text, quick_replies }
async function sendMessage(recipientId, messagePayload) {
  const res = await api.post(
    `${BASE}/${accountId()}/messages`,
    { recipient: { id: recipientId }, message: messagePayload },
    { headers: { Authorization: `Bearer ${token()}` } },
  );
  return res.data;
}

// Post a public reply to a comment (used for private profile fallback).
async function replyToComment(commentId, text) {
  const res = await api.post(
    `${BASE}/${commentId}/replies`,
    { message: text },
    { params: { access_token: token() } },
  );
  return res.data;
}

// Check whether the user follows our business account.
// Returns true/false, or null if the field is unavailable for this account type.
async function checkIsFollowing(userIgsid) {
  try {
    const res = await api.get(`${BASE}/${userIgsid}`, {
      params: { fields: 'is_user_follow_business', access_token: token() },
    });
    const val = res.data.is_user_follow_business;
    if (typeof val === 'boolean') return val;
    console.warn('[instagram] is_user_follow_business field missing in response');
    return null;
  } catch (err) {
    // Error already logged by the interceptor
    return null;
  }
}

module.exports = { sendMessage, replyToComment, checkIsFollowing };
