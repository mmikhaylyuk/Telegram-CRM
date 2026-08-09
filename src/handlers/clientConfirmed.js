const telegramApi = require('../telegram/api');
const { statusKeyboard } = require('../telegram/keyboards');
const { getApplicationByMessage, updateApplicationStatus } = require('../db/applications');
const { findOrCreateClient } = require('../db/clients');
const { createBooking, updateBookingGoogleEventId, updateBookingCalendarError } = require('../db/bookings');
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

  // ТИМЧАСОВА ІНСТРУМЕНТАЦІЯ: пишемо позначку прогресу на кожному кроці,
  // щоб точно побачити, на якому саме кроці все зупиняється.
  const markProgress = async (step) => {
    try {
      await updateBookingCalendarError(booking.id, `[progress] ${step}`);
    } catch (e) {
      // якщо навіть це падає — booking.id точно валідний? залишаємо мовчки,
      // побачимо по відсутності прогресу в базі.
    }
  };

  await markProgress('1: старт блоку Google Calendar');

  try {
    await markProgress('2: перед parseDatesRange');
    const range = parseDatesRange(application.dates);

    if (!range) {
      await updateBookingCalendarError(booking.id, `Не вдалося розпізнати дати: "${application.dates}"`);
      return;
    }

    await markProgress('3: дати розпізнано, перед createCalendarEvent');

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

    await markProgress('4: createCalendarEvent завершився без throw, event=' + JSON.stringify(event ? event.id : event));

    if (event && event.id) {
      await updateBookingGoogleEventId(booking.id, event.id);
      await updateBookingCalendarError(booking.id, null);
    } else {
      await updateBookingCalendarError(booking.id, '5: подія не створена, event порожній: ' + JSON.stringify(event));
    }
  } catch (err) {
    const errText = (err && (err.stack || err.message)) ? String(err.stack || err.message) : String(err);
    try {
      await updateBookingCalendarError(booking.id, `CATCH: ${errText}`.slice(0, 1900));
    } catch (innerErr) {
      // Останній шанс — пишемо хоч щось мінімальне
      try {
        await updateBookingCalendarError(booking.id, 'CATCH сталася, але запис детальної помилки теж впав');
      } catch (e2) {}
    }
  }
}

module.exports = { handleClientConfirmed };
