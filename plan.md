


---

# Crypto Value Buy Signal Website - Full Plan

## 1) Project idea

Build a website that scans crypto coins and shows:

```text
1. Coins near monthly RSI 40
2. Coins that confirmed weekly close breakout
3. Star rating from 1 to 5
4. Watchlist coins
5. Final signal coins
6. Condition ON/OFF settings
7. Automatic scan after fixed time
8. Telegram alert later
```

The system should be a **crypto screener**, not an auto-trading bot.

Binance Spot API is suitable for candle data because its kline endpoint gives open, high, low, close, volume, close time, and supports weekly `1w` and monthly `1M` intervals. ([Binance Developer Center][1]) CoinGecko can be used for coin ranking, metadata, market categories, and broader crypto market data because its API covers REST data and a large coin/exchange universe. ([docs.coingecko.com][2])

---

# 2) Final strategy v1

## Main value condition

```text
Monthly RSI(14) should be near 40.
```

Use RSI from monthly candle closes. TradingView's RSI default length is 14 bars, and close is the default source, so this is a normal setup. ([TradingView][3])

## RSI zones

```text
38-41 = Perfect zone
41-44 = Good zone
44-47 = Watchlist zone
Above 47 = Ignore
Below 38 = Oversold but risky; keep separate
```

## Weekly confirmation

You already finalized this:

```text
Last completed weekly candle must be green
AND
weekly close must break above the high of previous red weekly candle.
```

Important:

```text
Use close break, not wick break.
```

Example:

```text
Previous red weekly high = 100
Current weekly open = 92
Current weekly close = 103

Signal = Yes
```

But:

```text
Previous red weekly high = 100
Current weekly high = 105
Current weekly close = 98

Signal = No
```

Because it only wicked above, but did not close above.

---

# 3) ON/OFF condition system

This is very important.

Create a **Settings page** where every condition has a switch.

## Required switches

| Condition             |   Default | Why                     |
| --------------------- | --------: | ----------------------- |
| Monthly RSI filter    |        ON | Main value strategy     |
| Weekly green candle   |        ON | Confirms bullish candle |
| Weekly close breakout |        ON | Main confirmation       |
| Volume confirmation   |        ON | Avoid weak breakouts    |
| BTC trend filter      | OFF first | Add later               |
| Top market cap filter |        ON | Avoid dead coins        |
| Minimum volume filter |        ON | Avoid illiquid coins    |
| Trending coin boost   | OFF first | Add later               |
| Stablecoin filter     |        ON | Remove useless pairs    |
| Duplicate alert block |        ON | Avoid repeated alerts   |

This means if the market changes, you can turn something off without changing code.

Example:

```text
If volume is weak in the full market, turn OFF volume confirmation.
If BTC is sideways but altcoins are pumping, keep BTC filter OFF.
If you want more signals, increase RSI range or turn off volume filter.
```

---

# 4) Settings values

Create editable inputs like this:

```text
RSI length: 14

Perfect RSI min: 38
Perfect RSI max: 41

Good RSI min: 41
Good RSI max: 44

Watch RSI min: 44
Watch RSI max: 47

Minimum 24h volume: 10,000,000 USDT

Coin universe:
- Top 100
- Top 200
- Top 500

Breakout mode:
- Close break only

Volume rule:
- Weekly volume > 20-week average volume

Signal alert minimum:
- 4 stars
```

Short trick: make everything editable from UI. Don't hardcode strategy numbers forever.

---

# 5) Star rating system

## 5-star signal

```text
Monthly RSI between 38-41
Weekly candle green
Weekly close broke previous red candle high
Weekly volume above 20-week average
Coin has strong liquidity
```

## 4-star signal

```text
Monthly RSI between 41-44
Weekly candle green
Weekly close breakout confirmed
Volume normal or strong
```

## 3-star setup

```text
Monthly RSI between 38-44
Weekly candle green
But weekly close breakout not confirmed yet
```

