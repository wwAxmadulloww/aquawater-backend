import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'

export interface CartItem {
    _id: string
    name: string
    price: number
    imageUrl: string
    qty: number
    /** Only set for containers the customer keeps and owes back. */
    returnable?: boolean
    /** Per-unit charge if they keep the container instead of returning it. */
    depositPrice?: number | null
    /** Their choice. True — cheaper, and the container goes on their ledger. */
    returnBottle?: boolean
}

interface CartContextType {
    items: CartItem[]
    addItem: (product: Omit<CartItem, 'qty'>) => void
    removeItem: (id: string) => void
    updateQty: (id: string, qty: number) => void
    setReturnBottle: (id: string, returnBottle: boolean) => void
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

    /*
     * The basket belongs to whoever filled it.
     *
     * Clearing localStorage on sign-out is not enough on its own: this state was
     * seeded from storage once at mount and then lives in memory, so without
     * watching who is signed in, the next account to use the same browser
     * inherits the previous customer's basket.
     *
     * The ref starts undefined so the very first render — before /auth/me has
     * answered — is not mistaken for a change of account and does not wipe the
     * basket of someone who simply reloaded the page.
     */
    const { user, loading } = useAuth()
    const lastUserId = useRef<string | null | undefined>(undefined)

    useEffect(() => {
        /*
         * Nothing is decided until the session has been established.
         *
         * On any page load `user` is null while /auth/me is in flight and then
         * becomes the signed-in customer. Watching the id alone read that
         * null -> id transition as a change of account and emptied the basket on
         * every single reload — the customer filled it, navigated once, and it
         * was gone.
         */
        if (loading) return

        const id = user?._id ?? null
        if (lastUserId.current !== undefined && lastUserId.current !== id) {
            setItems([])
            localStorage.removeItem('aq_cart')
        }
        lastUserId.current = id
    }, [loading, user?._id])

    /**
     * Every mutation goes through the functional updater form. Reading `items`
     * from the render scope instead meant two clicks landing before a re-render
     * both worked from the same stale array, so the second silently undid the
     * first — visible as a quantity that jumps back or an item that reappears
     * after being removed.
     */
    const update = (fn: (prev: CartItem[]) => CartItem[]) => {
        setItems(prev => {
            const updated = fn(prev)
            localStorage.setItem('aq_cart', JSON.stringify(updated))
            return updated
        })
    }

    const addItem = (product: Omit<CartItem, 'qty'>) => {
        update(prev => {
            const existing = prev.find(i => i._id === product._id)
            return existing
                ? prev.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i)
                // Returning is the default because it is the cheaper choice; a
                // customer who never opens the option is not charged for a
                // bottle by omission.
                : [...prev, { ...product, qty: 1, returnBottle: true }]
        })
    }

    const setReturnBottle = (id: string, returnBottle: boolean) =>
        update(prev => prev.map(i => i._id === id ? { ...i, returnBottle } : i))

    const removeItem = (id: string) => update(prev => prev.filter(i => i._id !== id))

    const updateQty = (id: string, qty: number) => {
        if (qty < 1) { removeItem(id); return }
        update(prev => prev.map(i => i._id === id ? { ...i, qty } : i))
    }

    const clearCart = () => update(() => [])

    const totalItems = items.reduce((sum, i) => sum + i.qty, 0)
    /** What a line costs: the water, plus the container if they are keeping it. */
    const lineTotal = (i: CartItem) =>
        (i.price + (i.returnable && i.returnBottle === false ? (i.depositPrice || 0) : 0)) * i.qty

    const totalPrice = items.reduce((sum, i) => sum + lineTotal(i), 0)

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQty, setReturnBottle, clearCart, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const ctx = useContext(CartContext)
    if (!ctx) throw new Error('useCart must be used within CartProvider')
    return ctx
}
