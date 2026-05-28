'use strict';

require('dotenv').config();

const express = require('express');
const { setupWebhook } = require('./webhook');

const app = express();

// Parse JSON and capture the raw body buffer needed for HMAC signature verification.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

setupWebhook(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] Instagram bot running on port ${PORT}`);
});
