import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '../i18n/LanguageContext'
import { getProducts } from '../api/client'
import ProductCard from '../components/ProductCard'
import { SlidersHorizontal } from 'lucide-react'

type Category = 'all' | 'water' | 'equipment' | 'accessories' | 'service'
type Sort = 'default' | 'price_asc' | 'price_desc'

export default function ProductsPage() {
    const { t } = useLanguage()
    const [category, setCategory] = useState<Category>('all')
    const [sort, setSort] = useState<Sort>('default')

    const params: Record<string, string> = {}
    if (category !== 'all') params.category = category
    if (sort !== 'default') params.sort = sort

    const { data: products, isLoading } = useQuery({
        queryKey: ['products', category, sort],
        queryFn: () => getProducts(params),
    })

    const categories: { val: Category; label: string }[] = [
        { val: 'all', label: 'Barchasi' },
        { val: 'water', label: '💧 Suv' },
        { val: 'equipment', label: '⚙️ Jihozlar' },
        { val: 'accessories', label: '🔩 Aksessuarlar' },
        { val: 'service', label: '🔧 Xizmatlar' },
    ]

    return (
        <div className="py-10">
            <div className="container-custom">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('products.title')}</h1>
                    <p className="text-gray-500 text-sm">{products?.length || 0} ta mahsulot</p>
                </div>

                {/* Filters + Sort */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        {categories.map(c => (
                            <button
                                key={c.val}
                                onClick={() => setCategory(c.val)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${category === c.val
                                        ? 'bg-primary-600 text-white shadow-sm'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                                    }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                        <select
                            value={sort}
                            onChange={e => setSort(e.target.value as Sort)}
                            className="input py-2 w-auto text-sm"
                        >
                            <option value="default">{t('products.sort.default')}</option>
                            <option value="price_asc">{t('products.sort.price_asc')}</option>
                            <option value="price_desc">{t('products.sort.price_desc')}</option>
                        </select>
                    </div>
                </div>

                {/* Products grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="card overflow-hidden animate-pulse">
                                <div className="aspect-square bg-gray-200" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-full" />
                                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : products?.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <div className="text-5xl mb-4">🔍</div>
                        <p className="font-medium">{t('products.empty')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products?.map((p: any) => <ProductCard key={p._id} product={p} />)}
                    </div>
                )}
            </div>
        </div>
    )
}
