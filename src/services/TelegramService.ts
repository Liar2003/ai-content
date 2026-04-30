import type { INotifierService } from '../interfaces/INotifier';

/**
 * Telegram API response shape for sendMessage.
 */
interface TelegramApiResponse {
  ok: boolean;
  description?: string;
}

/**
 * Telegram's maximum allowed message length.
 */
const TELEGRAM_MAX_LENGTH = 4096;

/**
 * Implements INotifierService using raw Telegram Bot API calls.
 * No wrapper libraries — just native fetch with Markdown parse mode.
 * Automatically splits long messages into multiple parts.
 */
export class TelegramService implements INotifierService {
  private readonly apiBase: string;
  private readonly chatId: string;

  constructor(botToken: string, chatId: string) {
    this.apiBase = `https://api.telegram.org/bot${botToken}`;
    this.chatId = chatId;
  }

  async sendMessage(message: string): Promise<boolean> {
    const chunks = this.splitMessage(message);

    console.log(
      `[TelegramService] Message length: ${message.length} chars → ${chunks.length} part(s)`
    );

    for (let i = 0; i < chunks.length; i++) {
      console.log(
        `[TelegramService] Sending part ${i + 1}/${chunks.length} (${chunks[i].length} chars)`
      );
      await this.sendSingleMessage(chunks[i]);

      // Small delay between messages to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return true;
  }

  /**
   * Sends a single message chunk to the Telegram API.
   */
  private async sendSingleMessage(text: string): Promise<void> {
    const url = `${this.apiBase}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text,
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
  }

  /**
   * Splits a long message into chunks that fit within Telegram's limit.
   * Tries to split at paragraph boundaries (double newline) first,
   * then at single newlines, then at spaces — never mid-word if possible.
   */
  private splitMessage(message: string): string[] {
    if (message.length <= TELEGRAM_MAX_LENGTH) {
      return [message];
    }

    const chunks: string[] = [];
    let remaining = message;

    while (remaining.length > 0) {
      if (remaining.length <= TELEGRAM_MAX_LENGTH) {
        chunks.push(remaining);
        break;
      }

      // Find the best split point within the limit
      let splitAt = this.findSplitPoint(remaining, TELEGRAM_MAX_LENGTH);
      chunks.push(remaining.slice(0, splitAt).trimEnd());
      remaining = remaining.slice(splitAt).trimStart();
    }

    return chunks;
  }

  /**
   * Finds the best position to split text, preferring natural boundaries:
   * 1. Paragraph break (double newline)
   * 2. Single newline
   * 3. Space
   * 4. Hard cut (last resort)
   */
  private findSplitPoint(text: string, maxLen: number): number {
    const searchRegion = text.slice(0, maxLen);

    // Try paragraph break first (split at numbered section boundaries like ၁။, ၂။)
    const lastParagraph = searchRegion.lastIndexOf('\n\n');
    if (lastParagraph > maxLen * 0.3) {
      return lastParagraph + 2;
    }

    // Try single newline
    const lastNewline = searchRegion.lastIndexOf('\n');
    if (lastNewline > maxLen * 0.3) {
      return lastNewline + 1;
    }

    // Try space
    const lastSpace = searchRegion.lastIndexOf(' ');
    if (lastSpace > maxLen * 0.3) {
      return lastSpace + 1;
    }

    // Hard cut as last resort
    return maxLen;
  }
}
