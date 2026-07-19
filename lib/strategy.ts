import {
  averageVolume,
  calculateRSI,
  findPreviousRedCandle,
  isGreenCandle,
  type Candle,
} from "./indicators.ts";
import type {
  CoinData,
  EvaluatedCoin,
  StrategyResult,
  StrategySettings,
} from "./types.ts";

export type StrategyCoinData = CoinData & {
  monthlyCandles?: Candle[];
  monthlyCloses?: number[];
  weeklyCandles?: Candle[];
};

type ConditionResult = {
  enabled: boolean;
  passed: boolean;
  rawPassed: boolean;
  value?: number | boolean | string | null;
};

export type RealStrategyResult = StrategyResult & {
  conditions: Record<string, ConditionResult>;
};

const clampStars = (stars: number) => Math.max(1, Math.min(5, stars));

export function evaluateCoin(
  coinData: StrategyCoinData,
  settings: StrategySettings,
): RealStrategyResult {
  const monthlyCloses =
    coinData.monthlyCloses ??
    coinData.monthlyCandles?.map((candle) => candle.close);
  const monthlyRsi =
    monthlyCloses && monthlyCloses.length > 0
      ? calculateRSI(monthlyCloses, settings.rsiLength)
      : coinData.monthlyRsi;

  const lastWeeklyCandle = coinData.weeklyCandles?.at(-1) ?? {
    open: coinData.weeklyOpen,
    high: coinData.weeklyHigh,
    close: coinData.weeklyClose,
    volume: coinData.weeklyVolume,
  };
  const previousRedCandle = coinData.weeklyCandles
    ? findPreviousRedCandle(coinData.weeklyCandles)
    : {
        open: coinData.previousRedWeeklyHigh,
        high: coinData.previousRedWeeklyHigh,
        close: 0,
        volume: 0,
      };
  const previousRedWeeklyHigh =
    previousRedCandle?.high ?? coinData.previousRedWeeklyHigh;
  const averageWeeklyVolume =
    coinData.weeklyCandles && coinData.weeklyCandles.length > 1
      ? averageVolume(coinData.weeklyCandles.slice(0, -1), 20)
      : coinData.averageWeeklyVolume20;

  const weeklyGreenRaw = isGreenCandle(lastWeeklyCandle);
  const closeBreakoutRaw =
    previousRedCandle !== null &&
    lastWeeklyCandle.close > previousRedWeeklyHigh;
  const volumeRaw =
    averageWeeklyVolume !== null &&
    lastWeeklyCandle.volume > averageWeeklyVolume;
  const inSignalRsiZone =
    monthlyRsi !== null &&
    monthlyRsi >= settings.signalRsiMin &&
    monthlyRsi <= settings.signalRsiMax;
  const inPerfectRsiZone =
    monthlyRsi !== null &&
    monthlyRsi >= settings.perfectRsiMin &&
    monthlyRsi <= settings.perfectRsiMax;
  const inWatchlistRsiZone =
    monthlyRsi !== null &&
    monthlyRsi > settings.watchlistRsiMin &&
    monthlyRsi <= settings.watchlistRsiMax;

  const rawChecks = {
    monthlyRsi: inSignalRsiZone || inWatchlistRsiZone,
    weeklyGreen: weeklyGreenRaw,
    weeklyCloseBreakout: closeBreakoutRaw,
    volume: volumeRaw,
    topMarketCap: coinData.marketCapRank <= settings.maxMarketCapRank,
    minimumVolume: coinData.volume24h >= settings.minimum24hVolume,
    stablecoin: !coinData.isStablecoin,
    duplicateAlert: !coinData.alreadyAlertedThisWeek,
    btcTrend: coinData.btcTrendOk,
  };

  const checks = {
    monthlyRsi: !settings.monthlyRsiFilter || rawChecks.monthlyRsi,
    weeklyGreen:
      !settings.weeklyGreenCandleFilter || rawChecks.weeklyGreen,
    weeklyCloseBreakout:
      !settings.weeklyCloseBreakoutFilter ||
      rawChecks.weeklyCloseBreakout,
    volume: !settings.volumeConfirmationFilter || rawChecks.volume,
    topMarketCap: !settings.topMarketCapFilter || rawChecks.topMarketCap,
    minimumVolume:
      !settings.minimumVolumeFilter || rawChecks.minimumVolume,
    stablecoin: !settings.stablecoinFilter || rawChecks.stablecoin,
    duplicateAlert:
      !settings.duplicateAlertFilter || rawChecks.duplicateAlert,
    btcTrend: !settings.btcTrendFilter || rawChecks.btcTrend,
  };

  const signalPassed =
    checks.monthlyRsi &&
    checks.weeklyGreen &&
    checks.weeklyCloseBreakout &&
    checks.volume &&
    checks.topMarketCap &&
    checks.minimumVolume &&
    checks.stablecoin &&
    checks.duplicateAlert &&
    checks.btcTrend &&
    inSignalRsiZone;

  const watchlistPassed =
    checks.monthlyRsi &&
    checks.topMarketCap &&
    checks.minimumVolume &&
    checks.stablecoin &&
    (inWatchlistRsiZone || (inSignalRsiZone && !closeBreakoutRaw));

  let status: StrategyResult["status"] = "IGNORED";
  if (signalPassed) {
    status = "SIGNAL";
  } else if (watchlistPassed) {
    status = "WATCHLIST";
  }

  let stars = 1;
  if (status === "SIGNAL") {
    stars = inPerfectRsiZone ? 5 : 4;
  } else if (status === "WATCHLIST") {
    stars = inSignalRsiZone && weeklyGreenRaw ? 3 : 2;
  }

  if (settings.trendingCoinBoost && coinData.trending) {
    stars += 1;
  }

  return {
    status,
    stars: clampStars(stars),
    reason: buildReason({
      monthlyRsi,
      previousRedWeeklyHigh,
      status,
      inSignalRsiZone,
      inWatchlistRsiZone,
      weeklyGreenRaw,
      closeBreakoutRaw,
      volumeRaw,
    }),
    checks,
    conditions: {
      monthlyRsi: toCondition(
        settings.monthlyRsiFilter,
        checks.monthlyRsi,
        rawChecks.monthlyRsi,
        monthlyRsi,
      ),
      weeklyGreen: toCondition(
        settings.weeklyGreenCandleFilter,
        checks.weeklyGreen,
        rawChecks.weeklyGreen,
        weeklyGreenRaw,
      ),
      weeklyCloseBreakout: toCondition(
        settings.weeklyCloseBreakoutFilter,
        checks.weeklyCloseBreakout,
        rawChecks.weeklyCloseBreakout,
        previousRedWeeklyHigh,
      ),
      volume: toCondition(
        settings.volumeConfirmationFilter,
        checks.volume,
        rawChecks.volume,
        averageWeeklyVolume,
      ),
      topMarketCap: toCondition(
        settings.topMarketCapFilter,
        checks.topMarketCap,
        rawChecks.topMarketCap,
        coinData.marketCapRank,
      ),
      minimumVolume: toCondition(
        settings.minimumVolumeFilter,
        checks.minimumVolume,
        rawChecks.minimumVolume,
        coinData.volume24h,
      ),
      stablecoin: toCondition(
        settings.stablecoinFilter,
        checks.stablecoin,
        rawChecks.stablecoin,
        coinData.isStablecoin,
      ),
      duplicateAlert: toCondition(
        settings.duplicateAlertFilter,
        checks.duplicateAlert,
        rawChecks.duplicateAlert,
        coinData.alreadyAlertedThisWeek,
      ),
      btcTrend: toCondition(
        settings.btcTrendFilter,
        checks.btcTrend,
        rawChecks.btcTrend,
        coinData.btcTrendOk,
      ),
      trendingCoinBoost: toCondition(
        settings.trendingCoinBoost,
        true,
        coinData.trending,
        coinData.trending,
      ),
    },
  };
}

