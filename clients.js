const supabase = require('./supabaseClient');

async function findClientByPhone(phone) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createClient({ phone, name }) {
  const { data, error } = await supabase
    .from('clients')
    .insert({ phone, name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findOrCreateClient({ phone, name }) {
  const existing = await findClientByPhone(phone);
  if (existing) return existing;
  return createClient({ phone, name });
}

module.exports = { findClientByPhone, createClient, findOrCreateClient };
