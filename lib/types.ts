export type SignalStatus = "SIGNAL" | "WATCHLIST" | "IGNORED";

export type StrategySwitches = {
  monthlyRsiFilter: boolean;
  weeklyGreenCandleFilter: boolean;
  weeklyCloseBreakoutFilter: boolean;
  volumeConfirmationFilter: boolean;
  topMarketCapFilter: boolean;
  minimumVolumeFilter: boolean;
  stablecoinFilter: boolean;
  duplicateAlertFilter: boolean;
  btcTrendFilter: boolean;
  trendingCoinBoost: boolean;
};

export type StrategyValues = {
  rsiLength: number;
  perfectRsiMin: number;
  perfectRsiMax: number;
  signalRsiMin: number;
  signalRsiMax: number;
  watchlistRsiMin: number;
  watchlistRsiMax: number;
  minimum24hVolume: number;
  alertMinimumStars: number;
  maxMarketCapRank: number;
};

export type AutomationSettings = {
  defaultScanUniverse:
    | "default"
    | "top100"
    | "top200"
    | "top500"
    | "binance"
    | "multi"
    | "ai"
    | "gaming"
    | "rwa"
    | "meme"
    | "trending"
    | "recent"
    | "events"
    | "social";
  dailyScanEnabled: boolean;
  weeklyScanEnabled: boolean;
  persistScansDefault: boolean;
  telegramAlertsDefault: boolean;
};

export type StrategySettings = StrategySwitches & StrategyValues & AutomationSettings;

export type CoinData = {
  name: string;
  symbol: string;
  price: number;
  monthlyRsi: number;
  weeklyOpen: number;
  weeklyClose: number;
  weeklyHigh: number;
  previousRedWeeklyHigh: number;
  weeklyVolume: number;
  averageWeeklyVolume20: number;
  volume24h: number;
  marketCapRank: number;
  isStablecoin: boolean;
  alreadyAlertedThisWeek: boolean;
  btcTrendOk: boolean;
  trending: boolean;
};

export type StrategyResult = {
  status: SignalStatus;
  stars: number;
  reason: string;
  checks: {
    monthlyRsi: boolean;
    weeklyGreen: boolean;
    weeklyCloseBreakout: boolean;
    volume: boolean;
    topMarketCap: boolean;
    minimumVolume: boolean;
    stablecoin: boolean;
    duplicateAlert: boolean;
    btcTrend: boolean;
  };
};

export type EvaluatedCoin = CoinData & StrategyResult;
