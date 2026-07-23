import axios, { AxiosInstance } from 'axios';

/**
 * Escapes text interpolated into a `parse_mode: 'HTML'` message.
 *
 * Telegram rejects the entire message with 400 if the markup does not parse,
 * so an unescaped `<` or `&` in a customer name silently loses the whole
 * notification. Always wrap dynamic values with this.
 */
export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** Strips HTML tags, used as a fallback when a message fails to parse. */
export function stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, '');
}

export interface TelegramError {
    ok: false;
    error_code?: number;
    description?: string;
    parameters?: { retry_after?: number; migrate_to_chat_id?: number };
}

export class TelegramApiError extends Error {
    public readonly code?: number;
    public readonly description?: string;
    public readonly retryAfter?: number;

    constructor(method: string, payload: TelegramError | undefined, fallback: string) {
        super(`[${method}] ${payload?.description || fallback}`);
        this.name = 'TelegramApiError';
        this.code = payload?.error_code;
        this.description = payload?.description;
        this.retryAfter = payload?.parameters?.retry_after;
    }

    /** True when the chat blocked the bot or no longer exists. */
    get isUnreachableChat(): boolean {
        const d = this.description || '';
        return this.code === 403
            || d.includes('chat not found')
            || d.includes('bot was blocked')
            || d.includes('user is deactivated');
    }
}

/**
 * Thin, resilient wrapper over the Telegram Bot API.
 *
 * Handles the three failure modes that break naive implementations in
 * production: 429 flood control, transient 5xx from Telegram, and long-poll
 * timeouts being mistaken for errors.
 */
export class TelegramClient {
    private readonly http: AxiosInstance;
    private readonly token: string;

    /**
     * Telegram allows ~30 messages/second overall. Serialising outbound sends
     * behind a small delay keeps us well under it without needing a queue.
     */
    private sendChain: Promise<unknown> = Promise.resolve();
    private static readonly SEND_INTERVAL_MS = 40;

    constructor(token: string) {
        this.token = token;
        this.http = axios.create({
            baseURL: `https://api.telegram.org/bot${token}`,
            timeout: 15000,
        });
    }

    get isConfigured(): boolean {
        return Boolean(this.token);
    }

    /**
     * Performs an API call, retrying on flood control and transient errors.
     * `timeoutMs` overrides the default for long-polling calls.
     */
    public async call<T = any>(
        method: string,
        payload: Record<string, unknown> = {},
        options: { timeoutMs?: number; retries?: number } = {},
    ): Promise<T> {
        const maxRetries = options.retries ?? 2;
        let attempt = 0;

        for (;;) {
            try {
                const res = await this.http.post(`/${method}`, payload, {
                    timeout: options.timeoutMs,
                });
                return res.data.result as T;
            } catch (err: any) {
                const data: TelegramError | undefined = err?.response?.data;
                const status: number | undefined = err?.response?.status;
                const apiError = new TelegramApiError(method, data, err.message);

                // 429: Telegram tells us exactly how long to wait.
                if (status === 429 && apiError.retryAfter !== undefined && attempt < maxRetries) {
                    const waitMs = Math.min(apiError.retryAfter * 1000 + 250, 60000);
                    console.warn(`[Telegram] Flood control on ${method}, waiting ${waitMs}ms`);
                    await delay(waitMs);
                    attempt += 1;
                    continue;
                }

                // Transient upstream failures and network blips are worth one retry.
                const isTransient = (status !== undefined && status >= 500)
                    || err.code === 'ECONNRESET'
                    || err.code === 'ETIMEDOUT'
                    || err.code === 'ECONNABORTED';

                if (isTransient && attempt < maxRetries) {
                    await delay(500 * 2 ** attempt);
                    attempt += 1;
                    continue;
                }

                throw apiError;
            }
        }
    }

    /** Serialises sends so a burst of notifications cannot trip flood control. */
    private enqueue<T>(fn: () => Promise<T>): Promise<T> {
        const run = this.sendChain.then(fn, fn);
        this.sendChain = run.then(
            () => delay(TelegramClient.SEND_INTERVAL_MS),
            () => delay(TelegramClient.SEND_INTERVAL_MS),
        );
        return run;
    }

