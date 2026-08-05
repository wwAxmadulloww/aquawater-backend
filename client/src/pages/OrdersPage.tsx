import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Clock, Droplets } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { orderCode, paymentKey, orderTotal, orderBottles } from '../lib/orderFormat'
import { getOrders, getMyBottles, formatPrice, cancelMyOrder, describeApiError } from '../api/client'
import toast from 'react-hot-toast'

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
    const { user } = useAuth()

    const { data: orders, isLoading } = useQuery({
        queryKey: ['my-orders', user?._id],
        queryFn: () => getOrders(),
    })

    /*
     * The container balance belongs on this page, not only on the standing-order
     * page. This is the screen a customer opens after buying, and it was the one
     * place that said nothing at all about the bottles they are holding.
     */
    const qc = useQueryClient()

    /*
     * A customer can call off their own order until it is on the road. Every
     * cancellation used to be a phone call to the shop, for something the
     * person who made the mistake could undo themselves.
     */
    const cancel = useMutation({
        mutationFn: (id: string) => cancelMyOrder(id),
        onSuccess: () => {
            toast.success(t('orders.cancelled'))
            qc.invalidateQueries({ queryKey: ['my-orders', user?._id] })
        },
        onError: (err) => toast.error(describeApiError(err)),
    })

    const { data: bottles } = useQuery({
        queryKey: ['my-bottles', user?._id],
        queryFn: getMyBottles,
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

                {(bottles?.balance ?? 0) > 0 && (
                    <Link
                        to="/subscriptions"
                        className="card mb-6 flex items-center gap-4 p-5 transition-colors hover:border-accent"
                    >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center
                                         rounded-full border border-line text-accent">
                            <Droplets className="h-5 w-5" />
                        </span>
                        <span className="text-sm text-gray-900">
                            {t('orders.bottles.hold').replace('{n}', String(bottles.balance))}
                        </span>
                    </Link>
                )}

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
                        <Link to="/products" className="btn-primary px-8 py-3 mt-4 inline-flex">{t('common.toProducts')}</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders?.map((order: any) => {
                            const total = orderTotal(order)
                            const b = orderBottles(order)
                            const delivered = order.status === 'delivered'
                            return (
                                <div key={order._id} className="card p-5 flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`badge ${STATUS_CLASSES[order.status]}`}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                            <span className="font-mono text-xs text-gray-600">#{orderCode(order._id)}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate mb-1">
                                            {order.items.map((i: any) => `${i.nameSnapshot} ×${i.qty}`).join(', ')}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                                            </span>
                                            <span>{order.deliveryDate} • {order.deliveryTimeSlot}</span>
                                        </div>

                                        {/* What this particular order did to the bottle count,
                                            so the running balance above is explainable rather
                                            than a number the customer has to trust. */}
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                            {!!b.toReturn && (
                                                <span className="text-accent">
                                                    ♻️ {t('orders.bottles.toReturn').replace('{n}', String(b.toReturn))}
                                                </span>
                                            )}
                                            {b.bought > 0 && (
                                                <span className="text-gray-600">
                                                    📦 {t('orders.bottles.bought').replace('{n}', String(b.bought))}
                                                </span>
                                            )}
                                            {delivered && b.collected > 0 && (
                                                <span className="text-[#039855]">
                                                    ✅ {t('orders.bottles.collected').replace('{n}', String(b.collected))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-primary-700">{formatPrice(total)}</p>
                                        <p className="text-xs text-gray-600">{t(paymentKey(order.paymentMethod) as any)}</p>
                                        {['pending', 'confirmed'].includes(order.status) && (
                                            <button
                                                onClick={() => cancel.mutate(order._id)}
                                                disabled={cancel.isPending}
                                                className="mt-2 text-xs text-[#d92d20] underline underline-offset-2 hover:opacity-80"
                                            >
                                                {t('orders.cancel')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
