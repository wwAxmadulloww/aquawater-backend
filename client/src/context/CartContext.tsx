import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface CartItem {
    _id: string
    name: string
    price: number
    imageUrl: string
    qty: number
}

interface CartContextType {
    items: CartItem[]
    addItem: (product: Omit<CartItem, 'qty'>) => void
    removeItem: (id: string) => void
    updateQty: (id: string, qty: number) => void
    clearCart: () => void
    totalItems: number
    totalPrice: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem('aq_cart')
            return saved ? JSON.parse(saved) : []
        } catch { return [] }
    })

    const save = (updated: CartItem[]) => {
        setItems(updated)
        localStorage.setItem('aq_cart', JSON.stringify(updated))
    }

    const addItem = (product: Omit<CartItem, 'qty'>) => {
        setItems(prev => {
            const existing = prev.find(i => i._id === product._id)
            const updated = existing
                ? prev.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i)
                : [...prev, { ...product, qty: 1 }]
            localStorage.setItem('aq_cart', JSON.stringify(updated))
            return updated
        })
    }

    const removeItem = (id: string) => save(items.filter(i => i._id !== id))

    const updateQty = (id: string, qty: number) => {
        if (qty < 1) { removeItem(id); return }
        save(items.map(i => i._id === id ? { ...i, qty } : i))
    }

    const clearCart = () => save([])

    const totalItems = items.reduce((sum, i) => sum + i.qty, 0)
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0)

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const ctx = useContext(CartContext)
    if (!ctx) throw new Error('useCart must be used within CartProvider')
    return ctx
}
