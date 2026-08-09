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

module.exports = { createBooking, updateBookingGoogleEventId, updateBookingCalendarError };
