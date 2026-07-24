import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Minus, Plus, ShoppingCart, CheckCircle } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { getProduct, getProducts, formatPrice } from '../api/client'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'
import toast from 'react-hot-toast'

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { t } = useLanguage()
    const { addItem } = useCart()
    const [qty, setQty] = useState(1)

    const { data: product, isLoading } = useQuery({
        queryKey: ['product', id],
        queryFn: () => getProduct(id!),
    })

    const { data: allProducts } = useQuery({
        queryKey: ['products-similar'],
        queryFn: () => getProducts(),
        enabled: !!product,
    })

    const similar = allProducts?.filter((p: any) => p._id !== id && p.category === product?.category).slice(0, 4) || []

    if (isLoading) return (
        <div className="container-custom py-10">
            <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="aspect-square bg-gray-200 rounded-2xl" />
                <div className="space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-10 bg-gray-200 rounded w-1/2" />
                </div>
            </div>
        </div>
    )

    if (!product) return (
        <div className="container-custom py-20 text-center text-gray-500">
            Mahsulot topilmadi
        </div>
    )

    const isService = product?.productType === 'service'

    const handleAddToCart = () => {
        const count = isService ? 1 : qty
        for (let i = 0; i < count; i++) {
            addItem({ _id: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl })
        }
        toast.success(`${product.name} savatga qo'shildi!`)
    }

    return (
        <div className="py-10">
            <div className="container-custom">
                <Link to="/products" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    {t('common.back')}
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
                    {/* Image */}
                    <div className="card overflow-hidden">
                        <div className="aspect-square">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium capitalize">
                                {product.category}
                            </span>
                            {product.inStock ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {t('product.inStock')}
                                </span>
                            ) : (
                                <span className="text-red-500 text-xs">{t('product.outOfStock')}</span>
                            )}
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>
                        <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>

                        <div className="text-3xl font-bold text-primary-700 mb-6">{formatPrice(product.price)}</div>

                        {/* Qty selector — faqat mahsulot uchun, xizmatda ko'rinmaydi */}
                        {!isService && (
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-sm font-medium text-gray-700">{t('product.qty')}:</span>
                                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                                    <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setQty(v => Math.max(1, v - 1))}>
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="px-4 py-2 font-medium text-gray-900 min-w-[48px] text-center">{qty}</span>
                                    <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setQty(v => v + 1)}>
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleAddToCart}
                            disabled={!product.inStock}
                            className="btn-primary py-3 text-base gap-2 w-full sm:w-auto"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {t('product.addToCart')}
                        </button>
                    </div>
                </div>

                {/* Similar */}
                {similar.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('product.similar')}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {similar.map((p: any) => <ProductCard key={p._id} product={p} />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
