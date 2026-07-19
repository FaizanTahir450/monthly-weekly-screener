import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

loadLocalEnv();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!botToken || !chatId) {
  throw new Error(
    "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in root .env.local.",
  );
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

let response: Response;
try {
  response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Crypto Value Screener Telegram test alert is working.",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    },
  );
} catch (error) {
  throw new Error(
    "Could not reach api.telegram.org. Check your internet connection, VPN/proxy, firewall, or whether Telegram API access is blocked on this network.",
    { cause: error },
  );
} finally {
  clearTimeout(timeout);
}

if (!response.ok) {
  throw new Error(
    `Telegram test failed: ${response.status} ${response.statusText} ${await response.text()}`,
  );
}

console.log("Telegram test message sent.");

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const envFile = readFileSync(envPath, "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    process.env[key] ??= stripQuotes(value);
  }
}

function stripQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
