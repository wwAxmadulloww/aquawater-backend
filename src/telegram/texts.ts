export type BotLang = 'uz' | 'ru' | 'en';

export const SUPPORTED_LANGS: BotLang[] = ['uz', 'ru', 'en'];

export function normalizeLang(value: unknown): BotLang {
    return SUPPORTED_LANGS.includes(value as BotLang) ? (value as BotLang) : 'uz';
}

/**
 * Explicit shape for one language's copy. Without this, TypeScript infers a
 * distinct string-literal type per language from the object literals below,
 * and t()'s return type (pinned to TEXTS['uz']) rejects 'ru'/'en' whose
 * literal wording naturally differs — string here is what's actually needed.
 */
interface BotTexts {
    chooseLanguage: string;
    languageSet: string;
    welcome: (name: string) => string;
    mainMenu: string;
    btnProducts: string;
    btnMyOrders: string;
    btnBranches: string;
    btnSupport: string;
    btnOrder: string;
    btnLanguage: string;
    btnSharePhone: string;
    btnBack: string;
    productsTitle: string;
    productsEmpty: string;
    productsFooter: string;
    branchesTitle: string;
    branchesEmpty: string;
    ordersTitle: string;
    ordersEmpty: string;
    ordersNeedPhone: string;
    ordersNotRegistered: (phone: string) => string;
    phoneLinked: (name: string) => string;
    phoneInvalid: string;
    supportText: (site: string) => string;
    orderCta: string;
    openSite: string;
    openProducts: string;
    openOrders: string;
    contactOperator: string;
    unknown: string;
    error: string;
    dbUnavailable: string;
    statusChanged: (id: string, status: string) => string;
}

/**
 * Bot copy, kept separate from handler logic so wording can change without
 * touching control flow. Mirrors the languages the web app already supports.
 */
