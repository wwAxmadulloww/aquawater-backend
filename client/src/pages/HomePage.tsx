import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowRight, Clock, Phone, CreditCard, ShieldCheck, ChevronRight, MapPin,
    Droplets, Truck, Recycle, BadgeCheck,
} from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { getProducts, api, formatPrice } from '../api/client'
import ProductCard from '../components/ProductCard'
import BranchMap from '../components/BranchMap'

/*
 * The upper page is carried by one photograph with frosted panels floating
 * over it. Below the brand story the page returns to a light surface: a
 * product grid, prices and a cart need to be scanned, and a photograph behind
 * them costs legibility for no gain.
 */
const HERO_PHOTO =
    'url("https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=2000&q=70")'

const HOW_STEPS = ['step1', 'step2', 'step3'] as const

// Claims sit in a rail beside the headline, the way a label's certifications
// do — short, checkable, no adjectives.
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
            {/* ── Photographic stage: hero + brand story ──────────────────── */}
            <div className="stage" style={{ '--stage-image': HERO_PHOTO } as React.CSSProperties}>

                {/* Hero */}
                <section className="container-custom relative pt-16 pb-20 md:pt-36 md:pb-36">
                    <div className="grid items-center gap-10 md:grid-cols-[1.35fr_auto] md:gap-10 lg:gap-16">
                        <div className="animate-rise text-center md:text-left">
                            <p className="eyebrow !text-caustic justify-center md:justify-start">
                                <span className="h-px w-6 bg-caustic/60" />
                                Toshkent
                            </p>

                            <h1 className="mt-4 whitespace-pre-line font-display text-[2.1rem] font-bold
                                           leading-[1.06] text-white drop-shadow-[0_2px_20px_rgba(3,24,31,.6)]
                                           sm:text-5xl md:text-6xl lg:text-[5rem]">
                                {t('home.hero.title')}
                            </h1>

                            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-white/80 md:mx-0 md:text-lg">
                                {t('home.hero.subtitle')}
                            </p>

                            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                                <Link to="/products" className="btn-primary group px-8 py-4 text-base">
                                    {t('home.hero.cta')}
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    to="/products"
                                    className="btn border border-white/30 bg-white/10 px-8 py-4 text-base
                                               text-white backdrop-blur-xl hover:border-white/50 hover:bg-white/20"
                                >
                                    {t('home.hero.secondary')}
                                </Link>
                            </div>

                            {/* Grounded facts, not slogans */}
                            <dl className="mt-9 flex flex-wrap justify-center gap-x-8 gap-y-4 md:justify-start">
                                {cheapest !== null && (
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-[0.18em] text-white/50">Eng arzon</dt>
                                        <dd className="tabular mt-1 font-display text-xl text-white">{formatPrice(cheapest)}</dd>
                                    </div>
                                )}
                                {hours && (
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-[0.18em] text-white/50">Ish vaqti</dt>
                                        <dd className="tabular mt-1 font-display text-xl text-white">{hours}</dd>
                                    </div>
                                )}
                                {branchCount !== null && branchCount > 0 && (
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-[0.18em] text-white/50">Filiallar</dt>
                                        <dd className="tabular mt-1 font-display text-xl text-white">{branchCount}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Claims, as one frosted panel — it carries its own contrast over
                            the bright half of the photograph, where loose tiles could not. */}
                        <ul className="glass animate-rise mx-auto w-full max-w-sm divide-y divide-white/10 px-6 md:w-72">
                            {CLAIMS.map(c => (
                                <li key={c.title} className="flex items-center gap-4 py-4">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center
                                                     rounded-2xl bg-white/15 text-caustic">
                                        {c.icon}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-bold tracking-tight text-white">
                                            {c.title}
                                        </span>
                                        <span className="block text-xs leading-tight text-white/65">{c.note}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Why this water — a wide panel over the photograph */}
                <section className="container-custom relative pb-16 md:pb-24">
                    <div className="glass p-7 md:p-10">
                        <h2 className="text-center font-display text-xl text-white md:text-2xl">
                            Nega aynan biz
                        </h2>
                        <div className="mx-auto mt-2 h-px w-24 bg-white/25" />

                        <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
                            {QUALITIES.map((q, i) => (
                                <div
                                    key={q.title}
                                    className={`text-center md:text-left ${i > 0 ? 'md:border-l md:border-white/15 md:pl-6' : ''}`}
                                >
                                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl
                                                     bg-white/15 text-caustic md:mx-0">
                                        {q.icon}
                                    </span>
                                    <h3 className="mt-4 font-display text-base text-white">{q.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-white/65">{q.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Trust strip, closing the photographic region */}
                <section className="container-custom relative pb-16 md:pb-20">
                    <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {TRUST.map(item => (
                            <li key={item.key} className="flex items-center gap-3">
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center
                                                 rounded-2xl bg-white/12 text-caustic backdrop-blur-xl">
                                    {item.icon}
                                </span>
                                <span className="text-xs font-bold leading-tight text-white/85">{t(item.key)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            {/* ── Shop: light surface, because this is where people read ───── */}
            <section className="py-20 md:py-24">
                <div className="container-custom">
                    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="eyebrow">Tanlovimiz</p>
                            <h2 className="mt-2 text-3xl text-gray-900 md:text-4xl">{t('home.products.title')}</h2>
                        </div>
                        <Link to="/products" className="group inline-flex items-center gap-1.5 font-semibold text-primary-700">
                            Barchasi
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {productsLoading
                            ? [1, 2, 3].map(i => <div key={i} className="card aspect-[4/5] animate-pulse bg-white/60" />)
                            : featuredProducts.map((p: any) => <ProductCard key={p._id} product={p} />)}
                    </div>
                </div>
            </section>

            {/* ── How it works ────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <p className="eyebrow w-full justify-center text-center">Uch qadam</p>
                    <h2 className="mb-14 mt-2 text-center text-3xl text-gray-900 md:text-4xl">
                        {t('home.howworks.title')}
                    </h2>

                    {/*
                     * Numbering is kept because these really are sequential — you
                     * cannot pay before choosing, or receive before ordering.
                     */}
                    <ol className="grid gap-6 md:grid-cols-3">
                        {HOW_STEPS.map((key, i) => (
                            <li key={key} className="card p-7">
                                <span className="tabular font-display text-4xl text-primary-200">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <h3 className="mt-4 text-lg text-gray-900">{t(`home.howworks.${key}.title` as any)}</h3>
                                <p className="mt-2 leading-relaxed text-gray-500">{t(`home.howworks.${key}.desc` as any)}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ── Branches ────────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <p className="eyebrow">Qayerdamiz</p>
                    <h2 className="mb-3 mt-2 text-3xl text-gray-900 md:text-4xl">Bizning filiallarimiz</h2>
                    <p className="mb-10 max-w-2xl text-gray-500">Sizga eng yaqin filialni xaritadan toping.</p>

                    <div className="card overflow-hidden p-2">
                        {branchesLoading
                            ? <div className="h-[420px] animate-pulse rounded-3xl bg-gray-100" />
                            : <BranchMap branches={branches || []} />}
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {branches?.slice(0, 6).map((b: any) => (
                            <div key={b._id} className="card flex items-center gap-4 p-4">
                                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center
                                                 rounded-2xl bg-primary-50 text-primary-700">
                                    <MapPin className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <h4 className="truncate text-sm text-gray-900">{b.name}</h4>
                                    <p className="truncate text-xs text-gray-500">{b.address}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Closing call to action ──────────────────────────────────── */}
            <section className="deep caustics">
                <div className="waterline" />
                <div className="container-custom relative flex flex-col items-center gap-8 py-16 text-center
                                md:flex-row md:justify-between md:text-left">
                    <div>
                        <p className="eyebrow !text-caustic">To'lov usullari</p>
                        <h3 className="mt-2 font-display text-2xl text-white md:text-3xl">Naqd, Click yoki Payme</h3>
                        <p className="mt-2 text-white/60">Kuryerga topshirishda yoki oldindan to'lang.</p>
                    </div>
                    <Link to="/products" className="btn-primary group px-9 py-4 text-base">
                        {t('home.hero.cta')}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </section>
        </div>
    )
}
