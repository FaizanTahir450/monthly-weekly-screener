export type Candle = {
  openTime?: number;
  open: number;
  high: number;
  low?: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  closeTime?: number;
};

export function calculateRSI(
  closes: number[],
  period: number,
): number | null {
  if (period <= 0 || closes.length <= period) {
    return null;
  }

  let gainSum = 0;
  let lossSum = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = closes[index] - closes[index - 1];
    if (change >= 0) {
      gainSum += change;
    } else {
      lossSum += Math.abs(change);
    }
  }

  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;

  for (let index = period + 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export function averageVolume(
  candles: Candle[],
  period: number,
): number | null {
  if (period <= 0 || candles.length < period) {
    return null;
  }

  const candlesToAverage = candles.slice(-period);
  const volumeSum = candlesToAverage.reduce(
    (sum, candle) => sum + candle.volume,
    0,
  );

  return volumeSum / candlesToAverage.length;
}

export function findPreviousRedCandle(candles: Candle[]): Candle | null {
  if (candles.length < 2) {
    return null;
  }

  for (let index = candles.length - 2; index >= 0; index -= 1) {
    const candle = candles[index];
    if (candle.close < candle.open) {
      return candle;
    }
  }

  return null;
}

export function isGreenCandle(candle: Candle): boolean {
  return candle.close > candle.open;
}
