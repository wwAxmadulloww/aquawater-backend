import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Menu, X, Droplets } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../i18n/LanguageContext'

const LANGS = [
    { code: 'uz', label: "O'z" },
    { code: 'ru', label: 'Рус' },
    { code: 'en', label: 'Eng' },
] as const

export default function Header() {
    const { isAuthenticated, isAdmin, user, logout } = useAuth()
    const { totalItems } = useCart()
    const { lang, setLang, t } = useLanguage()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 border-b border-white/60 bg-foam/80 backdrop-blur-xl
                           shadow-[inset_0_-1px_0_rgba(255,255,255,.7),0_1px_16px_-8px_rgba(5,42,56,.25)]">
            <div className="container-custom flex items-center h-16 gap-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 mr-4 flex-shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl
                                    bg-gradient-to-b from-[#2ad0e8] to-[#0f7d94]
                                    shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_6px_14px_-6px_rgba(18,160,184,.9)]">
                        <Droplets className="h-5 w-5 text-white" />
                    </div>
                    <span className="hidden font-display text-lg font-semibold tracking-tight text-gray-900 sm:block">AquaWater</span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1 flex-1">
                    <NavLink to="/products">{t('nav.products')}</NavLink>
                    {isAuthenticated && <NavLink to="/orders">{t('nav.orders')}</NavLink>}
                    {isAdmin && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
                    {user?.role === 'worker' && <NavLink to="/worker">Ishchi Paneli</NavLink>}
                    {user?.role === 'courier' && <NavLink to="/courier">Kuryer Paneli</NavLink>}
                </nav>

                <div className="flex items-center gap-2 ml-auto">
                    {/* Language switcher */}
                    <div className="flex items-center gap-0.5 rounded-2xl bg-gray-100/80 p-1 shadow-[inset_0_1px_3px_rgba(5,42,56,.10)]">
                        {LANGS.map(l => (
                            <button
                                key={l.code}
                                onClick={() => setLang(l.code)}
                                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${lang === l.code
                                    ? 'bg-white text-primary-700 shadow-[0_1px_3px_rgba(5,42,56,.18)]'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>

                    {/* Cart */}
                    <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors">
                        <ShoppingCart className="w-5 h-5" />
                        {totalItems > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full
                                             bg-sun text-[11px] font-extrabold text-abyss
                                             shadow-[0_2px_8px_-2px_rgba(255,169,77,.9)]">
                                {totalItems > 9 ? '9+' : totalItems}
                            </span>
                        )}
                    </Link>

                    {/* User */}
                    {isAuthenticated ? (
                        <div className="hidden md:flex items-center gap-2">
                            <Link to="/profile" className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors">
                                <User className="w-5 h-5" />
                            </Link>
                            <button onClick={() => { logout(); navigate('/') }} className="btn-ghost text-sm py-1.5">
                                {t('nav.logout')}
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="btn-primary text-sm py-1.5 hidden md:flex">
                            {t('nav.login')}
                        </Link>
                    )}

                    {/* Mobile menu btn */}
                    <button className="md:hidden p-2 text-gray-600" onClick={() => setMenuOpen(v => !v)}>
                        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="flex flex-col gap-1 border-t border-white/60 bg-foam/95 px-4 py-3 backdrop-blur-xl md:hidden">
                    <MobileNav to="/products" onClick={() => setMenuOpen(false)}>{t('nav.products')}</MobileNav>
                    {isAuthenticated && <MobileNav to="/orders" onClick={() => setMenuOpen(false)}>{t('nav.orders')}</MobileNav>}
                    {isAdmin && <MobileNav to="/admin" onClick={() => setMenuOpen(false)}>{t('nav.admin')}</MobileNav>}
                    {user?.role === 'worker' && <MobileNav to="/worker" onClick={() => setMenuOpen(false)}>Ishchi Paneli</MobileNav>}
                    {user?.role === 'courier' && <MobileNav to="/courier" onClick={() => setMenuOpen(false)}>Kuryer Paneli</MobileNav>}
                    {isAuthenticated ? (
                        <>
                            <MobileNav to="/profile" onClick={() => setMenuOpen(false)}>{t('nav.profile')}</MobileNav>
                            <button className="btn-ghost text-left py-2" onClick={() => { logout(); navigate('/'); setMenuOpen(false) }}>
                                {t('nav.logout')}
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="btn-primary text-center py-2" onClick={() => setMenuOpen(false)}>
                            {t('nav.login')}
                        </Link>
                    )}
                </div>
            )}
        </header>
    )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
    return (
        <Link to={to} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            {children}
        </Link>
    )
}

function MobileNav({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <Link to={to} onClick={onClick} className="py-2 px-2 text-gray-700 font-medium hover:text-primary-600 rounded-lg transition-colors">
            {children}
        </Link>
    )
}
