const telegramApi = require('../telegram/api');
const { statusKeyboard } = require('../telegram/keyboards');
const { getApplicationByMessage, updateApplicationStatus } = require('../db/applications');

async function handleClientDeclined(callbackQuery) {
  const { message, id: callbackQueryId } = callbackQuery;
  const application = await getApplicationByMessage(message.chat.id, message.message_id);

  if (!application) {
    await telegramApi.answerCallbackQuery(callbackQueryId, 'Заявку не знайдено в базі.', true);
    return;
  }

  if (application.status !== 'new') {
    await telegramApi.answerCallbackQuery(callbackQueryId, 'Заявку вже оброблено.', true);
    return;
  }

  // На цьому етапі жодних записів у CRM не створюємо — лише статус заявки.
  await updateApplicationStatus(application.id, 'declined');

  await telegramApi.editMessageReplyMarkup(
    message.chat.id,
    message.message_id,
    statusKeyboard('🔴 Відмовився')
  );

  await telegramApi.answerCallbackQuery(callbackQueryId, 'Статус оновлено ❌');
}

module.exports = { handleClientDeclined };
