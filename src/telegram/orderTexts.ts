import { BotLang } from './texts';

/**
 * Copy for the in-chat ordering flow.
 *
 * Kept beside the existing `texts.ts` rather than merged into it: that table
 * covers the informational bot, this one covers a checkout, and the two change
 * for different reasons.
 */

export interface OrderTexts {
    btnCart: string;
    btnCatalog: string;

    catalogTitle: string;
    catalogEmpty: string;
    catalogPick: string;

    outOfStock: string;
    added: (name: string) => string;
    inCart: (qty: number) => string;

    cartTitle: string;
    cartEmpty: string;
    cartTotal: (sum: string) => string;
    cartCleared: string;

    btnAdd: string;
    btnCheckout: string;
    btnClear: string;
    btnBackToCatalog: string;
    btnRemove: string;

    needPhone: string;

    askRegion: string;
    askCity: string;
    askDistrict: string;
    askStreet: string;
    askHouse: string;
    btnSameAddress: (line: string) => string;
    askDate: string;
    askSlot: string;
    askPayment: string;

    stepHint: (step: number, total: number) => string;
    tooShort: string;

    confirmTitle: string;
    confirmAddress: string;
    confirmWhen: string;
    confirmPayment: string;
    btnConfirm: string;
    btnCancelCheckout: string;
    checkoutCancelled: string;

    placed: (code: string) => string;
    placeFailed: (reason: string) => string;

    payCash: string;
    payClick: string;
    payPayme: string;

    today: string;
    tomorrow: string;

    orderTitle: (code: string) => string;
    btnRepeat: string;
    btnCancelOrder: string;
    orderCancelled: string;
    cannotCancel: string;
    repeatAdded: string;
    orderNotFound: string;

    btnBottles: string;
    bottlesTitle: string;
    bottlesNone: string;
    bottlesOwed: (n: number) => string;
    bottlesHint: string;

    btnSubscribe: string;
    subsTitle: string;
    subsNone: string;
    subsAskDay: string;
    subsCreated: (day: string, slot: string) => string;
    subsPaused: string;
    subsResumed: string;
    subsRemoved: string;
    btnPause: string;
    btnResume: string;
    btnDelete: string;
    weekdays: string[];
    deliveryFee: string;
    freeDelivery: string;

    btnReturnBottle: string;
    btnKeepBottle: string;
    containerNote: string;
}

const PAY = { cash: '💵', click: '🔵', payme: '🟢' };

