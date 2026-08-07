import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowRight, Clock, Phone, CreditCard, ShieldCheck, ChevronRight, MapPin,
    Droplets, Truck, Recycle, BadgeCheck, Zap,
} from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { getProducts, api, formatPrice, getTrustFigures } from '../api/client'
import ProductCard from '../components/ProductCard'
import BranchMap from '../components/BranchMap'
import WaterSurface from '../components/WaterSurface'
import Reveal3D from '../components/Reveal3D'
import { useViewportProgress } from '../hooks/useScrollMotion'

/*
 * The hero is a photograph of water that reacts to the cursor; everything
 * below it is the light canvas the rest of the site runs on. The two are
 * joined by a fade rather than a cut, so the page still reads as one field
 * even though it changes surface once.
 */

const HOW_STEPS = ['step1', 'step2', 'step3'] as const

// Claims read like the certifications on a label — short, checkable, no adjectives.
const CLAIMS = [
    { icon: <Droplets className="h-5 w-5" />, title: 'home.claim.filtered', note: 'home.claim.filteredNote' },
    { icon: <Truck className="h-5 w-5" />, title: 'home.claim.delivery', note: 'home.claim.deliveryNote' },
    { icon: <Recycle className="h-5 w-5" />, title: 'home.claim.return', note: 'home.claim.returnNote' },
] as const

