import React from 'react'
import { Link } from 'react-router-dom'
import { Droplets, Phone, Send, MapPin, Clock } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const regions = ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Namangan', 'Farg\'ona']

export default function Footer() {
    const { t } = useLanguage()
    return (
        <footer className="border-t border-line bg-ink pb-10 pt-20 text-gray-600">

            <div className="container-custom relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
                    {/* Brand & Mission */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-accent">
                                <Droplets className="h-5 w-5" />
                            </span>
                            <span className="font-display text-lg font-semibold uppercase tracking-[0.16em] text-gray-950">AquaWater</span>
                        </div>
                        <p className="text-sm leading-relaxed max-w-xs transition-colors hover:text-gray-600">
                            {t('footer.mission')}
                        </p>
                        {/*
                          * Instagram and Facebook used to sit here on href="#",
                          * which looks like a link, invites a click and does
                          * nothing. Only the Telegram bot has an address that
                          * actually exists, so it is the only one shown; the
                          * others belong here the day those accounts do.
                          */}
                        <a
                            href="https://t.me/aquawatersuz_bot"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-3 rounded-full border border-line px-4 py-2.5
                                       text-xs text-gray-800 transition-colors hover:border-gray-500 hover:text-gray-950"
                        >
                            <Send className="h-4 w-4 text-accent" />
                            {t('footer.telegramBot')}
                        </a>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="eyebrow mb-6">{t('footer.pages')}</h3>
                        <ul className="space-y-4 text-sm">
                            {[
                                { to: '/products', label: 'nav.products' },
                                { to: '/orders', label: 'nav.orders' },
                                { to: '/profile', label: 'nav.profile' },
                                { to: '/cart', label: 'nav.cart' }
                            ].map(link => (
                                <li key={link.to}>
                                    <Link to={link.to} className="group flex items-center gap-2 transition-colors hover:text-gray-950">
                                        <div className="h-1 w-1 rounded-full bg-gray-400 transition-colors group-hover:bg-accent" />
                                        {t(link.label as any)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Branches / Regions */}
                    <div>
                        <h3 className="eyebrow mb-6">{t('footer.regions')}</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                            {regions.map(r => (
                                <span key={r} className="flex cursor-default items-center gap-2 transition-colors hover:text-gray-900">
                                    <MapPin className="h-3.5 w-3.5 text-gray-500" />
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="eyebrow mb-6">{t('footer.contact')}</h3>
                        <div className="space-y-5">
                            <a href="tel:+998901234567" className="group flex items-center gap-4 text-sm transition-colors hover:text-gray-950">
                                <div className="btn-round">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500">{t('footer.phone')}</span>
                                    <span className="font-medium text-gray-900">+998 90 123 45 67</span>
                                </div>
                            </a>
                            <div className="group flex items-center gap-4 text-sm transition-colors hover:text-gray-950">
                                <div className="btn-round">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500">{t('footer.serviceHours')}</span>
                                    <span className="font-medium text-gray-900">{t('footer.allDay')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-8">
                            {['Click', 'Payme', 'Visa', 'MasterCard'].map(m => (
                                <span key={m} className="rounded-full border border-line px-3 py-1 text-[10px] uppercase tracking-widest">
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-6 border-t border-line pt-10 text-[10px] uppercase tracking-widest text-gray-500 md:flex-row">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                        <span>© 2026 AquaWater Uzbekistan</span>
                        <span className="hidden text-gray-600 md:inline">•</span>
                        <span>{t('footer.rights')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Made by</span>
                        <span className="text-accent">Antigravity Team</span>
                        <span className="text-gray-600">|</span>
                        <span>UX/UI Platinum Edition</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

