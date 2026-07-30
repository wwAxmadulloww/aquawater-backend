import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Repeat, Play, Calendar, Phone, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllSubscriptions, runSubscriptions, describeApiError } from '../../api/client'

/**
 * Every standing order in the business.
 *
 * The scheduler creates real orders overnight, and without this screen the owner
 * would only find out what it had decided by seeing the orders appear. A manual
 * run is offered too, so the behaviour can be checked now rather than trusted
 * until morning.
 */

const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

export default function AdminSubscriptions() {
    const qc = useQueryClient()

    const { data: subs, isLoading } = useQuery({
        queryKey: ['subscriptions-all'],
        queryFn: getAllSubscriptions,
    })

    const run = useMutation({
        mutationFn: runSubscriptions,
        onSuccess: (r: any) => {
            toast.success(
                `${r.subscriptionsRun} ta tekshirildi, ${r.ordersCreated} buyurtma yaratildi`
                + (r.remindersSent ? `, ${r.remindersSent} eslatma yuborildi` : ''),
            )
            qc.invalidateQueries({ queryKey: ['subscriptions-all'] })
        },
        onError: (err) => toast.error(describeApiError(err)),
    })

    const active = (subs || []).filter((s: any) => s.isActive)

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-950">Doimiy buyurtmalar</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Har kuni 09:00 da tizim shu ro'yxatdan buyurtmalarni o'zi yaratadi.
                    </p>
                </div>
                <button
                    onClick={() => run.mutate()}
                    disabled={run.isPending}
                    className="btn-primary px-5 py-2.5 text-xs"
                >
                    <Play className="h-3.5 w-3.5" />
                    {run.isPending ? 'Bajarilmoqda…' : 'Hozir ishga tushirish'}
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { label: 'Jami', value: (subs || []).length },
                    { label: 'Faol', value: active.length },
                    { label: "Bir haftada buyurtma", value: active.length },
                ].map(c => (
                    <div key={c.label} className="card p-5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full
                                         border border-line text-accent">
                            <Repeat className="h-5 w-5" />
                        </span>
                        <p className="eyebrow mt-4">{c.label}</p>
                        <p className="tabular mt-1 text-2xl font-bold text-gray-950">{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="card p-6">
                {isLoading ? (
                    <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
                ) : (subs || []).length === 0 ? (
                    <p className="text-sm text-gray-600">
                        Hozircha doimiy buyurtma yo'q. Mijozlar saytdan yoki botdan yaratadi.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-line">
                                    {['Mijoz', 'Kuni', 'Vaqt', 'Turlar', 'Keyingi', 'Yaratilgan', 'Holat'].map(h => (
                                        <th key={h} className="pb-2 text-left text-[10px] uppercase tracking-wider text-gray-600">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {subs.map((s: any) => (
                                    <tr key={s._id}>
                                        <td className="py-3">
                                            <p className="text-gray-950">{s.userId?.name || '—'}</p>
                                            {s.userId?.phone && (
                                                <a href={`tel:${s.userId.phone}`}
                                                   className="flex items-center gap-1 text-[11px] text-accent">
                                                    <Phone className="h-3 w-3" />{s.userId.phone}
                                                </a>
                                            )}
                                        </td>
                                        <td className="py-3 text-gray-800">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-gray-600" />
                                                {WEEKDAYS[s.weekday - 1]}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-800">{s.deliveryTimeSlot}</td>
                                        <td className="tabular py-3 text-gray-800">{s.items?.length ?? 0}</td>
                                        <td className="py-3 text-gray-800">
                                            {s.nextRunAt ? new Date(s.nextRunAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="tabular py-3 text-gray-800">{s.createdOrders ?? 0}</td>
                                        <td className="py-3">
                                            <span className={`badge ${s.isActive ? 'badge-delivered' : 'badge-pending'}`}>
                                                {s.isActive ? 'Faol' : "To'xtatilgan"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Only the customer can change their own standing order, which is
                why this screen reads rather than edits. */}
            <p className="flex items-start gap-2 text-xs text-gray-600">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Doimiy buyurtmani faqat mijozning o'zi to'xtatishi yoki o'chirishi mumkin.
                Kerak bo'lsa, mijoz bilan bog'lanib, botdan yoki saytdan o'zgartirishini so'rang.
            </p>
        </div>
    )
}
