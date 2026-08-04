import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, X, Check, Package, ImageOff, Upload, Loader2 } from 'lucide-react'
import {
    getProducts, createProduct, updateProduct, deleteProduct, stocktakeProduct,
    formatPrice, uploadProductImage,
} from '../../api/client'
import { shrinkImage, NotAnImageError } from '../../lib/image'
import { useLanguage } from '../../i18n/LanguageContext'
import toast from 'react-hot-toast'

interface ProductForm {
    name: string
    description: string; price: string; imageUrl: string; inStock: boolean
}

const EMPTY: ProductForm = {
    name: '', description: '', price: '', imageUrl: '', inStock: true
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
    const [uploading, setUploading] = useState(false)

    /*
     * The photo is taken from the device and uploaded straight away, so by the
     * time the form is submitted the image is already on the site. Typing a URL
     * meant every product picture was a link to someone else's server, which
     * went blank the day that server rearranged its files — and there was no
     * way to put up a photo of the actual bottle without publishing it
     * elsewhere first.
     */
    const handleFile = async (file: File | undefined) => {
        if (!file) return
        setUploading(true)
        setImgError(false)
        try {
            const { url } = await uploadProductImage(await shrinkImage(file))
            onChange({ ...form, imageUrl: url })
        } catch (err: any) {
            toast.error(
                err instanceof NotAnImageError
                    ? 'Faqat rasm tanlang (JPG, PNG, WEBP)'
                    : err?.response?.data?.message || 'Rasm yuklanmadi',
            )
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">{editing ? t('admin.editProduct') : t('admin.addProduct')}</h2>
                <button onClick={onCancel} className="text-gray-600 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

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
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Mahsulot rasmi *</label>
                    <div className="flex items-center gap-4">
                        {form.imageUrl && !imgError ? (
                            <img
                                src={form.imageUrl}
                                alt="Tanlangan rasm"
                                className="w-28 h-28 object-cover rounded-xl border border-gray-200 bg-gray-50"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1">
                                <ImageOff className="w-6 h-6 text-gray-600" />
                                <span className="text-xs text-gray-600">Rasm yo'q</span>
                            </div>
                        )}

                        <div>
                            {/* A plain file input styled as a button. `accept` points the
                                phone's picker straight at the photo library. */}
                            <label className={`btn-secondary inline-flex cursor-pointer items-center gap-2 text-sm
                                               ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                                {uploading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Upload className="w-4 h-4" />}
                                {uploading ? 'Yuklanmoqda...' : form.imageUrl ? 'Rasmni almashtirish' : 'Rasm tanlash'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
                                />
                            </label>
                            <p className="mt-2 text-xs text-gray-600">
                                Telefon yoki kompyuter xotirasidan. Faqat rasm — JPG, PNG, WEBP.
                            </p>
                        </div>
                    </div>
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
    /** Which row is being counted, and the figure typed so far. */
    const [counting, setCounting] = useState<{ id: string; value: string } | null>(null)

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

    const stockMut = useMutation({
        mutationFn: ({ id, stockQty }: { id: string; stockQty: number | null }) =>
            stocktakeProduct(id, stockQty),
        onSuccess: () => {
            toast.success('Qoldiq hisobga olindi')
            setCounting(null)
            refresh()
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Xatolik'),
    })

    const openEdit = (p: any) => {
        setEditing(p._id)
        setForm({
            name: p.name,
            description: p.description, price: String(p.price),
            imageUrl: p.imageUrl, inStock: p.inStock
        })
        setShowForm(false)
    }

    const handleCancel = () => { setShowForm(false); setEditing(null); setForm(EMPTY) }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // The URL box carried `required`; a file picker cannot, so the check
        // moves here rather than letting a product through with no photo and
        // failing on the server's own validation.
        if (!form.imageUrl) {
            toast.error('Mahsulot rasmini tanlang')
            return
        }
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
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narx</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qoldiq</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
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
                                                <ImageOff className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <span className="font-medium text-gray-900">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-primary-700 font-medium">{formatPrice(p.price)}</td>
                                    {/*
                                      * Stock is edited by counting, not by nudging a number: the
                                      * field takes an absolute figure and stamps when it was
                                      * counted. Until that happens the figure is shown as
                                      * unverified, because the values the system started with
                                      * were seeded, not counted, and presenting a seeded number
                                      * as inventory is how a shop oversells.
                                      */}
                                    <td className="px-4 py-3">
                                        {p.stockQty === null || p.stockQty === undefined ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-600">Hisoblanmaydi</span>
                                                <button
                                                    onClick={() => setCounting({ id: p._id, value: '0' })}
                                                    className="text-[11px] text-accent hover:underline"
                                                >
                                                    Hisobga olish
                                                </button>
                                            </div>
                                        ) : counting?.id === p._id ? (
                                            <form
                                                className="flex items-center gap-1.5"
                                                onSubmit={e => {
                                                    e.preventDefault()
                                                    const n = Number(counting?.value)
                                                    if (!Number.isInteger(n) || n < 0) {
                                                        toast.error('Butun, manfiy bo\'lmagan son kiriting')
                                                        return
                                                    }
                                                    stockMut.mutate({ id: p._id, stockQty: n })
                                                }}
                                            >
                                                <input
                                                    type="number" min={0} inputMode="numeric" autoFocus
                                                    value={counting?.value ?? ''}
                                                    onChange={e => setCounting({ id: p._id, value: e.target.value })}
                                                    className="input w-20 px-2 py-1 text-sm"
                                                />
                                                <button type="submit" disabled={stockMut.isPending}
                                                        className="btn-primary px-2.5 py-1 text-[11px]">OK</button>
                                                <button type="button" onClick={() => setCounting(null)}
                                                        className="text-[11px] text-gray-600 hover:underline">Bekor</button>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setCounting({ id: p._id, value: String(p.stockQty) })}
                                                className="group flex items-center gap-2 text-left"
                                                title="Sanab, haqiqiy qoldiqni kiriting"
                                            >
                                                <span className="tabular font-medium text-gray-900">{p.stockQty}</span>
                                                {p.stockCountedAt ? (
                                                    <span className="text-[10px] text-gray-600">
                                                        {new Date(p.stockCountedAt).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="badge-pending badge text-[10px]">tekshirilmagan</span>
                                                )}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <span className={`badge ${p.inStock ? 'badge-delivered' : 'badge-pending'}`}>
                                                {p.inStock ? 'Mavjud' : 'Tugagan'}
                                            </span>
                                            {p.returnable && (
                                                <span className="text-[10px] text-accent">idish qaytariladi</span>
                                            )}
                                        </div>
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
