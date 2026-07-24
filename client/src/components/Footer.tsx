import React from 'react'
import { Link } from 'react-router-dom'
import { Droplets, Phone, Instagram, Send, Facebook, MapPin, Mail, Clock } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const regions = ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Namangan', 'Farg\'ona']

export default function Footer() {
    const { t } = useLanguage()
    return (
        <footer className="bg-[#0a0f18] text-gray-400 pt-20 pb-10 relative overflow-hidden">
            {/* Subtle light effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />

            <div className="container-custom relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
                    {/* Brand & Mission */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/20">
                                <Droplets className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-bold text-white text-2xl tracking-tight">AquaWater</span>
                        </div>
                        <p className="text-sm leading-relaxed max-w-xs transition-colors hover:text-gray-300">
                            Bizning maqsadimiz — har bir xonadonga toza, mineral va sifatli ichimlik suvini eng zamonaviy texnologiyalar orqali tezda yetkazib berish.
                        </p>
                        <div className="flex gap-4">
                            {[Instagram, Send, Facebook].map((Icon, i) => (
                                <a key={i} href="#" className="w-10 h-10 bg-gray-800/50 rounded-xl flex items-center justify-center hover:bg-primary-600 hover:text-white transition-all duration-300 transform hover:-translate-y-1">
                                    <Icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-[0.1em]">Sahifalar</h3>
                        <ul className="space-y-4 text-sm">
                            {[
                                { to: '/products', label: 'Mahsulotlar' },
                                { to: '/orders', label: 'Buyurtmalar' },
                                { to: '/profile', label: 'Profil' },
                                { to: '/cart', label: 'Savat' }
                            ].map(link => (
                                <li key={link.to}>
                                    <Link to={link.to} className="hover:text-primary-400 transition-colors flex items-center gap-2 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-primary-500 transition-colors" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Branches / Regions */}
                    <div>
                        <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-[0.1em]">Viloyatlar</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                            {regions.map(r => (
                                <span key={r} className="flex items-center gap-2 hover:text-gray-200 transition-colors cursor-default">
                                    <MapPin className="w-3.5 h-3.5 text-primary-500/50" />
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-[0.1em]">Aloqa</h3>
                        <div className="space-y-5">
                            <a href="tel:+998901234567" className="group flex items-center gap-4 text-sm hover:text-white transition-colors">
                                <div className="w-10 h-10 bg-primary-900/20 text-primary-400 rounded-xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 uppercase font-black">Telefon</span>
                                    <span className="font-bold">+998 90 123 45 67</span>
                                </div>
                            </a>
                            <div className="group flex items-center gap-4 text-sm hover:text-white transition-colors">
                                <div className="w-10 h-10 bg-gray-800/50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-gray-700 transition-all">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 uppercase font-black">Xizmat vaqti</span>
                                    <span className="font-bold">24/7 Davomida</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-gray-800/50 flex flex-wrap gap-2">
                            {['Click', 'Payme', 'Visa', 'MasterCard'].map(m => (
                                <span key={m} className="px-3 py-1 bg-gray-800/30 border border-gray-800 text-[10px] font-bold tracking-widest uppercase rounded-lg">
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-10 border-t border-gray-800/50 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-bold tracking-widest uppercase text-gray-600">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                        <span>© 2026 AquaWater Uzbekistan</span>
                        <span className="hidden md:inline text-gray-800">•</span>
                        <span>{t('footer.rights')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Made by</span>
                        <span className="text-primary-500">Antigravity Team</span>
                        <span className="text-gray-800">|</span>
                        <span>UX/UI Platinum Edition</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

