import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, UserPlus, Truck, Wrench } from 'lucide-react'
import { getOrders, updateOrderStatus, deleteOrder, formatPrice, getAdminUsers, assignOrder } from '../../api/client'
import { useLanguage } from '../../i18n/LanguageContext'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['pending', 'confirmed', 'assigned', 'in_transit', 'delivered', 'cancelled']
const STATUS_LABELS: Record<string, string> = {
    pending: 'Kutilmoqda',
    confirmed: 'Tasdiqlandi',
    assigned: 'Kuryerga berildi',
    in_transit: 'Yo\'lda',
    delivered: 'Yetkazildi',
    cancelled: 'Bekor qilindi',
}

export default function AdminOrders() {
    const { t } = useLanguage()
    const qc = useQueryClient()
    const [statusFilter, setStatusFilter] = useState('')

    const params: Record<string, string> = {}
    if (statusFilter) params.status = statusFilter

    const { data: orders, isLoading } = useQuery({
        queryKey: ['admin-orders', statusFilter],
        queryFn: () => getOrders(params),
    })

    const { data: users } = useQuery({
        queryKey: ['admin-users'],
        queryFn: getAdminUsers,
    })

    const couriers = users?.filter((u: any) => u.role === 'courier') || []
    const workers = users?.filter((u: any) => u.role === 'worker') || []

    const statusMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
        onSuccess: () => { toast.success('Status yangilandi'); qc.invalidateQueries({ queryKey: ['admin-orders'] }) },
        onError: () => toast.error(t('common.error')),
    })

    const assignMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { courierId?: string, workerId?: string } }) => assignOrder(id, data),
        onSuccess: () => { toast.success('Biriktirildi'); qc.invalidateQueries({ queryKey: ['admin-orders'] }) },
        onError: () => toast.error('Xatolik yuz berdi'),
    })

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteOrder(id),
        onSuccess: () => { toast.success('Buyurtma o\'chirildi'); qc.invalidateQueries({ queryKey: ['admin-orders'] }) },
        onError: () => toast.error(t('common.error')),
    })

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.orders')}</h1>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="input py-2 text-sm w-auto"
                >
                    <option value="">Barcha statuslar</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Mijoz</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahsulotlar</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manzil</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kuryer / Ishchi</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[...Array(6)].map((__, j) => (
                                            <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-200 rounded" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : orders?.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Buyurtmalar topilmadi</td></tr>
                            ) : orders?.map((order: any) => {
                                const customer = typeof order.userId === 'object' ? order.userId : null
                                return (
                                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-mono text-xs text-gray-400 mb-1">#{order._id.slice(-6)}</p>
                                                <p className="font-medium text-gray-900 text-xs">{customer?.name || '—'}</p>
                                                <p className="text-gray-500 text-xs">{customer?.phone || '—'}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs text-gray-700 max-w-[160px] truncate space-y-1">
                                                {order.items.map((i: any, idx: number) => (
                                                    <div key={idx}>{i.nameSnapshot} <span className="text-gray-400">×{i.qty}</span></div>
                                                ))}
                                                <div className="font-semibold text-primary-700 mt-1">
                                                    {formatPrice(order.items.reduce((s: number, i: any) => s + i.priceSnapshot * i.qty, 0))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            <p className="truncate max-w-[150px]" title={`${order.addressSnapshot?.city}, ${order.addressSnapshot?.district}, ${order.addressSnapshot?.street}`}>
                                                {order.addressSnapshot?.city}, {order.addressSnapshot?.district}
                                            </p>
                                            <p className="text-gray-400 mt-1">{order.deliveryDate} | {order.deliveryTimeSlot}</p>
                                        </td>

                                        {/* Kuryer & Ishchi biriktirish */}
                                        <td className="px-4 py-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Truck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                                    <select
                                                        value={order.courierId || ''}
                                                        onChange={e => assignMut.mutate({ id: order._id, data: { courierId: e.target.value } })}
                                                        disabled={assignMut.isPending}
                                                        className="input text-xs py-1 px-2 h-auto"
                                                    >
                                                        <option value="">Kuryer tanlang</option>
                                                        {couriers.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Wrench className="w-4 h-4 text-orange-600 flex-shrink-0" />
                                                    <select
                                                        value={order.workerId || ''}
                                                        onChange={e => assignMut.mutate({ id: order._id, data: { workerId: e.target.value } })}
                                                        disabled={assignMut.isPending}
                                                        className="input text-xs py-1 px-2 h-auto"
                                                    >
                                                        <option value="">Ishchi tanlang</option>
                                                        {workers.map((w: any) => <option key={w._id} value={w._id}>{w.name} {w.workerType ? `(${w.workerType})` : ''}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3">
                                            <select
                                                value={order.status}
                                                onChange={e => statusMut.mutate({ id: order._id, status: e.target.value })}
                                                disabled={statusMut.isPending}
                                                className={`text-xs font-medium border-0 rounded-lg py-1 px-2 cursor-pointer focus:ring-2 focus:ring-primary-500 ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                                        order.status === 'assigned' ? 'bg-indigo-100 text-indigo-800' :
                                                            order.status === 'in_transit' ? 'bg-orange-100 text-orange-800' :
                                                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                    'bg-green-100 text-green-800'
                                                    }`}
                                            >
                                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    if (confirm('Buyurtmani o\'chirishni tasdiqlaysizmi?')) deleteMut.mutate(order._id)
                                                }}
                                                disabled={deleteMut.isPending}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block"
                                                title="Buyurtmani o'chirish"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
