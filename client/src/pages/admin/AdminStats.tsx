import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { TrendingUp, ShoppingBag, CheckCircle, Users, Package, AlertTriangle } from 'lucide-react'
import { getAdminStats, formatPrice } from '../../api/client'
import { useLanguage } from '../../i18n/LanguageContext'

export default function AdminStats() {
    const { t } = useLanguage()
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: getAdminStats,
    })

    const statCards = [
        {
            label: t('admin.totalOrders'),
            value: stats?.totalOrders ?? '—',
            icon: <ShoppingBag className="w-6 h-6 text-blue-600" />,
            bg: 'bg-blue-50',
        },
        {
            label: t('admin.delivered'),
            value: stats?.deliveredOrders ?? '—',
            icon: <CheckCircle className="w-6 h-6 text-green-600" />,
            bg: 'bg-green-50',
        },
        {
            label: t('admin.revenue'),
            value: stats ? formatPrice(stats.totalRevenue) : '—',
            icon: <TrendingUp className="w-6 h-6 text-purple-600" />,
            bg: 'bg-purple-50',
            wide: true,
        },
        {
            label: t('admin.customers'),
            value: stats?.totalCustomers ?? '—',
            icon: <Users className="w-6 h-6 text-orange-600" />,
            bg: 'bg-orange-50',
        },
        {
            label: 'Mahsulotlar',
            value: stats?.totalProducts ?? '—',
            icon: <Package className="w-6 h-6 text-primary-600" />,
            bg: 'bg-primary-50',
        },
    ]

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('admin.stats')}</h1>

            {/*
              * The stock figures the system started with were seeded, not counted.
              * Until somebody walks the depot they are a guess that the
              * overselling guard is nonetheless enforcing, so this sits at the top
              * of the first screen an owner opens rather than buried in a table.
              */}
            {stats?.uncountedStock?.length > 0 && (
                <div className="card mb-8 border-sun/30 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="flex items-center gap-2 font-semibold text-sun">
                                <AlertTriangle className="h-4 w-4" />
                                Ombor qoldig'i hali sanalmagan
                            </p>
                            <p className="mt-1.5 max-w-xl text-sm text-gray-600">
                                Quyidagi mahsulotlarning qoldig'i tizimga boshlang'ich qiymat sifatida
                                kiritilgan — hech kim ularni omborda sanamagan. Buyurtma qabul qilish
                                shu raqamlarga qarab cheklanadi, shuning uchun ularni bir marta
                                sanab kiritish kerak.
                            </p>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {stats.uncountedStock.map((p: any) => (
                                    <li key={p._id} className="badge-pending badge text-[11px]">
                                        {p.name}: {p.stockQty}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Link to="/admin/products" className="btn-primary shrink-0 px-5 py-2.5 text-xs">
                            Sanab kiritish
                        </Link>
                    </div>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => (
                    <div key={card.label} className={`card p-5 ${card.wide ? 'col-span-2 sm:col-span-1' : ''}`}>
                        <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                            {card.icon}
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : card.value}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            {stats?.ordersPerDay && stats.ordersPerDay.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Orders per day */}
                    <div className="card p-6">
                        <h2 className="font-semibold text-gray-900 mb-4 text-sm">Kunlik buyurtmalar (so'nggi 7 kun)</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={stats.ordersPerDay} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    formatter={(value: number) => [value, 'Buyurtmalar']}
                                    labelFormatter={(label) => `Sana: ${label}`}
                                />
                                <Bar dataKey="count" fill="#1e7fe8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Revenue per day */}
                    <div className="card p-6">
                        <h2 className="font-semibold text-gray-900 mb-4 text-sm">Kunlik daromad (so'm)</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={stats.ordersPerDay} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    formatter={(value: number) => [formatPrice(value), 'Daromad']}
                                    labelFormatter={(label) => `Sana: ${label}`}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Status breakdown */}
            {stats && (
                <div className="card p-6 mt-6">
                    <h2 className="font-semibold text-gray-900 mb-4 text-sm">Buyurtmalar holati</h2>
                    <div className="flex gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="badge-pending badge text-sm">⏳ Kutilmoqda: {stats.pendingOrders}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="badge-accepted badge text-sm">✅ Qabul qilindi: {stats.acceptedOrders}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="badge-delivered badge text-sm">🚚 Yetkazildi: {stats.deliveredOrders}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