    /**
     * Sends an HTML message. Returns the message id, or null when the chat is
     * unreachable (blocked/deleted) — callers treat that as a non-error.
     */
    public async sendMessage(
        chatId: string | number,
        text: string,
        replyMarkup?: unknown,
        options: { disablePreview?: boolean } = {},
    ): Promise<number | null> {
        return this.enqueue(async () => {
            const body = {
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: options.disablePreview !== false },
                ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
            };

            try {
                const msg = await this.call<{ message_id: number }>('sendMessage', body);
                return msg.message_id;
            } catch (err) {
                const e = err as TelegramApiError;
                if (e.isUnreachableChat) {
                    console.warn(`[Telegram] Chat ${chatId} unreachable: ${e.description}`);
                    return null;
                }

                // Most likely a parse failure from unexpected markup — retry as
                // plain text so the operator still receives the information.
                console.error(`[Telegram] sendMessage failed, retrying as plain text: ${e.message}`);
                try {
                    const msg = await this.call<{ message_id: number }>('sendMessage', {
                        chat_id: chatId,
                        text: stripHtml(text),
                        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
                    }, { retries: 0 });
                    return msg.message_id;
                } catch (fallbackErr) {
                    console.error('[Telegram] Plain-text fallback failed:', (fallbackErr as Error).message);
                    return null;
                }
            }
        });
    }

    public async editMessageText(
        chatId: string | number,
        messageId: number,
        text: string,
        replyMarkup?: unknown,
    ): Promise<boolean> {
        try {
            await this.call('editMessageText', {
                chat_id: chatId,
                message_id: messageId,
                text,
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true },
                ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
            });
            return true;
        } catch (err) {
            const e = err as TelegramApiError;
            // Editing to identical content is not a real failure.
            if (e.description?.includes('message is not modified')) return true;
            console.error(`[Telegram] editMessageText failed: ${e.message}`);
            return false;
        }
    }

    public async answerCallbackQuery(id: string, text?: string, showAlert = false): Promise<void> {
        try {
            await this.call('answerCallbackQuery', {
                callback_query_id: id,
                ...(text ? { text: text.slice(0, 200) } : {}),
                show_alert: showAlert,
            }, { retries: 0 });
        } catch (err) {
            // Callback queries expire after ~15s; a late answer is harmless.
            console.warn(`[Telegram] answerCallbackQuery failed: ${(err as Error).message}`);
        }
    }

    public async sendLocation(chatId: string | number, latitude: number, longitude: number): Promise<void> {
        try {
            await this.enqueue(() => this.call('sendLocation', { chat_id: chatId, latitude, longitude }));
        } catch (err) {
            console.warn(`[Telegram] sendLocation failed: ${(err as Error).message}`);
        }
    }

    public async sendChatAction(chatId: string | number, action = 'typing'): Promise<void> {
        try {
            await this.call('sendChatAction', { chat_id: chatId, action }, { retries: 0 });
        } catch {
            // Purely cosmetic — never surface a failure.
        }
    }

    public async getUpdates(offset: number, timeoutSec: number): Promise<any[]> {
        return this.call<any[]>('getUpdates', {
            offset,
            timeout: timeoutSec,
            allowed_updates: ['message', 'callback_query', 'my_chat_member'],
        }, {
            // Must exceed the long-poll window or every poll aborts client-side.
            timeoutMs: (timeoutSec + 10) * 1000,
            retries: 0,
        });
    }

    public getMe(): Promise<{ id: number; username: string; first_name: string }> {
        return this.call('getMe');
    }

    public deleteWebhook(dropPending = false): Promise<boolean> {
        return this.call('deleteWebhook', { drop_pending_updates: dropPending });
    }

    public getWebhookInfo(): Promise<{ url: string; pending_update_count: number }> {
        return this.call('getWebhookInfo');
    }

    /** Registers the command list shown in the Telegram UI menu. */
    public async setMyCommands(commands: { command: string; description: string }[]): Promise<void> {
        try {
            await this.call('setMyCommands', { commands });
        } catch (err) {
            console.warn(`[Telegram] setMyCommands failed: ${(err as Error).message}`);
        }
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
