const telegramApi = require('../telegram/api');
const { handleActivateCrm } = require('./activateCrm');
const { handleClientConfirmed } = require('./clientConfirmed');
const { handleClientDeclined } = require('./clientDeclined');
const { handleClientLookup } = require('./clientLookup');
const { handleEditCommand, handleEditTextInput, handleEditCallback } = require('./editClient');

async function routeUpdate(update) {
  console.log('ВХІДНИЙ UPDATE:', JSON.stringify(update));

  if (update.message && update.message.text) {
    // Спочатку перевіряємо, чи це не введення значення для активного
    // редагування — інакше такий текст може випадково збігтися з
    // майбутньою командою.
    const consumed = await handleEditTextInput(update.message);
    if (consumed) return;

    const text = update.message.text.trim().toLowerCase();

    if (text === '/crm' && update.message.reply_to_message) {
      await handleActivateCrm(update.message);
      return;
    }

    if (text.startsWith('/клієнт') || text.startsWith('/client')) {
      await handleClientLookup(update.message.chat.id, update.message.text);
      return;
    }

    if (text.startsWith('/редагувати') || text.startsWith('/edit')) {
      await handleEditCommand(update.message);
      return;
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

    if (
      data.startsWith('edt:') ||
      data.startsWith('eb:') ||
      data.startsWith('ef:') ||
      data.startsWith('ec:')
    ) {
      await handleEditCallback(update.callback_query);
      return;
    }
  }
}

module.exports = { routeUpdate };
