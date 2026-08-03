import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle, MapPin, Calendar, CreditCard, ChevronRight } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { orderCode } from '../lib/orderFormat'
import { useCart } from '../context/CartContext'
import {
    createOrder, createSubscription, formatPrice, getDeliveryQuote, getDeliveryZones,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const TIME_SLOTS = ['09:00–11:00', '11:00–13:00', '13:00–15:00', '15:00–17:00', '17:00–19:00']

const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

type PayMethod = 'cash' | 'click' | 'payme'

/** ISO weekday (1 = Monday … 7 = Sunday) of a YYYY-MM-DD string. */
function isoWeekday(dateStr: string): number {
    // Parsed as local, not UTC, so the weekday matches the date the customer
    // picked in their own calendar rather than shifting a day either side.
    const [y, m, d] = dateStr.split('-').map(Number)
    const day = new Date(y, (m || 1) - 1, d || 1).getDay()
    return day === 0 ? 7 : day
}

/**
 * Today's date in the user's own timezone, as YYYY-MM-DD.
 *
 * toISOString() converts to UTC first. Uzbekistan is UTC+5, so between
 * midnight and 05:00 local it returned *yesterday* — the delivery date
 * defaulted to a day that had already passed, and `min` accepted it.
 */
function getTodayStr() {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function CheckoutPage() {
    const { t } = useLanguage()
    const { items, totalPrice, clearCart } = useCart()
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()

    const [region, setRegion] = useState('')
    const [city, setCity] = useState('')
    const [district, setDistrict] = useState('')
    const [street, setStreet] = useState('')
    const [house, setHouse] = useState('')
    const [apartment, setApartment] = useState('')
    const [date, setDate] = useState(getTodayStr())
    const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0])
    const [payment, setPayment] = useState<PayMethod>('cash')
    const [repeat, setRepeat] = useState(false)
    const [orderId, setOrderId] = useState<string | null>(null)

    /*
     * The delivery charge is quoted by the server, not computed here: a fee the
     * page worked out for itself could disagree with the one the order is
     * actually created with, and the customer would see one number and be
     * charged another.
     */
    const { data: zones } = useQuery({ queryKey: ['delivery-zones'], queryFn: getDeliveryZones })
    const { data: quote } = useQuery({
        queryKey: ['delivery-quote', region, totalPrice],
        queryFn: () => getDeliveryQuote(region, totalPrice),
        enabled: !!region,
    })

    const deliveryFee = quote?.ok ? quote.fee : 0
    const grandTotal = totalPrice + deliveryFee

    const mutation = useMutation({
        mutationFn: () => createOrder({
            items: items.map(i => ({ productId: i._id, qty: i.qty, returnBottle: i.returnBottle !== false })),
            addressSnapshot: { region, city, district, street, house, apartment: apartment || undefined },
            deliveryDate: date,
            deliveryTimeSlot: timeSlot,
            paymentMethod: payment,
        }),
        onSuccess: async (data) => {
            /*
             * The standing order is created after the one-off order, and its
             * failure is reported without losing the order: the delivery the
             * customer just paid attention to is the part that matters, and a
             * subscription they can retry from their own page is not worth
             * rolling that back.
             */
            if (repeat) {
                try {
                    await createSubscription({
                        items: items.map(i => ({
                            productId: i._id, qty: i.qty, returnBottle: i.returnBottle !== false,
                        })),
                        addressSnapshot: {
                            region, city, district, street, house,
                            apartment: apartment || undefined,
                        },
                        weekday: isoWeekday(date),
                        deliveryTimeSlot: timeSlot,
                        paymentMethod: payment,
                    })
                    toast.success(t('subs.repeatOn'))
                } catch {
                    toast.error(t('subs.repeatFailed'))
                }
            }
            setOrderId(data._id)
            clearCart()
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || t('common.error'))
        },
    })

    if (!isAuthenticated) {
        return (
            <div className="container-custom py-20 text-center">
                <p className="text-gray-600 mb-4">{t('checkout.loginFirst')}</p>
                <Link to="/login" className="btn-primary px-8 py-3">{t('auth.login')}</Link>
            </div>
        )
    }

    if (items.length === 0 && !orderId) {
        return (
            <div className="container-custom py-20 text-center">
                <p className="text-gray-600 mb-4">Savat bo'sh.</p>
                <Link to="/products" className="btn-primary px-8 py-3">{t('common.toProducts')}</Link>
            </div>
        )
    }

    if (orderId) {
        return (
            <div className="container-custom py-20 max-w-lg mx-auto text-center">
                <div className="card p-10">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('checkout.success.title')}</h1>
                    <p className="text-gray-500 mb-6">{t('checkout.success.desc')}</p>
                    <div className="bg-gray-50 rounded-xl px-6 py-4 mb-8">
                        <p className="text-xs text-gray-500 mb-1">{t('checkout.success.order')}</p>
                        <p className="font-mono text-lg font-bold tracking-widest text-primary-700">#{orderCode(orderId)}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/orders" className="btn-primary py-3 px-6">{t('checkout.success.viewOrders')}</Link>
                        <Link to="/" className="btn-secondary py-3 px-6">{t('checkout.success.home')}</Link>
                    </div>
                </div>
            </div>
        )
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!region || !city || !district || !street || !house) {
            toast.error('Barcha maydonlarni to\'ldiring')
            return
        }
        if (date < getTodayStr()) {
            toast.error('Yetkazib berish sanasi o\'tmishda bo\'lishi mumkin emas')
            return
        }
        mutation.mutate()
    }

    return (
        <div className="py-10">
            <div className="container-custom max-w-5xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('checkout.title')}</h1>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Address */}
                            <div className="card p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <MapPin className="w-5 h-5 text-primary-600" />
                                    <h2 className="font-semibold text-lg text-gray-900">{t('checkout.address')}</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.region')} *</label>
                                        <select value={region} onChange={e => setRegion(e.target.value)} required className="input">
                                            <option value="">Tanlang...</option>
                                            {(zones || []).map((z: any) => (
                                                <option key={z._id} value={z.region}>
                                                    {z.region}{z.fee > 0 ? ` — ${formatPrice(z.fee)}` : ' — bepul'}
                                                </option>
                                            ))}
                                        </select>
                                        {quote && !quote.ok && (
                                            <p className="mt-1.5 text-xs text-[#ff9ea1]">{quote.message}</p>
                                        )}
                                        {quote?.ok && quote.eta && (
                                            <p className="mt-1.5 text-xs text-gray-600">{quote.eta}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.city')} *</label>
                                        <input value={city} onChange={e => setCity(e.target.value)} required className="input" placeholder="Shahar nomi" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.district')} *</label>
                                        <input value={district} onChange={e => setDistrict(e.target.value)} required className="input" placeholder="Tuman nomi" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.street')} *</label>
                                        <input value={street} onChange={e => setStreet(e.target.value)} required className="input" placeholder="Ko'cha nomi" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.house')} *</label>
                                        <input value={house} onChange={e => setHouse(e.target.value)} required className="input" placeholder="12A" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.apartment')}</label>
                                        <input value={apartment} onChange={e => setApartment(e.target.value)} className="input" placeholder="45" />
                                    </div>
                                </div>
                            </div>

                            {/* Delivery time */}
                            <div className="card p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <Calendar className="w-5 h-5 text-primary-600" />
                                    <h2 className="font-semibold text-lg text-gray-900">{t('checkout.delivery')}</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.date')}</label>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} min={getTodayStr()} required className="input" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('checkout.timeslot')}</label>
                                        <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="input">
                                            {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Water is bought on a rhythm, so the moment the
                                    customer has already chosen a day and a slot is
                                    the cheapest possible place to offer the repeat. */}
                                <label className="mt-4 flex cursor-pointer gap-3 rounded-xl border border-line p-4">
                                    <input
                                        type="checkbox"
                                        checked={repeat}
                                        onChange={e => setRepeat(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                                    />
                                    <span>
                                        <span className="block text-sm font-medium text-gray-900">
                                            {t('subs.repeat')}
                                        </span>
                                        <span className="mt-1 block text-xs text-gray-600">
                                            {t('subs.repeatHint').replace(
                                                '{day}', WEEKDAYS[isoWeekday(date) - 1],
                                            )}
                                        </span>
                                    </span>
                                </label>
                            </div>

                            {/* Payment */}
                            <div className="card p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <CreditCard className="w-5 h-5 text-primary-600" />
                                    <h2 className="font-semibold text-lg text-gray-900">{t('checkout.payment')}</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {(['cash', 'click', 'payme'] as PayMethod[]).map(m => (
                                        <button
                                            type="button"
                                            key={m}
                                            onClick={() => setPayment(m)}
                                            className={`border-2 rounded-xl p-4 text-center transition-all ${payment === m ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{m === 'cash' ? '💵' : m === 'click' ? '📱' : '💳'}</div>
                                            <div className={`text-sm font-medium ${payment === m ? 'text-primary-700' : 'text-gray-700'}`}>
                                                {t(`checkout.payment.${m}` as any)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Order summary */}
                        <div>
                            <div className="card p-6 sticky top-24">
                                <h2 className="font-bold text-lg text-gray-900 mb-4">{t('checkout.summary')}</h2>
                                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                    {items.map(i => (
                                        <div key={i._id} className="flex justify-between text-sm">
                                            <span className="text-gray-600 truncate mr-2">
                                                {i.name} × {i.qty}
                                                {i.returnable && i.returnBottle === false && (
                                                    <span className="block text-[10px] text-sun">{t('cart.container.keep')}</span>
                                                )}
                                            </span>
                                            <span className="font-medium text-gray-900 flex-shrink-0">
                                                {formatPrice((i.price + (i.returnable && i.returnBottle === false ? (i.depositPrice || 0) : 0)) * i.qty)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mb-6 space-y-2 border-t border-line pt-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">{t('checkout.goods')}</span>
                                        <span className="text-gray-900">{formatPrice(totalPrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">{t('checkout.deliveryFee')}</span>
                                        <span className="text-gray-900">
                                            {region
                                                ? (deliveryFee > 0 ? formatPrice(deliveryFee) : t('checkout.free'))
                                                : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-line pt-2 font-bold text-gray-900">
                                        <span>{t('cart.total')}</span>
                                        <span className="text-accent">{formatPrice(grandTotal)}</span>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={mutation.isPending || (!!region && quote && !quote.ok)}
                                    className="btn-primary w-full py-3 text-base justify-center gap-2"
                                >
                                    {mutation.isPending ? (
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-line" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                    {t('checkout.place')}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
