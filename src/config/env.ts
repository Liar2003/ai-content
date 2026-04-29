/**
 * Centralized, validated environment configuration.
 * Fails fast at startup if any required variable is missing.
 */
export interface EnvConfig {
  geminiApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  cronSecret: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadEnvConfig(): EnvConfig {
  return {
    geminiApiKey: requireEnv('GEMINI_API_KEY'),
    telegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    telegramChatId: requireEnv('TELEGRAM_CHAT_ID'),
    cronSecret: requireEnv('CRON_SECRET'),
  };
}
