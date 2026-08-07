import React from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'

/**
 * The public offer and the privacy notice.
 *
 * Online trade in Uzbekistan needs both, and the site had neither: a customer
 * was agreeing to nothing in particular and had no statement of what happens to
 * their phone number and address. The text describes what this system actually
 * does — the data it stores, why, and for how long — rather than boilerplate
 * copied from another shop.
 *
 * It is written to be accurate, not to be legal advice. The blanks are the
 * facts only the business can fill in, and a lawyer should read it before it is
 * relied on in a dispute.
 */

const COMPANY = {
    name: 'AquaWater',
    // Deliberately left as a marker rather than invented: an incorrect
    // registration number on a public offer is worse than a visible gap.
    legalName: null as string | null,
    inn: null as string | null,
    address: null as string | null,
    phone: '+998 90 123 45 67',
}

function Missing({ what }: { what: string }) {
    return (
        <span className="rounded bg-[#d92d20]/15 px-1.5 py-0.5 text-[#b42318]">
            [{what} — to'ldirilishi kerak]
        </span>
    )
}

function Offer() {
    return (
        <>
            <h1 className="mb-6 text-3xl text-gray-950">Ommaviy oferta</h1>

            <p>
                Ushbu hujjat {COMPANY.legalName ?? <Missing what="yuridik nom" />}{' '}
                (keyingi o'rinlarda — «Sotuvchi») tomonidan taqdim etilgan ommaviy
                oferta hisoblanadi. Saytda buyurtma berish orqali Xaridor quyidagi
                shartlarga rozilik bildiradi.
            </p>

            <h2>1. Oferta predmeti</h2>
            <p>
                Sotuvchi ichimlik suvi va u bilan bog'liq idishlarni sotadi va
                Xaridor ko'rsatgan manzilga yetkazib beradi. Mahsulot nomi, narxi
                va tavsifi saytdagi katalogda ko'rsatiladi.
            </p>

            <h2>2. Narx va to'lov</h2>
            <ul>
                <li>Barcha narxlar O'zbekiston so'mida ko'rsatilgan.</li>
                <li>
                    Buyurtma narxi buyurtma berilgan paytdagi narx bo'yicha
                    belgilanadi va keyinchalik o'zgarmaydi.
                </li>
                <li>
                    Yetkazib berish narxi hududga qarab alohida hisoblanadi va
                    buyurtmani rasmiylashtirishda ko'rsatiladi.
                </li>
                <li>
                    To'lov yetkazib berish paytida naqd pul orqali amalga
                    oshiriladi.
                </li>
            </ul>

            <h2>3. Qaytariladigan idish</h2>
            <p>
                Xaridor buyurtma berishda ikkita variantdan birini tanlaydi:
            </p>
            <ul>
                <li>
                    <b>Idishni qaytaraman</b> — idish Sotuvchining mulki bo'lib
                    qoladi va Xaridorning hisobida qayd etiladi. Keyingi yetkazib
                    berishda bo'sh idish kuryerga topshiriladi.
                </li>
                <li>
                    <b>Idishni sotib olaman</b> — idish narxi buyurtma summasiga
                    qo'shiladi va idish Xaridor mulkiga o'tadi. Qaytarish talab
                    etilmaydi.
                </li>
            </ul>

            <h2>4. Buyurtmani bekor qilish</h2>
            <p>
                Xaridor buyurtma kuryerga topshirilgunga qadar uni saytdagi
                «Buyurtmalarim» bo'limidan mustaqil bekor qilishi mumkin. Kuryer
                yo'lga chiqqandan so'ng bekor qilish uchun operatorga murojaat
                qilinadi.
            </p>

            <h2>5. Mahsulot sifati</h2>
            <p>
                Yetkazib berish paytida Xaridor mahsulotni va idish butunligini
                tekshirib olishi mumkin. Sifatsiz mahsulot aniqlansa, u
                almashtiriladi yoki summasi qaytariladi.
            </p>

            <h2>6. Sotuvchi rekvizitlari</h2>
            <ul>
                <li>Nomi: {COMPANY.legalName ?? <Missing what="yuridik nom" />}</li>
                <li>STIR (INN): {COMPANY.inn ?? <Missing what="STIR" />}</li>
                <li>Manzil: {COMPANY.address ?? <Missing what="yuridik manzil" />}</li>
                <li>Telefon: {COMPANY.phone}</li>
            </ul>
        </>
    )
}

function Privacy() {
    return (
        <>
            <h1 className="mb-6 text-3xl text-gray-950">Maxfiylik siyosati</h1>

            <p>
                Ushbu hujjat AquaWater xizmatidan foydalanganda qanday shaxsiy
                ma'lumotlar to'planishini va ular nima uchun ishlatilishini
                tushuntiradi.
            </p>

            <h2>1. Qanday ma'lumotlar to'planadi</h2>
            <ul>
                <li><b>Telefon raqami</b> — akkauntga kirish uchun; u sizning shaxsiy identifikatoringiz.</li>
                <li><b>Ism</b> — kuryer sizga murojaat qilishi uchun.</li>
                <li><b>Yetkazib berish manzili</b> — buyurtmani yetkazish uchun. Har bir buyurtma o'zining manzil nusxasini saqlaydi.</li>
                <li><b>Buyurtmalar tarixi</b> — mahsulotlar, summalar va holatlar.</li>
                <li><b>Idish hisobi</b> — sizda turgan qaytariladigan idishlar soni.</li>
                <li><b>Telegram chat identifikatori</b> — faqat botdan foydalansangiz.</li>
            </ul>
            <p>
                To'lov naqd pulda amalga oshirilgani uchun <b>karta ma'lumotlari
                to'planmaydi va saqlanmaydi</b>.
            </p>

            <h2>2. Ma'lumotlar nima uchun ishlatiladi</h2>
            <p>
                Faqat buyurtmani bajarish, yetkazib berish, idish hisobini yuritish
                va sizga buyurtma holati haqida xabar berish uchun. Ma'lumotlaringiz
                reklama maqsadida uchinchi shaxslarga sotilmaydi.
            </p>

            <h2>3. Kim ko'radi</h2>
            <ul>
                <li>Sizning buyurtmangizga biriktirilgan kuryer — ismingiz, telefoningiz va manzilingizni.</li>
                <li>Do'kon ma'muriyati — buyurtmalarni boshqarish uchun.</li>
                <li>
                    Texnik xizmat ko'rsatuvchilar: ma'lumotlar bazasi
                    (MongoDB Atlas), hosting (Vercel) va Telegram — xizmat
                    ishlashi uchun zarur bo'lgan darajada.
                </li>
            </ul>

            <h2>4. Qancha vaqt saqlanadi</h2>
            <p>
                Buyurtmalar tarixi buxgalteriya hisobi uchun saqlanadi. Akkauntingizni
                o'chirsangiz, ismingiz va telefoningiz o'chiriladi; buyurtmalar esa
                shaxsingizga bog'lanmagan holda qoladi.
            </p>

            <h2>5. Sizning huquqlaringiz</h2>
            <ul>
                <li>Ma'lumotlaringizni ko'rish va tuzatish — «Profil» bo'limida.</li>
                <li>Akkauntni o'chirish — «Profil» bo'limidagi tegishli tugma orqali.</li>
                <li>Savollar bo'yicha murojaat: {COMPANY.phone}</li>
            </ul>

            <h2>6. Xavfsizlik</h2>
            <p>
                Parollar qaytarib bo'lmaydigan tarzda shifrlanadi (bcrypt). Saytga
                ulanish HTTPS orqali himoyalangan. Shunga qaramay, hech bir tizim
                mutlaq xavfsiz emas — parolingizni boshqalar bilan bo'lishmang.
            </p>
        </>
    )
}

export default function LegalPage() {
    const { doc } = useParams()

    if (doc !== 'oferta' && doc !== 'maxfiylik') return <Navigate to="/" replace />

    return (
        <div className="container-custom max-w-3xl py-12">
            <article className="legal-prose space-y-4 text-sm leading-relaxed text-gray-600">
                {doc === 'oferta' ? <Offer /> : <Privacy />}

                <p className="border-t border-line pt-6 text-xs text-gray-600">
                    Oxirgi yangilanish: {new Date().toISOString().slice(0, 10)} ·{' '}
                    <Link to={doc === 'oferta' ? '/legal/maxfiylik' : '/legal/oferta'} className="text-accent underline">
                        {doc === 'oferta' ? 'Maxfiylik siyosati' : 'Ommaviy oferta'}
                    </Link>
                </p>
            </article>
        </div>
    )
}
