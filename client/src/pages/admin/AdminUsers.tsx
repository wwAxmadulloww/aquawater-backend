import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminUsers, updateUserRole, deleteAdminUser } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { Edit2, X, Check, ShieldAlert, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface RoleModalProps {
    user: any
    onClose: () => void
}

function RoleEditModal({ user, onClose }: RoleModalProps) {
    const qc = useQueryClient()
    const { isSuperAdmin } = useAuth()
    const [role, setRole] = useState(user.role)
    const [workerType, setWorkerType] = useState(user.workerType || '')

    const { mutate, isPending } = useMutation({
        mutationFn: () => updateUserRole(user._id, role, workerType),
        onSuccess: () => {
            toast.success('Rol yangilandi')
            qc.invalidateQueries({ queryKey: ['admin-users'] })
            onClose()
        },
        onError: () => toast.error('Xatolik yuz berdi')
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-primary-600" />
                        Rolni tahrirlash
                    </h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Mijoz</p>
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-sm font-mono text-gray-500">{user.phone}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Rolni tanlang</label>
                        <select
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className="input text-sm"
                        >
                            <option value="customer">Mijoz (Customer)</option>
                            <option value="worker">Ishchi (Worker)</option>
                            <option value="courier">Kuryer (Courier)</option>
                            {isSuperAdmin && <option value="admin">Admin</option>}
                            {isSuperAdmin && <option value="super_admin">⚡️ Super Admin</option>}
                        </select>
                        {!isSuperAdmin && role === 'admin' && (
                            <p className="text-xs text-orange-600 mt-1">Adminlarni boshqarish uchun Super Admin huquqi kerak</p>
                        )}
                    </div>

                    {role === 'worker' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Mutaxassisligi (ixtiyoriy)</label>
                            <input
                                value={workerType}
                                onChange={e => setWorkerType(e.target.value)}
                                placeholder="Masalan: Santexnik, Nasos ustasi..."
                                className="input text-sm"
                            />
                            <p className="text-xs text-gray-400 mt-1">Bu ishchining qanday xizmat ko'rsatishini bildiradi.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-ghost text-sm py-2">Bekor qilish</button>
                    <button
                        onClick={() => mutate()}
                        disabled={isPending || (!isSuperAdmin && (role === 'admin' || role === 'super_admin'))}
                        className="btn-primary text-sm py-2 gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Saqlash
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AdminUsers() {
    const { t } = useLanguage()
    const { isSuperAdmin } = useAuth()
    const qc = useQueryClient()
    const [editingUser, setEditingUser] = useState<any>(null)

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: getAdminUsers,
    })

    const { mutate: deleteMutate } = useMutation({
        mutationFn: (id: string) => deleteAdminUser(id),
        onSuccess: () => {
            toast.success('Foydalanuvchi o\'chirildi')
            qc.invalidateQueries({ queryKey: ['admin-users'] })
        },
        onError: () => toast.error('O\'chirishda xatolik yuz berdi')
    })

    const handleDelete = (u: any) => {
        if (window.confirm(`${u.name}ni tizimdan butunlay o'chirib tashlamoqchimisiz?`)) {
            deleteMutate(u._id)
        }
    }

    const getRoleBadge = (u: any) => {
        switch (u.role) {
            case 'super_admin': return <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-bold ring-1 ring-primary-200">⚡️ Super Admin</span>
            case 'admin': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">👑 Admin</span>
            case 'worker': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">🔧 Ishchi{u.workerType ? ` (${u.workerType})` : ''}</span>
            case 'courier': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">🚚 Kuryer</span>
            default: return <span className="badge-accepted">👤 Mijoz</span>
        }
    }

    return (
        <div>
            {editingUser && <RoleEditModal user={editingUser} onClose={() => setEditingUser(null)} />}

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.users')}</h1>
                <span className="text-sm text-gray-500">{users?.length || 0} ta foydalanuvchi</span>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ism</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {[...Array(4)].map((__, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-200 rounded" /></td>)}
                                    </tr>
                                ))
                            ) : users?.map((u: any) => (
                                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-200 text-gray-700">
                                                {u.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-900">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{u.phone}</td>
                                    <td className="px-4 py-3">
                                        {getRoleBadge(u)}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <button
                                            onClick={() => setEditingUser(u)}
                                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors inline-flex"
                                            title="Rolni o'zgartirish"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {isSuperAdmin && u.role !== 'super_admin' && (
                                            <button
                                                onClick={() => handleDelete(u)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                                                title="Foydalanuvchini o'chirish"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
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
