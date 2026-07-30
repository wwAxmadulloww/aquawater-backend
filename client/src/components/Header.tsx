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
        <header className="sticky top-0 z-50 border-b border-line/80 bg-ink/70 backdrop-blur-xl">
            <div className="container-custom flex h-16 items-center gap-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 mr-4 flex-shrink-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-accent">
                        <Droplets className="h-4 w-4" />
                    </span>
                    <span className="hidden font-display text-base font-semibold uppercase tracking-[0.16em] text-gray-950 sm:block">
                        AquaWater
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1 flex-1">
                    <NavLink to="/products">{t('nav.products')}</NavLink>
                    {isAuthenticated && <NavLink to="/orders">{t('nav.orders')}</NavLink>}
                    {isAuthenticated && <NavLink to="/subscriptions">{t('subs.title')}</NavLink>}
                    {isAdmin && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
                    {user?.role === 'worker' && <NavLink to="/worker">Ishchi Paneli</NavLink>}
                    {user?.role === 'courier' && <NavLink to="/courier">Kuryer Paneli</NavLink>}
                </nav>

                <div className="flex items-center gap-2 ml-auto">
                    {/* Language switcher */}
                    <div className="flex items-center gap-0.5 rounded-full border border-line p-1">
                        {LANGS.map(l => (
                            <button
                                key={l.code}
                                onClick={() => setLang(l.code)}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-all ${lang === l.code
                                    ? 'bg-gray-950 text-ink'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>

                    {/* Cart */}
                    <Link to="/cart" className="btn-round relative">
                        <ShoppingCart className="w-5 h-5" />
                        {totalItems > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full
                                             bg-accent text-[10px] font-bold text-ink">
                                {totalItems > 9 ? '9+' : totalItems}
                            </span>
                        )}
                    </Link>

                    {/* User */}
                    {isAuthenticated ? (
                        <div className="hidden md:flex items-center gap-2">
                            <Link to="/profile" className="btn-round">
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
                    <button className="btn-round md:hidden" onClick={() => setMenuOpen(v => !v)}>
                        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="flex flex-col gap-1 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur-xl md:hidden">
                    <MobileNav to="/products" onClick={() => setMenuOpen(false)}>{t('nav.products')}</MobileNav>
                    {isAuthenticated && <MobileNav to="/orders" onClick={() => setMenuOpen(false)}>{t('nav.orders')}</MobileNav>}
                    {isAuthenticated && <MobileNav to="/subscriptions" onClick={() => setMenuOpen(false)}>{t('subs.title')}</MobileNav>}
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
        <Link to={to} className="rounded-full px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-600 transition-colors hover:text-gray-950">
            {children}
        </Link>
    )
}

function MobileNav({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <Link to={to} onClick={onClick} className="rounded-lg px-2 py-2 text-sm font-medium text-gray-800 transition-colors hover:text-gray-950">
            {children}
        </Link>
    )
}
