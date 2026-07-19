create extension if not exists pgcrypto;

create table if not exists coins (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text not null,
  coingecko_id text,
  market_cap_rank integer,
  volume_24h numeric,
  exchange text,
  source_symbol text,
  binance_symbol text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  scan_type text not null,
  universe text,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  coins_scanned integer not null default 0,
  error_message text
);

create table if not exists signal_results (
  id uuid primary key default gen_random_uuid(),
  coin_id uuid references coins(id) on delete set null,
  symbol text not null,
  exchange text,
  source_symbol text,
  price numeric,
  monthly_rsi numeric,
  rsi_zone text,
  weekly_open numeric,
  weekly_close numeric,
  weekly_high numeric,
  weekly_low numeric,
  previous_red_high numeric,
  close_break_confirmed boolean not null default false,
  weekly_green_confirmed boolean not null default false,
  volume_confirmed boolean not null default false,
  stars integer not null,
  status text not null,
  reason text not null,
  scan_id uuid references scans(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table coins
  add column if not exists exchange text,
  add column if not exists source_symbol text;

alter table coins
  alter column binance_symbol drop not null;

alter table coins
  alter column exchange set default 'BINANCE';

alter table coins
  drop constraint if exists coins_symbol_key;

update coins
set
  exchange = coalesce(exchange, 'BINANCE'),
  source_symbol = coalesce(source_symbol, binance_symbol, symbol)
where exchange is null or source_symbol is null;

alter table coins
  alter column exchange set not null,
  alter column source_symbol set not null;

alter table scans
  add column if not exists universe text;

alter table signal_results
  add column if not exists exchange text,
  add column if not exists source_symbol text;

create or replace view latest_signal_results as
select
  id,
  coin_id,
  symbol,
  exchange,
  source_symbol,
  price,
  monthly_rsi,
  rsi_zone,
  weekly_open,
  weekly_close,
  weekly_high,
  weekly_low,
  previous_red_high,
  close_break_confirmed,
  weekly_green_confirmed,
  volume_confirmed,
  stars,
  status,
  reason,
  scan_id,
  created_at
from (
  select
    signal_results.*,
    row_number() over (
      partition by symbol
      order by created_at desc, id desc
    ) as row_number
  from signal_results
  where status in ('SIGNAL', 'WATCHLIST')
) ranked_signal_results
where row_number = 1;

create or replace view latest_signal_results_by_exchange as
select
  id,
  coin_id,
  symbol,
  exchange,
  source_symbol,
  price,
  monthly_rsi,
  rsi_zone,
  weekly_open,
  weekly_close,
  weekly_high,
  weekly_low,
  previous_red_high,
  close_break_confirmed,
  weekly_green_confirmed,
  volume_confirmed,
  stars,
  status,
  reason,
  scan_id,
  created_at
from (
  select
    signal_results.*,
    row_number() over (
      partition by symbol, exchange, source_symbol
      order by created_at desc, id desc
    ) as row_number
  from signal_results
  where status in ('SIGNAL', 'WATCHLIST')
) ranked_signal_results
where row_number = 1;

create table if not exists strategy_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  type text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists alert_logs (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  stars integer not null,
  status text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_signal_results_status_created_at
  on signal_results(status, created_at desc);

create index if not exists idx_signal_results_symbol_created_at
  on signal_results(symbol, created_at desc);

create index if not exists idx_signal_results_symbol_status_created_at
  on signal_results(symbol, status, created_at desc);

create index if not exists idx_signal_results_exchange_source_created_at
  on signal_results(exchange, source_symbol, created_at desc);

create index if not exists idx_coins_exchange_source_symbol
  on coins(exchange, source_symbol);

create unique index if not exists idx_coins_exchange_source_symbol_unique
  on coins(exchange, source_symbol);

create index if not exists idx_scans_started_at
  on scans(started_at desc);

create index if not exists idx_alert_logs_symbol_created_at
  on alert_logs(symbol, created_at desc);