const TEXTS: Record<BotLang, BotTexts> = {
    uz: {
        chooseLanguage: '🌐 <b>Tilni tanlang</b> / Выберите язык / Choose language',
        languageSet: '✅ Til o\'zgartirildi.',

        welcome: (name: string) => `💧 <b>AquaWater Uzbekistan</b>\n\nAssalomu alaykum, <b>${name}</b>!\nToza ichimlik suvini uyingiz va ofisingizga tez yetkazib beramiz.\n\nQuyidagi menyudan foydalaning 👇`,
        mainMenu: '📋 <b>Asosiy menyu</b>',

        btnProducts: '💧 Mahsulotlar',
        btnMyOrders: '📦 Buyurtmalarim',
        btnBranches: '📍 Filiallar',
        btnSupport: '📞 Aloqa',
        btnOrder: '🛒 Buyurtma berish',
        btnLanguage: '🌐 Til',
        btnSharePhone: '📱 Telefon raqamni yuborish',
        btnBack: '⬅️ Orqaga',

        productsTitle: '💧 <b>Mahsulotlar va xizmatlar</b>',
        productsEmpty: 'Hozircha mahsulotlar mavjud emas. Keyinroq urinib ko\'ring.',
        productsFooter: 'Buyurtma berish uchun saytimizga o\'ting 👇',

        branchesTitle: '📍 <b>Bizning filiallar</b>',
        branchesEmpty: 'Filiallar ro\'yxati hozircha bo\'sh.',

        ordersTitle: '📦 <b>Sizning buyurtmalaringiz</b>',
        ordersEmpty: 'Sizda hali buyurtmalar yo\'q.',
        ordersNeedPhone: '📱 Buyurtmalaringizni ko\'rish uchun telefon raqamingizni yuboring.\n\nBu raqam saytdagi hisobingizga bog\'lanadi.',
        ordersNotRegistered: (phone: string) => `❌ <code>${phone}</code> raqami bilan ro'yxatdan o'tilmagan.\n\nAvval saytda ro'yxatdan o'ting.`,
        phoneLinked: (name: string) => `✅ Hisobingiz bog'landi!\n\nXush kelibsiz, <b>${name}</b>.`,
        phoneInvalid: '❌ Telefon raqam noto\'g\'ri. Faqat o\'zingizning raqamingizni yuboring.',

        supportText: (site: string) => `📞 <b>Aloqa</b>\n\n☎️ Call-markaz: <code>+998 71 200-00-00</code>\n💬 Operator: @Axmadullo_77\n🌐 Sayt: ${site}\n\n🕘 Ish vaqti: har kuni 08:00 – 22:00`,

        orderCta: '🛒 Buyurtma berish uchun saytimizga o\'ting:',
        openSite: '🌐 Saytni ochish',
        openProducts: '💧 Mahsulotlarni ko\'rish',
        openOrders: '📋 Buyurtmalarim',
        contactOperator: '💬 Operator',

        unknown: 'Tushunmadim. Menyudan tanlang 👇',
        error: '⚠️ Xatolik yuz berdi. Birozdan so\'ng urinib ko\'ring.',
        dbUnavailable: '⚠️ Ma\'lumotlar bazasi vaqtincha mavjud emas. Birozdan so\'ng urinib ko\'ring.',

        statusChanged: (id: string, status: string) => `🔔 <b>Buyurtma #${id}</b>\n\nHolat: ${status}`,
    },

    ru: {
        chooseLanguage: '🌐 <b>Выберите язык</b> / Tilni tanlang / Choose language',
        languageSet: '✅ Язык изменён.',

        welcome: (name: string) => `💧 <b>AquaWater Uzbekistan</b>\n\nЗдравствуйте, <b>${name}</b>!\nДоставляем чистую питьевую воду к вам домой и в офис.\n\nВоспользуйтесь меню ниже 👇`,
        mainMenu: '📋 <b>Главное меню</b>',

        btnProducts: '💧 Товары',
        btnMyOrders: '📦 Мои заказы',
        btnBranches: '📍 Филиалы',
        btnSupport: '📞 Контакты',
        btnOrder: '🛒 Заказать',
        btnLanguage: '🌐 Язык',
        btnSharePhone: '📱 Отправить номер',
        btnBack: '⬅️ Назад',

        productsTitle: '💧 <b>Товары и услуги</b>',
        productsEmpty: 'Товары пока недоступны. Попробуйте позже.',
        productsFooter: 'Для заказа перейдите на сайт 👇',

        branchesTitle: '📍 <b>Наши филиалы</b>',
        branchesEmpty: 'Список филиалов пока пуст.',

        ordersTitle: '📦 <b>Ваши заказы</b>',
        ordersEmpty: 'У вас пока нет заказов.',
        ordersNeedPhone: '📱 Отправьте номер телефона, чтобы увидеть свои заказы.\n\nОн будет привязан к вашему аккаунту на сайте.',
        ordersNotRegistered: (phone: string) => `❌ Номер <code>${phone}</code> не зарегистрирован.\n\nСначала зарегистрируйтесь на сайте.`,
        phoneLinked: (name: string) => `✅ Аккаунт привязан!\n\nДобро пожаловать, <b>${name}</b>.`,
        phoneInvalid: '❌ Неверный номер. Отправьте только свой номер.',

        supportText: (site: string) => `📞 <b>Контакты</b>\n\n☎️ Call-центр: <code>+998 71 200-00-00</code>\n💬 Оператор: @Axmadullo_77\n🌐 Сайт: ${site}\n\n🕘 Время работы: ежедневно 08:00 – 22:00`,

        orderCta: '🛒 Для заказа перейдите на сайт:',
        openSite: '🌐 Открыть сайт',
        openProducts: '💧 Смотреть товары',
        openOrders: '📋 Мои заказы',
        contactOperator: '💬 Оператор',

        unknown: 'Не понял. Выберите из меню 👇',
        error: '⚠️ Произошла ошибка. Попробуйте позже.',
        dbUnavailable: '⚠️ База данных временно недоступна. Попробуйте позже.',

        statusChanged: (id: string, status: string) => `🔔 <b>Заказ #${id}</b>\n\nСтатус: ${status}`,
    },

    en: {
        chooseLanguage: '🌐 <b>Choose language</b> / Tilni tanlang / Выберите язык',
        languageSet: '✅ Language updated.',

        welcome: (name: string) => `💧 <b>AquaWater Uzbekistan</b>\n\nHello, <b>${name}</b>!\nWe deliver clean drinking water to your home and office.\n\nUse the menu below 👇`,
        mainMenu: '📋 <b>Main menu</b>',

        btnProducts: '💧 Products',
        btnMyOrders: '📦 My orders',
        btnBranches: '📍 Branches',
        btnSupport: '📞 Contact',
        btnOrder: '🛒 Place order',
        btnLanguage: '🌐 Language',
        btnSharePhone: '📱 Share phone number',
        btnBack: '⬅️ Back',

        productsTitle: '💧 <b>Products and services</b>',
        productsEmpty: 'No products available yet. Please try later.',
        productsFooter: 'Visit our site to order 👇',

        branchesTitle: '📍 <b>Our branches</b>',
        branchesEmpty: 'The branch list is empty for now.',

        ordersTitle: '📦 <b>Your orders</b>',
        ordersEmpty: 'You have no orders yet.',
        ordersNeedPhone: '📱 Share your phone number to see your orders.\n\nIt will be linked to your website account.',
        ordersNotRegistered: (phone: string) => `❌ <code>${phone}</code> is not registered.\n\nPlease sign up on the website first.`,
        phoneLinked: (name: string) => `✅ Account linked!\n\nWelcome, <b>${name}</b>.`,
        phoneInvalid: '❌ Invalid number. Please share only your own number.',

        supportText: (site: string) => `📞 <b>Contact</b>\n\n☎️ Call centre: <code>+998 71 200-00-00</code>\n💬 Operator: @Axmadullo_77\n🌐 Website: ${site}\n\n🕘 Working hours: daily 08:00 – 22:00`,

        orderCta: '🛒 Visit our website to place an order:',
        openSite: '🌐 Open website',
        openProducts: '💧 Browse products',
        openOrders: '📋 My orders',
        contactOperator: '💬 Operator',

        unknown: 'I did not understand. Please use the menu 👇',
        error: '⚠️ Something went wrong. Please try again later.',
        dbUnavailable: '⚠️ The database is temporarily unavailable. Please try later.',

        statusChanged: (id: string, status: string) => `🔔 <b>Order #${id}</b>\n\nStatus: ${status}`,
    },
};

export function t(lang: BotLang): BotTexts {
    return TEXTS[lang] ?? TEXTS.uz;
}

/** Order status labels shown to customers and operators. */
export const STATUS_LABELS: Record<string, Record<BotLang, string>> = {
    pending: { uz: '🟡 Kutilmoqda', ru: '🟡 В ожидании', en: '🟡 Pending' },
    confirmed: { uz: '✅ Qabul qilindi', ru: '✅ Принят', en: '✅ Confirmed' },
    assigned: { uz: '👷 Kuryerga berildi', ru: '👷 Назначен курьеру', en: '👷 Assigned' },
    in_transit: { uz: '🚚 Yo\'lda', ru: '🚚 В пути', en: '🚚 In transit' },
    delivered: { uz: '🎉 Yetkazildi', ru: '🎉 Доставлен', en: '🎉 Delivered' },
    cancelled: { uz: '❌ Bekor qilindi', ru: '❌ Отменён', en: '❌ Cancelled' },
};

export function statusLabel(status: string, lang: BotLang = 'uz'): string {
    return STATUS_LABELS[status]?.[lang] ?? status;
}
