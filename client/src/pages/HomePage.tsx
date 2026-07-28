import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock, Phone, CreditCard, ShieldCheck, ChevronRight, MapPin } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { getProducts, api, formatPrice } from '../api/client'
import ProductCard from '../components/ProductCard'
import BranchMap from '../components/BranchMap'
import WaterVessel from '../components/WaterVessel'

const HOW_STEPS = ['step1', 'step2', 'step3'] as const

const TRUST = [
    { icon: <Clock className="w-5 h-5" />, key: 'home.trust.delivery' },
    { icon: <Phone className="w-5 h-5" />, key: 'home.trust.support' },
    { icon: <CreditCard className="w-5 h-5" />, key: 'home.trust.payment' },
    { icon: <ShieldCheck className="w-5 h-5" />, key: 'home.trust.quality' },
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
    const cheapest = products?.length
        ? Math.min(...products.map((p: any) => p.price))
        : null
    const branchCount = branches?.length ?? null
    const hours = branches?.[0]?.workingHours ?? null

    return (
        <div className="overflow-x-hidden">
            {/* ── Hero: you are looking into the tank ─────────────────────── */}
            <section className="deep caustics">
                <div className="container-custom relative py-14 md:py-28">
                    <div className="grid md:grid-cols-[1.15fr_1fr] items-center gap-10 md:gap-14 lg:gap-20">
                        <div className="animate-rise text-center md:text-left">
                            <p className="eyebrow !text-caustic justify-center md:justify-start">
                                <span className="h-px w-6 bg-caustic/60" />
                                Toshkent
                            </p>

                            <h1 className="mt-4 text-[2.1rem] leading-[1.08] sm:text-5xl md:text-6xl lg:text-7xl
                                           font-display font-bold text-white whitespace-pre-line">
                                {t('home.hero.title')}
                            </h1>

                            <p className="mt-5 max-w-lg mx-auto md:mx-0 text-base md:text-lg text-white/70 leading-relaxed">
                                {t('home.hero.subtitle')}
                            </p>

                            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                                <Link to="/products" className="btn-primary text-base px-8 py-4 group">
                                    {t('home.hero.cta')}
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    to="/products"
                                    className="btn text-base px-8 py-4 text-white border border-white/25 bg-white/5
                                               backdrop-blur-sm hover:bg-white/10 hover:border-white/40"
                                >
                                    {t('home.hero.secondary')}
                                </Link>
                            </div>

                            {/* Grounded facts, not slogans */}
                            <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-4 justify-center md:justify-start">
                                {cheapest !== null && (
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-[0.18em] text-white/45">Eng arzon</dt>
                                        <dd className="mt-1 font-display text-xl text-white tabular">{formatPrice(cheapest)}</dd>
                                    </div>
                                )}
                                {hours && (
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-[0.18em] text-white/45">Ish vaqti</dt>
                                        <dd className="mt-1 font-display text-xl text-white tabular">{hours}</dd>
                                    </div>
                                )}
                                {branchCount !== null && branchCount > 0 && (
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-[0.18em] text-white/45">Filiallar</dt>
                                        <dd className="mt-1 font-display text-xl text-white tabular">{branchCount}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="flex justify-center">
                            <WaterVessel className="w-32 sm:w-40 md:w-56 lg:w-64 h-56 sm:h-72 md:h-[27rem] lg:h-[31rem] animate-rise" />
                        </div>
                    </div>
                </div>
                <div className="waterline" />
            </section>

            {/* ── Products ────────────────────────────────────────────────── */}
            <section className="py-20 md:py-24">
                <div className="container-custom">
                    <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
                        <div>
                            <p className="eyebrow">Tanlovimiz</p>
                            <h2 className="mt-2 text-3xl md:text-4xl text-gray-900">{t('home.products.title')}</h2>
                        </div>
                        <Link to="/products" className="group inline-flex items-center gap-1.5 font-semibold text-primary-700">
                            Barchasi
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {productsLoading
                            ? [1, 2, 3].map(i => (
                                <div key={i} className="card aspect-[4/5] animate-pulse bg-white/60" />
                            ))
                            : featuredProducts.map((p: any) => <ProductCard key={p._id} product={p} />)}
                    </div>
                </div>
            </section>

            {/* ── How it works ────────────────────────────────────────────── */}
            <section className="py-20 md:py-24">
                <div className="container-custom">
                    <p className="eyebrow justify-center w-full text-center">Uch qadam</p>
                    <h2 className="mt-2 mb-14 text-center text-3xl md:text-4xl text-gray-900">
                        {t('home.howworks.title')}
                    </h2>

                    {/*
                     * Numbering is kept here because these really are sequential —
                     * you cannot pay before choosing, or receive before ordering.
                     */}
                    <ol className="grid gap-6 md:grid-cols-3">
                        {HOW_STEPS.map((key, i) => (
                            <li key={key} className="card p-7">
                                <span className="font-display text-4xl text-primary-200 tabular">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <h3 className="mt-4 text-lg text-gray-900">
                                    {t(`home.howworks.${key}.title` as any)}
                                </h3>
                                <p className="mt-2 text-gray-500 leading-relaxed">
                                    {t(`home.howworks.${key}.desc` as any)}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ── Branches ────────────────────────────────────────────────── */}
            <section className="py-20 md:py-24">
                <div className="container-custom">
                    <p className="eyebrow">Qayerdamiz</p>
                    <h2 className="mt-2 mb-3 text-3xl md:text-4xl text-gray-900">Bizning filiallarimiz</h2>
                    <p className="mb-10 max-w-2xl text-gray-500">
                        Sizga eng yaqin filialni xaritadan toping.
                    </p>

                    <div className="card overflow-hidden p-2">
                        {branchesLoading
                            ? <div className="h-[420px] rounded-3xl bg-gray-100 animate-pulse" />
                            : <BranchMap branches={branches || []} />}
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {branches?.slice(0, 6).map((b: any) => (
                            <div key={b._id} className="card flex items-center gap-4 p-4">
                                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl
                                                 bg-primary-50 text-primary-700">
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

            {/* ── Trust ───────────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom grid grid-cols-2 gap-4 md:grid-cols-4">
                    {TRUST.map(item => (
                        <div key={item.key} className="card p-6 text-center">
                            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl
                                             bg-primary-50 text-primary-700">
                                {item.icon}
                            </span>
                            <p className="text-sm font-bold text-gray-800">{t(item.key)}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Closing call to action ──────────────────────────────────── */}
            <section className="deep caustics">
                <div className="waterline" />
                <div className="container-custom relative flex flex-col items-center gap-8 py-16 text-center
                                md:flex-row md:justify-between md:text-left">
                    <div>
                        <p className="eyebrow !text-caustic">To'lov usullari</p>
                        <h3 className="mt-2 font-display text-2xl text-white md:text-3xl">
                            Naqd, Click yoki Payme
                        </h3>
                        <p className="mt-2 text-white/60">Kuryerga topshirishda yoki oldindan to'lang.</p>
                    </div>
                    <Link to="/products" className="btn-primary px-9 py-4 text-base group">
                        {t('home.hero.cta')}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </section>
        </div>
    )
}
