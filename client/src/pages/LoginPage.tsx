import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Phone, Lock, User, Eye, EyeOff, Droplets, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import { describeApiError } from '../api/client'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register'

export default function LoginPage() {
    const { t } = useLanguage()
    const { login, sendOtp, register, verifyOtp, isAuthenticated } = useAuth()
    const navigate = useNavigate()

    const [mode, setMode] = useState<Mode>('login')

    // Form fields
    const [phone, setPhone] = useState('+998')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [name, setName] = useState('')

    // UI state
    const [showPass, setShowPass] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/')
        }
    }, [isAuthenticated, navigate])

    // Clear a stale error as soon as the user changes anything.
    useEffect(() => { setFormError(null) }, [mode, phone, password, name, confirmPassword])

    const mutation = useMutation({
        mutationFn: async () => {
            if (mode === 'login') {
                await login(phone, password)
            } else {
                await register(phone, name, password)
            }
        },
        onSuccess: () => {
            toast.success('Muvaffaqiyatli!')
            navigate('/')
        },
        onError: (err: any) => {
            console.error('Auth error:', err)
            // Shown inline rather than as a toast: a toast disappears while the
            // user is still looking at the form wondering what went wrong.
            setFormError(describeApiError(err))
        }
    })

    const handlePhoneChange = (v: string) => {
        if (!v.startsWith('+998')) return
        if (v.length > 13) return
        const digits = v.slice(4).replace(/\D/g, '')
        setPhone('+998' + digits)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Validation failures render in the same inline banner as server errors,
        // so the user always looks in one place for feedback.
        if (phone.length !== 13) return setFormError('Telefon raqamini to\'liq kiriting')
        if (password.length < 6) return setFormError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')

        if (mode === 'register') {
            if (name.trim().length < 2) return setFormError('Ismingizni kiriting')
            if (password !== confirmPassword) return setFormError('Parollar mos kelmadi')
        }

        setFormError(null)
        mutation.mutate()
    }

    return (
        <div className="deep caustics flex min-h-screen items-center justify-center p-4 font-sans">
            <div className="relative z-10 w-full max-w-md animate-rise">
                {/* Brand Logo */}
                <div className="text-center mb-10 group cursor-default">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem]
                                    bg-gradient-to-b from-[#2ad0e8] to-[#0f7d94]
                                    shadow-[inset_0_2px_0_rgba(255,255,255,.45),0_18px_38px_-14px_rgba(18,160,184,.95)]">
                        <Droplets className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <h1 className="font-display text-3xl font-semibold tracking-tight text-white">AquaWater</h1>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.3em] text-caustic/80">Uzbekistan</p>
                </div>

                {/* Main Auth Container */}
                <div className="card relative overflow-hidden p-8 md:p-10">
                    {/* Decorative Elements */}

                    {/* Mode Selector */}
                    <div className="relative z-10 mb-10 flex rounded-2xl bg-gray-100/80 p-1.5 shadow-[inset_0_1px_3px_rgba(5,42,56,.10)]">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${mode === 'login' ? 'bg-white text-primary-700 shadow-[0_2px_8px_-2px_rgba(5,42,56,.25)]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Kirish
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${mode === 'register' ? 'bg-white text-primary-700 shadow-[0_2px_8px_-2px_rgba(5,42,56,.25)]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Ro'yxatdan o'tish
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                        {mode === 'register' && (
                            <div className="space-y-2 animate-in fade-in duration-500">
                                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Ism va familiya</label>
                                <div className="relative group">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="input !pl-14 font-semibold"
                                        placeholder="Ismingizni kiriting"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Telefon raqam</label>
                            <div className="relative group">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => handlePhoneChange(e.target.value)}
                                    className="input !pl-14 font-semibold"
                                    placeholder="+998 XX XXX XX XX"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Parol</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="input !pl-14 !pr-14 font-semibold"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
                                >
                                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div className="space-y-2 animate-in fade-in duration-500 text-center">
                                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Parolni tasdiqlang</label>
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="input !pl-14 !pr-14 font-semibold"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {formError && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 bg-red-50 border-2 border-red-100 rounded-[20px] px-5 py-4"
                            >
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-semibold text-red-700 leading-snug">{formError}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="btn-primary group mt-8 w-full py-5 text-sm uppercase tracking-[0.18em]"
                        >
                            {mutation.isPending ? (
                                <RefreshCw className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Tizimga kirish' : 'Ro\'yxatdan o\'tish'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-12 text-center text-[10px] font-bold uppercase tracking-[0.35em] text-white/35">
                    © {new Date().getFullYear()} AquaWater Uzbekistan
                </p>
            </div>

        </div>
    )
}
