import React, { useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { MapPin, LayoutDashboard, Package, ShoppingBag, Users, BarChart2, LogOut, Menu, X, Droplets } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n/LanguageContext'
import AdminStats from './AdminStats'
import AdminProducts from './AdminProducts'
import AdminOrders from './AdminOrders'
import AdminUsers from './AdminUsers'
import AdminBranches from './AdminBranches'

const NAV_ITEMS = [
    { path: '/admin', label: 'admin.stats', icon: BarChart2, exact: true },
    { path: '/admin/products', label: 'admin.products', icon: Package },
    { path: '/admin/orders', label: 'admin.orders', icon: ShoppingBag },
    { path: '/admin/users', label: 'admin.users', icon: Users },
    { path: '/admin/branches', label: 'Filiallar', icon: MapPin },
]

export default function AdminPage() {
    const { logout } = useAuth()
    const { t } = useLanguage()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => { logout(); navigate('/') }

    const Sidebar = () => (
        <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-full">
            <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="font-bold text-sm">AquaWater</p>
                    <p className="text-xs text-gray-400">Admin Panel</p>
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
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {item.label.includes('.') ? t(item.label as any) : item.label}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t border-gray-800">
                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl text-sm transition-colors">
                    <LogOut className="w-4 h-4" />
                    {t('nav.logout')}
                </button>
                <Link to="/" className="flex items-center gap-3 w-full px-3 py-2 text-gray-400 hover:text-white text-xs mt-1 rounded-xl hover:bg-gray-800 transition-colors">
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
                    <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    <div className="relative z-10 w-64">
                        <Sidebar />
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile topbar */}
                <div className="md:hidden flex items-center h-14 px-4 bg-white border-b border-gray-200 gap-3">
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
                    </Routes>
                </main>
            </div>
        </div>
    )
}
