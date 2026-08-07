const { TELEGRAM_BOT_TOKEN } = require('../config/env');

const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function callTelegramApi(method, payload) {
  const res = await fetch(`${BASE_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!data.ok) {
    console.error(`Telegram API помилка [${method}]:`, JSON.stringify(data));
  }

  return data;
}

module.exports = {
  sendMessage: (chatId, text, replyMarkup) =>
    callTelegramApi('sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
      parse_mode: 'HTML',
    }),

  editMessageReplyMarkup: (chatId, messageId, replyMarkup) =>
    callTelegramApi('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    }),

  answerCallbackQuery: (callbackQueryId, text, showAlert = false) =>
    callTelegramApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
};
