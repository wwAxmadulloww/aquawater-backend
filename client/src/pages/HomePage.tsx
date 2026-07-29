import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowRight, Clock, Phone, CreditCard, ShieldCheck, ChevronRight, MapPin,
    Droplets, Truck, Recycle, BadgeCheck, Zap,
} from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { getProducts, api, formatPrice } from '../api/client'
import ProductCard from '../components/ProductCard'
import BranchMap from '../components/BranchMap'
import WireDrop from '../components/WireDrop'

/*
 * The page is one continuous black field. There is no light section and no
 * photograph: the reference builds everything from a single wireframe object,
 * very large type, and small panels that float clear of the canvas — and the
 * moment a second surface colour appears, that read breaks.
 */

const HOW_STEPS = ['step1', 'step2', 'step3'] as const

// Claims read like the certifications on a label — short, checkable, no adjectives.
const CLAIMS = [
    { icon: <Droplets className="h-5 w-5" />, title: 'Tozalangan', note: 'Ko\'p bosqichli filtr' },
    { icon: <Truck className="h-5 w-5" />, title: 'Yetkazamiz', note: 'Uy va ofisga' },
    { icon: <Recycle className="h-5 w-5" />, title: 'Qaytariladi', note: 'Idish almashtiriladi' },
] as const

const QUALITIES = [
    { icon: <Droplets className="h-6 w-6" />, title: 'Toza ta\'m', desc: 'Ortiqcha mineral va xlor yo\'q — suv suvday ta\'m beradi.' },
    { icon: <BadgeCheck className="h-6 w-6" />, title: 'Tekshirilgan', desc: 'Har partiya laboratoriya nazoratidan o\'tadi.' },
    { icon: <Truck className="h-6 w-6" />, title: 'Kelishilgan vaqtda', desc: 'Yetkazish vaqtini o\'zingiz tanlaysiz.' },
] as const

const TRUST = [
    { icon: <Clock className="h-5 w-5" />, key: 'home.trust.delivery' },
    { icon: <Phone className="h-5 w-5" />, key: 'home.trust.support' },
    { icon: <CreditCard className="h-5 w-5" />, key: 'home.trust.payment' },
    { icon: <ShieldCheck className="h-5 w-5" />, key: 'home.trust.quality' },
] as const

