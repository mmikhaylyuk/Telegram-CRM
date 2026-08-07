const telegramApi = require('../telegram/api');
const { statusKeyboard } = require('../telegram/keyboards');
const { getApplicationByMessage, updateApplicationStatus } = require('../db/applications');
const { findOrCreateClient } = require('../db/clients');
const { createBooking } = require('../db/bookings');

async function handleClientConfirmed(callbackQuery) {
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

  const client = await findOrCreateClient({
    phone: application.phone,
    name: application.name,
  });

  await createBooking({
    clientId: client.id,
    applicationId: application.id,
    dates: application.dates,
  });

  await updateApplicationStatus(application.id, 'confirmed', { client_id: client.id });

  await telegramApi.editMessageReplyMarkup(
    message.chat.id,
    message.message_id,
    statusKeyboard('🟢 Погоджено')
  );

  await telegramApi.answerCallbackQuery(callbackQueryId, 'Клієнта підтверджено, бронювання створено ✅');
}

module.exports = { handleClientConfirmed };