## 2-star watchlist

```text
Monthly RSI between 44-47
No weekly confirmation yet
```

## 1-star early watch

```text
Coin is moving near the value zone
But conditions are weak
```

---

# 6) Final signal formula

Use this logic:

```js
const monthlyRsiCondition =
  !settings.monthlyRsiEnabled ||
  (monthlyRsi >= settings.rsiSignalMin && monthlyRsi <= settings.rsiSignalMax);

const weeklyGreenCondition =
  !settings.weeklyGreenEnabled ||
  lastWeekly.close > lastWeekly.open;

const closeBreakCondition =
  !settings.closeBreakEnabled ||
  lastWeekly.close > previousRedWeekly.high;

const volumeCondition =
  !settings.volumeEnabled ||
  lastWeekly.volume > averageWeeklyVolume20;

const finalSignal =
  monthlyRsiCondition &&
  weeklyGreenCondition &&
  closeBreakCondition &&
  volumeCondition;
```

The `!settings.conditionEnabled || condition` trick is the easiest way to support ON/OFF buttons.

---

# 7) Coin selection plan

## Version 1 coin universe

Start with:

```text
Top 100 or Top 200 coins
Only Binance USDT spot pairs
Exclude stablecoins
Minimum 24h volume filter
```

Do not start with top 500 immediately. It will create too many weak and noisy results.

## Later coin categories

Add later:

```text
Top 500 coins
AI coins
Gaming coins
RWA coins
Meme coins
Trending coins
Recently listed coins
Coins with events/upgrades
Social media trend coins
```

CoinGecko can help with broader market data and categories; Binance should remain the main candle source for actual RSI and breakout calculations. ([docs.coingecko.com][2])

---

# 8) Recommended free stack

Use this:

```text
Frontend:
Next.js + Tailwind CSS

Backend:
Next.js Route Handlers

Database:
Supabase free Postgres

Data:
Binance API for candles
CoinGecko API for market ranking/categories

Automation:
GitHub Actions first
Cloudflare Workers later if needed

Alerts:
Telegram Bot later

Hosting:
Vercel
```

Next.js Route Handlers are good because they let you create backend API endpoints inside the app directory. ([Next.js][4]) Supabase free tier is enough for MVP because its docs list 500 MB database size, 5 GB egress, 50,000 monthly active users, and 500,000 Edge Function invocations on the free plan. ([Supabase][5])

For automation, GitHub Actions supports scheduled workflows and the shortest interval is once every 5 minutes, but GitHub also warns scheduled jobs can be delayed or dropped during high load. ([GitHub Docs][6]) Cloudflare Cron Triggers are designed for scheduled Workers and third-party API collection jobs. ([Cloudflare Docs][7]) Vercel Hobby cron is not ideal for frequent scans because Hobby cron runs only once per day and has loose timing precision. ([Vercel][8])

Telegram Bot API is HTTP-based, so later your backend can send alert messages to your Telegram chat. ([Telegram][9])

---

# 9) Website pages

## Page 1: Dashboard

Show:

```text
Total coins scanned
Total watchlist coins
Total confirmed signals
5-star signals
4-star signals
Last scan time
Next scan time
```

Cards:

```text
Confirmed Signals
Near RSI 40
Waiting for Weekly Close Break
Strong Volume Breakouts
```

---

## Page 2: Signals

This page shows only confirmed signals.

Columns:

```text
Coin
Symbol
Price
Monthly RSI
Weekly close
Previous red candle high
Breakout %
Volume status
Stars
Signal date
Reason
```

Example reason:

```text
Monthly RSI 41.8, weekly candle closed green, and weekly close broke previous red candle high.
```

---

## Page 3: Watchlist

This page shows coins not confirmed yet.

Columns:

```text
Coin
Symbol
Monthly RSI
RSI zone
Current weekly close
Breakout needed
Distance to breakout
Watch status
Stars
```

Example:

