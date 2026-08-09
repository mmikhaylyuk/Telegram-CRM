const crypto = require('crypto');

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken() {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Google OAuth: не вдалося отримати access token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

async function createCalendarEvent({ summary, description, startDate, endDate }) {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID } = process.env;

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
    // Кидаємо помилку замість тихого return null, щоб causeConfirmed.js
    // зловив це в catch і записав діагностику в Supabase.
    throw new Error(
      'Google Calendar: не задані environment variables. ' +
      `GOOGLE_CLIENT_EMAIL=${GOOGLE_CLIENT_EMAIL ? 'є' : 'ВІДСУТНЯ'}, ` +
      `GOOGLE_PRIVATE_KEY=${GOOGLE_PRIVATE_KEY ? 'є' : 'ВІДСУТНЯ'}, ` +
      `GOOGLE_CALENDAR_ID=${GOOGLE_CALENDAR_ID ? 'є' : 'ВІДСУТНЯ'}`
    );
  }

  const accessToken = await getAccessToken();

  // end.date у Google Calendar не включає останній день -> +1 день
  const endExclusive = new Date(endDate);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const endExclusiveStr = endExclusive.toISOString().slice(0, 10);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description,
        start: { date: startDate },
        end: { date: endExclusiveStr },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error('Google Calendar API помилка: ' + JSON.stringify(data));
  }

  return data;
}

module.exports = { createCalendarEvent };
