import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, formatMoney } from '../api/client';
import type { DashboardPayload, Sale } from '../types';

export function DashboardPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadDashboard = async (rangeDays = days) => {
    setLoading(true);
    try {
      const res = await apiRequest<DashboardPayload>(`/dashboard?days=${rangeDays}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(days);
  }, [days]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSinglePO = async (productId: string, qty: number, name: string) => {
    await apiRequest('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({ status: 'ordered', items: [{ productId, qtyOrdered: qty }] })
    });
    showToast(`Created Purchase Order for ${name} (+${qty})`);
    navigate('/purchase-orders');
  };

  const handleBulkReorder = async () => {
    await apiRequest('/purchase-orders/auto-reorder', { method: 'POST' });
    showToast('Smart batch Purchase Order created');
    navigate('/purchase-orders');
  };

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#E5E7EB] rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-[#E5E7EB] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const maxRev = Math.max(...data.chartSeries.map((p) => p.revenue), 5000);
  const chartW = 700;
  const chartH = 210;
  const padX = 40;
  const padY = 20;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const points = data.chartSeries.map((pt, idx) => {
    const x = padX + (idx / Math.max(1, data.chartSeries.length - 1)) * plotW;
    const yRev = padY + plotH - (pt.revenue / maxRev) * plotH;
    const yProf = padY + plotH - (Math.max(0, pt.netProfit) / maxRev) * plotH;
    return { ...pt, x, yRev, yProf };
  });

  const revPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.yRev.toFixed(1)}`).join(' ');
  const profPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.yProf.toFixed(1)}`).join(' ');
  const areaPath =
    points.length > 0
      ? `${revPath} L${points[points.length - 1].x.toFixed(1)},${padY + plotH} L${points[0].x.toFixed(1)},${padY + plotH} Z`
      : '';

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed bottom-5 right-5 bg-[#151c27] text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Minimal Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold text-[#151c27] tracking-tight">Dashboard</h1>
        <div className="inline-flex bg-white border border-[#E5E7EB] p-0.5 rounded-lg">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                days === d ? 'bg-[#eef0ff] text-[#4f46e5]' : 'text-[#575e70] hover:text-[#151c27]'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: 4 Minimal KPI Cards (max 3 elements each) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between gap-2">
          <span className="text-[12px] font-medium text-[#575e70]">Today&apos;s Revenue</span>
          <span className="text-[26px] font-bold text-[#151c27] tabular-nums tracking-tight">
            {formatMoney(data.kpis.todaysRevenue)}
          </span>
          <span className="text-[12px] font-medium text-emerald-600">+14.8% vs yesterday</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between gap-2">
          <span className="text-[12px] font-medium text-[#575e70]">Net Profit ({days}D)</span>
          <span className="text-[26px] font-bold text-[#151c27] tabular-nums tracking-tight">
            {formatMoney(data.kpis.netProfit)}
          </span>
          <span className="text-[12px] font-medium text-emerald-600">
            {data.kpis.netMarginPercent}% net margin
          </span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between gap-2">
          <span className="text-[12px] font-medium text-[#575e70]">Low Stock Items</span>
          <span className="text-[26px] font-bold text-[#151c27] tabular-nums tracking-tight">
            {data.kpis.totalAlertItems}
          </span>
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-[#ba1a1a]">{data.kpis.criticalStockCount} critical</span>
            <Link to="/inventory?status=low" className="text-[#4f46e5] font-medium hover:underline">
              View →
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between gap-2">
          <span className="text-[12px] font-medium text-[#575e70]">Customer Dues</span>
          <span className="text-[26px] font-bold text-[#151c27] tabular-nums tracking-tight">
            {formatMoney(data.kpis.totalCustomerDues)}
          </span>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#575e70]">{data.kpis.dueAccountsCount} accounts</span>
            <Link to="/customers" className="text-[#4f46e5] font-medium hover:underline">
              Collect →
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: Revenue & Profit Chart (65%) + Reorder Alerts (35%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-white border border-[#E5E7EB] rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-[15px] font-semibold text-[#151c27]">Revenue &amp; Profit</h2>
            <div className="flex items-center gap-4 text-[12px] text-[#575e70]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Net Profit
              </span>
            </div>
          </div>

          <div className="w-full h-60">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="spRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                const y = padY + plotH * frac;
                const val = Math.round(maxRev * (1 - frac));
                return (
                  <g key={idx}>
                    <line x1={padX} x2={chartW - padX} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="3 3" />
                    <text x={padX - 8} y={y + 3} textAnchor="end" className="fill-[#777587] text-[10px] font-mono">
                      ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    </text>
                  </g>
                );
              })}
              {areaPath && <path d={areaPath} fill="url(#spRevGrad)" />}
              {revPath && <path d={revPath} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />}
              {profPath && <path d={profPath} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.yRev} r="3.5" fill="#4F46E5" stroke="#fff" strokeWidth="1.5" />
                  <text x={p.x} y={chartH - 2} textAnchor="middle" className="fill-[#777587] text-[10px] font-mono">
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Smart Reorder Alerts */}
        <div className="xl:col-span-4 bg-white border border-[#E5E7EB] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-[15px] font-semibold text-[#151c27]">Reorder Alerts</h2>
              {data.reorderPredictions.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkReorder}
                  className="text-[12px] font-medium text-[#4f46e5] hover:underline"
                >
                  Bulk Order →
                </button>
              )}
            </div>

            <div className="flex flex-col divide-y divide-[#E5E7EB]/60">
              {data.reorderPredictions.slice(0, 4).map((item) => (
                <div key={item.productId} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[#151c27] truncate">{item.name}</div>
                    <div
                      className={`text-[12px] font-medium ${
                        item.urgency === 'critical' ? 'text-[#ba1a1a]' : 'text-amber-600'
                      }`}
                    >
                      ~{item.estimatedDaysLeft}d left
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSinglePO(item.productId, item.suggestedOrderQty, item.name)}
                    className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] text-[12px] font-medium text-[#151c27] hover:bg-[#f4f6fb] shrink-0"
                  >
                    Order
                  </button>
                </div>
              ))}
              {data.reorderPredictions.length === 0 && (
                <p className="text-[13px] text-[#575e70] py-6 text-center">All products are well stocked.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Sales (60%) + Inventory Health ABC (40%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-white border border-[#E5E7EB] rounded-xl p-6">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-[15px] font-semibold text-[#151c27]">Recent Sales</h2>
            <Link to="/pos" className="text-[12px] font-medium text-[#4f46e5] hover:underline">
              Open POS →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider text-[#575e70]">
                  <th className="py-2.5 font-medium">Invoice #</th>
                  <th className="py-2.5 font-medium">Customer</th>
                  <th className="py-2.5 font-medium text-right">Total</th>
                  <th className="py-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]/60 text-[13px]">
                {data.recentSales.slice(0, 5).map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-mono font-medium text-[#4f46e5]">{sale.invoiceNumber}</td>
                    <td className="py-3 text-[#151c27]">{sale.customerName}</td>
                    <td className="py-3 text-right font-mono font-semibold tabular-nums">
                      {formatMoney(sale.totalAmount)}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sale.status === 'paid'
                              ? 'bg-emerald-500'
                              : sale.status === 'overdue'
                              ? 'bg-[#ba1a1a]'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span className="capitalize text-[#464555]">{sale.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 bg-white border border-[#E5E7EB] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-[15px] font-semibold text-[#151c27]">Inventory Health (ABC)</h2>
              <span className="font-mono text-[13px] font-semibold text-[#151c27] tabular-nums">
                {formatMoney(data.abcSummary.totalAssetValue)}
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-[#f4f6fb] overflow-hidden flex mb-5">
              <div className="bg-[#4f46e5] h-full" style={{ width: '70%' }} />
              <div className="bg-[#9ea8da] h-full" style={{ width: '20%' }} />
              <div className="bg-[#dce2f3] h-full" style={{ width: '10%' }} />
            </div>

            <div className="flex flex-col gap-3">
              {data.abcSummary.classes.map((cls) => (
                <div key={cls.code} className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB]/60">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-[12px] font-mono font-bold ${
                        cls.code === 'A'
                          ? 'bg-[#eef0ff] text-[#4f46e5]'
                          : cls.code === 'B'
                          ? 'bg-[#d9dff5] text-[#141b2b]'
                          : 'bg-[#E5E7EB] text-[#464555]'
                      }`}
                    >
                      {cls.code}
                    </span>
                    <div>
                      <div className="text-[13px] font-medium text-[#151c27]">{cls.label}</div>
                      <div className="text-[11px] text-[#575e70]">{cls.skuCount} SKUs • {cls.sharePercent}% revenue share</div>
                    </div>
                  </div>
                  <span className="font-mono text-[13px] font-semibold tabular-nums">{formatMoney(cls.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E5E7EB]/60 flex justify-end">
            <Link to="/analytics" className="text-[12px] font-medium text-[#4f46e5] hover:underline">
              Run Aging Audit →
            </Link>
          </div>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {selectedSale && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#151c27]">Invoice {selectedSale.invoiceNumber}</h3>
                <p className="text-[12px] text-[#575e70]">{selectedSale.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="p-1 text-[#777587] hover:text-[#151c27]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="my-4 space-y-2 text-[13px]">
              {selectedSale.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span className="font-mono tabular-nums">{formatMoney(it.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-[#E5E7EB] space-y-1 text-[13px]">
              <div className="flex justify-between text-[#575e70]">
                <span>Subtotal</span>
                <span className="font-mono">{formatMoney(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#575e70]">
                <span>Tax</span>
                <span className="font-mono">{formatMoney(selectedSale.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[#151c27] pt-1">
                <span>Total</span>
                <span className="font-mono">{formatMoney(selectedSale.totalAmount)}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
