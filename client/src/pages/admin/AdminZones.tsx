import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import {
    getDeliveryZones, createDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
    formatPrice, describeApiError,
} from '../../api/client'

/**
 * Where the business delivers, and what it charges.
 *
 * A region that is not listed here cannot be ordered to at all — which is the
 * point. Before this existed the checkout accepted any address in the country
 * and implied free delivery to all of it, so orders arrived from places with no
 * courier and had to be cancelled by hand.
 */

const EMPTY = { region: '', fee: '', minOrder: '', eta: '' }

export default function AdminZones() {
    const qc = useQueryClient()
    const [form, setForm] = useState(EMPTY)
    const [edits, setEdits] = useState<Record<string, { fee: string; minOrder: string; eta: string }>>({})

    const { data: zones, isLoading } = useQuery({
        queryKey: ['delivery-zones-admin'],
        queryFn: getDeliveryZones,
    })

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ['delivery-zones-admin'] })
        // The checkout reads the same list, so its copy has to go too.
        qc.invalidateQueries({ queryKey: ['delivery-zones'] })
    }

    const create = useMutation({
        mutationFn: () => createDeliveryZone({
            region: form.region.trim(),
            fee: Number(form.fee || 0),
            minOrder: Number(form.minOrder || 0),
            eta: form.eta.trim() || undefined,
        }),
        onSuccess: () => { toast.success('Hudud qo\'shildi'); setForm(EMPTY); refresh() },
        onError: (err) => toast.error(describeApiError(err)),
    })

    const save = useMutation({
        mutationFn: ({ id, data }: { id: string; data: unknown }) => updateDeliveryZone(id, data),
        onSuccess: () => { toast.success('Saqlandi'); refresh() },
        onError: (err) => toast.error(describeApiError(err)),
    })

    const remove = useMutation({
        mutationFn: (id: string) => deleteDeliveryZone(id),
        onSuccess: () => { toast.success('O\'chirildi'); refresh() },
        onError: (err) => toast.error(describeApiError(err)),
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-950">Yetkazish hududlari</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Ro'yxatda yo'q hududga buyurtma berilmaydi.
                </p>
            </div>

            <form
                className="card grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-5"
                onSubmit={e => { e.preventDefault(); create.mutate() }}
            >
                <label className="text-xs text-gray-600 lg:col-span-2">
                    Hudud nomi *
                    <input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
                           required minLength={2} className="input mt-1 py-2.5 text-sm"
                           placeholder="Toshkent shahri" />
                </label>
                <label className="text-xs text-gray-600">
                    Yetkazish narxi
                    <input value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })}
                           type="number" min={0} className="input mt-1 py-2.5 text-sm" placeholder="0" />
                </label>
                <label className="text-xs text-gray-600">
                    Eng kam buyurtma
                    <input value={form.minOrder} onChange={e => setForm({ ...form, minOrder: e.target.value })}
                           type="number" min={0} className="input mt-1 py-2.5 text-sm" placeholder="20000" />
                </label>
                <label className="text-xs text-gray-600">
                    Muddat
                    <input value={form.eta} onChange={e => setForm({ ...form, eta: e.target.value })}
                           className="input mt-1 py-2.5 text-sm" placeholder="2-4 soat" />
                </label>
                <button type="submit" disabled={create.isPending}
                        className="btn-primary justify-center py-2.5 text-xs sm:col-span-2 lg:col-span-5">
                    <Plus className="h-3.5 w-3.5" /> Hudud qo'shish
                </button>
            </form>

            {isLoading ? (
                <div className="card h-32 animate-pulse" />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {(zones || []).map((z: any) => {
                        const e = edits[z._id] || {
                            fee: String(z.fee), minOrder: String(z.minOrder), eta: z.eta || '',
                        }
                        const dirty = Number(e.fee) !== z.fee
                            || Number(e.minOrder) !== z.minOrder
                            || e.eta !== (z.eta || '')

                        return (
                            <div key={z._id} className="card p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <p className="flex items-center gap-2 text-gray-950">
                                        <MapPin className="h-4 w-4 text-accent" />
                                        {z.region}
                                    </p>
                                    <span className="text-xs text-gray-600">
                                        {z.fee > 0 ? formatPrice(z.fee) : 'Bepul'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <label className="text-[10px] uppercase tracking-wider text-gray-600">
                                        Narx
                                        <input value={e.fee} type="number" min={0}
                                               onChange={ev => setEdits({ ...edits, [z._id]: { ...e, fee: ev.target.value } })}
                                               className="input mt-1 py-2 text-sm" />
                                    </label>
                                    <label className="text-[10px] uppercase tracking-wider text-gray-600">
                                        Min.
                                        <input value={e.minOrder} type="number" min={0}
                                               onChange={ev => setEdits({ ...edits, [z._id]: { ...e, minOrder: ev.target.value } })}
                                               className="input mt-1 py-2 text-sm" />
                                    </label>
                                    <label className="text-[10px] uppercase tracking-wider text-gray-600">
                                        Muddat
                                        <input value={e.eta}
                                               onChange={ev => setEdits({ ...edits, [z._id]: { ...e, eta: ev.target.value } })}
                                               className="input mt-1 py-2 text-sm" />
                                    </label>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => save.mutate({
                                            id: z._id,
                                            data: { fee: Number(e.fee || 0), minOrder: Number(e.minOrder || 0), eta: e.eta || undefined },
                                        })}
                                        disabled={!dirty || save.isPending}
                                        className="btn-primary flex-1 py-2 text-xs"
                                    >
                                        <Save className="h-3.5 w-3.5" /> Saqlash
                                    </button>
                                    <button
                                        onClick={() => save.mutate({ id: z._id, data: { isActive: !z.isActive } })}
                                        className="btn-secondary py-2 text-xs"
                                    >
                                        {z.isActive ? 'Yopish' : 'Ochish'}
                                    </button>
                                    <button
                                        onClick={() => remove.mutate(z._id)}
                                        className="btn-secondary px-3 py-2 text-xs text-[#ff9ea1]"
                                        title="O'chirish"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
