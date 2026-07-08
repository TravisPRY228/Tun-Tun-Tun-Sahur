-- ============================================================================
-- Telegram-сповіщення про нові записи
-- Виконати в Supabase SQL Editor. Це ДОДАЄ до вже існуючої таблиці bookings,
-- нічого не видаляє.
-- ============================================================================

-- pg_net зазвичай вже увімкнений у Supabase за замовчуванням,
-- цей рядок безпечний навіть якщо так і є.
create extension if not exists pg_net with schema extensions;

create or replace function notify_telegram_new_booking()
returns trigger as $$
declare
  bot_token text := '8820491869:AAHLl_097qq63EzPE77ea5zCQQbdtVdBX_A';
  chat_id text := '1538674029';
  message text;
begin
  message := format(
    E'\U0001F514 Новий запис!\n\n\U0001F464 %s %s\n\U0001F4DE %s\n\U00002702 %s\n\U0001F488 Майстер: %s\n\U0001F4C5 %s о %s',
    new.first_name,
    new.last_name,
    new.phone,
    new.service_name,
    new.master_name,
    to_char(new.booking_date, 'DD.MM.YYYY'),
    to_char(new.booking_time, 'HH24:MI')
  );

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', chat_id, 'text', message),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_booking_notify_telegram on bookings;

create trigger on_new_booking_notify_telegram
  after insert on bookings
  for each row
  execute function notify_telegram_new_booking();
