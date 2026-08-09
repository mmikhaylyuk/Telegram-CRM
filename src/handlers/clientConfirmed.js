const telegramApi = require('../telegram/api');
const { statusKeyboard } = require('../telegram/keyboards');
const { getApplicationByMessage, updateApplicationStatus } = require('../db/applications');
const { findOrCreateClient } = require('../db/clients');
const { createBooking, updateBookingGoogleEventId } = require('../db/bookings');
const { parseDatesRange, parseDogInfo } = require('../telegram/parseApplication');
const { createCalendarEvent } = require('../calendar/googleCalendar');

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

  const booking = await createBooking({
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

  // Google Calendar — не критична дія. Якщо впаде, CRM і кнопка вже відпрацювали.
  try {
    const range = parseDatesRange(application.dates);

    if (!range) {
      console.error('Google Calendar: не вдалося розпізнати дати', application.id, application.dates);
      return;
    }

    const { dogName, breed } = parseDogInfo(application.dog_info);

    const summary = `🐶 ${dogName || application.dog_info || 'Собака'}${breed ? ' ' + breed : ''} — ${application.name || 'Клієнт'}`;
    const description =
      `👤 Клієнт: ${application.name || '—'}\n` +
      `📞 Телефон: ${application.phone || '—'}\n` +
      `🐶 Собака: ${dogName || '—'}\n` +
      `🐕 Порода: ${breed || '—'}\n` +
      `📅 Бронювання: ${application.dates || '—'}\n` +
      (application.comment ? `💬 Коментар: ${application.comment}` : '');

    const event = await createCalendarEvent({
      summary,
      description,
      startDate: range.startDate,
      endDate: range.endDate,
    });

    if (event && event.id) {
      await updateBookingGoogleEventId(booking.id, event.id);
    }
  } catch (err) {
    console.error('Google Calendar: помилка створення події', err);
  }
}

module.exports = { handleClientConfirmed };
