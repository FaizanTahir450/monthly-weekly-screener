import { saveAlertLog } from "./supabase.ts";
import type { ScanResponse, ScanResult } from "./scanner.ts";
import type { StrategySettings } from "./types.ts";

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

export function isTelegramConfigured() {
  return Boolean(telegramBotToken && telegramChatId);
}

export async function sendTelegramSignalAlerts(
  scan: ScanResponse,
  settings: StrategySettings,
) {
  const signals = scan.results.filter(isAlertableSignal(settings));

  if (!isTelegramConfigured()) {
    return {
      sent: 0,
      skipped: signals.length,
      reason: "Telegram env vars are not configured.",
    };
  }

  let sent = 0;
  const failures: { symbol: string; error: string }[] = [];

  for (const result of signals) {
    try {
      await sendTelegramMessage(formatSignalMessage(result));
      await saveAlertLog({
        symbol: result.data.symbol,
        stars: result.data.stars,
        status: result.data.status,
        reason: result.data.reason,
      });
      sent += 1;
    } catch (error) {
      failures.push({
        symbol: result.data.symbol,
        error: error instanceof Error ? error.message : "Unknown alert error",
      });
    }
  }

  return {
    sent,
    skipped: signals.length - sent,
    failures,
  };
}

function isAlertableSignal(settings: StrategySettings) {
  return (
    result: ScanResult,
  ): result is ScanResult & { data: NonNullable<ScanResult["data"]> } =>
    Boolean(
      result.ok &&
        result.data &&
        result.data.status === "SIGNAL" &&
        result.data.stars >= settings.alertMinimumStars,
    );
}

async function sendTelegramMessage(text: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Telegram sendMessage failed: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }
}

function formatSignalMessage(
  result: ScanResult & { data: NonNullable<ScanResult["data"]> },
) {
  return [
    `${result.data.stars}-Star Crypto Signal`,
    "",
    `Coin: ${escapeHtml(result.data.symbol)}`,
    `Monthly RSI: ${formatNumber(result.data.monthlyRsi)}`,
    `Weekly Close: ${formatNumber(result.data.weeklyClose)}`,
    `Previous Red High: ${formatNumber(result.data.previousRedWeeklyHigh)}`,
    `Reason: ${escapeHtml(result.data.reason)}`,
  ].join("\n");
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "N/A" : value.toFixed(2);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