```text
LINK needs weekly close above 18.40 for confirmation.
```

---

## Page 4: Coin detail

For each coin show:

```text
Monthly RSI
Weekly candle status
Previous red candle high
Current weekly close
20-week average volume
Signal history
Last 10 weekly candles
Last 15 monthly candles
```

---

## Page 5: Settings

This is your most important page.

Settings sections:

```text
Coin Universe Settings
RSI Settings
Weekly Confirmation Settings
Volume Settings
Star Rating Settings
Automation Settings
Alert Settings
```

Every condition should have:

```text
ON/OFF switch
Editable value
Small explanation
```

Example:

```text
Weekly Close Breakout: ON
Rule: weekly close > previous red candle high
```

---

# 10) Database plan

Use these tables.

## coins

```text
id
symbol
name
binance_symbol
coingecko_id
market_cap_rank
volume_24h
is_active
created_at
updated_at
```

## scans

```text
id
scan_type
status
started_at
finished_at
coins_scanned
error_message
```

## signal_results

```text
id
coin_id
symbol
price
monthly_rsi
rsi_zone
weekly_open
weekly_close
weekly_high
weekly_low
previous_red_high
close_break_confirmed
weekly_green_confirmed
volume_confirmed
stars
status
reason
scan_id
created_at
```

Status can be:

```text
SIGNAL
WATCHLIST
IGNORED
```

## strategy_settings

```text
id
key
value
type
enabled
updated_at
```

Example rows:

```text
monthly_rsi_filter_enabled = true
weekly_green_enabled = true
close_break_enabled = true
volume_filter_enabled = true
rsi_signal_min = 38
rsi_signal_max = 44
rsi_watch_min = 44
rsi_watch_max = 47
```

---

# 11) File/folder structure

Use this structure:

```text
crypto-value-screener/
│
├── app/
│   ├── page.tsx
│   ├── signals/
│   │   └── page.tsx
│   ├── watchlist/
│   │   └── page.tsx
│   ├── coins/
│   │   └── [symbol]/
│   │       └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── api/
│       ├── scan/
│       │   └── route.ts
│       ├── signals/
│       │   └── route.ts
│       ├── watchlist/
│       │   └── route.ts
│       └── settings/
│           └── route.ts
│
├── components/
│   ├── DashboardCard.tsx
│   ├── SignalTable.tsx
│   ├── WatchlistTable.tsx
│   ├── SettingsToggle.tsx
│   ├── StarRating.tsx
│   └── Navbar.tsx
│
├── lib/
│   ├── binance.ts
│   ├── coingecko.ts
│   ├── indicators.ts
│   ├── strategy.ts
│   ├── supabase.ts
│   └── telegram.ts
│
├── scripts/
│   └── run-scan.ts
│
├── supabase/
│   └── schema.sql
│
├── .github/
│   └── workflows/
│       └── scan.yml
│
├── .env.local
├── package.json
└── README.md
```

---

# 12) Core files purpose

## `lib/binance.ts`

Responsible for:

```text
Fetch weekly candles
Fetch monthly candles
Fetch latest price
Fetch volume
```

## `lib/coingecko.ts`

Responsible for:

```text
Fetch top 100/top 200/top 500 coins
Fetch market cap rank
Fetch categories later
Fetch trending coins later
```

## `lib/indicators.ts`

Responsible for:

```text
Calculate RSI
Calculate average volume
Find previous red candle
```

## `lib/strategy.ts`

Responsible for:

```text
Apply ON/OFF settings
Check monthly RSI
Check weekly green candle
Check weekly close breakout
Check volume
Calculate stars
Generate reason text
```

## `scripts/run-scan.ts`

Responsible for:

```text
Load settings
Load coin universe
Scan each coin
Save watchlist/signals
Send Telegram alert if needed
```

---

# 13) Automation plan

Because this is monthly + weekly strategy, don't over-scan.

## Best schedule

