import { useEffect, useMemo, useState } from 'react';
import { apiRequest, formatMoney } from '../api/client';
import type { Product, PurchaseOrder } from '../types';

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<'all' | 'pending' | 'received'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [qtyOrdered, setQtyOrdered] = useState(20);
  const [toast, setToast] = useState('');

  const loadAll = async () => {
    const [poRes, prodRes] = await Promise.all([
      apiRequest<{ purchaseOrders: PurchaseOrder[] }>('/purchase-orders'),
      apiRequest<{ products: Product[] }>('/products')
    ]);
    setOrders(poRes.purchaseOrders);
    setProducts(prodRes.products);
    if (!selectedProdId && prodRes.products.length > 0) {
      setSelectedProdId(prodRes.products[0].id);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filtered = useMemo(() => {
    if (tab === 'pending') return orders.filter((o) => o.status === 'draft' || o.status === 'ordered');
    if (tab === 'received') return orders.filter((o) => o.status === 'received');
    return orders;
  }, [orders, tab]);

  const handleMarkReceived = async (id: string, poNumber: string) => {
    await apiRequest(`/purchase-orders/${id}/receive`, { method: 'PATCH' });
    showToast(`${poNumber} received — inventory restocked!`);
    await loadAll();
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId) return;
    await apiRequest('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplierName: supplierName.trim() || undefined,
        status: 'ordered',
        items: [{ productId: selectedProdId, qtyOrdered }]
      })
    });
    setDrawerOpen(false);
    setSupplierName('');
    setQtyOrdered(20);
    showToast('Purchase Order created');
    await loadAll();
  };

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed bottom-5 right-5 bg-[#151c27] text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#151c27] tracking-tight">Purchase Orders</h1>
          <p className="text-[13px] text-[#575e70] mt-0.5">
            Track supplier orders and receive inbound stock directly into inventory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#4f46e5] text-white text-[13px] font-medium hover:bg-[#3525cd] self-start"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Purchase Order
        </button>
      </div>

      {/* 3-Tab Filter Bar */}
      <div className="inline-flex bg-white border border-[#E5E7EB] p-1 rounded-lg self-start">
        {(['all', 'pending', 'received'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium capitalize transition-colors ${
              tab === t ? 'bg-[#eef0ff] text-[#4f46e5]' : 'text-[#575e70] hover:text-[#151c27]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 6-Col PO Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider text-[#575e70]">
                <th className="py-3 px-5 font-medium">PO #</th>
                <th className="py-3 px-5 font-medium">Supplier</th>
                <th className="py-3 px-5 font-medium">Items</th>
                <th className="py-3 px-5 font-medium text-right">Total Cost</th>
                <th className="py-3 px-5 font-medium">Status</th>
                <th className="py-3 px-5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]/60 text-[13px]">
              {filtered.map((po) => {
                const totalUnits = po.items.reduce((a, i) => a + i.qtyOrdered, 0);
                return (
                  <tr key={po.id} className="hover:bg-[#FAFAFA]">
                    <td className="py-3.5 px-5 font-mono font-medium text-[#4f46e5]">{po.poNumber}</td>
                    <td className="py-3.5 px-5 font-medium text-[#151c27]">{po.supplierName}</td>
                    <td className="py-3.5 px-5 text-[#575e70]">
                      {po.items.length} item{po.items.length > 1 ? 's' : ''} ({totalUnits} units)
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-semibold tabular-nums">
                      {formatMoney(po.totalCost)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                          po.status === 'received'
                            ? 'bg-emerald-50 text-emerald-700'
                            : po.status === 'ordered'
                            ? 'bg-[#eef0ff] text-[#4f46e5]'
                            : 'bg-[#f4f6fb] text-[#575e70]'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {po.status !== 'received' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkReceived(po.id, po.poNumber)}
                          className="px-3 py-1 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
                        >
                          Mark Received
                        </button>
                      ) : (
                        <span className="text-[12px] text-[#575e70]">Stocked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Order Modal */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-[15px] font-semibold text-[#151c27]">New Purchase Order</h3>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-[#777587]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreatePO} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Product to Restock</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stockQty} left • Cost {formatMoney(p.costPrice)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Quantity Ordered</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={qtyOrdered}
                  onChange={(e) => setQtyOrdered(Number(e.target.value) || 1)}
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Supplier (Optional)</label>
                <input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Defaults to product's primary supplier"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#575e70]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
