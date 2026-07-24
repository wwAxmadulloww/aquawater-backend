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
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div className="container-custom flex items-center h-16 gap-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 mr-4 flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-primary-700 text-lg leading-tight hidden sm:block">AquaWater</span>
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
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                        {LANGS.map(l => (
                            <button
                                key={l.code}
                                onClick={() => setLang(l.code)}
                                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${lang === l.code
                                    ? 'bg-white text-primary-700 shadow-sm'
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
                            <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
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
                <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-2">
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
