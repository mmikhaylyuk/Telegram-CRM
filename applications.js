const supabase = require('./supabaseClient');

async function createApplication(data) {
  const { data: row, error } = await supabase
    .from('applications')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row;
}

// chat_id + message_id того повідомлення, яке CRM надіслала з кнопками —
// це унікальний ключ заявки, за яким ми впізнаємо її при натисканні кнопки.
async function getApplicationByMessage(chatId, messageId) {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .eq('telegram_message_id', messageId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateApplicationStatus(id, status, extra = {}) {
  const { data, error } = await supabase
    .from('applications')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { createApplication, getApplicationByMessage, updateApplicationStatus };
