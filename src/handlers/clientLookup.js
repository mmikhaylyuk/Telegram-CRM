const { getClientWithHistory } = require('../db/clients');
const { sendMessage } = require('../telegram/api');

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('uk-UA') : '—';
}

function esc(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatClientCard({ client, applications, bookings }) {
  let text = `👤 <b>${esc(client.name) || 'Без імені'}</b>\n`;
  text += `📞 ${esc(client.phone)}\n`;
  text += `📅 Клієнт з: ${fmtDate(client.created_at)}\n`;

  // Підтверджені бронювання
  text += `\n📋 <b>Підтверджені бронювання (${bookings.length}):</b>`;
  if (bookings.length === 0) {
    text += '\n<i>немає</i>';
  } else {
    bookings.forEach((b, i) => {
      text += `\n${i + 1}. 📅 ${esc(b.dates) || 'дати не вказано'} — статус: ${esc(b.status)}`;
      text += `\n   <i>створено: ${fmtDate(b.created_at)}</i>`;
    });
  }

  // Всі заявки (історія, включно з відхиленими)
  text += `\n\n📨 <b>Усі заявки (${applications.length}):</b>`;
  if (applications.length === 0) {
    text += '\n<i>немає</i>';
  } else {
    applications.forEach((a, i) => {
      text += `\n\n${i + 1}. Статус: <b>${esc(a.status)}</b> (${fmtDate(a.created_at)})`;
      if (a.dates) text += `\n   📅 Дати: ${esc(a.dates)}`;
      if (a.dog_info) text += `\n   🐶 Собака: ${esc(a.dog_info)}`;
      if (a.size) text += `\n   📏 Розмір: ${esc(a.size)}`;
      if (a.comment) text += `\n   💬 Коментар: ${esc(a.comment)}`;
    });
  }

  return text;
}

async function handleClientLookup(chatId, messageText) {
  const match = messageText.match(/^\/клієнт\s+(.+)/i) || messageText.match(/^\/client\s+(.+)/i);
  if (!match) return false;

  const phoneArg = match[1].trim();

  try {
    const result = await getClientWithHistory(phoneArg);

    if (result && result.invalidFormat) {
      await sendMessage(chatId, '⚠️ Не вдалося розпізнати номер телефону. Спробуй у форматі +380XXXXXXXXX.');
      return true;
    }

    if (!result) {
      await sendMessage(chatId, '❌ Клієнта з таким номером телефону не знайдено.');
      return true;
    }

    await sendMessage(chatId, formatClientCard(result));
  } catch (err) {
    console.error('Client lookup error:', err);
    await sendMessage(chatId, '⚠️ Помилка при пошуку клієнта. Спробуй ще раз.');
  }

  return true;
}

module.exports = { handleClientLookup };
