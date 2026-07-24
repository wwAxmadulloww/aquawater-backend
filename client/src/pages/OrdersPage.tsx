import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight, Clock } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { getOrders, formatPrice } from '../api/client'

const STATUS_CLASSES: Record<string, string> = {
    pending: 'badge-pending',
    confirmed: 'bg-blue-100 text-blue-700',
    assigned: 'bg-indigo-100 text-indigo-700',
    in_transit: 'bg-orange-100 text-orange-700',
    delivered: 'badge-delivered',
    cancelled: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
    const { t } = useLanguage()
    const { data: orders, isLoading } = useQuery({
        queryKey: ['my-orders'],
        queryFn: () => getOrders(),
    })

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            pending: t('orders.status.pending'),
            confirmed: t('orders.status.confirmed'),
            assigned: t('orders.status.assigned'),
            in_transit: t('orders.status.in_transit'),
            delivered: t('orders.status.delivered'),
            cancelled: t('orders.status.cancelled'),
        }
        return map[status] || status
    }

    return (
        <div className="py-10">
            <div className="container-custom max-w-4xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <Package className="w-8 h-8 text-primary-600" />
                    {t('orders.title')}
                </h1>

                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="card p-5 animate-pulse">
                                <div className="flex justify-between">
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                                    </div>
                                    <div className="h-6 bg-gray-200 rounded w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : orders?.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📦</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('orders.empty')}</h2>
                        <Link to="/products" className="btn-primary px-8 py-3 mt-4 inline-flex">Mahsulotlarga o'tish</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders?.map((order: any) => {
                            const total = order.items.reduce(
                                (s: number, i: any) => s + i.priceSnapshot * i.qty, 0
                            )
                            return (
                                <Link key={order._id} to={`/orders/${order._id}`} className="card p-5 flex items-center justify-between gap-4 hover:shadow-soft transition-all group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`badge ${STATUS_CLASSES[order.status]}`}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                            <span className="text-xs text-gray-400 font-mono">#{order._id.slice(-8)}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate mb-1">
                                            {order.items.map((i: any) => `${i.nameSnapshot} ×${i.qty}`).join(', ')}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                                            </span>
                                            <span>{order.deliveryDate} • {order.deliveryTimeSlot}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-primary-700">{formatPrice(total)}</p>
                                        <p className="text-xs text-gray-400 capitalize">{order.paymentMethod}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
