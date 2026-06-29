'use strict';

const fs = require('fs');
const path = require('path');

const CAMPAIGNS_PATH = path.join(__dirname, '../../campaigns.json');

function loadKeywords() {
  const raw = fs.readFileSync(CAMPAIGNS_PATH, 'utf8');
  return JSON.parse(raw).keywords ?? [];
}

// Find a matching keyword for an incoming DM.
// The keyword matches if it appears anywhere in the message (case-insensitive).
function findKeywordMatch(messageText) {
  const keywords = loadKeywords();
  const normalized = messageText.toLowerCase();
  const keywordConfig = keywords.find(k => normalized.includes(k.word.toLowerCase()));
  if (!keywordConfig) return null;

  return { keywordConfig };
}

// Look up a keyword by exact word (used by the postback/quick-reply handler).
function findByKeyword(keyword) {
  const keywords = loadKeywords();
  const keywordConfig = keywords.find(k => k.word.toLowerCase() === keyword.toLowerCase());
  if (!keywordConfig) return null;

  return { keywordConfig };
}

module.exports = { findKeywordMatch, findByKeyword };
