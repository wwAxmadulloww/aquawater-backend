import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Header from './components/Header'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import OrdersPage from './pages/OrdersPage'
import AdminPage from './pages/admin/AdminPage'
import WorkerDashboard from './pages/WorkerDashboard'
import CourierDashboard from './pages/CourierDashboard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isAdmin, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (!isAdmin) return <Navigate to="/" replace />
    return <>{children}</>
}

function RoleRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
    const { isAuthenticated, user, loading } = useAuth()
    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
    if (!isAuthenticated) return <Navigate to="/login" replace />
    if (!user || (!allowedRoles.includes(user.role) && user.role !== 'admin' && user.role !== 'super_admin')) return <Navigate to="/" replace />
    return <>{children}</>
}

function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    )
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Layout><HomePage /></Layout>} />
            <Route path="/products" element={<Layout><ProductsPage /></Layout>} />
            <Route path="/products/:id" element={<Layout><ProductDetailPage /></Layout>} />
            <Route path="/cart" element={<Layout><CartPage /></Layout>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/checkout" element={<ProtectedRoute><Layout><CheckoutPage /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Layout><OrdersPage /></Layout></ProtectedRoute>} />
            <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/worker/*" element={<RoleRoute allowedRoles={['worker']}><Layout><WorkerDashboard /></Layout></RoleRoute>} />
            <Route path="/courier/*" element={<RoleRoute allowedRoles={['courier']}><Layout><CourierDashboard /></Layout></RoleRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <LanguageProvider>
                <AuthProvider>
                    <CartProvider>
                        <ErrorBoundary>
                            <AppRoutes />
                        </ErrorBoundary>
                    </CartProvider>
                </AuthProvider>
            </LanguageProvider>
        </BrowserRouter>
    )
}
