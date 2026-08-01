import React from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../i18n/LanguageContext'
import { formatPrice } from '../api/client'

const DELIVERY_FEE = 0

/** True when this line is being bought outright rather than returned. */
const keepsContainer = (i: any) => !!i.returnable && i.returnBottle === false

export default function CartPage() {
    const { items, updateQty, removeItem, setReturnBottle, totalPrice } = useCart()
    const { t } = useLanguage()

    if (items.length === 0) return (
        <div className="container-custom py-20 text-center">
            <div className="text-7xl mb-6">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('cart.empty')}</h2>
            <p className="text-gray-500 mb-8">{t('cart.empty.desc')}</p>
            <Link to="/products" className="btn-primary px-8 py-3">{t('cart.empty.btn')}</Link>
        </div>
    )

    return (
        <div className="py-10">
            <div className="container-custom">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <ShoppingBag className="w-8 h-8 text-primary-600" />
                    {t('cart.title')}
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {items.map(item => (
                            <div key={item._id} className="card p-4 flex flex-wrap items-center gap-4">
                                <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{item.name}</h3>
                                    <p className="text-primary-600 font-bold">
                                        {formatPrice(item.price + (keepsContainer(item) ? (item.depositPrice || 0) : 0))}
                                    </p>
                                </div>
                                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                                    <button className="px-2 py-2 text-gray-500 hover:bg-gray-50" onClick={() => updateQty(item._id, item.qty - 1)}>
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="px-3 py-2 text-sm font-medium min-w-[36px] text-center">{item.qty}</span>
                                    <button className="px-2 py-2 text-gray-500 hover:bg-gray-50" onClick={() => updateQty(item._id, item.qty + 1)}>
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-gray-700 font-semibold text-sm hidden sm:block min-w-[80px] text-right">
                                    {formatPrice((item.price + (keepsContainer(item) ? (item.depositPrice || 0) : 0)) * item.qty)}
                                </p>
                                <button onClick={() => removeItem(item._id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                {item.returnable && (item.depositPrice || 0) > 0 && (
                                    <div className="w-full border-t border-line pt-3">
                                        <p className="eyebrow mb-2">{t('cart.container')}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setReturnBottle(item._id, true)}
                                                className={`btn px-4 py-2 text-xs ${item.returnBottle !== false
                                                    ? 'bg-brand text-white' : 'border border-line text-gray-700'}`}
                                            >
                                                {t('cart.container.return')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setReturnBottle(item._id, false)}
                                                className={`btn px-4 py-2 text-xs ${item.returnBottle === false
                                                    ? 'bg-brand text-white' : 'border border-line text-gray-700'}`}
                                            >
                                                {t('cart.container.keep')} +{formatPrice(item.depositPrice || 0)}
                                            </button>
                                        </div>
                                        <p className="mt-2 text-[11px] text-gray-600">
                                            {item.returnBottle === false
                                                ? t('cart.container.keepNote')
                                                : t('cart.container.returnNote')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div>
                        <div className="card p-6 sticky top-24">
                            <h2 className="font-bold text-lg text-gray-900 mb-4">{t('checkout.summary')}</h2>
                            <div className="space-y-3 text-sm mb-4">
                                <div className="flex justify-between text-gray-600">
                                    <span>{t('cart.subtotal')}</span>
                                    <span>{formatPrice(totalPrice)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>{t('cart.delivery')}</span>
                                    <span className="text-green-600 font-medium">{DELIVERY_FEE === 0 ? t('cart.free') : formatPrice(DELIVERY_FEE)}</span>
                                </div>
                                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
                                    <span>{t('cart.total')}</span>
                                    <span className="text-primary-700">{formatPrice(totalPrice + DELIVERY_FEE)}</span>
                                </div>
                            </div>
                            <Link to="/checkout" className="btn-primary w-full py-3 text-base justify-center">
                                {t('cart.checkout')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
