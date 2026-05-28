'use strict';

// Quick reply with embedded text — sends greet_message and "Done" button as one message.
function buildFollowPromptPayload(postId, keyword, greetMessage) {
  return {
    text: greetMessage,
    quick_replies: [
      {
        content_type: 'text',
        title: 'Done',
        payload: `DONE:${postId}:${keyword}`,
      },
    ],
  };
}

function buildSuccessTextPayload(successMessage) {
  return { text: successMessage };
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

module.exports = { buildFollowPromptPayload, buildSuccessTextPayload, buildGiftButtonPayload };
