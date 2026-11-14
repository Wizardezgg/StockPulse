import { useEffect, useMemo, useState } from 'react';
import { apiRequest, downloadCsv, formatMoney } from '../api/client';
import type { ABCClass, AnalyticsPayload } from '../types';

const RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 }
];

const ABC_STYLES: Record<ABCClass, string> = {
  A: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  B: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  C: 'bg-slate-100 text-slate-600 border-slate-200'
};

const MOVEMENT_STYLES: Record<string, string> = {
  sale: 'bg-blue-50 text-blue-700 border-blue-200',
  restock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  adjustment: 'bg-amber-50 text-amber-700 border-amber-200',
  return: 'bg-rose-50 text-rose-700 border-rose-200'
};

export function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [abcFilter, setAbcFilter] = useState<'ALL' | ABCClass>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiRequest<AnalyticsPayload>(`/analytics?days=${days}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [days]);

  const filteredAudit = useMemo(() => {
    if (!data) return [];
    if (abcFilter === 'ALL') return data.abcAudit;
    return data.abcAudit.filter((item) => item.abcClass === abcFilter);
  }, [data, abcFilter]);

  const handleExportAudit = () => {
    if (!data) return;
    downloadCsv(
      `stockpulse-abc-audit-${days}d.csv`,
      filteredAudit.map((p) => ({
        SKU: p.sku,
        Product: p.name,
        Category: p.category,
        ABC_Class: p.abcClass,
        Stock_Qty: p.stockQty,
        Unit: p.unit,
        Stock_Value: p.stockValue.toFixed(2),
        Units_Sold_30D: p.unitsSold30d,
        Margin_Percent: p.marginPercent.toFixed(1),
        Days_Left: p.estimatedDaysLeft >= 999 ? '999+' : p.estimatedDaysLeft,
        Recommended_Action: p.recommendedAction
      }))
    );
  };

  if (loading && !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-sm text-gray-500">
        Computing smart inventory analytics and profitability...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { profitability, topSellers, recentMovements } = data;
  const maxBar = Math.max(profitability.revenue, profitability.cogs + profitability.expenses, 1);

  const profitBars = [
    {
      label: 'Gross Revenue',
      amount: profitability.revenue,
      color: 'bg-[#4F46E5]',
      width: Math.min(100, (profitability.revenue / maxBar) * 100)
    },
    {
      label: 'Cost of Goods Sold (COGS)',
      amount: profitability.cogs,
      color: 'bg-amber-500',
      width: Math.min(100, (profitability.cogs / maxBar) * 100)
    },
    {
      label: 'Operating Expenses',
      amount: profitability.expenses,
      color: 'bg-rose-500',
      width: Math.min(100, (profitability.expenses / maxBar) * 100)
    },
    {
      label: 'Net Profit',
      amount: Math.max(0, profitability.netProfit),
      color: profitability.netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600',
      width: Math.min(100, (Math.max(0, profitability.netProfit) / maxBar) * 100)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Smart Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Profit &amp; Loss breakdown, ABC inventory valuation, and stock movement audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex bg-white border border-gray-200 rounded-lg p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setDays(opt.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  days === opt.days
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportAudit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export ABC CSV
          </button>
        </div>
      </div>

      {/* P&L KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Gross Revenue ({days}D)</span>
            <span className="material-symbols-outlined text-[18px] text-[#4F46E5]">payments</span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-gray-900 font-mono-data">
            {formatMoney(profitability.revenue)}
          </div>
          <div className="mt-1 text-xs text-gray-500">Completed POS &amp; credit invoices</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Cost of Goods Sold</span>
            <span className="material-symbols-outlined text-[18px] text-amber-600">inventory_2</span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-gray-900 font-mono-data">
            {formatMoney(profitability.cogs)}
          </div>
          <div className="mt-1 text-xs text-gray-500">Unit cost across sold items</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Operating Expenses</span>
            <span className="material-symbols-outlined text-[18px] text-rose-600">receipt_long</span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-gray-900 font-mono-data">
            {formatMoney(profitability.expenses)}
          </div>
          <div className="mt-1 text-xs text-gray-500">Rent, utilities, salaries &amp; logistics</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Net Profit</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                profitability.netProfit >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {profitability.netMarginPercent.toFixed(1)}% margin
            </span>
          </div>
          <div
            className={`mt-2 text-2xl font-semibold font-mono-data ${
              profitability.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatMoney(profitability.netProfit)}
          </div>
          <div className="mt-1 text-xs text-gray-500">Revenue minus COGS &amp; expenses</div>
        </div>
      </div>

      {/* Profitability Breakdown & Top 5 Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Profitability Breakdown</h2>
              <p className="text-xs text-gray-500">Revenue vs. cost structure for last {days} days</p>
            </div>
            <span className="text-xs font-mono-data text-gray-500">P&amp;L SUMMARY</span>
          </div>

          <div className="space-y-4">
            {profitBars.map((bar) => (
              <div key={bar.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">{bar.label}</span>
                  <span className="font-mono-data font-medium text-gray-900">
                    {formatMoney(bar.amount)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${bar.color}`}
                    style={{ width: `${Math.max(bar.width, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Top 5 Selling Products</h2>
              <p className="text-xs text-gray-500">Ranked by revenue generated in the selected period</p>
            </div>
            <span className="text-xs font-mono-data text-gray-500">LEADERS</span>
          </div>

          {topSellers.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-500">
              No sales recorded in the last {days} days.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topSellers.map((item, idx) => (
                <div key={item.productId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-700 text-xs font-mono-data flex items-center justify-center shrink-0">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 font-mono-data">
                        {item.sku} · {item.unitsSold} units sold
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gray-900 font-mono-data">
                      {formatMoney(item.revenue)}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      {item.marginPercent.toFixed(1)}% margin
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ABC Classification & Dead Stock Audit */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">ABC Classification &amp; Dead Stock Audit</h2>
            <p className="text-xs text-gray-500">
              Class A drives ~80% revenue · Class B drives ~15% · Class C represents slow-moving or tail stock.
            </p>
          </div>
          <div className="inline-flex bg-gray-100 p-0.5 rounded-lg self-start">
            {(['ALL', 'A', 'B', 'C'] as const).map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setAbcFilter(cls)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  abcFilter === cls
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {cls === 'ALL' ? 'All Classes' : `Class ${cls}`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">ABC</th>
                <th className="py-2.5 px-4 text-right">On Hand</th>
                <th className="py-2.5 px-4 text-right">Stock Value</th>
                <th className="py-2.5 px-4 text-right">30D Sold</th>
                <th className="py-2.5 px-4 text-right">Est. Days Left</th>
                <th className="py-2.5 px-4">Smart Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredAudit.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/70">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500 font-mono-data">
                      {product.sku} · {product.category}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${
                        ABC_STYLES[product.abcClass]
                      }`}
                    >
                      Class {product.abcClass}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-data text-gray-900">
                    {product.stockQty} {product.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-data text-gray-900">
                    {formatMoney(product.stockValue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-data text-gray-700">
                    {product.unitsSold30d}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-data">
                    <span
                      className={
                        product.estimatedDaysLeft <= 3
                          ? 'text-rose-600 font-semibold'
                          : product.estimatedDaysLeft <= 7
                            ? 'text-amber-600 font-medium'
                            : 'text-gray-700'
                      }
                    >
                      {product.estimatedDaysLeft >= 999 ? '999+ d' : `${product.estimatedDaysLeft} d`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-700">{product.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Stock Movement Ledger */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Recent Stock Movement Ledger</h2>
          <p className="text-xs text-gray-500">
            Immutable audit log of POS deductions, purchase order restocks, and manual adjustments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-right">Delta</th>
                <th className="py-2.5 px-4 text-right">Stock Shift</th>
                <th className="py-2.5 px-4">Note / Reference</th>
                <th className="py-2.5 px-4">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-gray-500">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                recentMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50/70">
                    <td className="py-2.5 px-4 text-xs text-gray-500 font-mono-data whitespace-nowrap">
                      {new Date(mov.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-gray-900">{mov.productName}</div>
                      <div className="text-xs text-gray-500 font-mono-data">{mov.sku}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize ${
                          MOVEMENT_STYLES[mov.type] || 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {mov.type}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono-data font-semibold ${
                        mov.quantityDelta >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {mov.quantityDelta >= 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-data text-xs text-gray-600">
                      {mov.previousQty} &rarr; {mov.newQty}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-700">
                      {mov.note}
                      {mov.referenceId ? (
                        <span className="ml-1.5 font-mono-data text-[11px] text-gray-400">
                          ({mov.referenceId})
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-600">{mov.performedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
