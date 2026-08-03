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
  return match ? match[1].trim() : null;
}

function parseApplicationText(text) {
  if (!text) return null;

  const name = extractField(text, "Ім[’ʼ'`]?я");
  const phoneRaw = extractField(text, 'Контакт|Телефон');
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

module.exports = { parseApplicationText };
