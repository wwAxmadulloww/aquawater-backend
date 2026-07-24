import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, X, Check, Package, Wrench, ImageOff } from 'lucide-react'
import { getProducts, createProduct, updateProduct, deleteProduct, formatPrice } from '../../api/client'
import { useLanguage } from '../../i18n/LanguageContext'
import toast from 'react-hot-toast'

interface ProductForm {
    name: string; category: string; productType: 'product' | 'service'
    description: string; price: string; imageUrl: string; inStock: boolean
}

const EMPTY: ProductForm = {
    name: '', category: 'water', productType: 'product',
    description: '', price: '', imageUrl: '', inStock: true
}

interface FormPanelProps {
    form: ProductForm
    editing: string | null
    isPending: boolean
    onChange: (f: ProductForm) => void
    onSubmit: (e: React.FormEvent) => void
    onCancel: () => void
    t: (key: any) => string
}

function ProductFormPanel({ form, editing, isPending, onChange, onSubmit, onCancel, t }: FormPanelProps) {
    const [imgError, setImgError] = useState(false)

    // Rasm URL o'zgarganda error state reset
    const handleImageUrlChange = (url: string) => {
        setImgError(false)
        onChange({ ...form, imageUrl: url })
    }

    return (
        <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">{editing ? t('admin.editProduct') : t('admin.addProduct')}</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Mahsulot turi — birinchi savol */}
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Mahsulot turi *</label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => onChange({ ...form, productType: 'product' })}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium ${form.productType === 'product'
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            Mahsulot (suv, idish...)
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ ...form, productType: 'service' })}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium ${form.productType === 'service'
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                        >
                            <Wrench className="w-4 h-4" />
                            Xizmat (o'rnatish, ta'mirlash...)
                        </button>
                    </div>
                    {form.productType === 'service' && (
                        <p className="text-xs text-orange-600 mt-1.5">
                            ℹ️ Xizmatlar uchun miqdor tanlash ko'rinmaydi
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nomi *</label>
                    <input
                        value={form.name}
                        onChange={e => onChange({ ...form, name: e.target.value })}
                        required
                        className="input text-sm"
                        placeholder="Mahsulot nomi"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kategoriya *</label>
                    <select
                        value={form.category}
                        onChange={e => onChange({ ...form, category: e.target.value })}
                        className="input text-sm"
                    >
                        <option value="water">Suv</option>
                        <option value="equipment">Jihozlar</option>
                        <option value="accessories">Aksessuarlar</option>
                        <option value="service">Xizmat</option>
                    </select>
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tavsif *</label>
                    <textarea
                        value={form.description}
                        onChange={e => onChange({ ...form, description: e.target.value })}
                        required
                        rows={2}
                        className="input text-sm resize-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Narx (UZS) *</label>
                    <input
                        type="number"
                        value={form.price}
                        onChange={e => onChange({ ...form, price: e.target.value })}
                        required
                        min="0"
                        className="input text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rasm URL *</label>
                    <input
                        value={form.imageUrl}
                        onChange={e => handleImageUrlChange(e.target.value)}
                        required
                        className="input text-sm"
                        placeholder="https://..."
                    />
                </div>

                {/* Rasm preview */}
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Rasm ko'rinishi</label>
                    {form.imageUrl && !imgError ? (
                        <img
                            src={form.imageUrl}
                            alt="preview"
                            className="w-28 h-28 object-cover rounded-xl border border-gray-200 bg-gray-50"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1">
                            <ImageOff className="w-6 h-6 text-gray-300" />
                            <span className="text-xs text-gray-400">
                                {form.imageUrl && imgError ? 'URL noto\'g\'ri' : 'URL kiriting'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={form.inStock}
                        onChange={e => onChange({ ...form, inStock: e.target.checked })}
                        id="inStock"
                        className="w-4 h-4 accent-primary-600"
                    />
                    <label htmlFor="inStock" className="text-sm text-gray-700">Mavjud (in stock)</label>
                </div>
                <div className="sm:col-span-2 flex gap-3">
                    <button type="submit" disabled={isPending} className="btn-primary gap-2 text-sm">
                        <Check className="w-4 h-4" />
                        {t('admin.save')}
                    </button>
                    <button type="button" onClick={onCancel} className="btn-ghost text-sm">
                        {t('admin.cancel')}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default function AdminProducts() {
    const { t } = useLanguage()
    const qc = useQueryClient()
    const [editing, setEditing] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<ProductForm>(EMPTY)

    const { data: products, isLoading } = useQuery({
        queryKey: ['products', 'admin-all'],
        queryFn: () => import('../../api/client').then(m => m.api.get('/products/admin/all').then(r => r.data))
    })
    const refresh = () => qc.invalidateQueries({ queryKey: ['products'] })

    const createMut = useMutation({
        mutationFn: () => createProduct({ ...form, price: Number(form.price) }),
        onSuccess: () => { toast.success('Mahsulot qo\'shildi'); setShowForm(false); setForm(EMPTY); refresh() },
        onError: (e: any) => toast.error(e.response?.data?.message || t('common.error'))
    })

    const updateMut = useMutation({
        mutationFn: () => updateProduct(editing!, { ...form, price: Number(form.price) }),
        onSuccess: () => { toast.success('Yangilandi'); setEditing(null); setForm(EMPTY); refresh() },
        onError: (e: any) => toast.error(e.response?.data?.message || t('common.error'))
    })

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteProduct(id),
        onSuccess: () => { toast.success('O\'chirildi'); refresh() },
        onError: () => toast.error(t('common.error'))
    })

    const approveMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => import('../../api/client').then(m => m.approveProduct(id, status)),
        onSuccess: () => { toast.success('Status yangilandi'); refresh() },
        onError: () => toast.error('Xatolik yuz berdi')
    })

    const openEdit = (p: any) => {
        setEditing(p._id)
        setForm({
            name: p.name, category: p.category,
            productType: p.productType || 'product',
            description: p.description, price: String(p.price),
            imageUrl: p.imageUrl, inStock: p.inStock
        })
        setShowForm(false)
    }

    const handleCancel = () => { setShowForm(false); setEditing(null); setForm(EMPTY) }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (editing) updateMut.mutate()
        else createMut.mutate()
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.products')}</h1>
                <button
                    onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY) }}
                    className="btn-primary text-sm gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {t('admin.addProduct')}
                </button>
            </div>

            {(showForm || editing) && (
                <ProductFormPanel
                    form={form}
                    editing={editing}
                    isPending={createMut.isPending || updateMut.isPending}
                    onChange={setForm}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    t={t}
                />
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nomi</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turi</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narx</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasdiq</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : products?.map((p: any) => (
                                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {p.imageUrl ? (
                                                <img
                                                    src={p.imageUrl}
                                                    alt=""
                                                    className="w-9 h-9 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                                                    onError={e => {
                                                        const el = e.target as HTMLImageElement
                                                        el.style.display = 'none'
                                                        const next = el.nextElementSibling as HTMLElement
                                                        if (next) next.style.display = 'flex'
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                style={{ display: p.imageUrl ? 'none' : 'flex' }}
                                                className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center flex-shrink-0"
                                            >
                                                <ImageOff className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <span className="font-medium text-gray-900">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.productType === 'service'
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {p.productType === 'service' ? '🔧 Xizmat' : '📦 Mahsulot'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-primary-700 font-medium">{formatPrice(p.price)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`badge ${p.inStock ? 'badge-delivered' : 'badge-pending'}`}>
                                            {p.inStock ? 'Mavjud' : 'Tugagan'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {p.status === 'pending' ? (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => approveMut.mutate({ id: p._id, status: 'approved' })}
                                                    title="Tasdiqlash"
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => approveMut.mutate({ id: p._id, status: 'rejected' })}
                                                    title="Rad etish"
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`text-xs font-semibold ${p.status === 'rejected' ? 'text-red-500' : 'text-green-600'}`}>
                                                {p.status === 'rejected' ? 'Rad etilgan' : 'Tasdiqlangan'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => { if (confirm('O\'chirishni tasdiqlaysizmi?')) deleteMut.mutate(p._id) }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
