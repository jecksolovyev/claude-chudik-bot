'use strict';

const fs = require('fs');
const path = require('path');

const CAMPAIGNS_PATH = path.join(__dirname, '../../campaigns.json');

function loadCampaigns() {
  const raw = fs.readFileSync(CAMPAIGNS_PATH, 'utf8');
  return JSON.parse(raw).campaigns;
}

// Find a matching active campaign + keyword for an incoming comment.
// Comment text must match the keyword exactly (case-insensitive, trimmed).
function findKeywordMatch(postId, commentText) {
  const campaigns = loadCampaigns();
  const campaign = campaigns.find(c => c.active && c.post_id === postId);
  if (!campaign) return null;

  const normalized = commentText.trim().toLowerCase();
  const keywordConfig = campaign.keywords.find(k => k.word.toLowerCase() === normalized);
  if (!keywordConfig) return null;

  return { campaign, keywordConfig };
}

// Look up campaign + keyword by exact IDs (used by the postback handler).
function findByPostAndKeyword(postId, keyword) {
  const campaigns = loadCampaigns();
  const campaign = campaigns.find(c => c.post_id === postId);
  if (!campaign) return null;

  const keywordConfig = campaign.keywords.find(k => k.word.toLowerCase() === keyword.toLowerCase());
  if (!keywordConfig) return null;

  return { campaign, keywordConfig };
}

module.exports = { findKeywordMatch, findByPostAndKeyword };