```text
Daily scan:
Update RSI watchlist.

Weekly scan:
Run after weekly candle close.

Manual scan:
Button on dashboard.
```

## Pakistan time idea

```text
Daily scan:
Every day around 6:00 AM PKT

Weekly serious scan:
Monday around 6:00 AM PKT
```

Why Monday? Weekly candle is completed, so you avoid fake unfinished weekly signals.

## GitHub Actions MVP

Use GitHub Actions first because it is simple inside your repo.

Example schedule:

```yaml
name: Crypto Scan

on:
  schedule:
    - cron: "10 1 * * *"
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run scan
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```

---

# 14) Alert plan

Do not send alert for every small thing.

Send Telegram only when:

```text
Stars >= 4
Status = SIGNAL
Coin was not already alerted this week
```

Alert format:

```text
ALERT: 5-Star Crypto Signal

Coin: SOLUSDT
Monthly RSI: 40.8
Weekly Close: 158.20
Previous Red High: 154.70
Reason: Monthly RSI near value zone + weekly close breakout confirmed.
```

---

# 15) Development phases

## Phase 1 - Basic frontend

Build:

```text
Dashboard
Signals page
Watchlist page
Settings page
Dummy data only
```

Goal:

```text
Website UI complete before API complexity.
```

---

## Phase 2 - Strategy engine

Build:

```text
RSI calculator
Previous red candle finder
Weekly close breakout checker
Star rating system
ON/OFF condition logic
```

Goal:

```text
Test strategy with fake candle data first.
```

---

## Phase 3 - Binance data

Build:

```text
Fetch weekly candles
Fetch monthly candles
Calculate monthly RSI
Check weekly close breakout
Return result for one coin first
```

Test with:

```text
BTCUSDT
ETHUSDT
SOLUSDT
BNBUSDT
LINKUSDT
```

---

## Phase 4 - Coin universe

Build:

```text
Fetch top coins from CoinGecko
Match them with Binance USDT pairs
Remove stablecoins
Apply volume filter
```

---

## Phase 5 - Database

Build:

```text
Supabase connection
Save scan result
Save signals
Save watchlist
Save settings
```

---

## Phase 6 - Automation

Build:

```text
Manual scan button
GitHub Actions scheduled scan
Scan logs
Error logs
Duplicate alert prevention
```

---

## Phase 7 - Telegram alerts

Build:

```text
Telegram bot connection
Send alerts for 4-star and 5-star only
```

---

## Phase 8 - Backtesting later

Build:

```text
Check past signals
4-week return
8-week return
12-week return
Win rate
Average return
Worst drawdown
```

This is where you find out if the strategy is actually strong.

---

# 16) MVP scope for Codex

Do not ask Codex to build everything at once.

Start with this MVP:

```text
Next.js app
Dashboard
Signals page
Watchlist page
Settings page
Dummy data
Condition toggle UI
Strategy function
Manual scan API route
```

Then add real APIs.

---

[1]: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints "Market Data endpoints | Binance Open Platform"
[2]: https://docs.coingecko.com/ "Welcome to CoinGecko API - CoinGecko API"
[3]: https://www.tradingview.com/support/solutions/43000502338-relative-strength-index-rsi/ "Relative Strength Index (RSI) - TradingView"
[4]: https://nextjs.org/docs/app/getting-started/route-handlers "Getting Started: Route Handlers | Next.js"
[5]: https://supabase.com/docs/guides/platform/billing-on-supabase "About billing on Supabase | Supabase Docs"
[6]: https://docs.github.com/actions/using-workflows/events-that-trigger-workflows "Events that trigger workflows - GitHub Docs"
[7]: https://developers.cloudflare.com/workers/configuration/cron-triggers/ "Cron Triggers - Cloudflare Workers docs"
[8]: https://vercel.com/docs/cron-jobs/usage-and-pricing "Usage & Pricing for Cron Jobs"
[9]: https://core.telegram.org/bots/api "Telegram Bot API"
