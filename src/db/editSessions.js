const supabase = require('./supabaseClient');

// Одна активна сесія редагування на чат (унікальний індекс на chat_id).
async function getSession(chatId) {
  const { data, error } = await supabase
    .from('edit_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function startSession(chatId, clientId) {
  await clearSession(chatId);

  const { data, error } = await supabase
    .from('edit_sessions')
    .insert({
      chat_id: chatId,
      client_id: clientId,
      booking_id: null,
      field: null,
      pending_value: null,
      step: 'menu',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateSession(chatId, fields) {
  const { data, error } = await supabase
    .from('edit_sessions')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function clearSession(chatId) {
  const { error } = await supabase.from('edit_sessions').delete().eq('chat_id', chatId);
  if (error) throw error;
}

module.exports = { getSession, startSession, updateSession, clearSession };