export default function HomePage() {
    const { t } = useLanguage()

    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['products-home'],
        queryFn: () => getProducts(),
    })

    const { data: branches, isLoading: branchesLoading } = useQuery({
        queryKey: ['branches-home'],
        queryFn: async () => (await api.get('/branches')).data,
    })

    const featuredProducts = products?.slice(0, 3) || []

    // Figures come from what is actually in the database, so the hero never
    // claims something the business cannot back up.
    const cheapest = products?.length ? Math.min(...products.map((p: any) => p.price)) : null
    const branchCount = branches?.length ?? null
    const hours = branches?.[0]?.workingHours ?? null

    return (
        <div className="overflow-x-hidden">

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="stage">
                {/*
                 * The object is placed rather than laid out: on desktop it fills
                 * the middle of the field and the text overlaps it, which is what
                 * gives the composition its depth. On phones it drops behind the
                 * type at low opacity, because at that width anything else buries
                 * the words.
                 */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <WireDrop className="h-[70%] w-[150%] max-w-[52rem] -translate-y-24 opacity-[.18] sm:h-[80%] sm:-translate-y-16 sm:opacity-30 md:h-[94%] md:w-auto md:translate-y-0 md:opacity-100" />
                </div>

                <div className="container-custom relative flex min-h-[38rem] flex-col justify-end
                                pb-14 pt-28 md:min-h-[46rem] md:pb-20 md:pt-36">

                    {/* Vertical rail, as in the reference's left margin */}
                    <ul className="absolute -left-2 top-1/2 hidden -translate-y-1/2 flex-col gap-3 2xl:flex">
                        {CLAIMS.map(c => (
                            <li
                                key={c.title}
                                className="btn-round cursor-default text-gray-700"
                                title={`${c.title} — ${c.note}`}
                            >
                                {c.icon}
                            </li>
                        ))}
                    </ul>

                    {/* Floating stat panels, as in the reference's right margin */}
                    <div className="absolute right-4 top-24 hidden w-52 flex-col gap-4 lg:flex xl:right-6 xl:w-56">
                        {cheapest !== null && (
                            <div className="glass animate-rise p-5">
                                <p className="eyebrow">Eng arzon</p>
                                <p className="tabular mt-2 font-display text-2xl font-bold text-gray-950">
                                    {formatPrice(cheapest)}
                                </p>
                                <p className="mt-1 text-xs text-gray-600">Yetkazib berish bilan</p>
                            </div>
                        )}
                        <div className="glass animate-rise p-5">
                            <p className="eyebrow">Ish vaqti</p>
                            <p className="tabular mt-2 font-display text-2xl font-bold text-gray-950">
                                {hours || '08:00 - 22:00'}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                                {branchCount ? `${branchCount} ta filial` : 'Toshkent bo\'ylab'}
                            </p>
                        </div>
                    </div>

                    <div className="relative max-w-3xl animate-rise 2xl:pl-20">
                        <p className="eyebrow">
                            <Zap className="h-3 w-3 text-accent" />
                            Toshkent
                        </p>

                        <p className="mt-5 max-w-sm text-sm leading-relaxed text-gray-700 [text-shadow:0_2px_12px_rgb(0_0_0)] md:text-base">
                            {t('home.hero.subtitle')}
                        </p>

                        {/*
                         * The single largest thing on the page. clamp() lets it run
                         * to the container edge at every width without a stack of
                         * breakpoints, which is how the reference's headline behaves.
                         */}
                        <h1
                            className="display mt-6 [text-shadow:0_4px_40px_rgb(0_0_0)]"
                            style={{ fontSize: 'clamp(3.4rem, 15vw, 11rem)' }}
                        >
                            AquaWater
                        </h1>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link to="/products" className="btn-primary group px-7 py-3.5 text-sm">
                                {t('home.hero.cta')}
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <Link to="/products" className="btn-secondary px-7 py-3.5 text-sm">
                                {t('home.hero.secondary')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Claims, spelled out — the icon rail above is decoration, not information */}
            <section className="container-custom pb-16 md:pb-24 2xl:hidden">
                <ul className="grid gap-3 sm:grid-cols-3">
                    {CLAIMS.map(c => (
                        <li key={c.title} className="card flex items-center gap-3 p-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center
                                             rounded-full border border-line text-accent">
                                {c.icon}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-gray-950">{c.title}</span>
                                <span className="block text-xs text-gray-600">{c.note}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ── Why this water ──────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <p className="eyebrow">Nega aynan biz</p>
                    <h2 className="mb-12 mt-3 max-w-2xl text-3xl text-gray-950 md:text-5xl">
                        Suvni tanlashda uchta narsa muhim
                    </h2>

                    <div className="grid gap-4 md:grid-cols-3">
                        {QUALITIES.map(q => (
                            <div key={q.title} className="card p-7">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full
                                                 border border-line text-accent">
                                    {q.icon}
                                </span>
                                <h3 className="mt-5 text-lg text-gray-950">{q.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">{q.desc}</p>
                            </div>
                        ))}
                    </div>

                    <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        {TRUST.map(item => (
                            <li key={item.key} className="card flex items-center gap-3 p-4">
                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center
                                                 rounded-full border border-line text-accent">
                                    {item.icon}
                                </span>
                                <span className="text-xs font-medium leading-tight text-gray-800">{t(item.key)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ── Shop ────────────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="eyebrow">Tanlovimiz</p>
                            <h2 className="mt-3 text-3xl text-gray-950 md:text-5xl">{t('home.products.title')}</h2>
                        </div>
                        <Link to="/products" className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                            Barchasi
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {productsLoading
                            ? [1, 2, 3].map(i => <div key={i} className="card aspect-[4/5] animate-pulse" />)
                            : featuredProducts.map((p: any) => <ProductCard key={p._id} product={p} />)}
                    </div>
                </div>
            </section>

            {/* ── How it works ────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <p className="eyebrow">Uch qadam</p>
                    <h2 className="mb-12 mt-3 text-3xl text-gray-950 md:text-5xl">
                        {t('home.howworks.title')}
                    </h2>

                    {/*
                     * Numbering is kept because these really are sequential — you
                     * cannot pay before choosing, or receive before ordering.
                     */}
                    <ol className="grid gap-4 md:grid-cols-3">
                        {HOW_STEPS.map((key, i) => (
                            <li key={key} className="card p-7">
                                <span className="tabular font-display text-5xl font-extrabold text-gray-600">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <h3 className="mt-5 text-lg text-gray-950">{t(`home.howworks.${key}.title` as any)}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(`home.howworks.${key}.desc` as any)}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ── Branches ────────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <p className="eyebrow">Qayerdamiz</p>
                    <h2 className="mb-3 mt-3 text-3xl text-gray-950 md:text-5xl">Bizning filiallarimiz</h2>
                    <p className="mb-10 max-w-2xl text-gray-600">Sizga eng yaqin filialni xaritadan toping.</p>

                    <div className="card overflow-hidden p-2">
                        {branchesLoading
                            ? <div className="h-[420px] animate-pulse rounded-3xl bg-gray-200" />
                            : <BranchMap branches={branches || []} />}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {branches?.slice(0, 6).map((b: any) => (
                            <div key={b._id} className="card flex items-center gap-4 p-4">
                                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center
                                                 rounded-full border border-line text-accent">
                                    <MapPin className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <h4 className="truncate text-sm text-gray-950">{b.name}</h4>
                                    <p className="truncate text-xs text-gray-600">{b.address}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Closing call to action ──────────────────────────────────── */}
            <section className="pb-24">
                <div className="container-custom">
                    <div className="card flex flex-col items-start gap-8 p-8 md:flex-row md:items-center
                                    md:justify-between md:p-12">
                        <div>
                            <p className="eyebrow">To'lov usullari</p>
                            <h3 className="mt-3 font-display text-2xl text-gray-950 md:text-4xl">
                                Naqd, Click yoki Payme
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">Kuryerga topshirishda yoki oldindan to'lang.</p>
                        </div>
                        <Link to="/products" className="btn-primary group shrink-0 px-8 py-4 text-sm">
                            {t('home.hero.cta')}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
