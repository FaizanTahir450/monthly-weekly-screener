# Crypto Value Screener

A Next.js crypto value screener for monthly RSI value zones and weekly close-break confirmation. It is a screener only, not an auto-trading bot.

## Features

- Dark dashboard UI with Dashboard, Live Signals, Saved Results, Live Watchlist, Scan Logs, Backtest, Settings, and Coin Detail pages
- Binance, Bybit, and OKX spot candle integration for weekly and monthly klines
- CoinGecko top 100/top 200/top 500, category, and trending universe support matched to Binance USDT spot symbols
- All-Binance and multi-exchange USDT universe support
- Strategy engine with ON/OFF conditions
- Manual scan API and UI
- Supabase schema and optional scan/result persistence
- Optional Telegram alerts for qualifying signals
- GitHub Actions scheduled scan workflow
- Backtesting utility for 4-week, 8-week, and 12-week returns

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run lint
npm run build
npm run scan
npm run scan -- --universe=top100
npm run scan -- --universe=top200 --alerts
npm run scan -- --universe=top500
npm run scan -- --universe=binance
npm run scan -- --universe=multi
npm run scan -- --universe=ai
npm run scan -- --universe=trending
npm run scan -- --universe=recent
npm run scan -- --universe=events
npm run scan -- --universe=social
```

## GitHub Actions Automation

The repository includes `.github/workflows/scan.yml`.

- Scheduled runs use the `multi` universe and send Telegram alerts by default.
- Manual runs can be started from `GitHub -> Actions -> Crypto Scan -> Run workflow`.
- Manual runs let you choose `default`, `top100`, `top200`, `top500`, `binance`, `multi`, category, trending, recent, events, or social universes.

Add these repository secrets before enabling automation:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

GitHub path:

`Repository -> Settings -> Secrets and variables -> Actions -> New repository secret`

## API Routes

- `POST /api/scan`
- `POST /api/scan?universe=top100`
- `POST /api/scan?universe=top200&persist=true&alerts=true`
- `POST /api/scan?universe=top500&persist=true`
- `POST /api/scan?universe=binance`
- `POST /api/scan?universe=multi`
- `POST /api/scan?universe=ai`
- `POST /api/scan?universe=gaming`
- `POST /api/scan?universe=rwa`
- `POST /api/scan?universe=meme`
- `POST /api/scan?universe=trending`
- `POST /api/scan?universe=recent`
- `POST /api/scan?universe=events`
- `POST /api/scan?universe=social`
- `GET /api/signals`
- `GET /api/watchlist`
- `GET /api/settings`
- `GET /api/backtest`
- `GET /api/scans`

## Data Modes

- Dashboard shows the latest saved Supabase scan when configured, then lets you run a fresh live scan.
- Live scan buttons use exchange candles and optional CoinGecko universes.
- Settings preview counts still use local sample coins so you can see strategy effects instantly.
- Backtest uses saved Supabase `SIGNAL` rows when available and falls back to sample signals otherwise.

## Environment Variables

Supabase persistence is optional. Without these env vars, scans still run and persistence is skipped.

Create `.env.local` in the project root, next to `package.json`, using `.env.local.example` as the template.

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Telegram alerts are optional.

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Feed-backed universes are optional. Add comma-separated symbols to scan
recently listed coins, event coins, or social trend coins from your preferred
source. Each entry can be `SYMBOL`, `SYMBOLUSDT`, or
`SYMBOLUSDT:Display Name:MarketCapRank`.

```text
RECENTLY_LISTED_SYMBOLS=
EVENT_COIN_SYMBOLS=
SOCIAL_TREND_SYMBOLS=
```

## Database

Run `supabase/schema.sql` in Supabase SQL editor to create:

- `coins`
- `scans`
- `signal_results`
- `strategy_settings`
- `alert_logs`
- `latest_signal_results` view

The schema keeps `binance_symbol` as a nullable legacy column, while new
multi-exchange rows use `exchange` and `source_symbol`.

## Current Limitations

- Settings load/save through `/api/settings`; without Supabase env vars, the API returns defaults and save calls no-op.
- BTC trend filter uses BTC weekly close above its 20-week average close.
- Trending coin boost uses CoinGecko trending coins when enabled.
- Recently listed, event, and social trend universes use env-configured symbol feeds and validate them against Binance USDT spot symbols.
- Top 100/top 200/top 500/category scans may take longer because they fetch Binance candles per matched symbol.
- All-Binance scans cover live Binance USDT spot markets and disable market-cap filtering because Binance does not provide market-cap ranks.
- Multi-exchange scans cover unique USDT spot symbols across Binance, Bybit, and OKX. Duplicate symbols prefer Binance, then Bybit, then OKX. This mode prioritizes coverage over speed: it retries exchange requests, defaults to low concurrency, and requires every exchange source unless `MULTI_EXCHANGE_ALLOW_PARTIAL=true`.
