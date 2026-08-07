-- Виконати повністю в Supabase: SQL Editor -> New query -> вставити -> Run

create extension if not exists pgcrypto;

-- Клієнти. Основний пошук — за телефоном.
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Заявки. Прив'язані до конкретного повідомлення в Telegram
-- (того, що CRM надіслала з кнопками) через telegram_chat_id + telegram_message_id.
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint not null,
  telegram_message_id bigint not null,
  client_id uuid references clients(id),
  status text not null default 'new', -- new | confirmed | declined
  raw_text text,
  name text,
  phone text,
  dates text,
  dog_info text,
  size text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (telegram_chat_id, telegram_message_id)
);

-- Підтверджені бронювання.
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) not null,
  application_id uuid references applications(id),
  dates text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create index if not exists idx_applications_phone on applications(phone);
create index if not exists idx_bookings_client_id on bookings(client_id);
