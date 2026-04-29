/**
 * Contract for any notification delivery service (Telegram, Slack, etc.).
 * Decouples the notification mechanism from the orchestration logic.
 */
export interface INotifierService {
  /**
   * Sends a text message to the configured destination.
   * @param message - The formatted message string to send
   * @returns true if the message was sent successfully
   */
  sendMessage(message: string): Promise<boolean>;
}
