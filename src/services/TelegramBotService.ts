import axios from 'axios';
import Order from '../models/Order';
import Branch from '../models/Branch';

export class TelegramBotService {
    private static isPolling = false;
    private static lastUpdateId = 0;

    private static getBotToken(): string | null {
        return process.env.TELEGRAM_BOT_TOKEN || null;
    }

    private static getAdminChatId(): string | null {
        return process.env.TELEGRAM_ADMIN_CHAT_ID || null;
    }

    private static getWebAppUrl(): string {
        return process.env.WEBAPP_URL || 'https://aquawater-uz.vercel.app';
    }

    /**
     * Sends a formatted message to a Telegram Chat with optional reply markup
     */
    public static async sendMessage(text: string, chatId?: string, replyMarkup?: any): Promise<boolean> {
        try {
            const token = this.getBotToken();
            const targetChatId = chatId || this.getAdminChatId();

            if (!token || !targetChatId) {
                console.warn('[TelegramBotService] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID missing.');
                return false;
            }

            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            await axios.post(url, {
                chat_id: targetChatId,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...(replyMarkup && { reply_markup: replyMarkup }),
            });

            return true;
        } catch (err: any) {
            console.error('[TelegramBotService] Error sending message with markup:', err?.response?.data || err.message);
            // Fallback: send plain message without reply_markup if markup failed
            if (replyMarkup) {
                try {
                    const token = this.getBotToken();
                    const targetChatId = chatId || this.getAdminChatId();
                    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                        chat_id: targetChatId,
                        text,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                    });
                    return true;
                } catch (fallbackErr: any) {
                    console.error('[TelegramBotService] Fallback send error:', fallbackErr?.response?.data || fallbackErr.message);
                }
            }
            return false;
        }
    }

    /**
     * Answers callback queries (button clicks)
     */
    private static async answerCallbackQuery(callbackQueryId: string, text: string) {
        try {
            const token = this.getBotToken();
            if (!token) return;
            await axios.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                callback_query_id: callbackQueryId,
                text,
                show_alert: true,
            });
        } catch (err: any) {
            console.error('[TelegramBotService] Error answering callback:', err.message);
        }
    }

    /**
     * Edits message text and reply markup
     */
    private static async editMessageText(chatId: string, messageId: number, text: string, replyMarkup?: any) {
        try {
            const token = this.getBotToken();
            if (!token) return;
            await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, {
                chat_id: chatId,
                message_id: messageId,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...(replyMarkup && { reply_markup: replyMarkup }),
            });
        } catch (err: any) {
            console.error('[TelegramBotService] Error editing message:', err.message);
        }
    }

    /**
     * Starts listening for updates
     */
    public static startPolling() {
        if (this.isPolling) return;
        const token = this.getBotToken();
        if (!token) {
            console.warn('[TelegramBotService] Cannot start polling: TELEGRAM_BOT_TOKEN missing.');
            return;
        }

        this.isPolling = true;
        console.log('🤖 [TelegramBotService] Rich Interactive Bot Polling started...');
        setTimeout(() => {
            this.pollUpdates().catch(err => console.error('[TelegramBotService] Unhandled poll error:', err));
        }, 1000);
    }

    private static async pollUpdates() {
        const token = this.getBotToken();
        if (!token) return;

        while (this.isPolling) {
            try {
                const response = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
                    params: {
                        offset: this.lastUpdateId + 1,
                        timeout: 5,
                    },
                    timeout: 8000,
                });

                const updates = response.data?.result || [];
                for (const update of updates) {
                    this.lastUpdateId = update.update_id;
                    await this.handleUpdate(update);
                }
            } catch (err: any) {
                if (err.code !== 'ECONNABORTED') {
                    console.error('[TelegramBotService] Polling error:', err.message);
                }
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }
    }

    private static async handleUpdate(update: any) {
        // 1. Handle Callback Query (Button Clicks in Group/Private)
        if (update.callback_query) {
            await this.handleCallbackQuery(update.callback_query);
            return;
        }

        // 2. Handle Text Messages
        const message = update.message || update.channel_post;
        if (!message || !message.text) return;

        const chatId = message.chat.id.toString();
        const text = message.text.trim();
        const lowerText = text.toLowerCase();
        const senderName = message.from?.first_name || message.chat?.title || 'Foydalanuvchi';

        console.log(`[TelegramBotService] Message from ${senderName} (${chatId}): ${text}`);

        // Main Menu Keyboard (standard text buttons)
        const mainKeyboard = {
            keyboard: [
                [
                    { text: '💧 Suv Buyurtma Qilish' },
                    { text: '📦 Buyurtmalarim' }
                ],
                [
                    { text: '📍 Filiallar va Xarita' },
                    { text: '📞 Qo\'llab-quvvatlash' }
                ]
            ],
            resize_keyboard: true
        };

        if (lowerText.startsWith('/start') || lowerText.startsWith('/help') || lowerText.startsWith('/id')) {
            const welcomeText = `
💧 <b>AquaWater Uzbekistan Rasmiy Botiga Xush Kelibsiz!</b>

Assalomu alaykum, <b>${senderName}</b>!
Toza va shifobaxsh ichimlik suvlarini uyingizga yoki ofisingizga tez va qulay yetkazib beramiz.

🆔 <b>Ushbu Chat / Guruh ID-si:</b> <code>${chatId}</code>

👇 <i>Pastdagi menyu tugmalari orqali buyurtma berishingiz mumkin:</i>
`.trim();

            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        { text: '🌐 Vebsaytga O\'tish', url: this.getWebAppUrl() },
                        { text: '📞 Operator bilan aloqa', url: 'https://t.me/Axmadullo_77' }
                    ]
                ]
            };

            await this.sendMessage(welcomeText, chatId, mainKeyboard);
            await this.sendMessage('👇 <b>Tezkor havolalar:</b>', chatId, inlineKeyboard);
            return;
        }

        if (lowerText.includes('suv buyurtma') || lowerText.includes('do\'kon') || lowerText.includes('katalog')) {
            const msg = `
💧 <b>Suv va Aksessuarlar Katalogi</b>

Mahsulotlarimizni ko'rish va buyurtma berish uchun vebsaytimizga o'ting:
`.trim();
            const inlineApp = {
                inline_keyboard: [
                    [{ text: '🌐 Saytda Mahsulotlarni Ko\'rish', url: `${this.getWebAppUrl()}/products` }]
                ]
            };
            await this.sendMessage(msg, chatId, inlineApp);
            return;
        }

        if (lowerText.includes('filial')) {
            try {
                const branches = await Branch.find({ isActive: true }).limit(5);
                let branchMsg = `📍 <b>AquaWater Filiallari:</b>\n\n`;
                if (branches.length === 0) {
                    branchMsg += `• Toshkent Markaziy Filiali — Chilonzor 14-mavze\n⏰ Ish vaqti: 08:00 - 22:00\n📞 +998 90 123 45 67`;
                } else {
                    branches.forEach((b: any) => {
                        branchMsg += `🏢 <b>${b.name}</b>\n📍 ${b.address}\n⏰ ${b.workingHours}\n📞 ${b.phone}\n\n`;
                    });
                }
                await this.sendMessage(branchMsg, chatId, mainKeyboard);
            } catch {
                await this.sendMessage('📍 <b>Toshkent Markaziy Filiali</b>\nChilonzor 14-mavze\n📞 +998 90 123 45 67', chatId, mainKeyboard);
            }
            return;
        }

        if (lowerText.includes('qo\'llab') || lowerText.includes('biz haqimizda') || lowerText.includes('aloqa')) {
            const supportMsg = `
ℹ️ <b>AquaWater Uzbekistan</b>

Bizning maqsadimiz — aholini toza, sifatli va foydali mineral suv bilan uzluksiz ta'minlash.

📞 <b>Call-Markaz:</b> +998 (71) 200-00-00
💬 <b>Operator:</b> @Axmadullo_77
🌐 <b>Vebsayt:</b> ${this.getWebAppUrl()}
`.trim();
            await this.sendMessage(supportMsg, chatId, mainKeyboard);
            return;
        }

        if (lowerText.includes('buyurtma')) {
            const orderMsg = `
📦 <b>Sizning Buyurtmalaringiz:</b>

Buyurtmalar tarixi va holatini ko'rish uchun saytimizdagi shaxsiy kabinetga kiring:
`.trim();
            const inlineOrders = {
                inline_keyboard: [
                    [{ text: '📋 Buyurtmalarni Ko\'rish', url: `${this.getWebAppUrl()}/orders` }]
                ]
            };
            await this.sendMessage(orderMsg, chatId, inlineOrders);
            return;
        }

        // Default response for any other text
        const defaultText = `
💧 <b>AquaWater Bot</b>

Assalomu alaykum! Savol va buyurtmalar uchun quyidagi menyu tugmalaridan foydalaning.
`.trim();
        await this.sendMessage(defaultText, chatId, mainKeyboard);
    }

    /**
     * Handles interactive inline button clicks in Admin/Courier Telegram Group
     */
    private static async handleCallbackQuery(cb: any) {
        const data = cb.data as string;
        const cbId = cb.id;
        const message = cb.message;
        if (!message || !data) return;

        const chatId = message.chat.id.toString();
        const messageId = message.message_id;
        const clickerName = cb.from?.first_name || 'Kuryer/Admin';

        if (data.startsWith('st_')) {
            const parts = data.split('_');
            const action = parts[1];
            const orderId = parts[2];

            let newStatus = '';
            let statusBadge = '';

            if (action === 'accept') {
                newStatus = 'confirmed';
                statusBadge = '✅ QABUL QILINDI';
            } else if (action === 'transit') {
                newStatus = 'in_transit';
                statusBadge = '🚚 YO\'LGA CHIQDI';
            } else if (action === 'deliver') {
                newStatus = 'delivered';
                statusBadge = '🎉 TOPSHIRILDI';
            }

            if (newStatus) {
                try {
                    await Order.findByIdAndUpdate(orderId, { status: newStatus });
                } catch (e) {
                    console.error('[TelegramBotService] DB update error:', e);
                }

                await this.answerCallbackQuery(cbId, `Status: ${statusBadge} (${clickerName})`);

                const originalText = message.text || '';
                const updatedText = `${originalText}\n\n📌 <b>Holat:</b> ${statusBadge} (Bajaruvchi: <b>${clickerName}</b>)`;

                const updatedKeyboard = {
                    inline_keyboard: [
                        [
                            { text: action === 'accept' ? '✅ Qabul Qilindi' : 'Qabul Qilish', callback_data: `st_accept_${orderId}` },
                            { text: action === 'transit' ? '🚚 Yo\'lda' : 'Yo\'lga Chiqish', callback_data: `st_transit_${orderId}` },
                            { text: action === 'deliver' ? '🎉 Topshirildi' : 'Topshirish', callback_data: `st_deliver_${orderId}` }
                        ]
                    ]
                };

                await this.editMessageText(chatId, messageId, updatedText, updatedKeyboard);
            }
        }
    }

    /**
     * Formats and sends a rich order card with interactive buttons to Telegram Group
     */
    public static async sendOrderNotification(order: any, userPhone: string, userName: string): Promise<boolean> {
        const orderId = order._id?.toString() || order.id || 'NOMA\'LUM';

        const itemsList = Array.isArray(order.items)
            ? order.items.map((i: any) => `• <b>${i.nameSnapshot || 'Mahsulot'}</b> x ${i.qty} — <i>${(i.priceSnapshot * i.qty).toLocaleString('uz-UZ')} so'm</i>`).join('\n')
            : '• Mahsulotlar kiritilmagan';

        const totalPrice = Array.isArray(order.items)
            ? order.items.reduce((sum: number, i: any) => sum + (i.priceSnapshot * i.qty), 0)
            : 0;

        const addr = order.addressSnapshot || {};
        const addressStr = `${addr.region || ''}, ${addr.city || ''}, ${addr.district || ''}, ${addr.street || ''} k., ${addr.house || ''}-uy ${addr.apartment ? `, ${addr.apartment}-xona` : ''}`;

        const paymentMethodName = order.paymentMethod === 'click' ? '💳 Click' : order.paymentMethod === 'payme' ? '💳 Payme' : '💵 Naqd (Cash)';

        const messageText = `
<b>🔔 YANGI BUYURTMA #${orderId.slice(-6).toUpperCase()}</b>

<b>👤 Xaridor:</b> ${userName || 'Noma\'lum'}
<b>📞 Telefon:</b> <code>${userPhone}</code>

<b>📦 Tarkibi:</b>
${itemsList}

<b>💰 Jami Summa:</b> <b>${totalPrice.toLocaleString('uz-UZ')} so'm</b>
<b>💳 To'lov:</b> ${paymentMethodName}

<b>📍 Manzil:</b>
${addressStr}

<b>📅 Vaqt:</b> ${order.deliveryDate || ''} (${order.deliveryTimeSlot || ''})

📌 <b>Holat:</b> 🟡 KUTILMOQDA (PENDING)
`.trim();

        const interactiveKeyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Qabul Qilish', callback_data: `st_accept_${orderId}` },
                    { text: '🚚 Yo\'lga Chiqish', callback_data: `st_transit_${orderId}` },
                    { text: '🎉 Topshirish', callback_data: `st_deliver_${orderId}` }
                ]
            ]
        };

        return this.sendMessage(messageText, undefined, interactiveKeyboard);
    }
}
