import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Repeat, Package, Calendar, Pause, Play, Trash2, Droplets } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import {
    getSubscriptions, updateSubscription, deleteSubscription,
    getMyBottles, formatPrice, describeApiError,
} from '../api/client'

/**
 * The customer's standing orders and their returnable-container balance.
 *
 * Both live on one page because they are the two things a repeat customer needs
 * to check between deliveries, and neither is worth a screen of its own.
 */

const WEEKDAY_KEYS = [
    'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba',
]

export default function SubscriptionsPage() {
    const { t } = useLanguage()
    const { isAuthenticated } = useAuth()
    const qc = useQueryClient()

    const { data: subs, isLoading } = useQuery({
        queryKey: ['subscriptions'],
        queryFn: getSubscriptions,
        enabled: isAuthenticated,
    })

    const { data: bottles } = useQuery({
        queryKey: ['my-bottles'],
        queryFn: getMyBottles,
        enabled: isAuthenticated,
    })

    const toggle = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            updateSubscription(id, { isActive }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
        onError: (err) => toast.error(describeApiError(err)),
    })

    const remove = useMutation({
        mutationFn: (id: string) => deleteSubscription(id),
        onSuccess: () => {
            toast.success(t('subs.delete'))
            qc.invalidateQueries({ queryKey: ['subscriptions'] })
        },
        onError: (err) => toast.error(describeApiError(err)),
    })

    if (!isAuthenticated) {
        return (
            <div className="container-custom py-20 text-center">
                <p className="mb-4 text-gray-600">{t('subs.title')}</p>
                <Link to="/login" className="btn-primary px-8 py-3">{t('auth.login')}</Link>
            </div>
        )
    }

    return (
        <div className="container-custom py-10 md:py-14">
            <p className="eyebrow">{t('nav.orders')}</p>
            <h1 className="mb-10 mt-3 text-3xl text-gray-950 md:text-4xl">{t('subs.title')}</h1>

            {/* Returnable containers */}
            <div className="card mb-8 p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center
                                         rounded-full border border-line text-accent">
                            <Droplets className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="eyebrow">{t('bottles.title')}</p>
                            <p className="mt-1 text-lg text-gray-950">
                                {bottles?.balance
                                    ? `${t('bottles.owed')}: ${bottles.balance}`
                                    : t('bottles.none')}
                            </p>
                        </div>
                    </div>
                    {!!bottles?.balance && (
                        <p className="max-w-xs text-xs text-gray-600">{t('bottles.hint')}</p>
                    )}
                </div>

                {/* The movements behind the figure, so the number is checkable
                    rather than something the customer has to take on trust. */}
                {bottles?.movements?.length > 0 && (
                    <ul className="mt-6 divide-y divide-line border-t border-line pt-4 text-sm">
                        {bottles.movements.map((m: any) => (
                            <li key={m._id} className="flex items-center justify-between py-2">
                                <span className="text-gray-600">
                                    {new Date(m.createdAt).toLocaleDateString()} · {m.note || m.direction}
                                </span>
                                <span className={m.delta > 0 ? 'text-[#ff9ea1]' : 'text-[#7ff0c0]'}>
                                    {m.delta > 0 ? '+' : ''}{m.delta}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Standing orders */}
            {isLoading ? (
                <div className="card h-32 animate-pulse" />
            ) : (subs || []).length === 0 ? (
                <div className="card p-8 text-center">
                    <Repeat className="mx-auto h-8 w-8 text-gray-500" />
                    <p className="mt-4 text-gray-600">{t('subs.none')}</p>
                    <Link to="/products" className="btn-primary mt-6 px-7 py-3">{t('subs.create')}</Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {subs.map((s: any) => (
                        <div key={s._id} className="card p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <span className={`badge ${s.isActive ? 'badge-delivered' : 'badge-pending'}`}>
                                    {s.isActive ? t('subs.active') : t('subs.paused')}
                                </span>
                                <span className="text-xs text-gray-600">
                                    {s.createdOrders} × {t('nav.orders')}
                                </span>
                            </div>

                            <p className="flex items-center gap-2 text-gray-950">
                                <Calendar className="h-4 w-4 text-accent" />
                                {t('subs.weekly')}: <b>{WEEKDAY_KEYS[s.weekday - 1]}</b>, {s.deliveryTimeSlot}
                            </p>
                            <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                <Package className="h-4 w-4" />
                                {s.items?.length} × {t('orders.items')}
                            </p>
                            {s.nextRunAt && (
                                <p className="mt-1 text-xs text-gray-600">
                                    {t('subs.next')}: {new Date(s.nextRunAt).toLocaleDateString()}
                                </p>
                            )}

                            <div className="mt-6 flex gap-2">
                                <button
                                    onClick={() => toggle.mutate({ id: s._id, isActive: !s.isActive })}
                                    disabled={toggle.isPending}
                                    className="btn-secondary flex-1 py-2.5 text-xs"
                                >
                                    {s.isActive
                                        ? <><Pause className="h-3.5 w-3.5" />{t('subs.pause')}</>
                                        : <><Play className="h-3.5 w-3.5" />{t('subs.resume')}</>}
                                </button>
                                <button
                                    onClick={() => remove.mutate(s._id)}
                                    disabled={remove.isPending}
                                    className="btn-secondary px-3 py-2.5 text-xs text-[#ff9ea1]"
                                    title={t('subs.delete')}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
