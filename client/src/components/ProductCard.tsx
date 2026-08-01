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
    stockQty?: number | null
    returnable?: boolean
    depositPrice?: number | null
}

export default function ProductCard({ product }: { product: Product }) {
    const { addItem } = useCart()
    const { t } = useLanguage()

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        addItem({
            _id: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl,
            returnable: product.returnable, depositPrice: product.depositPrice,
        })
        toast.success(t('products.added'))
    }

    return (
        <Link
            to={`/products/${product._id}`}
            className="card-3d group block overflow-hidden"
        >
            <div className="relative aspect-square overflow-hidden bg-gray-200">
                <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                />
                {!product.inStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink/75 backdrop-blur-[2px]">
                        <span className="rounded-full border border-line bg-ink px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-900">
                            Sotuvda yo'q
                        </span>
                    </div>
                )}
                {product.category === 'water' && (
                    <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-ink/70 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gray-900 backdrop-blur-sm">
                        Asosiy
                    </div>
                )}
            </div>

            <div className="p-5">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="line-clamp-2 min-h-[40px] font-semibold leading-tight text-gray-950 transition-colors group-hover:text-accent">
                        {product.name}
                    </h3>
                </div>

                <p className="mb-4 line-clamp-2 min-h-[32px] text-xs text-gray-600">
                    {product.description}
                </p>

                <div className="flex items-center justify-between mt-auto">
                    <div>
                        {/* Only when it is genuinely low: a countdown on a full
                            shelf is noise, and on an uncounted product it would
                            be a guess dressed up as urgency. */}
                        {typeof product.stockQty === 'number' && product.stockQty > 0 && product.stockQty <= 5 && (
                            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-sun">
                                faqat {product.stockQty} ta qoldi
                            </p>
                        )}
                        <p className="mb-0.5 text-[10px] uppercase tracking-wider text-gray-500">Narxi</p>
                        <p className="tabular text-lg font-semibold text-accent">
                            {formatPrice(product.price)}
                        </p>
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={!product.inStock}
                        className={`rounded-full p-3.5 transition-all duration-200 ${product.inStock
                                ? 'bg-gray-950 text-ink hover:bg-white active:scale-90'
                                : 'cursor-not-allowed border border-line text-gray-500'
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

