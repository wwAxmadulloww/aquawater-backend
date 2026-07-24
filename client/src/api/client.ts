import axios from 'axios'
import toast from 'react-hot-toast'

const getBaseURL = () => {
    // Frontend and backend are served from the same Vercel project now, so
    // the default is a same-origin relative path — no CORS, no cross-deploy
    // URL drift. VITE_API_BASE_URL remains as an escape hatch (e.g. pointing
    // a local `vite dev` frontend at a separately-hosted backend).
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (!envUrl) return '/api';

    const cleanUrl = envUrl.replace(/\/$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const api = axios.create({
    baseURL: getBaseURL(),
    headers: { 'Content-Type': 'application/json' },
    // Without a timeout, a backend that accepts the connection but never
    // replies leaves the promise pending forever, which reads as a UI that
    // hangs on login/submit with no feedback.
    timeout: 20000,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('aq_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

/**
 * Turns any axios failure into the message a user should actually read.
 * Exported so pages can render the same text inline instead of re-deriving it.
 */
export function describeApiError(err: any): string {
    if (err?.code === 'ECONNABORTED') {
        return 'Server javob bermadi. Birozdan so\'ng qayta urinib ko\'ring.'
    }
    if (!err?.response) {
        return 'Serverga ulanib bo\'lmadi. Internet aloqangizni tekshiring.'
    }

    const { status, data } = err.response

    // The backend returns 503 while the database is unreachable.
    if (status === 503) {
        return data?.message || 'Server vaqtincha ishlamayapti. Birozdan so\'ng urinib ko\'ring.'
    }
    if (status === 429) {
        return data?.message || 'Juda ko\'p urinish. Birozdan so\'ng qayta urinib ko\'ring.'
    }
    if (status >= 500) {
        return data?.message || 'Serverda xatolik yuz berdi.'
    }

    // Zod validation failures arrive as { errors: [...] } and would otherwise
    // fall through to a useless generic message.
    return data?.message
        || (Array.isArray(data?.errors) && data.errors[0]?.message)
        || 'Xatolik yuz berdi'
}

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const url: string = err.config?.url || ''
        // Auth screens render their own inline error; toasting here as well
        // produced two stacked notifications for one failure.
        const isAuthRequest = url.startsWith('/auth/')

        if (err.response?.status === 401) {
            localStorage.removeItem('aq_token')
            // Only bounce to /login for an expired session on some other page.
            // A wrong password on /login must not trigger a reload, which would
            // wipe the form and discard the error before it could be read.
            if (!isAuthRequest && window.location.pathname !== '/login') {
                window.location.href = '/login'
                return Promise.reject(err)
            }
        }

        if (!isAuthRequest) toast.error(describeApiError(err))

        return Promise.reject(err)
    }
)

// Product helpers
export const getProducts = (params?: Record<string, string>) =>
    api.get('/products', { params }).then(r => r.data)

export const getProduct = (id: string) =>
    api.get(`/products/${id}`).then(r => r.data)

export const createProduct = (data: unknown) =>
    api.post('/products', data).then(r => r.data)

export const updateProduct = (id: string, data: unknown) =>
    api.put(`/products/${id}`, data).then(r => r.data)

export const deleteProduct = (id: string) =>
    api.delete(`/products/${id}`).then(r => r.data)

export const approveProduct = (id: string, status: 'approved' | 'rejected') =>
    api.patch(`/products/${id}/approve`, { status }).then(r => r.data)

// Order helpers
export const createOrder = (data: unknown) =>
    api.post('/orders', data).then(r => r.data)

export const getOrders = (params?: Record<string, string>) =>
    api.get('/orders', { params }).then(r => r.data)

export const getOrder = (id: string) =>
    api.get(`/orders/${id}`).then(r => r.data)

export const updateOrderStatus = (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }).then(r => r.data)

export const assignOrder = (id: string, data: { courierId?: string, workerId?: string }) =>
    api.patch(`/orders/${id}/assign`, data).then(r => r.data)

export const deleteOrder = (id: string) =>
    api.delete(`/orders/${id}`).then(r => r.data)


// Admin
export const getAdminStats = () =>
    api.get('/admin/stats').then(r => r.data)

export const getAdminUsers = () =>
    api.get('/admin/users').then(r => r.data)

export const updateUserRole = (id: string, role: string, workerType?: string) =>
    api.patch(`/admin/users/${id}/role`, { role, workerType }).then(r => r.data)

export const deleteAdminUser = (id: string) =>
    api.delete(`/admin/users/${id}`).then(r => r.data)

// Format currency
export const formatPrice = (price: number) =>
    new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m'
