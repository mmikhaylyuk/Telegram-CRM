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

/**
 * Витягує "ядро" номера — 9 значущих цифр без коду країни/нуля.
 * +380971234567 → 971234567
 * 380971234567  → 971234567
 * 0971234567    → 971234567
 */
function getCorePhone(raw) {
  let digits = raw.replace(/\D/g, ''); // тільки цифри

  if (digits.startsWith('380')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  return digits.slice(-9); // останні 9 цифр — про всяк випадок від зайвого сміття
}

/**
 * Генерує всі можливі варіанти запису номера, які могли бути в базі
 */
function phoneVariants(core) {
  return [
    `+380${core}`,
    `380${core}`,
    `0${core}`,
  ];
}

async function getClientWithHistory(rawPhone) {
  const core = getCorePhone(rawPhone);

  if (core.length !== 9) {
    return { invalidFormat: true };
  }

  const variants = phoneVariants(core);

  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .in('phone', variants);

  if (clientError) throw clientError;
  if (!clients || clients.length === 0) return null;

  const client = clients[0]; // якщо раптом дублікати в різних форматах — беремо першого

  const { data: applications, error: appsError } = await supabase
    .from('applications')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  if (appsError) throw appsError;

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  if (bookingsError) throw bookingsError;

  return { client, applications: applications || [], bookings: bookings || [] };
}

module.exports = {
  findClientByPhone,
  createClient,
  findOrCreateClient,
  getClientWithHistory,
  getCorePhone,
};
