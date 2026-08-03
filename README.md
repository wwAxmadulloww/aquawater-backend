# AquaWater — noldan deploy qilish

Bu papka **bitta yagona loyiha**: backend (Express API) va frontend (React/Vite)
bir joyda, bitta Vercel loyihasi sifatida deploy qilinadi. Alohida frontend
deploy'i, alohida backend deploy'i — endi kerak emas.

```
.
├── api/index.ts       → Vercel funksiyasi (/api/* so'rovlarini qabul qiladi)
├── src/               → Express backend (routes, controllers, models, telegram bot)
├── client/            → React frontend (Vite)
├── vercel.json        → build + routing sozlamalari
└── .env.example       → kerakli muhit o'zgaruvchilari ro'yxati
```

---

## 1-qadam. GitHub'ga yangi repo sifatida joylash

Bu papkada git tarixi **toza** — eski repolardagi ikkita muammo yo'q:
sirlar (`.env`) tarixga tushmagan, `node_modules` commit qilinmagan.

1. github.com → **New repository** → nom: `aquawater` → **Private** → Create
   (README/gitignore qo'shmang — bu yerda allaqachon bor)

2. Terminalda:

```bash
cd ~/Desktop/aquawater-app
git remote add origin https://github.com/<foydalanuvchi>/aquawater.git
git push -u origin main
```

---

## 2-qadam. Vercel'ga ulash

1. vercel.com → **Add New → Project** → yuqoridagi repo'ni tanlang
2. **Framework Preset: Other** (avtomatik aniqlanganini o'zgartiring)
3. Build/Output sozlamalariga tegmang — `vercel.json` hammasini o'zi hal qiladi
4. **Deploy** bosishdan oldin, quyidagi 3-qadamni bajaring

---

## 3-qadam. Muhit o'zgaruvchilari (ENG MUHIM)

> Oldingi deploy aynan shu sababdan ishlamagan edi: `MONGODB_URI` va
> `JWT_SECRET` qo'shilmagani uchun barcha `/api/*` yo'llari 503 qaytargan.

Vercel → loyiha → **Settings → Environment Variables**. Har birini
**Production, Preview, Development** — uchalasiga ham belgilang:

| Kalit | Qiymat | Majburiymi |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://<user>:<parol>@cluster0.6w9v7az.mongodb.net/aquawater?retryWrites=true&w=majority` | ✅ Ha |
| `JWT_SECRET` | Uzun tasodifiy satr — `openssl rand -hex 32` | ✅ Ha |
| `NODE_ENV` | `production` | ✅ Ha |
| `TELEGRAM_BOT_TOKEN` | @BotFather bergan token | Bot uchun |
| `TELEGRAM_ADMIN_CHAT_ID` | Operatorlar guruhi ID (`-100...`) | Bot uchun |
| `TELEGRAM_USE_WEBHOOK` | `true` | Bot uchun |
| `TELEGRAM_WEBHOOK_SECRET` | Tasodifiy satr — `openssl rand -hex 16` | Bot uchun |
| `WEBAPP_URL` | Deploy tugagach chiqadigan manzil, masalan `https://aquawater.vercel.app` | Bot uchun |

`CORS_ORIGINS` **kerak emas** — frontend va backend bir domenda.

Qo'shib bo'lgach: **Deployments → oxirgisi → ⋯ → Redeploy**.

---

## 4-qadam. Telegram webhook'ni ro'yxatdan o'tkazish

Deploy tugagach, bir marta ishga tushiring (o'z qiymatlaringizni qo'ying):

```bash
curl -F "url=https://<sizning-domeningiz>/api/telegram/webhook" -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook"
```

Tekshirish: `{"ok":true,"result":true,...}` qaytishi kerak.

---

## 5-qadam. Tekshirish

```bash
curl https://<sizning-domeningiz>/api/health
```

Kutilgan javob:

```json
{"status":"OK","database":"connected","telegramBot":"configured"}
```

- `database: connecting_or_disconnected` → `MONGODB_URI` yo'q yoki Atlas IP
  ro'yxati yopiq (Atlas → Network Access → `0.0.0.0/0`)
- `telegramBot: not_configured` → `TELEGRAM_BOT_TOKEN` yo'q

Keyin brauzerda saytni oching, ro'yxatdan o'ting, botga `/start` yuboring.

---

## Boshlang'ich ma'lumot (ixtiyoriy)

Bazani namuna mahsulotlar va admin hisobi bilan to'ldirish:

```bash
ALLOW_DESTRUCTIVE_SEED=true npm run seed
```

⚠️ Bu **barcha** foydalanuvchi va mahsulotlarni o'chirib, qaytadan yozadi.
Faqat bo'sh bazada ishlating.

---

## Lokal ishga tushirish

```bash
npm install && npm install --prefix client
cp .env.example .env    # qiymatlarni to'ldiring
npm run dev             # backend :5001
npm run dev --prefix client   # frontend :5173
```

---

## Eski xizmatlarni o'chirish (siz qilasiz)

Yangi deploy ishlayotganini tasdiqlagach:

- **Vercel** → eski `aquawater-backend` va `aquawater` loyihalari → Settings →
  pastda **Delete Project**
- **Render** → eski `aquawater-backend` xizmati → Settings → **Delete**
- **GitHub** → eski `aquawater-backend` va `aquawater` repolari → Settings →
  pastda **Delete this repository**

> ⚠️ Eski repolarni o'chirishdan oldin: ularning git tarixida `.env` fayli,
> ya'ni MongoDB paroli, JWT maxfiy kaliti, Telegram tokeni va Eskiz
> parollari saqlanib qolgan. Repo o'chirilsa ham, agar u ilgari ochiq
> (public) bo'lgan bo'lsa, kimdir nusxa olgan bo'lishi mumkin.
> **Shu sababli bu maxfiy kalitlarni almashtiring** — pastga qarang.

## Almashtirilishi kerak bo'lgan maxfiy kalitlar

1. **MongoDB Atlas** → Database Access → foydalanuvchi → Edit → yangi parol
   (keyin `MONGODB_URI` ni Vercel'da yangilang)
2. **JWT_SECRET** → `openssl rand -hex 32` bilan yangisini yarating
   (barcha foydalanuvchilar qayta login qilishi kerak bo'ladi)
3. **Telegram bot** → @BotFather → `/revoke` → yangi token
4. **Eskiz SMS** → kabinetda parolni almashtiring
