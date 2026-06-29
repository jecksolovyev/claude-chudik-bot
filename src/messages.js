'use strict';

// Plain text message.
function buildTextPayload(text) {
  return { text };
}

// Generic template card with a persistent, in-bubble "Done" postback button.
// Tapping it sends a messaging_postbacks webhook carrying DONE:{keyword},
// which handleMessaging picks up to run the follow check.
function buildDoneButtonPayload(keyword) {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: "Tap Done once you're following 👇",
            buttons: [
              {
                type: 'postback',
                title: 'Done',
                payload: `DONE:${keyword}`,
              },
            ],
          },
        ],
      },
    },
  };
}

// Generic template card with a URL button to open the gift link.
function buildGiftButtonPayload(giftUrl) {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: 'Your Gift',
            buttons: [
              {
                type: 'web_url',
                title: 'Get Gift',
                url: giftUrl,
              },
            ],
          },
        ],
      },
    },
  };
}

module.exports = { buildTextPayload, buildDoneButtonPayload, buildGiftButtonPayload };
