const supabase = require('./supabaseClient');

async function createBooking({ clientId, applicationId, dates }) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      client_id: clientId,
      application_id: applicationId,
      dates,
      status: 'confirmed',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { createBooking };
