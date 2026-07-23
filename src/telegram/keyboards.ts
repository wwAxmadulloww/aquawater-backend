import { BotLang, t } from './texts';

/**
 * Persistent reply keyboard shown under the input field.
 *
 * Note: in groups these buttons are invisible unless the bot's privacy mode is
 * disabled in @BotFather. They always work in private chats.
 */
export function mainKeyboard(lang: BotLang) {
    const x = t(lang);
    return {
        keyboard: [
            [{ text: x.btnProducts }, { text: x.btnMyOrders }],
            [{ text: x.btnBranches }, { text: x.btnSupport }],
            [{ text: x.btnLanguage }],
        ],
        resize_keyboard: true,
        is_persistent: true,
    };
}

/** Asks the user to share their phone number via Telegram's contact button. */
export function requestPhoneKeyboard(lang: BotLang) {
    const x = t(lang);
    return {
        keyboard: [
            [{ text: x.btnSharePhone, request_contact: true }],
            [{ text: x.btnBack }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
    };
}

export function languageKeyboard() {
    return {
        inline_keyboard: [[
            { text: "🇺🇿 O'zbekcha", callback_data: 'lang:uz' },
            { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
            { text: '🇬🇧 English', callback_data: 'lang:en' },
        ]],
    };
}

export function siteLinksKeyboard(lang: BotLang, siteUrl: string) {
    const x = t(lang);
    return {
        inline_keyboard: [
            [{ text: x.openProducts, url: `${siteUrl}/products` }],
            [{ text: x.openOrders, url: `${siteUrl}/orders` }],
            [{ text: x.contactOperator, url: 'https://t.me/Axmadullo_77' }],
        ],
    };
}

export function orderCtaKeyboard(lang: BotLang, siteUrl: string) {
    const x = t(lang);
    return {
        inline_keyboard: [[{ text: x.openSite, url: `${siteUrl}/products` }]],
    };
}

/**
 * Operator action row attached to new-order cards in the admin group.
 *
 * `callback_data` is capped at 64 bytes by Telegram; `st:<action>:<24-char id>`
 * is 33 bytes, leaving comfortable headroom.
 */
export function orderActionKeyboard(orderId: string, currentStatus?: string) {
    const mark = (status: string, active: string, idle: string) =>
        currentStatus === status ? active : idle;

    return {
        inline_keyboard: [
            [
                { text: mark('confirmed', '✅ Qabul qilindi', 'Qabul qilish'), callback_data: `st:confirmed:${orderId}` },
                { text: mark('in_transit', '🚚 Yo\'lda', 'Yo\'lga chiqish'), callback_data: `st:in_transit:${orderId}` },
            ],
            [
                { text: mark('delivered', '🎉 Topshirildi', 'Topshirish'), callback_data: `st:delivered:${orderId}` },
                { text: mark('cancelled', '❌ Bekor qilindi', 'Bekor qilish'), callback_data: `st:cancelled:${orderId}` },
            ],
        ],
    };
}
