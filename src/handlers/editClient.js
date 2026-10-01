const telegramApi = require('../telegram/api');
const {
  editMenuKeyboard,
  bookingSelectKeyboard,
  fieldPromptKeyboard,
  confirmKeyboard,
  statusKeyboard,
} = require('../telegram/keyboards');
const { getSession, startSession, updateSession, clearSession } = require('../db/editSessions');
const {
  findClientByPhoneCore,
  getCorePhone,
  updateClientName,
  updateClientPhone,
} = require('../db/clients');
const { getBookingsByClient, updateBookingFields, getBookingById, deleteBooking } = require('../db/bookings');
const { updateCalendarEvent, deleteCalendarEvent } = require('../calendar/googleCalendar');
const { updateApplicationStatus, getApplicationById } = require('../db/applications');

const FIELD_LABELS = {
  name: "ім'я клієнта",
  phone: 'телефон',
  dogname: 'кличку собаки',
  breed: 'породу',
  size: 'розмір',
  datestart: 'дату заїзду',
  dateend: 'дату виїзду',
  comment: 'коментар',
};

function esc(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- Валідація ----------

function isValidDatePart(str) {
  const m = String(str).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return false;
  const [, d, mo, y] = m.map(Number);
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

function toDateObj(str) {
  const [d, mo, y] = str.split('.').map(Number);
  return new Date(y, mo - 1, d);
}

// Розбирає поточний booking.dates ("16.10.2026–01.11.2026") на частини DD.MM.YYYY.
function splitDatesText(datesText) {
  if (!datesText) return { start: null, end: null };
  const dashClass = '[-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212]';
  const m = String(datesText)
    .trim()
    .match(new RegExp(`(\\d{2}\\.\\d{2}\\.\\d{4})\\s*${dashClass}\\s*(\\d{2}\\.\\d{2}\\.\\d{4})`));
  if (m) return { start: m[1], end: m[2] };
  const single = String(datesText).trim().match(/(\d{2}\.\d{2}\.\d{4})/);
  if (single) return { start: single[1], end: single[1] };
  return { start: null, end: null };
}

function validateField(field, value) {
  const v = String(value).trim();
  if (!v) return { ok: false, error: '❌ Значення не може бути порожнім.' };

  if (field === 'phone') {
    if (getCorePhone(v).length !== 9) {
      return { ok: false, error: '❌ Неправильний номер телефону.' };
    }
  }

  if (field === 'datestart' || field === 'dateend') {
    if (!isValidDatePart(v)) {
      return { ok: false, error: '❌ Некоректна дата. Формат: ДД.ММ.РРРР' };
    }
  }

  if (v.length > 200) {
    return { ok: false, error: '❌ Значення занадто довге.' };
  }

  return { ok: true, value: v };
}

// ---------- Рендер картки ----------

function renderCard(client, booking) {
  let text = `👤 Клієнт: ${esc(client.name) || 'не вказано'}\n`;
  text += `📞 Телефон: ${esc(client.phone)}\n`;

  if (booking) {
    const { start, end } = splitDatesText(booking.dates);
    text += `🐶 Собака: ${esc(booking.dog_name) || 'не вказано'}\n`;
    text += `🐕 Порода: ${esc(booking.dog_breed) || 'не вказана'}\n`;
    text += `📏 Розмір: ${esc(booking.size) || 'не вказано'}\n`;
    text += `📅 Бронювання: ${esc(start) || '—'} → ${esc(end) || '—'}\n`;
    text += `💬 Коментар: ${esc(booking.comment) || 'немає'}\n`;
  } else {
    text += `\n<i>У клієнта немає бронювань — доступне лише редагування контактних даних.</i>\n`;
  }

  return text;
}

async function showMenu(chatId, client, booking) {
  await telegramApi.sendMessage(chatId, renderCard(client, booking), editMenuKeyboard(!!booking));
}

// ---------- Точка входу: команда /редагувати ----------

async function handleEditCommand(message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const match = text.match(/^\/редагувати\s+(.+)/i) || text.match(/^\/edit\s+(.+)/i);
  if (!match) return;

  await openEditForPhone(chatId, match[1].trim());
}

// Спільна точка входу — використовується і командою, і кнопкою "✏️ Редагувати клієнта".
async function openEditForPhone(chatId, rawPhone) {
  const core = getCorePhone(rawPhone);
  if (core.length !== 9) {
    await telegramApi.sendMessage(chatId, '❌ Неправильний номер телефону.');
    return;
  }

  const client = await findClientByPhoneCore(core);
  if (!client) {
    await telegramApi.sendMessage(chatId, '❌ Клієнта з таким номером не знайдено.');
    return;
  }

  const bookings = await getBookingsByClient(client.id);
  const session = await startSession(chatId, client.id);

  if (bookings.length === 0) {
    await showMenu(chatId, client, null);
    return;
  }

  if (bookings.length === 1) {
    await updateSession(chatId, { booking_id: bookings[0].id, step: 'menu' });
    await showMenu(chatId, client, bookings[0]);
    return;
  }

  await updateSession(chatId, { step: 'choose_booking' });
  let text = '📅 У клієнта декілька бронювань. Оберіть, яке редагувати:\n';
  bookings.forEach((b, i) => {
    text += `\n${i + 1}️⃣ ${esc(b.dates) || 'дати не вказано'}`;
  });
  await telegramApi.sendMessage(chatId, text, bookingSelectKeyboard(bookings));
}

// ---------- Текстовий ввід значення (крок awaiting_value) ----------

// Викликається з router.js ДО перевірки команд — щоб не переплутати з /crm, /client тощо.
// Повертає true, якщо повідомлення було "спожите" як введення значення для редагування.
async function handleEditTextInput(message) {
  const chatId = message.chat.id;
  const text = message.text;

  if (!text || text.startsWith('/')) return false;

  const session = await getSession(chatId);
  if (!session || session.step !== 'awaiting_value') return false;

  const validation = validateField(session.field, text);
  if (!validation.ok) {
    await telegramApi.sendMessage(chatId, validation.error);
    return true;
  }

  await updateSession(chatId, { pending_value: validation.value, step: 'awaiting_confirm' });

  const oldValue = await getCurrentFieldValue(session);
  const label = FIELD_LABELS[session.field] || session.field;

  await telegramApi.sendMessage(
    chatId,
    `Змінити ${label}?\n\nБуло: ${esc(oldValue) || '—'}\nНове: ${esc(validation.value)}`,
    confirmKeyboard()
  );

  return true;
}

async function getCurrentFieldValue(session) {
  const supabase = require('../db/supabaseClient');
  if (session.field === 'name' || session.field === 'phone') {
    const { data } = await supabase.from('clients').select('*').eq('id', session.client_id).single();
    return session.field === 'name' ? data.name : data.phone;
  }

  const booking = await getBookingById(session.booking_id);
  if (session.field === 'dogname') return booking.dog_name;
  if (session.field === 'breed') return booking.dog_breed;
  if (session.field === 'size') return booking.size;
  if (session.field === 'comment') return booking.comment;
  if (session.field === 'datestart') return splitDatesText(booking.dates).start;
  if (session.field === 'dateend') return splitDatesText(booking.dates).end;
  return null;
}

// ---------- Callback-кнопки (edt:, eb:, ef:, ec:) ----------

async function handleEditCallback(callbackQuery) {
  const { data, id: callbackQueryId, message } = callbackQuery;
  const chatId = message.chat.id;

  if (data.startsWith('edt:')) {
    await telegramApi.answerCallbackQuery(callbackQueryId);
    await openEditForPhone(chatId, data.slice(4));
    return;
  }

  if (data.startsWith('eb:')) {
    const bookingId = data.slice(3);
    const session = await getSession(chatId);
    if (!session) {
      await telegramApi.answerCallbackQuery(callbackQueryId, 'Сесію редагування не знайдено. Почніть знову.', true);
      return;
    }
    const supabase = require('../db/supabaseClient');
    const { data: client } = await supabase.from('clients').select('*').eq('id', session.client_id).single();
    const booking = await getBookingById(bookingId);

    await updateSession(chatId, { booking_id: bookingId, step: 'menu' });
    await telegramApi.answerCallbackQuery(callbackQueryId);
    await showMenu(chatId, client, booking);
    return;
  }

  if (data.startsWith('ef:')) {
    const field = data.slice(3);
    const session = await getSession(chatId);
    if (!session) {
      await telegramApi.answerCallbackQuery(callbackQueryId, 'Сесію редагування не знайдено. Почніть знову.', true);
      return;
    }

    if (field === 'cancel') {
      await clearSession(chatId);
      await telegramApi.answerCallbackQuery(callbackQueryId, 'Скасовано.');
      await telegramApi.sendMessage(chatId, '↩️ Редагування скасовано.');
      return;
    }

    if (field === 'done') {
      await clearSession(chatId);
      await telegramApi.answerCallbackQuery(callbackQueryId, 'Завершено.');
      await telegramApi.sendMessage(chatId, '✅ Редагування завершено.');
      return;
    }

    if (field === 'delete') {
      if (!session.booking_id) {
        await telegramApi.answerCallbackQuery(callbackQueryId, 'У клієнта немає бронювання для видалення.', true);
        return;
      }
      const booking = await getBookingById(session.booking_id);
      await updateSession(chatId, { field: 'delete_booking', pending_value: 'confirm', step: 'awaiting_confirm' });
      await telegramApi.answerCallbackQuery(callbackQueryId);
      await telegramApi.sendMessage(
        chatId,
        `Видалити бронювання ${esc(booking.dates) || ''}?\n\n` +
          `Буде видалено:\n• Подію з Google Calendar (якщо була)\n• Запис бронювання\n\n` +
          `Клієнт залишиться в базі. Заявка отримає статус «Відмовився».`,
        confirmKeyboard()
      );
      return;
    }

    const bookingOnlyFields = ['dogname', 'breed', 'size', 'datestart', 'dateend', 'comment'];
    if (bookingOnlyFields.includes(field) && !session.booking_id) {
      await telegramApi.answerCallbackQuery(callbackQueryId, 'У клієнта немає бронювання для редагування.', true);
      return;
    }

    await updateSession(chatId, { field, step: 'awaiting_value' });
    await telegramApi.answerCallbackQuery(callbackQueryId);
    const label = FIELD_LABELS[field] || field;
    await telegramApi.sendMessage(chatId, `Введіть нове значення (${label}):`, fieldPromptKeyboard());
    return;
  }

  if (data === 'ec:save' || data === 'ec:cancel') {
    const session = await getSession(chatId);
    if (!session || session.step !== 'awaiting_confirm') {
      await telegramApi.answerCallbackQuery(callbackQueryId, 'Немає активної зміни для підтвердження.', true);
      return;
    }

    if (data === 'ec:cancel') {
      await updateSession(chatId, { field: null, pending_value: null, step: 'menu' });
      await telegramApi.answerCallbackQuery(callbackQueryId, 'Скасовано.');
      await rerenderMenu(chatId, session);
      return;
    }

    await telegramApi.answerCallbackQuery(callbackQueryId);
    await applyEdit(chatId, session);
  }
}

// ---------- Застосування підтвердженої зміни ----------

async function applyEdit(chatId, session) {
  if (session.field === 'delete_booking') {
    await handleDeleteBooking(chatId, session);
    return;
  }

  const oldValue = await getCurrentFieldValue(session);
  const newValue = session.pending_value;
  const label = FIELD_LABELS[session.field] || session.field;

  try {
    if (session.field === 'phone') {
      const core = getCorePhone(newValue);
      const conflict = await findClientByPhoneCore(core);
      if (conflict && conflict.id !== session.client_id) {
        await telegramApi.sendMessage(chatId, '❌ Клієнт із таким номером уже існує.');
        await updateSession(chatId, { field: null, pending_value: null, step: 'menu' });
        await rerenderMenu(chatId, session);
        return;
      }
      await updateClientPhone(session.client_id, newValue);
    } else if (session.field === 'name') {
      await updateClientName(session.client_id, newValue);
    } else {
      const booking = await getBookingById(session.booking_id);
      const patch = {};
      if (session.field === 'dogname') patch.dog_name = newValue;
      if (session.field === 'breed') patch.dog_breed = newValue;
      if (session.field === 'size') patch.size = newValue;
      if (session.field === 'comment') patch.comment = newValue;

      if (session.field === 'datestart' || session.field === 'dateend') {
        const current = splitDatesText(booking.dates);
        const newStart = session.field === 'datestart' ? newValue : current.start;
        const newEnd = session.field === 'dateend' ? newValue : current.end;

        if (newStart && newEnd && toDateObj(newEnd) < toDateObj(newStart)) {
          await telegramApi.sendMessage(chatId, '❌ Дата виїзду не може бути раніше дати заїзду.');
          await updateSession(chatId, { field: null, pending_value: null, step: 'menu' });
          await rerenderMenu(chatId, session);
          return;
        }
        patch.dates = `${newStart}–${newEnd}`;
      }

      await updateBookingFields(session.booking_id, patch);
    }
  } catch (err) {
    console.error('Помилка застосування редагування:', err);
    await telegramApi.sendMessage(chatId, '⚠️ Не вдалося зберегти зміну. Спробуйте ще раз.');
    await updateSession(chatId, { field: null, pending_value: null, step: 'menu' });
    return;
  }

  let resultText = `✅ ${label[0].toUpperCase() + label.slice(1)} змінено: ${esc(oldValue) || '—'} → ${esc(newValue)}`;

  // Синхронізація з Google Calendar — лише якщо в бронювання вже є подія.
  const calendarFields = ['dogname', 'breed', 'datestart', 'dateend', 'comment'];
  const clientFieldsAffectingCalendar = ['name', 'phone'];

  if (session.booking_id && (calendarFields.includes(session.field) || clientFieldsAffectingCalendar.includes(session.field))) {
    const booking = await getBookingById(session.booking_id);
    if (booking.google_event_id) {
      const supabase = require('../db/supabaseClient');
      const { data: client } = await supabase.from('clients').select('*').eq('id', session.client_id).single();
      const { start, end } = splitDatesText(booking.dates);

      const summary = `🐶 ${booking.dog_name || 'Собака'}${booking.dog_breed ? ' ' + booking.dog_breed : ''} — ${client.name || 'Клієнт'}`;
      const description =
        `👤 Клієнт: ${client.name || '—'}\n` +
        `📞 Телефон: ${client.phone || '—'}\n` +
        `🐶 Собака: ${booking.dog_name || '—'}\n` +
        `🐕 Порода: ${booking.dog_breed || '—'}\n` +
        `📅 Бронювання: ${booking.dates || '—'}\n` +
        (booking.comment ? `💬 Коментар: ${booking.comment}` : '');

      try {
        const toISO = (ddmmyyyy) => {
          if (!ddmmyyyy) return null;
          const [d, m, y] = ddmmyyyy.split('.');
          return `${y}-${m}-${d}`;
        };
        await updateCalendarEvent(booking.google_event_id, {
          summary,
          description,
          startDate: toISO(start),
          endDate: toISO(end),
        });
        resultText += '\n\n📅 Supabase: оновлено\n📅 Google Calendar: оновлено';
      } catch (err) {
        console.error('Google Calendar update error:', err && (err.stack || err.message || err));
        resultText += '\n\n⚠️ Дані в CRM оновлено, але Google Calendar не вдалося оновити.';
      }
    }
  }

  await telegramApi.sendMessage(chatId, resultText);
  await updateSession(chatId, { field: null, pending_value: null, step: 'menu' });
  await rerenderMenu(chatId, session);
}

// ---------- Видалення бронювання ----------

async function handleDeleteBooking(chatId, session) {
  const booking = await getBookingById(session.booking_id);
  let calendarNote = '';

  if (booking.google_event_id) {
    try {
      await deleteCalendarEvent(booking.google_event_id);
      calendarNote = '\n📅 Google Calendar: видалено';
    } catch (err) {
      console.error('Google Calendar delete error:', err && (err.stack || err.message || err));
      calendarNote = '\n⚠️ Подію в Google Calendar не вдалося видалити (видаліть вручну за потреби).';
    }
  } else {
    calendarNote = '\n📅 Google Calendar: подія не була створена';
  }

  await deleteBooking(booking.id);

  if (booking.application_id) {
    try {
      await updateApplicationStatus(booking.application_id, 'declined');
      const application = await getApplicationById(booking.application_id);
      if (application && application.telegram_chat_id && application.telegram_message_id) {
        await telegramApi.editMessageReplyMarkup(
          application.telegram_chat_id,
          application.telegram_message_id,
          statusKeyboard('🔴 Відмовився')
        );
      }
    } catch (err) {
      console.error('Помилка оновлення статусу заявки після видалення бронювання:', err);
    }
  }

  await telegramApi.sendMessage(chatId, `✅ Бронювання видалено.${calendarNote}\n📋 Статус заявки: Відмовився`);

  await updateSession(chatId, { booking_id: null, field: null, pending_value: null, step: 'menu' });
  await rerenderMenu(chatId, { ...session, booking_id: null });
}

async function rerenderMenu(chatId, session) {
  const supabase = require('../db/supabaseClient');
  const { data: client } = await supabase.from('clients').select('*').eq('id', session.client_id).single();
  const booking = session.booking_id ? await getBookingById(session.booking_id) : null;
  await showMenu(chatId, client, booking);
}

module.exports = { handleEditCommand, handleEditTextInput, handleEditCallback, openEditForPhone };

