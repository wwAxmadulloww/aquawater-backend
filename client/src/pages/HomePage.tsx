import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Droplets, Clock, Phone, CreditCard, ShieldCheck, ChevronRight, MapPin } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { getProducts, api } from '../api/client'
import ProductCard from '../components/ProductCard'
import BranchMap from '../components/BranchMap'

const HOW_STEPS = [
    { icon: '🔍', key: 'step1' },
    { icon: '📋', key: 'step2' },
    { icon: '🚚', key: 'step3' },
] as const

const TRUST = [
    { icon: <Clock className="w-6 h-6 text-primary-600" />, key: 'home.trust.delivery' },
    { icon: <Phone className="w-6 h-6 text-primary-600" />, key: 'home.trust.support' },
    { icon: <CreditCard className="w-6 h-6 text-primary-600" />, key: 'home.trust.payment' },
    { icon: <ShieldCheck className="w-6 h-6 text-primary-600" />, key: 'home.trust.quality' },
] as const

export default function HomePage() {
    const { t } = useLanguage()

    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['products-home'],
        queryFn: () => getProducts(),
    })

    const { data: branches, isLoading: branchesLoading } = useQuery({
        queryKey: ['branches-home'],
        queryFn: async () => {
            const res = await api.get('/branches')
            return res.data
        }
    })

    const featuredProducts = products?.slice(0, 3) || []

    return (
        <div className="overflow-x-hidden">
            {/* Hero */}
            <section className="relative bg-gradient-to-br from-primary-50 via-white to-water-light py-20 md:py-32">
                <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary-100 rounded-full blur-[120px] -mr-20 -mt-20 opacity-60" />
                <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-water-light rounded-full blur-[100px] -ml-20 -mb-20 opacity-50" />

                <div className="container-custom relative flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                    <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-primary-700 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-2xl shadow-sm border border-primary-100 mb-8 animate-fade-in">
                            <Droplets className="w-4 h-4" />
                            <span>Uzbekiston #1 suv yetkazib berish</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight whitespace-pre-line tracking-tight">
                            {t('home.hero.title')}
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-xl leading-relaxed font-medium">
                            {t('home.hero.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <Link to="/products" className="btn-primary text-base px-8 py-4 rounded-2xl gap-2 shadow-xl shadow-primary-200 group">
                                {t('home.hero.cta')}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/products" className="btn-secondary text-base px-8 py-4 rounded-2xl border border-primary-100 hover:bg-white hover:border-primary-200">
                                {t('home.hero.secondary')}
                            </Link>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center perspective-[1000px]">
                        <div className="relative animate-float">
                            <div className="w-72 h-72 md:w-96 md:h-96 bg-gradient-to-tr from-primary-100 to-white rounded-[40px] rotate-12 flex items-center justify-center shadow-soft overflow-hidden">
                                <div className="text-[140px] md:text-[200px] select-none scale-110 drop-shadow-2xl">💧</div>
                            </div>
                            <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-soft px-5 py-4 text-sm font-bold text-gray-800 border border-gray-100 animate-bounce-slow">
                                🚚 2 soat ichida
                            </div>
                            <div className="absolute -bottom-6 -left-6 bg-primary-600 rounded-2xl shadow-soft px-5 py-4 text-sm font-bold text-white shadow-xl shadow-primary-200">
                                ✅ Sertifikatlangan
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured products */}
            <section className="py-24 bg-white">
                <div className="container-custom">
                    <div className="flex items-end justify-between mb-12">
                        <div>
                            <p className="text-primary-600 font-bold text-sm uppercase tracking-widest mb-2">Tanlovimiz</p>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('home.products.title')}</h2>
                        </div>
                        <Link to="/products" className="text-primary-600 font-bold flex items-center gap-1 hover:gap-3 transition-all">
                            Barchasi <ChevronRight className="w-5 h-5 mt-0.5" />
                        </Link>
                    </div>

                    {productsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-gray-50 rounded-[32px] aspect-[4/5]" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {featuredProducts.map((p: any) => <ProductCard key={p._id} product={p} />)}
                        </div>
                    )}
                </div>
            </section>

            {/* Branches Map */}
            <section className="py-24 bg-gray-50 overflow-hidden">
                <div className="container-custom text-center mb-16">
                    <p className="text-primary-600 font-bold text-sm uppercase tracking-widest mb-2">Qayerda bormiz?</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Bizning filiallarimiz</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">Sizga eng yaqin filiallarni xaritadan toping va toza suvga ega bo'ling.</p>
                </div>

                <div className="container-custom">
                    {branchesLoading ? (
                        <div className="w-full h-[450px] bg-gray-200 animate-pulse rounded-3xl" />
                    ) : (
                        <BranchMap branches={branches || []} />
                    )}
                </div>

                <div className="container-custom mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {branches?.slice(0, 6).map((b: any) => (
                        <div key={b._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 flex-shrink-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 text-sm truncate">{b.name}</h4>
                                <p className="text-gray-500 text-xs truncate">{b.address}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="py-24 bg-white">
                <div className="container-custom">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16 underline decoration-primary-600 decoration-8 underline-offset-8 decoration-primary-100">{t('home.howworks.title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {HOW_STEPS.map((step, i) => (
                            <div key={step.key} className="text-center group">
                                <div className="w-24 h-24 bg-primary-50 rounded-[32px] flex items-center justify-center text-5xl mx-auto mb-6 relative group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                                    {step.icon}
                                    <span className="absolute -top-3 -right-3 w-8 h-8 bg-white border-4 border-gray-100 text-primary-600 text-xs rounded-full flex items-center justify-center font-black group-hover:border-primary-700">
                                        {i + 1}
                                    </span>
                                </div>
                                <h3 className="font-bold text-xl text-gray-900 mb-3">
                                    {t(`home.howworks.${step.key}.title` as any)}
                                </h3>
                                <p className="text-gray-500 leading-relaxed px-4">
                                    {t(`home.howworks.${step.key}.desc` as any)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust blocks */}
            <section className="py-16 bg-gray-50">
                <div className="container-custom">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        {TRUST.map((item, i) => (
                            <div key={i} className="bg-white text-center p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-soft transition-all group">
                                <div className="mb-4 flex justify-center group-hover:scale-110 transition-transform">{item.icon}</div>
                                <p className="text-sm font-bold text-gray-800">{t(item.key)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Payment methods banner */}
            <section className="py-16 bg-primary-600 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_0%,_transparent_50%)] opacity-10" />
                <div className="container-custom relative flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-center md:text-left">
                        <p className="text-primary-100 font-bold uppercase tracking-widest text-sm mb-2">Siz uchun qulayliklar</p>
                        <h3 className="text-white font-black text-3xl md:text-4xl">To'lov usullari</h3>
                    </div>
                    <div className="flex gap-4 flex-wrap justify-center">
                        {['💵 Naqd pul', '📱 Click', '💳 Payme'].map(m => (
                            <div key={m} className="bg-white/10 text-white font-bold px-8 py-4 rounded-2xl text-base backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors cursor-default">
                                {m}
                            </div>
                        ))}
                    </div>
                    <Link to="/products" className="bg-white text-primary-600 font-bold px-10 py-5 rounded-2xl hover:bg-primary-50 transition-all shadow-xl hover:-translate-y-1 active:scale-95 text-lg">
                        {t('home.hero.cta')} →
                    </Link>
                </div>
            </section>
        </div>
    )
}
