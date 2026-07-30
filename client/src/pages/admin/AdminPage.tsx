import React, { useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { MapPin, LayoutDashboard, Package, ShoppingBag, Users, BarChart2, LogOut, Menu, X, Droplets, TrendingUp, Truck, Repeat } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n/LanguageContext'
import AdminStats from './AdminStats'
import AdminProducts from './AdminProducts'
import AdminOrders from './AdminOrders'
import AdminUsers from './AdminUsers'
import AdminBranches from './AdminBranches'
import AdminReports from './AdminReports'
import AdminBottles from './AdminBottles'
import AdminZones from './AdminZones'
import AdminSubscriptions from './AdminSubscriptions'

const NAV_ITEMS = [
    { path: '/admin', label: 'admin.stats', icon: BarChart2, exact: true },
    { path: '/admin/products', label: 'admin.products', icon: Package },
    { path: '/admin/orders', label: 'admin.orders', icon: ShoppingBag },
    { path: '/admin/users', label: 'admin.users', icon: Users },
    { path: '/admin/branches', label: 'Filiallar', icon: MapPin },
    { path: '/admin/reports', label: 'Hisobotlar', icon: TrendingUp },
    { path: '/admin/bottles', label: 'Idishlar', icon: Droplets },
    { path: '/admin/zones', label: 'Yetkazish', icon: Truck },
    { path: '/admin/subscriptions', label: 'Doimiy', icon: Repeat },
]

export default function AdminPage() {
    const { logout } = useAuth()
    const { t } = useLanguage()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => { logout(); navigate('/') }

    const Sidebar = () => (
        <aside className="flex min-h-full w-64 flex-col border-r border-line bg-gray-100 text-gray-900">
            <div className="flex items-center gap-3 border-b border-line px-6 py-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-accent">
                    <Droplets className="h-4 w-4" />
                </span>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-950">AquaWater</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600">Admin Panel</p>
                </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map(item => {
                    const active = item.exact ? location.pathname === '/admin' : location.pathname.startsWith(item.path)
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active
                                ? 'bg-gray-950 text-ink'
                                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-950'
                                }`}
                        >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {item.label.includes('.') ? t(item.label as any) : item.label}
                        </Link>
                    )
                })}
            </nav>
            <div className="border-t border-line p-4">
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-950">
                    <LogOut className="w-4 h-4" />
                    {t('nav.logout')}
                </button>
                <Link to="/" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-950">
                    ← Saytga qaytish
                </Link>
            </div>
        </aside>
    )

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Desktop sidebar */}
            <div className="hidden md:flex flex-shrink-0">
                <Sidebar />
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="fixed inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
                    <div className="relative z-10 w-64">
                        <Sidebar />
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile topbar */}
                <div className="md:hidden flex items-center h-14 px-4 bg-surface border-b border-gray-200 gap-3">
                    <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-gray-900 text-sm">{t('admin.dashboard')}</span>
                </div>

                <main className="flex-1 p-6">
                    <Routes>
                        <Route index element={<AdminStats />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="branches" element={<AdminBranches />} />
                        <Route path="reports" element={<AdminReports />} />
                        <Route path="bottles" element={<AdminBottles />} />
                        <Route path="zones" element={<AdminZones />} />
                        <Route path="subscriptions" element={<AdminSubscriptions />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}
