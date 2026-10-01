const supabase = require('./supabaseClient');

async function createBooking({ clientId, applicationId, dates, dogName, dogBreed, size, comment }) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      client_id: clientId,
      application_id: applicationId,
      dates,
      status: 'confirmed',
      dog_name: dogName || null,
      dog_breed: dogBreed || null,
      size: size || null,
      comment: comment || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getBookingById(bookingId) {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
  if (error) throw error;
  return data;
}

async function getBookingsByClient(clientId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function updateBookingFields(bookingId, fields) {
  const { data, error } = await supabase
    .from('bookings')
    .update(fields)
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateBookingGoogleEventId(bookingId, googleEventId) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ google_event_id: googleEventId })
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateBookingCalendarError(bookingId, errorText) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ google_calendar_error: errorText })
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  createBooking,
  getBookingById,
  getBookingsByClient,
  updateBookingFields,
  updateBookingGoogleEventId,
  updateBookingCalendarError,
};
