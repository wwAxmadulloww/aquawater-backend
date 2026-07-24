import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, MapPin, Phone, Clock, Save, X, Search } from 'lucide-react'
import { api } from '../../api/client'
import toast from 'react-hot-toast'

interface Branch {
    _id: string
    name: string
    address: string
    phone: string
    latitude: number
    longitude: number
    workingHours: string
    isActive: boolean
    description?: string
}

export default function AdminBranches() {
    const queryClient = useQueryClient()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [form, setForm] = useState({
        name: '',
        address: '',
        phone: '',
        latitude: 41.3111,
        longitude: 69.2406,
        workingHours: '09:00 - 18:00',
        isActive: true,
        description: ''
    })

    const { data: branches, isLoading } = useQuery<Branch[]>({
        queryKey: ['admin-branches'],
        queryFn: async () => {
            const res = await api.get('/branches/admin/all')
            return res.data
        }
    })

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (editingId) return api.put(`/branches/${editingId}`, data)
            return api.post('/branches', data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-branches'] })
            toast.success(editingId ? 'Filial tahrirlandi' : 'Filial qo\'shildi')
            setIsFormOpen(false)
            resetForm()
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/branches/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-branches'] })
            toast.success('Filial o\'chirildi')
        }
    })

    const resetForm = () => {
        setForm({
            name: '',
            address: '',
            phone: '',
            latitude: 41.3111,
            longitude: 69.2406,
            workingHours: '09:00 - 18:00',
            isActive: true,
            description: ''
        })
        setEditingId(null)
    }

    const handleEdit = (b: Branch) => {
        setForm({
            name: b.name,
            address: b.address,
            phone: b.phone,
            latitude: b.latitude,
            longitude: b.longitude,
            workingHours: b.workingHours,
            isActive: b.isActive,
            description: b.description || ''
        })
        setEditingId(b._id)
        setIsFormOpen(true)
    }

    const handleDelete = (id: string) => {
        if (window.confirm('Haqiqatdan ham ushbu filialni o\'chirmoqchimisiz?')) {
            deleteMutation.mutate(id)
        }
    }

    const filtered = branches?.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.address.toLowerCase().includes(search.toLowerCase())
    )

    if (isLoading) return <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
    </div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Filiallar boshqaruvi</h1>
                <button
                    onClick={() => { resetForm(); setIsFormOpen(true) }}
                    className="btn-primary gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Yangi filial qo'shish
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Filiallarni qidirish..."
                    className="input pl-10"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-xl my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingId ? 'Filialni tahrirlash' : 'Yangi filial qo\'shish'}
                            </h2>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filial nomi</label>
                                <input
                                    type="text" required className="input"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Masalan: Chilonzor filiali"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                                <input
                                    type="text" required className="input"
                                    value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                    placeholder="Masalan: Chilonzor-24, 15-uy"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                <input
                                    type="text" required className="input"
                                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                    placeholder="+998 90 123 45 67"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ish vaqti</label>
                                <input
                                    type="text" required className="input"
                                    value={form.workingHours} onChange={e => setForm({ ...form, workingHours: e.target.value })}
                                    placeholder="09:00 - 20:00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kenglik (Latitude)</label>
                                <input
                                    type="number" step="0.000001" required className="input"
                                    value={form.latitude} onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Uzunlik (Longitude)</label>
                                <input
                                    type="number" step="0.000001" required className="input"
                                    value={form.longitude} onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Qisqacha ma'lumot (ixtiyoriy)</label>
                                <textarea
                                    className="input min-h-[80px]"
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 flex items-center gap-2 py-2">
                                <input
                                    type="checkbox" id="isActive"
                                    checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                    className="w-5 h-5 text-primary-600 rounded-lg border-gray-300"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">Aktiv holatda</label>
                            </div>

                            <div className="col-span-1 md:col-span-2 flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary flex-1 py-3">Bekor qilish</button>
                                <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 py-3 justify-center gap-2">
                                    {mutation.isPending && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                                    <Save className="w-5 h-5" />
                                    Saqlash
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {filtered?.map(b => (
                    <div key={b._id} className="card p-5 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-primary-600">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 truncate">{b.name}</h3>
                                        {!b.isActive && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase">Passiv</span>}
                                    </div>
                                    <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-1.5">
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{b.address}</span>
                                    </p>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-300" /> {b.phone}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-300" /> {b.workingHours}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex md:flex-col lg:flex-row gap-2">
                                <button
                                    onClick={() => handleEdit(b)}
                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                    title="Tahrirlash"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(b._id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="O'chirish"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filtered?.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                        <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400">Filiallar topilmadi</p>
                    </div>
                )}
            </div>
        </div>
    )
}
