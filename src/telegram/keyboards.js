function actionKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ Клієнт погодився', callback_data: 'confirm' },
        { text: '❌ Клієнт відмовився', callback_data: 'decline' },
      ],
    ],
  };
}

function statusKeyboard(label) {
  return {
    inline_keyboard: [[{ text: label, callback_data: 'noop' }]],
  };
}

// Кнопка під карткою клієнта в /client — відкриває редагування.
function editClientButton(phone) {
  return {
    inline_keyboard: [[{ text: '✏️ Редагувати клієнта', callback_data: `edt:${phone}` }]],
  };
}

function editMenuKeyboard(hasBooking) {
  const rows = [[{ text: "✏️ Ім'я", callback_data: 'ef:name' }, { text: '📞 Телефон', callback_data: 'ef:phone' }]];

  if (hasBooking) {
    rows.push([{ text: '🐶 Кличка', callback_data: 'ef:dogname' }, { text: '🐕 Порода', callback_data: 'ef:breed' }]);
    rows.push([{ text: '📏 Розмір', callback_data: 'ef:size' }]);
    rows.push([
      { text: '📅 Дата заїзду', callback_data: 'ef:datestart' },
      { text: '📅 Дата виїзду', callback_data: 'ef:dateend' },
    ]);
    rows.push([{ text: '💬 Коментар', callback_data: 'ef:comment' }]);
    rows.push([{ text: '🗑️ Видалити бронювання', callback_data: 'ef:delete' }]);
  }

  rows.push([{ text: '💾 Завершити', callback_data: 'ef:done' }]);
  rows.push([{ text: '↩️ Скасувати', callback_data: 'ef:cancel' }]);

  return { inline_keyboard: rows };
}


function bookingSelectKeyboard(bookings) {
  const rows = bookings.map((b, i) => [{ text: `${i + 1}️⃣ ${b.dates || 'без дат'}`, callback_data: `eb:${b.id}` }]);
  rows.push([{ text: '↩️ Скасувати', callback_data: 'ef:cancel' }]);
  return { inline_keyboard: rows };
}

function fieldPromptKeyboard() {
  return { inline_keyboard: [[{ text: '↩️ Скасувати', callback_data: 'ef:cancel' }]] };
}

function confirmKeyboard() {
  return {
    inline_keyboard: [[
      { text: '✅ Зберегти', callback_data: 'ec:save' },
      { text: '❌ Скасувати', callback_data: 'ec:cancel' },
    ]],
  };
}

module.exports = {
  actionKeyboard,
  statusKeyboard,
  editClientButton,
  editMenuKeyboard,
  bookingSelectKeyboard,
  fieldPromptKeyboard,
  confirmKeyboard,
};
