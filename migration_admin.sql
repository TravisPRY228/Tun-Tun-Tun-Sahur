-- ============================================================================
-- Додаток до основної схеми: статус запису + доступ для адміна
-- Виконати в Supabase SQL Editor. Це ДОДАЄ до вже існуючої таблиці bookings,
-- нічого не видаляє і не зачіпає вже збережені записи.
-- ============================================================================

-- 1) Статус запису: booked (за замовчуванням) | came | no_show | cancelled
alter table bookings
  add column if not exists status text not null default 'booked';

-- 2) Доступ для автентифікованого адміністратора (того, хто увійшов
--    у admin.html через логін/пароль) — читати, редагувати, видаляти.
create policy "authenticated can read bookings"
  on bookings for select
  to authenticated
  using (true);

create policy "authenticated can update bookings"
  on bookings for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated can delete bookings"
  on bookings for delete
  to authenticated
  using (true);

-- ============================================================================
-- Після виконання цього скрипта створи свій обліковий запис адміністратора:
-- Supabase → Authentication → Users → Add user
--   Email: твоя пошта
--   Password: придумай пароль
--   ⚠️ Обов'язково включи "Auto Confirm User" (щоб не чекати лист підтвердження)
-- Цими email + password потім заходиш в admin.html
-- ============================================================================
