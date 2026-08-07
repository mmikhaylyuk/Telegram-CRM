const { routeUpdate } = require('../../src/handlers/router');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const update = JSON.parse(event.body);
    await routeUpdate(update);
  } catch (err) {
    console.error('Помилка обробки webhook:', err);
  }

  // Telegram завжди очікує статус 200 — інакше почне повторно
  // надсилати те саме оновлення.
  return { statusCode: 200, body: 'OK' };
};
