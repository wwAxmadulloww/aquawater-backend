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

/**
 * Sends a prepared photo and returns the path it can be shown at.
 *
 * The blob goes up as the request body rather than inside a form: it is one
 * file with nothing alongside it, so there is nothing for multipart to keep
 * apart.
 */
export const uploadProductImage = (blob: Blob): Promise<{ url: string }> =>
    api.post('/products/image', blob, {
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
    }).then(r => r.data)

export const updateProduct = (id: string, data: unknown) =>
    api.put(`/products/${id}`, data).then(r => r.data)

export const deleteProduct = (id: string) =>
    api.delete(`/products/${id}`).then(r => r.data)

/**
 * Records a physical count. Sends an absolute figure, not a delta — an
 * increment would carry forward whatever error the previous number held.
 */
export const stocktakeProduct = (id: string, stockQty: number | null) =>
    api.patch(`/products/${id}/stocktake`, { stockQty }).then(r => r.data)

// Order helpers
export const createOrder = (data: unknown) =>
    api.post('/orders', data).then(r => r.data)

/**
 * A page of orders.
 *
 * These endpoints answer with `{ items, total, page, pages }` now that they
 * are bounded. Callers that only want the rows unwrap `items`; the array
 * fallback keeps a client running against an older deployment from rendering
 * nothing at all.
 */
export const getOrdersPage = (params?: Record<string, string | number>) =>
    api.get('/orders', { params }).then(r => r.data)

export const getOrders = (params?: Record<string, string | number>) =>
    getOrdersPage(params).then((d: any) => (Array.isArray(d) ? d : d?.items ?? []))

export const getOrder = (id: string) =>
    api.get(`/orders/${id}`).then(r => r.data)

export const updateOrderStatus = (
    id: string,
    status: string,
    extra?: { emptiesCollected?: number; paid?: boolean },
) => api.patch(`/orders/${id}/status`, { status, ...extra }).then(r => r.data)

/** A customer calling off their own order, while it is still callable off. */
export const cancelMyOrder = (id: string) =>
    api.patch(`/orders/${id}/cancel`).then(r => r.data)

/** Records that a courier's collected cash has reached the office. */
export const settleCourierCash = (courierId: string) =>
    api.post('/orders/cash/settle', { courierId }).then(r => r.data)

export const assignOrder = (id: string, data: { courierId?: string }) =>
    api.patch(`/orders/${id}/assign`, data).then(r => r.data)

export const deleteOrder = (id: string) =>
    api.delete(`/orders/${id}`).then(r => r.data)


// Admin
export const getAdminStats = () =>
    api.get('/admin/stats').then(r => r.data)

export const getAdminUsers = (params?: Record<string, string | number>) =>
    api.get('/admin/users', { params })
        .then(r => (Array.isArray(r.data) ? r.data : r.data?.items ?? []))

/** Closes the signed-in customer's own account. */
export const deleteMyAccount = () =>
    api.delete('/auth/me').then(r => r.data)

/** Issues a temporary password for a customer who cannot get in. */
export const resetCustomerPassword = (id: string): Promise<{ temporaryPassword: string }> =>
    api.post(`/admin/users/${id}/reset-password`).then(r => r.data)

export const updateUserRole = (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }).then(r => r.data)

export const deleteAdminUser = (id: string) =>
    api.delete(`/admin/users/${id}`).then(r => r.data)

// Format currency
export const formatPrice = (price: number) =>
    new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m'

// ── Delivery zones ───────────────────────────────────────────────────────

export const getDeliveryZones = () =>
    api.get('/delivery-zones').then(r => r.data)

export const getDeliveryQuote = (region: string, total: number) =>
    api.get('/delivery-quote', { params: { region, total } }).then(r => r.data)

export const createDeliveryZone = (data: unknown) =>
    api.post('/delivery-zones', data).then(r => r.data)

export const updateDeliveryZone = (id: string, data: unknown) =>
    api.put(`/delivery-zones/${id}`, data).then(r => r.data)

export const deleteDeliveryZone = (id: string) =>
    api.delete(`/delivery-zones/${id}`).then(r => r.data)

// ── Returnable containers ────────────────────────────────────────────────

export const getMyBottles = () =>
    api.get('/bottles/me').then(r => r.data)

export const getOutstandingBottles = () =>
    api.get('/bottles/outstanding').then(r => r.data)

export const adjustBottles = (data: { userId: string; delta: number; note?: string }) =>
    api.post('/bottles/adjust', data).then(r => r.data)

// ── Standing orders ──────────────────────────────────────────────────────

export const getSubscriptions = () =>
    api.get('/subscriptions').then(r => r.data)

export const createSubscription = (data: unknown) =>
    api.post('/subscriptions', data).then(r => r.data)

export const updateSubscription = (id: string, data: unknown) =>
    api.patch(`/subscriptions/${id}`, data).then(r => r.data)

export const deleteSubscription = (id: string) =>
    api.delete(`/subscriptions/${id}`).then(r => r.data)

// ── Reports ──────────────────────────────────────────────────────────────

/** Every standing order in the business, for the owner's overview. */
export const getAllSubscriptions = () =>
    api.get('/subscriptions/all').then(r => r.data)

/** Runs the scheduled work now, on an admin's authority. */
export const runSubscriptions = () =>
    api.post('/subscriptions/run').then(r => r.data)

export const getReport = (range: { from?: string; to?: string }) =>
    api.get('/reports', { params: range }).then(r => r.data)

/** Absolute URL for the CSV download, so the browser handles it as a file. */
export const reportExportUrl = (group: string, range: { from?: string; to?: string }) => {
    const qs = new URLSearchParams({ group, ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) })
    return `${api.defaults.baseURL}/reports/export?${qs}`
}

/** Public, checkable figures for the home page. */
export const getTrustFigures = () =>
    api.get('/trust').then(r => r.data)