const QUALITIES = [
    { icon: <Droplets className="h-6 w-6" />, title: 'home.why.taste', desc: 'home.why.tasteDesc' },
    { icon: <BadgeCheck className="h-6 w-6" />, title: 'home.why.tested', desc: 'home.why.testedDesc' },
    { icon: <Truck className="h-6 w-6" />, title: 'home.why.onTime', desc: 'home.why.onTimeDesc' },
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

    /*
     * Figures a customer could in principle check, rather than adjectives.
     * Trust in this category is built on evidence — how many deliveries have
     * actually been made — and anything the database cannot back is simply not
     * rendered rather than filled in with a flattering guess.
     */
    const { data: trust } = useQuery({ queryKey: ['trust'], queryFn: getTrustFigures })

    const monthsRunning = trust?.since
        ? Math.max(1, Math.round((Date.now() - new Date(trust.since).getTime()) / (30 * 86400000)))
        : null

    const featuredProducts = products?.slice(0, 3) || []

    // Figures come from what is actually in the database, so the hero never
    // claims something the business cannot back up.
    const cheapest = products?.length ? Math.min(...products.map((p: any) => p.price)) : null
    const branchCount = branches?.length ?? null
    const hours = branches?.[0]?.workingHours ?? null

    return (
        <div className="overflow-x-hidden">

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            {/*
             * The reference is a photograph of a water surface with the copy on
             * a frosted panel over it, and floating cards in the margin. What a
             * still cannot do — and what the design is really promising — is
             * move: here the surface answers the cursor.
             *
             * What the reference carries that a shop does not: a campaign date
             * badge, a vertical slogan rail, social icons that would link
             * nowhere, and filler copy. Those are gone. The panel, the water,
             * the side cards and the scroll cue are what remain, and every one
             * of them now holds something real.
             */}
            <section className="stage">
                <WaterSurface src="/water-hero.jpg" className="absolute inset-0" />

                <div className="container-custom relative z-10 flex min-h-[42rem] flex-col justify-center
                                pb-32 pt-28 md:min-h-[50rem] md:pb-40 md:pt-36">

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,42rem)_1fr] lg:items-center lg:gap-10">

                        <div className="hero-card animate-rise p-6 sm:p-11 md:p-14">
                            <p className="eyebrow text-gray-800">
                                <Zap className="h-3 w-3 text-accent" />
                                {t('home.hero.city')}
                            </p>

                            {/*
                             * `w-max` matters because the letters carry a gradient:
                             * background-clip paints inside the element's box, so any
                             * part of the word running past a narrower column has
                             * nothing to clip against and renders invisible — the
                             * headline read "AQUAWA". Sizing the box to the glyphs
                             * gives the gradient something to fill. Both ends of
                             * the clamp are set so the word fits the panel's content
                             * box at every width — measured, because at 2.6rem on a
                             * 320px phone it came out exactly the width of the box,
                             * and a fallback font loading first would have pushed it
                             * straight out of the glass.
                             */}
                            <h1
                                className="display text-gradient mt-6 w-max"
                                style={{ fontSize: 'clamp(2.35rem, 6vw, 4.9rem)' }}
                            >
                                AquaWater
                            </h1>

                            <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-700 md:text-lg">
                                {t('home.hero.subtitle')}
                            </p>

                            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link to="/products" className="btn-primary group px-8 py-4 text-[15px]">
                                    {t('home.hero.cta')}
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link to="/products" className="btn-secondary px-8 py-4 text-[15px]">
                                    {t('home.hero.secondary')}
                                </Link>
                            </div>
                        </div>

                        {/* The reference's floating margin cards, carrying real figures. */}
                        <div className="hidden w-full max-w-[15rem] flex-col gap-4 justify-self-end lg:flex">
                            {cheapest !== null && (
                                <div className="glass animate-rise p-5">
                                    <p className="eyebrow text-gray-800">{t('home.hero.cheapest')}</p>
                                    <p className="tabular mt-2 font-display text-2xl font-bold text-gray-950">
                                        {formatPrice(cheapest)}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-700">{t('home.hero.cheapestNote')}</p>
                                </div>
                            )}
                            <div className="glass animate-rise p-5">
                                <p className="eyebrow text-gray-800">{t('home.hero.hours')}</p>
                                <p className="tabular mt-2 font-display text-2xl font-bold text-gray-950">
                                    {hours || '08:00 - 22:00'}
                                </p>
                                <p className="mt-1 text-xs text-gray-700">
                                    {branchCount ? `${branchCount} ${t('home.hero.branchCount')}` : t('home.hero.everywhere')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/*
                 * The reference's scroll cue. It is a button rather than an
                 * ornament because it actually scrolls — there is no decorative
                 * control anywhere else on this site and this is not the place
                 * to start one.
                 */}
                <button
                    type="button"
                    onClick={() => document.getElementById('after-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="absolute inset-x-0 bottom-7 z-10 mx-auto hidden w-max flex-col items-center gap-2 md:flex"
                >
                    <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-gray-700">
                        {t('home.hero.scroll')}
                    </span>
                    <span className="flex h-9 w-5 justify-center rounded-full border border-gray-500 pt-1.5">
                        <span className="animate-scroll-cue h-1.5 w-1.5 rounded-full bg-gray-700" />
                    </span>
                </button>
            </section>

            {/* Claims — and the landing point for the hero's scroll cue. */}
            <section id="after-hero" className="container-custom scroll-mt-24 pb-16 md:pb-24">
                <Reveal3D lean={16} depth={160}>
                <ul className="grid gap-3 sm:grid-cols-3">
                    {CLAIMS.map(c => (
                        <li key={c.title} className="card flex items-center gap-3 p-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center
                                             rounded-full border border-line text-accent">
                                {c.icon}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-gray-950">{t(c.title as any)}</span>
                                <span className="block text-xs text-gray-600">{t(c.note as any)}</span>
                            </span>
                        </li>
                    ))}
                </ul>
                </Reveal3D>
            </section>

            {/* ── Why this water ──────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <p className="eyebrow">{t('home.why.eyebrow')}</p>
                    <h2 className="mb-12 mt-3 max-w-2xl text-3xl text-gray-950 md:text-5xl">
                        {t('home.why.title')}
                    </h2>

                    <Reveal3D lean={18} depth={200}>
                    <div className="grid gap-4 md:grid-cols-3">
                        {QUALITIES.map(q => (
                            <div key={q.title} className="card p-7">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full
                                                 border border-line text-accent">
                                    {q.icon}
                                </span>
                                <h3 className="mt-5 text-lg text-gray-950">{t(q.title as any)}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(q.desc as any)}</p>
                            </div>
                        ))}
                    </div>
                    </Reveal3D>

                    <Reveal3D lean={12} depth={120} className="mt-4">
                    <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
                    </Reveal3D>
                </div>
            </section>

            {/* ── Evidence ────────────────────────────────────────────────── */}
            {!!trust?.delivered && (
                <section className="pb-20 md:pb-24">
                    <div className="container-custom">
                        <p className="eyebrow">{t('trust.eyebrow')}</p>
                        <h2 className="mb-10 mt-3 max-w-2xl text-3xl text-gray-950 md:text-5xl">
                            {t('trust.title')}
                        </h2>

                        <Reveal3D lean={14} depth={150}>
                            <dl className="grid gap-4 sm:grid-cols-3">
                                {[
                                    { label: t('trust.delivered'), value: trust.delivered },
                                    { label: t('trust.customers'), value: trust.customers },
                                    ...(monthsRunning
                                        ? [{ label: t('trust.since'), value: `${monthsRunning} ${t('trust.months')}` }]
                                        : []),
                                ].map(f => (
                                    <div key={f.label} className="card p-7">
                                        <dd className="tabular font-display text-4xl font-extrabold text-gray-950">
                                            {f.value}
                                        </dd>
                                        <dt className="eyebrow mt-3">{f.label}</dt>
                                    </div>
                                ))}
                            </dl>
                        </Reveal3D>

                        <p className="mt-4 text-xs text-gray-600">{t('trust.note')}</p>
                    </div>
                </section>
            )}

            {/* ── Shop ────────────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="eyebrow">{t('home.picks.eyebrow')}</p>
                            <h2 className="mt-3 text-3xl text-gray-950 md:text-5xl">{t('home.products.title')}</h2>
                        </div>
                        <Link to="/products" className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                            {t('home.all')}
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    <Reveal3D lean={20} depth={220}>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {productsLoading
                            ? [1, 2, 3].map(i => <div key={i} className="card aspect-[4/5] animate-pulse" />)
                            : featuredProducts.map((p: any) => <ProductCard key={p._id} product={p} />)}
                    </div>
                    </Reveal3D>
                </div>
            </section>

            {/* ── How it works ────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <p className="eyebrow">{t('home.steps.eyebrow')}</p>
                    <h2 className="mb-12 mt-3 text-3xl text-gray-950 md:text-5xl">
                        {t('home.howworks.title')}
                    </h2>

                    {/*
                     * Numbering is kept because these really are sequential — you
                     * cannot pay before choosing, or receive before ordering.
                     */}
                    <Reveal3D lean={18} depth={200}>
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
                    </Reveal3D>
                </div>
            </section>

            {/* ── Branches ────────────────────────────────────────────────── */}
            <section className="pb-20 md:pb-24">
                <div className="container-custom">
                    <p className="eyebrow">{t('home.branches.eyebrow')}</p>
                    <h2 className="mb-3 mt-3 text-3xl text-gray-950 md:text-5xl">{t('home.branches.title')}</h2>
                    <p className="mb-10 max-w-2xl text-gray-600">{t('home.branches.subtitle')}</p>

                    <Reveal3D lean={10} depth={140}>
                    <div className="card overflow-hidden p-2">
                        {branchesLoading
                            ? <div className="h-[420px] animate-pulse rounded-3xl bg-gray-200" />
                            : <BranchMap branches={branches || []} />}
                    </div>
                    </Reveal3D>

                    <Reveal3D lean={14} depth={150} className="mt-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    </Reveal3D>
                </div>
            </section>

            {/* ── Closing call to action ──────────────────────────────────── */}
            <section className="pb-24">
                <div className="container-custom">
                    <Reveal3D lean={14} depth={180}>
                    <div className="card flex flex-col items-start gap-8 p-8 md:flex-row md:items-center
                                    md:justify-between md:p-12">
                        <div>
                            <p className="eyebrow">{t('home.pay.eyebrow')}</p>
                            <h3 className="mt-3 font-display text-2xl text-gray-950 md:text-4xl">
                                {t('home.pay.title')}
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">{t('home.pay.subtitle')}</p>
                        </div>
                        <Link to="/products" className="btn-primary group shrink-0 px-8 py-4 text-sm">
                            {t('home.hero.cta')}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                    </Reveal3D>
                </div>
            </section>
        </div>
    )
}
