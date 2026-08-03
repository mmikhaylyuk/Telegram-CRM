# Telegram CRM

Окремий проєкт. Існуючий сайт не змінюється жодним чином.

## Як це працює

1. Сайт як і раніше надсилає заявку в Telegram — без змін.
2. Менеджер відповідає (reply) на це повідомлення командою `/crm`.
3. CRM створює заявку в Supabase і надсилає нове повідомлення з кнопками
   `✅ Клієнт погодився` / `❌ Клієнт відмовився`.
4. Натискання кнопки оновлює статус, за потреби створює клієнта і бронювання.

## Розгортання — крок за кроком

### 1. Supabase
1. Створіть проєкт на supabase.com (якщо ще немає).
2. Відкрийте `SQL Editor -> New query`.
3. Скопіюйте весь вміст файлу `supabase/schema.sql`, вставте і натисніть `Run`.
4. Перейдіть у `Project Settings -> API`, скопіюйте:
   - `Project URL` → це буде `SUPABASE_URL`
   - `service_role` ключ (не `anon`!) → це буде `SUPABASE_SERVICE_ROLE_KEY`

### 2. Netlify
1. Завантажте цю папку як окремий репозиторій на GitHub (або перетягніть як ZIP через Netlify UI: `Add new site -> Deploy manually`).
2. У Netlify: `Site settings -> Environment variables`, додайте три змінні:
   - `TELEGRAM_BOT_TOKEN` — токен вашого існуючого бота
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Задеплойте сайт. Функція буде доступна за адресою:
   `https://ВАШ-САЙТ.netlify.app/.netlify/functions/telegram-webhook`

### 3. Підключення webhook до бота
Виконайте один раз у браузері або через curl (підставте свої значення):

```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://ВАШ-САЙТ.netlify.app/.netlify/functions/telegram-webhook
```

У відповіді має бути `"ok": true`.

Перевірити поточний webhook можна так:
```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

### 4. Перевірка
1. Дочекайтесь нової заявки від сайту в чаті (або надішліть тестове повідомлення в тому ж форматі).
2. Дайте reply на нього командою `/crm`.
3. Має з'явитись нове повідомлення з двома кнопками.
4. Натисніть одну з них — статус зміниться, повторне натискання буде заблоковано.

## Структура проєкту

```
netlify/functions/telegram-webhook.js   ← єдина точка входу від Telegram
src/telegram/                            ← все, що стосується Bot API
src/handlers/                            ← логіка по кожній дії (легко розширювати)
src/db/                                  ← робота з Supabase
src/config/env.js                        ← змінні середовища
supabase/schema.sql                      ← структура бази
```

## Додавання нових функцій у майбутньому

- Нова кнопка/дія → один файл у `src/handlers/` + один `case` у `src/handlers/router.js`.
- Кілька менеджерів → нова таблиця `managers` у Supabase + колонка `manager_id` в `applications`.
- Картки собак, фінанси, нагадування, статистика → нові таблиці, пов'язані через `client_id`/`application_id`, без зміни наявних файлів.
