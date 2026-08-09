// Парсер розрахований на формат повідомлень, які реально відправляє сайт, напр.:
//
// 🔔 Нова заявка з сайту Maks_and_Shon
//
// 👤 Ім'я: Катрина
// 📞 Контакт: 0988738134
// 📅 Дати: 01.08.2026–02.08.2026
// 🐶 Кличка / порода: Тена, той-пудель
// 📏 Розмір: Маленький (до 10 кг)
//
// 🕒 Відправлено: 01.08.2026, 20:46
// 🌐 Джерело: сайт Maks_and_Shon
//
// Парсинг іде за текстовими мітками (а не за емодзі), тому дрібні зміни
// в оформленні сайту не ламають парсер. Якщо якогось поля немає в тексті —
// повертається null, а не помилка.

function extractField(text, labelPattern) {
  const regex = new RegExp(`${labelPattern}\\s*:\\s*(.+)`, 'iu');
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : null;
}

function parseApplicationText(text) {
  if (!text) return null;

  const name = extractField(text, "Ім[’ʼ'`]?я");
  const phoneRaw = extractField(text, '(?:Контакт|Телефон)');
  const dates = extractField(text, 'Дати');
  const dogInfo = extractField(text, 'Кличка\\s*/\\s*порода');
  const size = extractField(text, 'Розмір');
  const comment = extractField(text, 'Коментар');

  return {
    name,
    phone: phoneRaw ? phoneRaw.replace(/\s+/g, '') : null,
    dates,
    dogInfo,
    size,
    comment,
  };
}

// Розбирає текстове поле "Дати" ("01.08.2026–02.08.2026" або одну дату)
// на структуровані startDate/endDate у форматі YYYY-MM-DD для Google Calendar.
function parseDatesRange(datesText) {
  if (!datesText) return null;

  // Нормалізуємо пробіли (в т.ч. невидимі/неразривні) і прибираємо зайве по краях
  const normalized = datesText.replace(/\s+/g, ' ').trim();

  // Будь-який символ тире/дефісу: "-" "–" "—" "―" "−" тощо, з пробілами навколо або без
  const dashClass = '[-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212]';

  const rangeMatch = normalized.match(
    new RegExp(`(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})\\s*${dashClass}\\s*(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})`)
  );
  if (rangeMatch) {
    const [, d1, m1, y1, d2, m2, y2] = rangeMatch;
    return {
      startDate: `${y1}-${m1.padStart(2, '0')}-${d1.padStart(2, '0')}`,
      endDate: `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}`,
    };
  }

  // Якщо вказано лише одну дату — бронювання на 1 день
  const singleMatch = normalized.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (singleMatch) {
    const [, d, m, y] = singleMatch;
    return {
      startDate: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
      endDate: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
    };
  }

  return null;
}

// Розбирає текстове поле "Кличка / порода" ("Тена, той-пудель")
// на окремі ім'я собаки та породу для тексту події в календарі.
function parseDogInfo(dogInfoText) {
  if (!dogInfoText) return { dogName: null, breed: null };
  const parts = dogInfoText.split(',').map((p) => p.trim());
  return { dogName: parts[0] || null, breed: parts[1] || null };
}

module.exports = { parseApplicationText, parseDatesRange, parseDogInfo };
