import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { User, Phone, Globe, LogOut, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import { api } from '../api/client'
import toast from 'react-hot-toast'

export default function ProfilePage() {
    const { user, logout } = useAuth()
    const { t, lang, setLang } = useLanguage()
    const navigate = useNavigate()
    const [name, setName] = useState(user?.name || '')

    const saveMutation = useMutation({
        mutationFn: () => api.patch('/auth/language', { language: lang }),
        onSuccess: () => toast.success(t('profile.save')),
        onError: () => toast.error(t('common.error')),
    })

    const handleLogout = () => {
        logout()
        navigate('/')
        toast.success('Chiqildi')
    }

    return (
        <div className="py-10">
            <div className="container-custom max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <User className="w-8 h-8 text-primary-600" />
                    {t('profile.title')}
                </h1>

                <div className="space-y-6">
                    {/* Info card */}
                    <div className="card p-6">
                        <h2 className="font-semibold text-gray-900 mb-4 text-base">Shaxsiy ma'lumotlar</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <User className="w-4 h-4 inline mr-1.5 text-gray-400" />
                                    {t('profile.name')}
                                </label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="input"
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <Phone className="w-4 h-4 inline mr-1.5 text-gray-400" />
                                    {t('profile.phone')}
                                </label>
                                <input value={user?.phone || ''} className="input bg-gray-50" readOnly />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <Globe className="w-4 h-4 inline mr-1.5 text-gray-400" />
                                    {t('profile.language')}
                                </label>
                                <div className="flex gap-2">
                                    {(['uz', 'ru', 'en'] as const).map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setLang(l)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${lang === l
                                                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {l === 'uz' ? "O'zbek" : l === 'ru' ? 'Русский' : 'English'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                            className="btn-primary gap-2 mt-6"
                        >
                            <Save className="w-4 h-4" />
                            {t('profile.save')}
                        </button>
                    </div>

                    {/* Role badge */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Roli</p>
                                <span className={`badge text-sm py-1 px-3 ${user?.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {user?.role === 'admin' ? '👑 Admin' : '👤 Mijoz'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleLogout} className="btn-danger gap-2 w-full justify-center py-3">
                        <LogOut className="w-4 h-4" />
                        {t('profile.logout')}
                    </button>
                </div>
            </div>
        </div>
    )
}
