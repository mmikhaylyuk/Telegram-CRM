const telegramApi = require('../telegram/api');
const { actionKeyboard } = require('../telegram/keyboards');
const { parseApplicationText } = require('../telegram/parseApplication');
const { createApplication } = require('../db/applications');

async function handleActivateCrm(message) {
  const original = message.reply_to_message;

  if (!original || !original.text) {
    await telegramApi.sendMessage(
      message.chat.id,
      '⚠️ Команду /crm треба надсилати як відповідь (reply) на повідомлення із заявкою від сайту.'
    );
    return;
  }

  const parsed = parseApplicationText(original.text);

  if (!parsed || !parsed.phone) {
    await telegramApi.sendMessage(
      message.chat.id,
      '⚠️ Не вдалося розпізнати заявку в цьому повідомленні. Перевірте формат.'
    );
    return;
  }

  const summary =
    `📋 <b>Заявка активована</b>\n\n` +
    `👤 Ім'я: ${parsed.name || '—'}\n` +
    `📞 Телефон: ${parsed.phone}\n` +
    `📅 Дати: ${parsed.dates || '—'}\n` +
    `🐶 Собака: ${parsed.dogInfo || '—'}\n` +
    `📏 Розмір: ${parsed.size || '—'}\n` +
    (parsed.comment ? `💬 Коментар: ${parsed.comment}\n` : '');

  const sent = await telegramApi.sendMessage(message.chat.id, summary, actionKeyboard());

  if (!sent.ok) {
    console.error('Не вдалося надіслати повідомлення CRM:', sent);
    return;
  }

  await createApplication({
    telegram_chat_id: sent.result.chat.id,
    telegram_message_id: sent.result.message_id,
    raw_text: original.text,
    name: parsed.name,
    phone: parsed.phone,
    dates: parsed.dates,
    dog_info: parsed.dogInfo,
    size: parsed.size,
    comment: parsed.comment,
    status: 'new',
  });
}

module.exports = { handleActivateCrm };
