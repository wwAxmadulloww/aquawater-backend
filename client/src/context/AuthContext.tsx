import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { api } from '../api/client'

interface User {
    _id: string
    name: string
    phone: string
    role: 'customer' | 'admin' | 'worker' | 'courier' | 'super_admin'
    workerType?: string
    isPhoneVerified: boolean
    preferredLanguage: 'uz' | 'ru' | 'en'
    addresses: Array<{
        region: string; city: string; district: string
        street: string; house: string; apartment?: string
    }>
}

interface AuthContextType {
    user: User | null
    token: string | null
    loading: boolean
    login: (phone: string, password: string) => Promise<void>
    sendOtp: (phone: string) => Promise<void>
    register: (phone: string, name: string, password: string) => Promise<void>
    verifyOtp: (phone: string, code: string) => Promise<{ token?: string }>
    logout: () => void
    isAdmin: boolean
    isSuperAdmin: boolean
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('aq_token'))
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchMe = async () => {
            if (!token) { setLoading(false); return }
            try {
                const res = await api.get('/auth/me')
                setUser(res.data)
            } catch {
                localStorage.removeItem('aq_token')
                setToken(null)
            } finally {
                setLoading(false)
            }
        }
        fetchMe()
    }, [token])

    const login = async (phone: string, password: string) => {
        const res = await api.post('/auth/login', { phone, password })
        const { token: t, user: u } = res.data
        localStorage.setItem('aq_token', t)
        setToken(t)
        setUser(u)
    }

    const sendOtp = async (phone: string) => {
        await api.post('/auth/send-otp', { phone })
    }

    const register = async (phone: string, name: string, password: string) => {
        const res = await api.post('/auth/register', { phone, name, password })
        const { token: t, user: u } = res.data
        localStorage.setItem('aq_token', t)
        setToken(t)
        setUser(u)
    }

    const verifyOtp = async (phone: string, code: string) => {
        const res = await api.post('/auth/verify-otp', { phone, code })
        if (res.data.token) {
            const { token: t, user: u } = res.data
            localStorage.setItem('aq_token', t)
            setToken(t)
            setUser(u)
        }
        return res.data
    }

    const logout = () => {
        localStorage.removeItem('aq_token')
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            login, sendOtp, register, verifyOtp, logout,
            isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
            isSuperAdmin: user?.role === 'super_admin',
            // Gating on isPhoneVerified locked out every account created before
            // the flag existed (and every seeded account): login succeeded, the
            // token was stored, then each protected route bounced back to /login.
            // Phone verification is enforced server-side at registration when
            // REQUIRE_PHONE_VERIFICATION is on, so having a session is enough here.
            isAuthenticated: !!user,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
