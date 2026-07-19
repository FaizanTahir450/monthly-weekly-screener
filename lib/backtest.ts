export type BacktestSignal = {
  symbol: string;
  signalDate: string;
  entryPrice: number;
  futureCloses: number[];
};

export type BacktestResult = {
  symbol: string;
  signalDate: string;
  entryPrice: number;
  return4Week: number | null;
  return8Week: number | null;
  return12Week: number | null;
  maxDrawdown: number | null;
};

export type BacktestSummary = {
  totalSignals: number;
  winRate4Week: number | null;
  winRate8Week: number | null;
  winRate12Week: number | null;
  averageReturn4Week: number | null;
  averageReturn8Week: number | null;
  averageReturn12Week: number | null;
  worstDrawdown: number | null;
};

export function backtestSignals(signals: BacktestSignal[]) {
  const results = signals.map(backtestSignal);

  return {
    results,
    summary: summarizeBacktest(results),
  };
}

export function backtestSignal(signal: BacktestSignal): BacktestResult {
  return {
    symbol: signal.symbol,
    signalDate: signal.signalDate,
    entryPrice: signal.entryPrice,
    return4Week: calculateReturn(signal.entryPrice, signal.futureCloses[3]),
    return8Week: calculateReturn(signal.entryPrice, signal.futureCloses[7]),
    return12Week: calculateReturn(signal.entryPrice, signal.futureCloses[11]),
    maxDrawdown: calculateMaxDrawdown(signal.entryPrice, signal.futureCloses),
  };
}

export function summarizeBacktest(
  results: BacktestResult[],
): BacktestSummary {
  return {
    totalSignals: results.length,
    winRate4Week: calculateWinRate(results.map((result) => result.return4Week)),
    winRate8Week: calculateWinRate(results.map((result) => result.return8Week)),
    winRate12Week: calculateWinRate(
      results.map((result) => result.return12Week),
    ),
    averageReturn4Week: averageNullable(
      results.map((result) => result.return4Week),
    ),
    averageReturn8Week: averageNullable(
      results.map((result) => result.return8Week),
    ),
    averageReturn12Week: averageNullable(
      results.map((result) => result.return12Week),
    ),
    worstDrawdown: minNullable(results.map((result) => result.maxDrawdown)),
  };
}

function calculateReturn(entryPrice: number, exitPrice: number | undefined) {
  if (!exitPrice || entryPrice <= 0) {
    return null;
  }

  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

function calculateMaxDrawdown(entryPrice: number, closes: number[]) {
  if (entryPrice <= 0 || closes.length === 0) {
    return null;
  }

  return Math.min(
    ...closes.map((close) => ((close - entryPrice) / entryPrice) * 100),
  );
}

function calculateWinRate(values: (number | null)[]) {
  const completed = values.filter((value): value is number => value !== null);

  if (completed.length === 0) {
    return null;
  }

  const winners = completed.filter((value) => value > 0);
  return (winners.length / completed.length) * 100;
}

function averageNullable(values: (number | null)[]) {
  const completed = values.filter((value): value is number => value !== null);

  if (completed.length === 0) {
    return null;
  }

  return (
    completed.reduce((sum, value) => sum + value, 0) / completed.length
  );
}

function minNullable(values: (number | null)[]) {
  const completed = values.filter((value): value is number => value !== null);
  return completed.length === 0 ? null : Math.min(...completed);
}
