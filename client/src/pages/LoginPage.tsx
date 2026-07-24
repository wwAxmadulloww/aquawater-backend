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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-primary-100 font-sans">
            <div className="w-full max-w-md">
                {/* Brand Logo */}
                <div className="text-center mb-10 group cursor-default">
                    <div className="w-20 h-20 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-primary-200 rotation-slow border-4 border-white">
                        <Droplets className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">AquaWater</h1>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mt-2">Uzbekistan</p>
                </div>

                {/* Main Auth Container */}
                <div className="bg-white rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.08)] border border-slate-100/50 p-8 md:p-10 relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-50 rounded-full blur-3xl opacity-50" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary-100 rounded-full blur-3xl opacity-30" />

                    {/* Mode Selector */}
                    <div className="flex bg-slate-50 p-1.5 rounded-[22px] mb-10 relative z-10 transition-all">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${mode === 'login' ? 'bg-white text-primary-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Kirish
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${mode === 'register' ? 'bg-white text-primary-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Ro'yxatdan o'tish
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                        {mode === 'register' && (
                            <div className="space-y-2 animate-in fade-in duration-500">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ism va familiya</label>
                                <div className="relative group">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full pl-14 pr-5 py-4.5 bg-slate-50 border-2 border-slate-50 rounded-[20px] focus:bg-white focus:border-primary-500/20 focus:ring-8 focus:ring-primary-500/5 transition-all font-bold text-slate-900 outline-none"
                                        placeholder="Ismingizni kiriting"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon raqam</label>
                            <div className="relative group">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => handlePhoneChange(e.target.value)}
                                    className="w-full pl-14 pr-5 py-4.5 bg-slate-50 border-2 border-slate-50 rounded-[20px] focus:bg-white focus:border-primary-500/20 focus:ring-8 focus:ring-primary-500/5 transition-all font-bold text-slate-900 outline-none"
                                    placeholder="+998 XX XXX XX XX"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parol</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-14 pr-14 py-4.5 bg-slate-50 border-2 border-slate-50 rounded-[20px] focus:bg-white focus:border-primary-500/20 focus:ring-8 focus:ring-primary-500/5 transition-all font-bold text-slate-900 outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary-600 transition-colors"
                                >
                                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div className="space-y-2 animate-in fade-in duration-500 text-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parolni tasdiqlang</label>
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full pl-14 pr-14 py-4.5 bg-slate-50 border-2 border-slate-50 rounded-[20px] focus:bg-white focus:border-primary-500/20 focus:ring-8 focus:ring-primary-500/5 transition-all font-bold text-slate-900 outline-none"
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
                            className="w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group mt-8 bg-slate-900 text-white shadow-slate-900/10"
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

                <p className="text-center mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] drop-shadow-sm">
                    © {new Date().getFullYear()} AquaWater Uzbekistan
                </p>
            </div>

            <style>{`
                @keyframes rotation {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .rotation-slow {
                    animation: rotation 20s linear infinite;
                }
                .tracking-tighter { letter-spacing: -0.05em; }
                input::placeholder { color: #cbd5e1; font-weight: 600; }
            `}</style>
        </div>
    )
}
