import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle2, Clock, MapPin, Phone, Package, Calendar } from 'lucide-react'
import { getOrders, getProducts, createProduct, updateOrderStatus, formatPrice } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import toast from 'react-hot-toast'

interface ServiceForm {
    name: string
    description: string
    price: string
    imageUrl: string
}

const EMPTY_FORM: ServiceForm = {
    name: '', description: '', price: '', imageUrl: ''
}

export default function WorkerDashboard() {
    const { t } = useLanguage()
    const { user } = useAuth()
    const qc = useQueryClient()
    const [activeTab, setActiveTab] = useState<'orders' | 'services'>('orders')
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)

    // Orders assigned to this worker
    const { data: orders, isLoading: loadingOrders } = useQuery({
        queryKey: ['worker-orders'],
        queryFn: () => getOrders(), // backend filters by workerId if role === worker
    })

    // Services proposed by this worker
    const { data: services, isLoading: loadingServices } = useQuery({
        queryKey: ['worker-services'],
        queryFn: () => getProducts({ admin: 'true' }) // Gets all for this worker due to backend filter
    })

    const statusMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
        onSuccess: () => { toast.success('Status yangilandi'); qc.invalidateQueries({ queryKey: ['worker-orders'] }) },
        onError: () => toast.error('Xatolik yuz berdi')
    })

    const createServiceMut = useMutation({
        mutationFn: () => createProduct({
            ...form,
            price: Number(form.price),
            category: 'service',
            productType: 'service',
            inStock: true
        }),
        onSuccess: () => {
            toast.success('Xizmat admin tekshiruviga yuborildi')
            setShowForm(false)
            setForm(EMPTY_FORM)
            qc.invalidateQueries({ queryKey: ['worker-services'] })
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Xato yuz berdi')
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createServiceMut.mutate()
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ishchi paneli</h1>
                    <p className="text-gray-500 mt-1">Sizning mutaxassisligingiz: <span className="font-semibold text-gray-700">{user?.workerType || 'Belgilanmagan'}</span></p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Mening Buyurtmalarim
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'services' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Xizmatlarim
                </button>
            </div>

            {activeTab === 'orders' && (
                <div className="space-y-4">
                    {loadingOrders ? (
                        <div className="text-center py-12 text-gray-400">Yuklanmoqda...</div>
                    ) : orders?.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                            Sizga biriktirilgan buyurtmalar yo'q
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {orders?.map((order: any) => (
                                <div key={order._id} className="card p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">Buyurtma #{order._id.slice(-6)}</p>
                                                <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                order.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {order.status === 'delivered' ? 'Bajarilgan' : order.status === 'accepted' ? 'Qabul qilingan' : 'Kutilmoqda'}
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-start gap-3 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <span>{order.addressSnapshot?.region}, {order.addressSnapshot?.city}, {order.addressSnapshot?.district}, {order.addressSnapshot?.street} {order.addressSnapshot?.house}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span>{order.deliveryDate} ({order.deliveryTimeSlot})</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span>{order.userId?.phone} ({order.userId?.name})</span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
                                        {order.items.map((i: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-gray-700">{i.nameSnapshot}</span>
                                                <span className="text-gray-500">×{i.qty}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <p className="font-bold text-gray-900">{formatPrice(order.items.reduce((s: number, i: any) => s + i.priceSnapshot * i.qty, 0))}</p>

                                        {order.status !== 'delivered' && (
                                            <button
                                                onClick={() => statusMut.mutate({ id: order._id, status: 'delivered' })}
                                                disabled={statusMut.isPending}
                                                className="btn-primary py-2 px-4 text-sm gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Bajarildi deb belgilash
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'services' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">Mening xizmatlarim</h2>
                        <button onClick={() => setShowForm(!showForm)} className="btn-primary py-2 text-sm gap-2">
                            <Plus className="w-4 h-4" />
                            Xizmat qo'shish
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={handleSubmit} className="card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Xizmat nomi</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input text-sm" placeholder="Masalan: Kranni almashtirish" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Narx (UZS)</label>
                                <input required type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input text-sm" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Xizmat haqida ma'lumot</label>
                                <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="input text-sm resize-none" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Rasm URL</label>
                                <input required value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} className="input text-sm" />
                            </div>
                            <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">Bekor qilish</button>
                                <button type="submit" disabled={createServiceMut.isPending} className="btn-primary text-sm gap-2">
                                    {createServiceMut.isPending ? 'Yuborilmoqda...' : 'Tasdiqlashga yuborish'}
                                </button>
                            </div>
                        </form>
                    )}

                    {loadingServices ? (
                        <div className="text-center py-12 text-gray-400">Yuklanmoqda...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {services?.map((svc: any) => (
                                <div key={svc._id} className="card group overflow-hidden">
                                    <div className="aspect-video w-full bg-gray-100 relative">
                                        <img src={svc.imageUrl} alt={svc.name} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            {svc.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-md shadow-sm">Kutilmoqda</span>}
                                            {svc.status === 'approved' && <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-md shadow-sm">Tasdiqlangan</span>}
                                            {svc.status === 'rejected' && <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-md shadow-sm">Rad etilgan</span>}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">{svc.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{svc.description}</p>
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <span className="font-bold text-primary-700 text-lg">{formatPrice(svc.price)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
