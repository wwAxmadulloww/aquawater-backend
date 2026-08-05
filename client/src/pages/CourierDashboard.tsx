import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, MapPin, Phone, Package, Calendar, Truck } from 'lucide-react'
import { getOrders, updateOrderStatus, formatPrice } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import { orderCode, paymentKey, orderTotal, orderBottles } from '../lib/orderFormat'
import toast from 'react-hot-toast'

export default function CourierDashboard() {
    const { t } = useLanguage()
    // Per-order, because a courier works through several stops in one session.
    const [empties, setEmpties] = useState<Record<string, number | ''>>({})
    /*
     * Per order, because a courier works a round and one customer being short
     * must not carry over to the next stop. Defaults to taken: that is what
     * happens at almost every door, and the exception is the one worth a tap.
     */
    const [unpaid, setUnpaid] = useState<Record<string, boolean>>({})
    const { user } = useAuth()
    const qc = useQueryClient()

    // Orders assigned to this courier (backend handles the filter based on token role)
    const { data: orders, isLoading } = useQuery({
        queryKey: ['courier-orders', user?._id],
        queryFn: () => getOrders(),
    })

    const statusMut = useMutation({
        mutationFn: ({ id, status, emptiesCollected, paid }: {
            id: string; status: string; emptiesCollected?: number; paid?: boolean;
        }) => updateOrderStatus(
            id, status,
            emptiesCollected === undefined && paid === undefined
                ? undefined
                : { ...(emptiesCollected === undefined ? {} : { emptiesCollected }), ...(paid === undefined ? {} : { paid }) },
        ),
        onSuccess: () => { toast.success('Status yangilandi'); qc.invalidateQueries({ queryKey: ['courier-orders', user?._id] }) },
        onError: () => toast.error('Xatolik yuz berdi')
    })

    /*
     * The round, summarised.
     *
     * A courier had a list of stops and no sense of the day: how much was left,
     * and — the figure that actually causes arguments — how much of the shop's
     * money was in their pocket. Both are derived from the orders they already
     * receive, so neither costs a request.
     */
    const mine = (orders || []).filter((o: any) => o.status !== 'cancelled')
    const remaining = mine.filter((o: any) => o.status !== 'delivered').length

    // Taken at the door, not yet handed in. Anything already settled has been
    // counted at the office and is no longer the courier's to answer for.
    const cashToHand = mine
        .filter((o: any) => o.paymentStatus === 'paid' && o.paymentMethod === 'cash' && !o.cashSettledAt)
        .reduce((sum: number, o: any) => sum + orderTotal(o), 0)

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <p className="eyebrow">Kuryer</p>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">{user?.name || 'Kuryer paneli'}</h1>
                <p className="text-gray-500 mt-1">
                    {isLoading
                        ? 'Yuklanmoqda...'
                        : `Bugungi marshrut — ${remaining} ta manzil qoldi`}
                </p>
            </div>

            {!isLoading && mine.length > 0 && (
                <div className="mb-8 grid grid-cols-2 gap-3 sm:max-w-md">
                    <div className="card p-4">
                        <p className="text-2xl font-bold tabular-nums text-gray-900">{mine.length}</p>
                        <p className="mt-1 text-xs text-gray-600">jami manzil</p>
                    </div>
                    <div className="card p-4">
                        {/* Smaller on a narrow phone: at 24px a six-figure sum broke
                            onto a second line and the card grew a step taller than
                            the one beside it. */}
                        <p className="text-lg font-bold tabular-nums text-gray-900 sm:text-2xl">
                            {formatPrice(cashToHand)}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">kassaga topshiriladi</p>
                    </div>
                </div>
            )}

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
                                    <p className="text-sm text-gray-600">{order.userId?.name}</p>
                                    <a
                                        href={`tel:${order.userId?.phone}`}
                                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-4
                                                   text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
                                    >
                                        <Phone className="w-4 h-4" />
                                        {order.userId?.phone}
                                    </a>
                                </div>

                                <ul className="mb-4 space-y-2 rounded-2xl bg-gray-50 px-4 py-3">
                                    {order.items.map((i: any, idx: number) => (
                                        <li key={idx} className="flex items-center gap-3 text-sm">
                                            <span className="font-semibold text-gray-900">{i.qty}×</span>
                                            <span className="flex-1 text-gray-900">{i.nameSnapshot}</span>
                                            <span className="text-xs text-gray-600">
                                                {(i.depositSnapshot || 0) > 0 ? 'sotib olindi' : 'qaytariladi'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

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
                                            {/* What was actually taken back, once the stop is
                                                closed. The courier typed the number and then had
                                                nothing to check it against — the one figure that
                                                settles a dispute about a customer's balance. */}
                                            {order.status === 'delivered' && (
                                                <p className={b.collected > 0 ? 'font-medium text-[#039855]' : 'text-gray-600'}>
                                                    {b.collected > 0
                                                        ? `✅ ${t('orders.bottles.collected').replace('{n}', String(b.collected))}`
                                                        : '✅ Bo\'sh idish olinmadi'}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })()}

                                {/*
                                  * The amount to collect gets a box of its own. It was a line of
                                  * metadata beside the payment method, which is the wrong weight
                                  * for the one number the courier is at the door to take — and it
                                  * now says so plainly when there is nothing left to collect.
                                  */}
                                <div className="mt-5 flex items-center justify-between gap-4
                                                rounded-2xl border border-line px-4 py-3.5">
                                    <span className="text-xs text-gray-600">
                                        Olinadigan summa
                                        <span className="ml-1.5 text-gray-500">
                                            ({t(paymentKey(order.paymentMethod) as any)})
                                        </span>
                                    </span>
                                    <span className={`text-xl font-bold ${order.paymentStatus === 'paid' ? 'text-[#039855]' : 'text-gray-900'}`}>
                                        {order.paymentStatus === 'paid' ? "To'langan" : formatPrice(orderTotal(order))}
                                    </span>
                                </div>

                                {['assigned', 'confirmed', 'in_transit'].includes(order.status) && (
                                    <>
                                        {/*
                                          * The empties count is captured here rather than on a
                                          * separate screen because this is the only moment the
                                          * courier is standing at the door and knows the answer.
                                          * Defaults to 0 so the tap still works when they took
                                          * nothing back.
                                          */}
                                        <label className="mt-4 block">
                                            <span className="text-xs font-medium text-gray-900">
                                                {t('courier.empties')}
                                            </span>
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
                                                placeholder="0"
                                                className="input mt-1.5 w-full py-2.5 text-sm"
                                            />
                                        </label>

                                        {/* The exception, at the size of a decision rather than a
                                            footnote: it is what turns a delivery into a debt. */}
                                        <label className="mt-3 flex min-h-[44px] w-full items-center gap-3
                                                          text-sm text-gray-900">
                                            <input
                                                type="checkbox"
                                                checked={!!unpaid[order._id]}
                                                onChange={e => setUnpaid(p => ({ ...p, [order._id]: e.target.checked }))}
                                                className="h-5 w-5 accent-[#d92d20]"
                                            />
                                            Pul olinmadi
                                        </label>

                                        <div className="mt-4 grid gap-3">
                                            {['assigned', 'confirmed'].includes(order.status) && (
                                                <button
                                                    onClick={() => statusMut.mutate({ id: order._id, status: 'in_transit' })}
                                                    disabled={statusMut.isPending}
                                                    className="btn-secondary w-full justify-center gap-2 py-3 text-sm"
                                                >
                                                    <Truck className="w-4 h-4" />
                                                    Yo'lga chiqdim
                                                </button>
                                            )}
                                            <button
                                                onClick={() => statusMut.mutate({
                                                    id: order._id,
                                                    status: 'delivered',
                                                    emptiesCollected: Number(empties[order._id] || 0),
                                                    paid: !unpaid[order._id],
                                                })}
                                                disabled={statusMut.isPending}
                                                className="btn-primary w-full justify-center gap-2 py-3 text-sm"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Yetkazildi
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
