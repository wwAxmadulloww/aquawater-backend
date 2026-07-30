import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Droplets, ArrowDownLeft, ArrowUpRight, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOutstandingBottles, adjustBottles, describeApiError } from '../../api/client'

/**
 * Who is holding the depot's containers.
 *
 * This is the chase list: sorted worst first, with a phone number to hand,
 * because the whole point of tracking bottles is being able to ring the person
 * who has eleven of them.
 *
 * The figures come from the movement ledger rather than the cached balance
 * column, so this screen can never quietly disagree with the rows behind it.
 */
export default function AdminBottles() {
    const qc = useQueryClient()
    const [editing, setEditing] = useState<string | null>(null)
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['bottles-outstanding'],
        queryFn: getOutstandingBottles,
    })

    const adjust = useMutation({
        mutationFn: (vars: { userId: string; delta: number; note?: string }) => adjustBottles(vars),
        onSuccess: () => {
            toast.success('Hisob yangilandi')
            setEditing(null); setAmount(''); setNote('')
            qc.invalidateQueries({ queryKey: ['bottles-outstanding'] })
        },
        onError: (err) => toast.error(describeApiError(err)),
    })

    const summary = data?.summary
    const holders = data?.holders || []

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-950">Bo'sh idishlar hisobi</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Qaytarilishi kerak idishlar va ular kimda turgani.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { label: 'Berilgan', value: summary?.issued ?? 0, icon: <ArrowUpRight className="h-5 w-5" /> },
                    { label: 'Qaytarilgan', value: summary?.returned ?? 0, icon: <ArrowDownLeft className="h-5 w-5" /> },
                    { label: 'Qaytarilmagan', value: summary?.outstanding ?? 0, icon: <Droplets className="h-5 w-5" /> },
                ].map(c => (
                    <div key={c.label} className="card p-5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full
                                         border border-line text-accent">{c.icon}</span>
                        <p className="eyebrow mt-4">{c.label}</p>
                        <p className="tabular mt-1 text-2xl font-bold text-gray-950">{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="card p-6">
                <h2 className="mb-4 text-lg text-gray-950">Kimda turgan</h2>

                {isLoading ? (
                    <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
                ) : holders.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        Hamma idish qaytarilgan — qarzdor mijoz yo'q.
                    </p>
                ) : (
                    <ul className="divide-y divide-line">
                        {holders.map((h: any) => (
                            <li key={h._id} className="py-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-gray-950">{h.name}</p>
                                        <a href={`tel:${h.phone}`}
                                           className="mt-0.5 flex items-center gap-1.5 text-xs text-accent">
                                            <Phone className="h-3 w-3" /> {h.phone}
                                        </a>
                                        <p className="mt-0.5 text-[11px] text-gray-600">
                                            Oxirgi harakat: {new Date(h.lastMovement).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="tabular text-2xl font-bold text-gray-950">{h.balance}</span>
                                        <button
                                            onClick={() => setEditing(editing === h._id ? null : h._id)}
                                            className="btn-secondary py-2 text-xs"
                                        >
                                            Qaytarildi
                                        </button>
                                    </div>
                                </div>

                                {/*
                                  * A manual correction, for empties dropped at the depot or
                                  * found in a stocktake — anything that did not come back
                                  * on a delivery and so has no order to attach it to.
                                  */}
                                {editing === h._id && (
                                    <form
                                        className="mt-4 flex flex-wrap items-end gap-3"
                                        onSubmit={e => {
                                            e.preventDefault()
                                            const n = Number(amount)
                                            if (!Number.isInteger(n) || n < 1) {
                                                toast.error('1 dan katta butun son kiriting')
                                                return
                                            }
                                            if (n > h.balance) {
                                                toast.error(`Bu mijozda faqat ${h.balance} ta idish turibdi`)
                                                return
                                            }
                                            adjust.mutate({ userId: h._id, delta: -n, note: note || 'Qo\'lda qaytarildi' })
                                        }}
                                    >
                                        <label className="text-xs text-gray-600">
                                            Nechta qaytarildi
                                            <input value={amount} onChange={e => setAmount(e.target.value)}
                                                   type="number" min={1} max={h.balance} inputMode="numeric"
                                                   className="input mt-1 w-28 py-2 text-sm" autoFocus />
                                        </label>
                                        <label className="min-w-[12rem] flex-1 text-xs text-gray-600">
                                            Izoh
                                            <input value={note} onChange={e => setNote(e.target.value)}
                                                   className="input mt-1 py-2 text-sm"
                                                   placeholder="Omborga o'zi keltirdi" />
                                        </label>
                                        <button type="submit" disabled={adjust.isPending}
                                                className="btn-primary py-2.5 text-xs">
                                            Saqlash
                                        </button>
                                    </form>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
