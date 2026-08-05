import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, TrendingUp, Package, Truck, Calendar, Wallet } from 'lucide-react'
import { getReport, reportExportUrl, formatPrice, settleCourierCash, describeApiError } from '../../api/client'
import toast from 'react-hot-toast'

/**
 * Where the money came from, over a chosen range.
 *
 * The dashboard only ever showed one lifetime revenue figure, which cannot
 * answer any question an owner actually has — whether this week beat last,
 * which courier is carrying the round, which product pays for the van.
 *
 * Every figure counts money that was actually taken, not deliveries that
 * happened: a stop marked done whose cash never arrived is not income. What has
 * been collected but not yet handed in is shown separately — that is the money
 * currently in couriers' pockets, and it is the figure a cash business is
 * usually missing.
 */

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

export default function AdminReports() {
    const [from, setFrom] = useState(daysAgo(30))
    const [to, setTo] = useState(today())

    const range = { from, to }
    const { data, isLoading } = useQuery({
        queryKey: ['report', from, to],
        queryFn: () => getReport(range),
    })

    const qc = useQueryClient()
    const totals = data?.totals
    const cash = data?.cash

    const settle = useMutation({
        mutationFn: (courierId: string) => settleCourierCash(courierId),
        onSuccess: (r: any) => {
            toast.success(`${r?.settled ?? 0} ta buyurtma kassaga qabul qilindi`)
            qc.invalidateQueries({ queryKey: ['report'] })
        },
        onError: (err) => toast.error(describeApiError(err)),
    })
    const maxDay = Math.max(1, ...(data?.days || []).map((d: any) => d.revenue))

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-950">Hisobotlar</h1>

                <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs text-gray-600">
                        Boshlanish
                        <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                               className="input mt-1 py-2 text-sm" />
                    </label>
                    <label className="text-xs text-gray-600">
                        Tugash
                        <input type="date" value={to} min={from} max={today()} onChange={e => setTo(e.target.value)}
                               className="input mt-1 py-2 text-sm" />
                    </label>
                    {/* A plain link rather than a fetch: the browser's own download
                        handling is what makes the file land in Downloads with its
                        Content-Disposition name. */}
                    <a href={reportExportUrl('day', range)} className="btn-secondary py-2.5 text-xs">
                        <Download className="h-3.5 w-3.5" /> Kunlar CSV
                    </a>
                    <a href={reportExportUrl('courier', range)} className="btn-secondary py-2.5 text-xs">
                        <Download className="h-3.5 w-3.5" /> Kuryerlar CSV
                    </a>
                    <a href={reportExportUrl('product', range)} className="btn-secondary py-2.5 text-xs">
                        <Download className="h-3.5 w-3.5" /> Mahsulotlar CSV
                    </a>
                </div>
            </div>

            {/* Money taken at the door that has not reached the office. Kept
                outside the date range: cash still out is owed today, whichever
                week it was collected in. */}
            {cash && (
                <div className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-accent">
                                <Wallet className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="eyebrow">Kuryerlarda turgan naqd pul</p>
                                <p className="text-xl font-bold text-gray-950">{formatPrice(cash.total || 0)}</p>
                            </div>
                        </div>
                        {(cash.byCourier || []).length === 0 && (
                            <p className="text-xs text-gray-600">Topshirilmagan pul yo'q</p>
                        )}
                    </div>

                    {(cash.byCourier || []).length > 0 && (
                        <ul className="mt-4 divide-y divide-line border-t border-line pt-2 text-sm">
                            {cash.byCourier.map((c: any) => (
                                <li key={c.courierId || 'none'} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                    <span className="text-gray-900">
                                        {c.name || 'Noma\'lum'}
                                        <span className="ml-2 text-xs text-gray-600">{c.orders} ta buyurtma</span>
                                    </span>
                                    <span className="flex items-center gap-3">
                                        <b className="text-gray-950">{formatPrice(c.amount || 0)}</b>
                                        <button
                                            onClick={() => settle.mutate(c.courierId)}
                                            disabled={settle.isPending || !c.courierId}
                                            className="btn-secondary px-3 py-1.5 text-xs"
                                        >
                                            Kassaga qabul qilindi
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}


            {isLoading ? (
                <div className="card h-40 animate-pulse" />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Daromad', value: formatPrice(totals?.revenue || 0), icon: <TrendingUp className="h-5 w-5" /> },
                            { label: 'Buyurtmalar', value: totals?.orders ?? 0, icon: <Package className="h-5 w-5" /> },
                            { label: "O'rtacha buyurtma", value: formatPrice(totals?.averageOrder || 0), icon: <Calendar className="h-5 w-5" /> },
                            { label: 'Yetkazish yig\'imi', value: formatPrice(totals?.delivery || 0), icon: <Truck className="h-5 w-5" /> },
                        ].map(c => (
                            <div key={c.label} className="card p-5">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full
                                                 border border-line text-accent">{c.icon}</span>
                                <p className="eyebrow mt-4">{c.label}</p>
                                <p className="tabular mt-1 text-xl font-bold text-gray-950">{c.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Days, as bars scaled to the busiest day in the range — the
                        shape of the week is the point, not the exact pixel height. */}
                    <div className="card p-6">
                        <h2 className="mb-4 text-lg text-gray-950">Kunlar bo'yicha</h2>
                        {(data?.days || []).length === 0 ? (
                            <p className="text-sm text-gray-600">Bu oraliqda yetkazilgan buyurtma yo'q.</p>
                        ) : (
                            <ul className="space-y-2">
                                {data.days.map((d: any) => (
                                    <li key={d.date} className="flex items-center gap-3 text-sm">
                                        <span className="w-24 shrink-0 tabular text-gray-600">{d.date}</span>
                                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                                            <span className="block h-full rounded-full bg-brand"
                                                  style={{ width: `${(d.revenue / maxDay) * 100}%` }} />
                                        </span>
                                        <span className="w-16 shrink-0 tabular text-right text-gray-600">{d.orders}</span>
                                        <span className="w-32 shrink-0 tabular text-right text-gray-950">
                                            {formatPrice(d.revenue)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="card p-6">
                            <h2 className="mb-4 text-lg text-gray-950">Kuryerlar bo'yicha</h2>
                            <Table
                                rows={data?.couriers || []}
                                columns={[
                                    { key: 'name', label: 'Kuryer' },
                                    { key: 'orders', label: 'Buyurtma', align: 'right' },
                                    { key: 'revenue', label: 'Summa', align: 'right', money: true },
                                ]}
                            />
                        </div>
                        <div className="card p-6">
                            <h2 className="mb-4 text-lg text-gray-950">Mahsulotlar bo'yicha</h2>
                            <Table
                                rows={data?.products || []}
                                columns={[
                                    { key: 'name', label: 'Mahsulot' },
                                    { key: 'qty', label: 'Dona', align: 'right' },
                                    { key: 'revenue', label: 'Summa', align: 'right', money: true },
                                ]}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

interface Column { key: string; label: string; align?: 'right'; money?: boolean }

function Table({ rows, columns }: { rows: any[]; columns: Column[] }) {
    if (rows.length === 0) return <p className="text-sm text-gray-600">Ma'lumot yo'q.</p>

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-line">
                        {columns.map(c => (
                            <th key={c.key}
                                className={`pb-2 text-[10px] uppercase tracking-wider text-gray-600 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {columns.map(c => (
                                <td key={c.key}
                                    className={`py-2.5 ${c.align === 'right' ? 'tabular text-right' : ''} ${c.money ? 'text-gray-950' : 'text-gray-800'}`}>
                                    {c.money ? formatPrice(r[c.key] || 0) : String(r[c.key] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
