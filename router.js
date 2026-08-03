const telegramApi = require('../telegram/api');
const { handleActivateCrm } = require('./activateCrm');
const { handleClientConfirmed } = require('./clientConfirmed');
const { handleClientDeclined } = require('./clientDeclined');

// Єдина точка маршрутизації для всіх типів оновлень Telegram.
// Додавання нової кнопки/команди в майбутньому = додати один case тут
// і один файл у handlers/, без зміни іншої логіки.
async function routeUpdate(update) {
  if (update.message && update.message.text) {
    const text = update.message.text.trim().toLowerCase();

    if (text === '/crm' && update.message.reply_to_message) {
      await handleActivateCrm(update.message);
    }
    return;
  }

  if (update.callback_query) {
    const { data } = update.callback_query;

    if (data === 'confirm') {
      await handleClientConfirmed(update.callback_query);
      return;
    }

    if (data === 'decline') {
      await handleClientDeclined(update.callback_query);
      return;
    }

    if (data === 'noop') {
      await telegramApi.answerCallbackQuery(update.callback_query.id, 'Заявку вже оброблено.');
      return;
    }
  }
}

module.exports = { routeUpdate };
