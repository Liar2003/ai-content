import type { INotifierService } from '../interfaces/INotifier';

/**
 * Telegram API response shape for sendMessage.
 */
interface TelegramApiResponse {
  ok: boolean;
  description?: string;
}

/**
 * Implements INotifierService using raw Telegram Bot API calls.
 * No wrapper libraries — just native fetch with Markdown parse mode.
 */
export class TelegramService implements INotifierService {
  private readonly apiBase: string;
  private readonly chatId: string;

  constructor(botToken: string, chatId: string) {
    this.apiBase = `https://api.telegram.org/bot${botToken}`;
    this.chatId = chatId;
  }

  async sendMessage(message: string): Promise<boolean> {
    const url = `${this.apiBase}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Telegram API error (${response.status}): ${errorText}`
      );
    }

    const result: TelegramApiResponse = await response.json() as TelegramApiResponse;

    if (!result.ok) {
      throw new Error(
        `Telegram API rejected message: ${result.description ?? 'Unknown error'}`
      );
    }

    return true;
  }
}
