import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShoppingCart, ShoppingBag, CheckCircle, XCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../i18n/LanguageContext'
import { formatPrice } from '../api/client'
import toast from 'react-hot-toast'

interface Product {
    _id: string
    name: string
    price: number
    imageUrl: string
    inStock: boolean
    category: string
    description: string
}

export default function ProductCard({ product }: { product: Product }) {
    const { addItem } = useCart()
    const { t } = useLanguage()

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        addItem({ _id: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl })
        toast.success(t('products.added'))
    }

    return (
        <Link
            to={`/products/${product._id}`}
            className="group block bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            <div className="relative aspect-square overflow-hidden bg-gray-50">
                <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                />
                {!product.inStock && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                            Sotuvda yo'q
                        </span>
                    </div>
                )}
                {product.category === 'water' && (
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-primary-600 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-primary-100 uppercase shadow-sm">
                        Asosiy
                    </div>
                )}
            </div>

            <div className="p-5">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 leading-tight group-hover:text-primary-600 transition-colors line-clamp-2 min-h-[40px]">
                        {product.name}
                    </h3>
                </div>

                <p className="text-gray-500 text-xs mb-4 line-clamp-2 min-h-[32px]">
                    {product.description}
                </p>

                <div className="flex items-center justify-between mt-auto">
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Narxi</p>
                        <p className="text-lg font-bold text-gray-900">
                            {formatPrice(product.price)}
                        </p>
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={!product.inStock}
                        className={`p-3 rounded-2xl transition-all duration-200 ${product.inStock
                                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200 active:scale-90'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        title={t('products.addToCart')}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </Link>
    )
}

