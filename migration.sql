-- ============================================================================
-- Tun-Tun-Tun Sahur — схема бази для системи запису
-- Виконати повністю в Supabase SQL Editor
-- ============================================================================

-- Прибираємо стару спрощену таблицю заявок (з першої, простішої версії сайту),
-- якщо вона є — нова система запису її повністю замінює.
drop view if exists public_slots;
drop table if exists bookings cascade;

create table bookings (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  service_name text not null,
  master_id text not null,
  master_name text not null,
  booking_date date not null,
  booking_time time not null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  created_at timestamptz default now(),

  -- ключова гарантія: два записи з однаковим майстром+датою+часом
  -- фізично не можуть існувати одночасно. Саме це і "блокує" слот.
  unique (master_id, booking_date, booking_time)
);

alter table bookings enable row level security;

-- Публічний перегляд без персональних даних — тільки щоб сайт міг
-- показати, які слоти вже зайняті, не розкриваючи чиїсь ім'я й телефон.
create view public_slots as
  select master_id, booking_date, booking_time
  from bookings;

grant select on public_slots to anon;

-- Будь-хто (анонімний відвідувач сайту) може СТВОРИТИ запис.
create policy "anon can insert bookings"
  on bookings for insert
  to anon
  with check (true);

-- Зверни увагу: політики SELECT/UPDATE/DELETE на саму таблицю bookings
-- для anon свідомо НЕ створені — тому імена й телефони клієнтів не можна
-- прочитати через публічний ключ сайту. Ти сам бачиш усе через
-- Table Editor у Supabase (дашборд заходить під власним, привілейованим
-- доступом і RLS не застосовується до тебе).
