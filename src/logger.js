'use strict';

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function maskHeaders(headers) {
  if (!headers) return {};
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = k.toLowerCase() === 'authorization' ? v.replace(/Bearer .+/, 'Bearer ***') : v;
  }
  return out;
}

function print(label, payload) {
  console.log(`\n[${ ts() }] ${ label }`);
  console.log(JSON.stringify(payload, null, 2));
}

function logWebhookIn(req) {
  print('WEBHOOK IN', {
    method: req.method,
    url: req.originalUrl,
    headers: maskHeaders(req.headers),
    query: req.query,
    body: req.body,
  });
}

function logApiRequest(method, url, headers, data) {
  print(`API → ${ method.toUpperCase() } ${ url }`, {
    headers: maskHeaders(headers),
    body: data,
  });
}

function logApiResponse(method, url, status, data) {
  print(`API ← ${ status } ${ method.toUpperCase() } ${ url }`, { body: data });
}

function logApiError(method, url, err) {
  print(`API ✗ ${ method.toUpperCase() } ${ url }`, {
    status: err.response?.status,
    body: err.response?.data,
    message: err.message,
  });
}

module.exports = { logWebhookIn, logApiRequest, logApiResponse, logApiError };
