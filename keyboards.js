// Клавіатура для нової активованої заявки.
// У майбутньому сюди легко додати ще одну кнопку (наприклад "Передати менеджеру"),
// не змінюючи решту проєкту.
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

// Клавіатура-заглушка, яка показує фінальний статус
// і блокує повторну обробку заявки.
function statusKeyboard(label) {
  return {
    inline_keyboard: [[{ text: label, callback_data: 'noop' }]],
  };
}

module.exports = { actionKeyboard, statusKeyboard };