export const ORDER_TEXTS: Record<BotLang, OrderTexts> = {
    uz: {
        btnCart: '🛒 Savat',
        btnCatalog: '💧 Mahsulotlar',

        catalogTitle: '💧 <b>Mahsulotlar</b>',
        catalogEmpty: 'Hozircha mahsulotlar mavjud emas.',
        catalogPick: 'Batafsil ko\'rish uchun mahsulotni tanlang 👇',

        outOfStock: '❌ Bu mahsulot hozircha sotuvda yo\'q.',
        added: (name) => `✅ <b>${name}</b> savatga qo'shildi.`,
        inCart: (qty) => `Savatda: <b>${qty}</b> dona`,

        cartTitle: '🛒 <b>Savatingiz</b>',
        cartEmpty: '🛒 Savat bo\'sh.\n\nMahsulotlar bo\'limidan tanlang.',
        cartTotal: (sum) => `\n💰 <b>Jami: ${sum}</b>`,
        cartCleared: '🗑 Savat tozalandi.',

        btnAdd: '➕ Savatga qo\'shish',
        btnCheckout: '✅ Buyurtma berish',
        btnClear: '🗑 Tozalash',
        btnBackToCatalog: '⬅️ Mahsulotlar',
        btnRemove: '❌',

        needPhone: '📱 Buyurtma berish uchun telefon raqamingizni yuboring.',

        askRegion: '📍 <b>Viloyatni tanlang</b>',
        askCity: '🏙 <b>Shahar yoki tuman markazini</b> yozing:',
        askDistrict: '🏘 <b>Tumanni yoki mahallani</b> yozing:',
        askStreet: '🛣 <b>Ko\'cha nomini</b> yozing:',
        askHouse: '🏠 <b>Uy va xonadon raqamini</b> yozing:',
        btnSameAddress: (line) => `📍 O'sha manzil: ${line}`,
        askDate: '📅 <b>Yetkazish sanasini tanlang</b>',
        askSlot: '🕒 <b>Qulay vaqtni tanlang</b>',
        askPayment: '💳 <b>To\'lov usulini tanlang</b>',

        stepHint: (step, total) => `\n\n<i>Qadam ${step}/${total}</i>`,
        tooShort: '❗️ Juda qisqa. Iltimos, to\'liqroq yozing.',

        confirmTitle: '🧾 <b>Buyurtmani tasdiqlang</b>',
        confirmAddress: '📍 Manzil',
        confirmWhen: '📅 Yetkazish',
        confirmPayment: '💳 To\'lov',
        btnConfirm: '✅ Tasdiqlash',
        btnCancelCheckout: '❌ Bekor qilish',
        checkoutCancelled: 'Buyurtma berish bekor qilindi. Savatingiz saqlanib qoldi.',

        placed: (code) => `🎉 <b>Buyurtma qabul qilindi!</b>\n\nRaqami: <b>#${code}</b>\n\nTez orada operator siz bilan bog'lanadi.`,
        placeFailed: (reason) => `❌ Buyurtma berilmadi.\n\n${reason}`,

        payCash: `${PAY.cash} Naqd pul`,
        payClick: `${PAY.click} Click`,
        payPayme: `${PAY.payme} Payme`,

        today: 'Bugun',
        tomorrow: 'Ertaga',

        orderTitle: (code) => `📦 <b>Buyurtma #${code}</b>`,
        btnRepeat: '🔁 Takrorlash',
        btnCancelOrder: '❌ Bekor qilish',
        orderCancelled: '✅ Buyurtma bekor qilindi.',
        cannotCancel: '❗️ Bu buyurtmani endi bekor qilib bo\'lmaydi. Operatorga murojaat qiling.',
        repeatAdded: '✅ Mahsulotlar savatga qo\'shildi.',
        orderNotFound: '❌ Buyurtma topilmadi.',

        btnBottles: '🫙 Idishlarim',
        bottlesTitle: '🫙 <b>Bo\'sh idishlar hisobi</b>',
        bottlesNone: '✅ Sizda qaytarilishi kerak idish yo\'q.',
        bottlesOwed: (n) => `Sizda <b>${n} ta</b> idish turibdi.`,
        bottlesHint: 'Keyingi yetkazishda kuryerga bering — hisobdan chiqariladi.',

        btnSubscribe: '🔁 Doimiy buyurtma',
        subsTitle: '🔁 <b>Doimiy buyurtmalar</b>',
        subsNone: 'Sizda doimiy buyurtma yo\'q.\n\nSavatni to\'ldirib, "Doimiy buyurtma" ni tanlang — har hafta o\'zi yaratiladi.',
        subsAskDay: '📅 <b>Har hafta qaysi kuni yetkazamiz?</b>',
        subsCreated: (day, slot) => `✅ Doimiy buyurtma yaratildi.\n\nHar <b>${day}</b> kuni, ${slot}.`,
        subsPaused: '⏸ Doimiy buyurtma to\'xtatildi.',
        subsResumed: '▶️ Doimiy buyurtma qayta ishga tushdi.',
        subsRemoved: '🗑 Doimiy buyurtma o\'chirildi.',
        btnPause: '⏸ To\'xtatish',
        btnResume: '▶️ Davom etish',
        btnDelete: '🗑 O\'chirish',
        weekdays: ['Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba','Yakshanba'],
        deliveryFee: 'Yetkazish',
        freeDelivery: 'Bepul',
        btnReturnBottle: '♻️ Idishni qaytaraman',
        btnKeepBottle: '📦 Idish menda qoladi',
        containerNote: 'Idishni qaytarsangiz arzonroq — u «Idishlarim» bo\'limida hisobga olinadi.',
    },

    ru: {
        btnCart: '🛒 Корзина',
        btnCatalog: '💧 Товары',

        catalogTitle: '💧 <b>Товары</b>',
        catalogEmpty: 'Товаров пока нет.',
        catalogPick: 'Выберите товар, чтобы посмотреть подробнее 👇',

        outOfStock: '❌ Этого товара сейчас нет в наличии.',
        added: (name) => `✅ <b>${name}</b> добавлен в корзину.`,
        inCart: (qty) => `В корзине: <b>${qty}</b> шт.`,

        cartTitle: '🛒 <b>Ваша корзина</b>',
        cartEmpty: '🛒 Корзина пуста.\n\nВыберите что-нибудь в разделе товаров.',
        cartTotal: (sum) => `\n💰 <b>Итого: ${sum}</b>`,
        cartCleared: '🗑 Корзина очищена.',

        btnAdd: '➕ В корзину',
        btnCheckout: '✅ Оформить заказ',
        btnClear: '🗑 Очистить',
        btnBackToCatalog: '⬅️ Товары',
        btnRemove: '❌',

        needPhone: '📱 Отправьте номер телефона, чтобы оформить заказ.',

        askRegion: '📍 <b>Выберите область</b>',
        askCity: '🏙 Напишите <b>город или райцентр</b>:',
        askDistrict: '🏘 Напишите <b>район или махаллю</b>:',
        askStreet: '🛣 Напишите <b>улицу</b>:',
        askHouse: '🏠 Напишите <b>дом и квартиру</b>:',
        btnSameAddress: (line) => `📍 Тот же адрес: ${line}`,
        askDate: '📅 <b>Выберите дату доставки</b>',
        askSlot: '🕒 <b>Выберите удобное время</b>',
        askPayment: '💳 <b>Выберите способ оплаты</b>',

        stepHint: (step, total) => `\n\n<i>Шаг ${step}/${total}</i>`,
        tooShort: '❗️ Слишком коротко. Напишите подробнее.',

        confirmTitle: '🧾 <b>Подтвердите заказ</b>',
        confirmAddress: '📍 Адрес',
        confirmWhen: '📅 Доставка',
        confirmPayment: '💳 Оплата',
        btnConfirm: '✅ Подтвердить',
        btnCancelCheckout: '❌ Отменить',
        checkoutCancelled: 'Оформление отменено. Корзина сохранена.',

        placed: (code) => `🎉 <b>Заказ принят!</b>\n\nНомер: <b>#${code}</b>\n\nОператор скоро свяжется с вами.`,
        placeFailed: (reason) => `❌ Заказ не оформлен.\n\n${reason}`,

        payCash: `${PAY.cash} Наличные`,
        payClick: `${PAY.click} Click`,
        payPayme: `${PAY.payme} Payme`,

        today: 'Сегодня',
        tomorrow: 'Завтра',

        orderTitle: (code) => `📦 <b>Заказ #${code}</b>`,
        btnRepeat: '🔁 Повторить',
        btnCancelOrder: '❌ Отменить',
        orderCancelled: '✅ Заказ отменён.',
        cannotCancel: '❗️ Этот заказ уже нельзя отменить. Свяжитесь с оператором.',
        repeatAdded: '✅ Товары добавлены в корзину.',
        orderNotFound: '❌ Заказ не найден.',

        btnBottles: '🫙 Мои бутыли',
        bottlesTitle: '🫙 <b>Учёт возвратной тары</b>',
        bottlesNone: '✅ За вами нет тары к возврату.',
        bottlesOwed: (n) => `За вами <b>${n} шт.</b> тары.`,
        bottlesHint: 'Передайте курьеру при следующей доставке — спишем.',

        btnSubscribe: '🔁 Регулярный заказ',
        subsTitle: '🔁 <b>Регулярные заказы</b>',
        subsNone: 'Регулярных заказов нет.\n\nНаполните корзину и выберите «Регулярный заказ» — он будет создаваться каждую неделю.',
        subsAskDay: '📅 <b>В какой день недели доставлять?</b>',
        subsCreated: (day, slot) => `✅ Регулярный заказ создан.\n\nКаждый <b>${day}</b>, ${slot}.`,
        subsPaused: '⏸ Регулярный заказ приостановлен.',
        subsResumed: '▶️ Регулярный заказ возобновлён.',
        subsRemoved: '🗑 Регулярный заказ удалён.',
        btnPause: '⏸ Пауза',
        btnResume: '▶️ Возобновить',
        btnDelete: '🗑 Удалить',
        weekdays: ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'],
        deliveryFee: 'Доставка',
        freeDelivery: 'Бесплатно',
        btnReturnBottle: '♻️ Верну тару',
        btnKeepBottle: '📦 Тара останется у меня',
        containerNote: 'С возвратом тары дешевле — она учитывается в разделе «Моя тара».',
    },

    en: {
        btnCart: '🛒 Cart',
        btnCatalog: '💧 Products',

        catalogTitle: '💧 <b>Products</b>',
        catalogEmpty: 'No products available yet.',
        catalogPick: 'Pick a product to see the details 👇',

        outOfStock: '❌ This product is currently out of stock.',
        added: (name) => `✅ <b>${name}</b> added to your cart.`,
        inCart: (qty) => `In cart: <b>${qty}</b>`,

        cartTitle: '🛒 <b>Your cart</b>',
        cartEmpty: '🛒 Your cart is empty.\n\nPick something from the products section.',
        cartTotal: (sum) => `\n💰 <b>Total: ${sum}</b>`,
        cartCleared: '🗑 Cart cleared.',

        btnAdd: '➕ Add to cart',
        btnCheckout: '✅ Checkout',
        btnClear: '🗑 Clear',
        btnBackToCatalog: '⬅️ Products',
        btnRemove: '❌',

        needPhone: '📱 Share your phone number to place an order.',

        askRegion: '📍 <b>Choose your region</b>',
        askCity: '🏙 Type your <b>city or town</b>:',
        askDistrict: '🏘 Type your <b>district</b>:',
        askStreet: '🛣 Type your <b>street</b>:',
        askHouse: '🏠 Type your <b>house and flat number</b>:',
        btnSameAddress: (line) => `📍 Same address: ${line}`,
        askDate: '📅 <b>Choose a delivery date</b>',
        askSlot: '🕒 <b>Choose a time slot</b>',
        askPayment: '💳 <b>Choose a payment method</b>',

        stepHint: (step, total) => `\n\n<i>Step ${step}/${total}</i>`,
        tooShort: '❗️ Too short. Please write it out.',

        confirmTitle: '🧾 <b>Confirm your order</b>',
        confirmAddress: '📍 Address',
        confirmWhen: '📅 Delivery',
        confirmPayment: '💳 Payment',
        btnConfirm: '✅ Confirm',
        btnCancelCheckout: '❌ Cancel',
        checkoutCancelled: 'Checkout cancelled. Your cart is still there.',

        placed: (code) => `🎉 <b>Order placed!</b>\n\nNumber: <b>#${code}</b>\n\nAn operator will contact you shortly.`,
        placeFailed: (reason) => `❌ Order not placed.\n\n${reason}`,

        payCash: `${PAY.cash} Cash`,
        payClick: `${PAY.click} Click`,
        payPayme: `${PAY.payme} Payme`,

        today: 'Today',
        tomorrow: 'Tomorrow',

        orderTitle: (code) => `📦 <b>Order #${code}</b>`,
        btnRepeat: '🔁 Order again',
        btnCancelOrder: '❌ Cancel',
        orderCancelled: '✅ Order cancelled.',
        cannotCancel: '❗️ This order can no longer be cancelled. Please contact an operator.',
        repeatAdded: '✅ Items added to your cart.',
        orderNotFound: '❌ Order not found.',

        btnBottles: '🫙 My bottles',
        bottlesTitle: '🫙 <b>Returnable containers</b>',
        bottlesNone: '✅ You have no containers to return.',
        bottlesOwed: (n) => `You are holding <b>${n}</b> container(s).`,
        bottlesHint: 'Hand them to the courier on your next delivery and they come off your balance.',

        btnSubscribe: '🔁 Standing order',
        subsTitle: '🔁 <b>Standing orders</b>',
        subsNone: 'You have no standing order.\n\nFill your cart and choose "Standing order" — it will be created every week.',
        subsAskDay: '📅 <b>Which day each week?</b>',
        subsCreated: (day, slot) => `✅ Standing order created.\n\nEvery <b>${day}</b>, ${slot}.`,
        subsPaused: '⏸ Standing order paused.',
        subsResumed: '▶️ Standing order resumed.',
        subsRemoved: '🗑 Standing order removed.',
        btnPause: '⏸ Pause',
        btnResume: '▶️ Resume',
        btnDelete: '🗑 Delete',
        weekdays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
        deliveryFee: 'Delivery',
        freeDelivery: 'Free',
        btnReturnBottle: '♻️ I will return it',
        btnKeepBottle: '📦 I will keep it',
        containerNote: 'Returning the container is cheaper — it is tracked under “My bottles”.',
    },
};

export const ot = (lang: BotLang): OrderTexts => ORDER_TEXTS[lang] ?? ORDER_TEXTS.uz;

/** The slots offered at checkout, matching the ones on the website. */
export const TIME_SLOTS = [
    '09:00–11:00',
    '11:00–13:00',
    '13:00–15:00',
    '15:00–17:00',
    '17:00–19:00',
] as const;

export const REGIONS = [
    'Toshkent shahri', 'Toshkent viloyati', 'Samarqand', 'Buxoro',
    'Andijon', 'Namangan', "Farg'ona", 'Qashqadaryo',
] as const;
