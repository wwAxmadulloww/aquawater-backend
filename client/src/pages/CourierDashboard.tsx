import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, MapPin, Phone, Package, Calendar } from 'lucide-react'
import { getOrders, updateOrderStatus, formatPrice } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import { orderCode, paymentKey, orderTotal, orderBottles } from '../lib/orderFormat'
import toast from 'react-hot-toast'

export default function CourierDashboard() {
    const { t } = useLanguage()
    // Per-order, because a courier works through several stops in one session.
    const [empties, setEmpties] = useState<Record<string, number | ''>>({})
    const { user } = useAuth()
    const qc = useQueryClient()

    // Orders assigned to this courier (backend handles the filter based on token role)
    const { data: orders, isLoading } = useQuery({
        queryKey: ['courier-orders', user?._id],
        queryFn: () => getOrders(),
    })

    const statusMut = useMutation({
        mutationFn: ({ id, status, emptiesCollected }: { id: string; status: string; emptiesCollected?: number }) =>
            updateOrderStatus(id, status, emptiesCollected === undefined ? undefined : { emptiesCollected }),
        onSuccess: () => { toast.success('Status yangilandi'); qc.invalidateQueries({ queryKey: ['courier-orders', user?._id] }) },
        onError: () => toast.error('Xatolik yuz berdi')
    })

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Kuryer paneli</h1>
                <p className="text-gray-500 mt-1">Sizga biriktirilgan yetkazib berish buyurtmalari ro'yxati</p>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12 text-gray-600">Yuklanmoqda...</div>
                ) : orders?.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-600">
                        Sizga biriktirilgan buyurtmalar yo'q
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {orders?.map((order: any) => (
                            <div key={order._id} className="card p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                {order.status === 'delivered' && (
                                    <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                                        <div className="absolute transform rotate-45 bg-green-500 text-white text-[10px] font-bold py-1 right-[-35px] top-[15px] w-[120px] text-center shadow-sm">
                                            YETKAZILDI
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4 pr-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Buyurtma #{orderCode(order._id)}</p>
                                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                        order.status === 'in_transit' ? 'bg-orange-100 text-orange-700' :
                                            ['assigned', 'confirmed'].includes(order.status) ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {order.status === 'delivered' ? 'Yetkazilgan' :
                                            order.status === 'in_transit' ? 'Yo\'lda' :
                                                ['assigned', 'confirmed'].includes(order.status) ? 'Biriktirilgan' :
                                                    'Kutilmoqda'}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-start gap-3 text-sm text-gray-900 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                        <span>{order.addressSnapshot?.region}, {order.addressSnapshot?.city}, {order.addressSnapshot?.district}, {order.addressSnapshot?.street} {order.addressSnapshot?.house} {order.addressSnapshot?.apartment ? `(Xonadon: ${order.addressSnapshot.apartment})` : ''}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Calendar className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                        <span>{order.deliveryDate} ({order.deliveryTimeSlot})</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                        <a href={`tel:${order.userId?.phone}`} className="text-primary-600 hover:underline">{order.userId?.phone}</a>
                                        <span>({order.userId?.name})</span>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-4 text-sm text-gray-600 border-t border-gray-50 pt-4">
                                    {order.items.map((i: any, idx: number) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>
                                                {i.nameSnapshot}
                                                {(i.depositSnapshot || 0) > 0 && (
                                                    <span className="ml-1.5 text-[10px] text-gray-500">📦</span>
                                                )}
                                            </span>
                                            <span className="font-medium text-gray-900">×{i.qty}</span>
                                        </div>
                                    ))}
                                </div>

                                {/*
                                  * What to expect at the door, before the count is typed. The
                                  * courier used to be shown an empty number box and nothing
                                  * else — no idea how many containers this delivery carries,
                                  * nor how many the customer is already holding — and a guessed
                                  * count is what makes the whole ledger untrustworthy.
                                  */}
                                {(() => {
                                    const b = orderBottles(order)
                                    const held = Number(order.userId?.bottleBalance || 0)
                                    if (!b.toReturn && !b.bought && !held) return null
                                    return (
                                        <div className="mb-4 space-y-1 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                                            {!!b.toReturn && (
                                                <p className="text-gray-900">
                                                    ♻️ {t('courier.expect').replace('{n}', String(b.toReturn))}
                                                </p>
                                            )}
                                            {b.bought > 0 && (
                                                <p className="text-gray-600">
                                                    📦 {t('orders.bottles.bought').replace('{n}', String(b.bought))}
                                                </p>
                                            )}
                                            <p className={held > 0 ? 'font-medium text-gray-900' : 'text-gray-600'}>
                                                {held > 0
                                                    ? `🫙 ${t('courier.holds').replace('{n}', String(held))}`
                                                    : `🫙 ${t('courier.holdsNone')}`}
                                            </p>
                                        </div>
                                    )
                                })()}

                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-0.5">To'lov holati: <span className="font-medium text-gray-700">{t(paymentKey(order.paymentMethod) as any)}</span></p>
                                        <p className="font-bold text-gray-900 text-lg">{formatPrice(orderTotal(order))}</p>
                                    </div>

                                    <div className="flex gap-2">
                                        {['assigned', 'confirmed'].includes(order.status) && (
                                            <button
                                                onClick={() => statusMut.mutate({ id: order._id, status: 'in_transit' })}
                                                disabled={statusMut.isPending}
                                                className="btn-primary py-2.5 px-5 text-sm gap-2 whitespace-nowrap bg-orange-600 hover:bg-orange-700"
                                            >
                                                Yo'lga chiqdim
                                            </button>
                                        )}
                                        {/*
                                          * `confirmed` counts too. Assigning a courier sets the
                                          * status to `assigned`, but an admin setting it back to
                                          * `confirmed` afterwards left the courier holding an
                                          * order with no buttons at all — so the delivery could
                                          * never be marked done and the empties never came back.
                                          */}
                                        {['assigned', 'confirmed', 'in_transit'].includes(order.status) && (
                                            <>
                                                {/*
                                                  * The empties count is captured here rather than on a
                                                  * separate screen because this is the only moment the
                                                  * courier is standing at the door and knows the answer.
                                                  * Defaults to 0 so the tap still works when they took
                                                  * nothing back.
                                                  */}
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={200}
                                                    inputMode="numeric"
                                                    value={empties[order._id] ?? ''}
                                                    onChange={e => setEmpties(prev => ({
                                                        ...prev,
                                                        [order._id]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
                                                    }))}
                                                    placeholder={t('courier.empties')}
                                                    title={t('courier.empties')}
                                                    className="input w-28 py-2.5 text-sm"
                                                />
                                                <button
                                                    onClick={() => statusMut.mutate({
                                                        id: order._id,
                                                        status: 'delivered',
                                                        emptiesCollected: Number(empties[order._id] || 0),
                                                    })}
                                                    disabled={statusMut.isPending}
                                                    className="btn-primary py-2.5 px-5 text-sm gap-2 whitespace-nowrap"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Yetkazildi
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