export function evaluateCoins(
  coins: StrategyCoinData[],
  settings: StrategySettings,
): EvaluatedCoin[] {
  return coins.map((coin) => ({
    ...coin,
    ...evaluateCoin(coin, settings),
  }));
}

function toCondition(
  enabled: boolean,
  passed: boolean,
  rawPassed: boolean,
  value?: number | boolean | string | null,
): ConditionResult {
  return {
    enabled,
    passed,
    rawPassed,
    value,
  };
}

function buildReason({
  monthlyRsi,
  previousRedWeeklyHigh,
  status,
  inSignalRsiZone,
  inWatchlistRsiZone,
  weeklyGreenRaw,
  closeBreakoutRaw,
  volumeRaw,
}: {
  monthlyRsi: number | null;
  previousRedWeeklyHigh: number;
  status: StrategyResult["status"];
  inSignalRsiZone: boolean;
  inWatchlistRsiZone: boolean;
  weeklyGreenRaw: boolean;
  closeBreakoutRaw: boolean;
  volumeRaw: boolean;
}) {
  if (monthlyRsi === null) {
    return "Not enough monthly candle closes to calculate RSI.";
  }

  if (status === "SIGNAL") {
    return `Monthly RSI ${monthlyRsi.toFixed(
      1,
    )} is in the signal zone, weekly candle closed green, and weekly close broke above ${previousRedWeeklyHigh.toFixed(
      2,
    )}.`;
  }

  if (status === "WATCHLIST") {
    if (inWatchlistRsiZone) {
      return `Monthly RSI ${monthlyRsi.toFixed(
        1,
      )} is in the watchlist zone. Needs weekly close above ${previousRedWeeklyHigh.toFixed(
        2,
      )} for confirmation.`;
    }

    return `RSI is attractive, but confirmation is incomplete: green candle ${yesNo(
      weeklyGreenRaw,
    )}, close breakout ${yesNo(closeBreakoutRaw)}, volume ${yesNo(volumeRaw)}.`;
  }

  if (!inSignalRsiZone && !inWatchlistRsiZone) {
    return `Monthly RSI ${monthlyRsi.toFixed(
      1,
    )} is outside the value and watchlist zones.`;
  }

  return "One or more enabled filters failed, so this coin is ignored for now.";
}

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}
