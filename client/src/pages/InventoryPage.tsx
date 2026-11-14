import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest, downloadCsv, formatMoney } from '../api/client';
import type { Product } from '../types';

export function InventoryPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [sortBy, setSortBy] = useState<'stock' | 'name' | 'margin' | 'days'>('stock');

  // Adjust Stock Modal
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Cycle Count Correction');

  // Add Product Modal
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('Beverages');
  const [newSupplier, setNewSupplier] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('');
  const [formError, setFormError] = useState('');

  const loadProducts = async () => {
    const res = await apiRequest<{ products: Product[] }>('/products');
    setProducts(res.products);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    const st = searchParams.get('status');
    if (q !== null) setSearch(q);
    if (st !== null) setStatusFilter(st);
  }, [searchParams]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'low' ? p.stockStatus === 'low' || p.stockStatus === 'critical' : p.stockStatus === statusFilter);
      return matchQ && matchCat && matchStatus;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'margin') return b.marginPercent - a.marginPercent;
      if (sortBy === 'days') return a.estimatedDaysLeft - b.estimatedDaysLeft;
      return a.stockQty - b.stockQty;
    });
  }, [products, search, categoryFilter, statusFilter, sortBy]);

  const totalValuation = products.reduce((acc, p) => acc + p.stockValue, 0);
  const lowCount = products.filter((p) => p.stockStatus === 'low').length;
  const criticalCount = products.filter((p) => p.stockStatus === 'critical').length;

  const handleAdjustSave = async () => {
    if (!adjustProduct) return;
    await apiRequest(`/products/${adjustProduct.id}/adjust`, {
      method: 'PATCH',
      body: JSON.stringify({ delta: adjustDelta, reason: adjustReason })
    });
    setAdjustProduct(null);
    setAdjustDelta(0);
    await loadProducts();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          sku: newSku,
          category: newCategory,
          supplierName: newSupplier || undefined,
          costPrice: Number(newCost),
          sellingPrice: Number(newPrice),
          stockQty: Number(newQty)
        })
      });
      setAddOpen(false);
      setNewName('');
      setNewSku('');
      setNewSupplier('');
      setNewCost('');
      setNewPrice('');
      setNewQty('');
      await loadProducts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to add product');
    }
  };

  const handleExport = () => {
    downloadCsv(
      'stockpulse-inventory.csv',
      filtered.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.category,
        CostPrice: p.costPrice,
        SellingPrice: p.sellingPrice,
        MarginPercent: p.marginPercent,
        StockQty: p.stockQty,
        Status: p.stockStatus,
        EstDaysLeft: p.estimatedDaysLeft,
        ABCClass: p.abcClass
      }))
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#151c27] tracking-tight">Inventory</h1>
          <p className="text-[13px] text-[#575e70] mt-0.5">
            Monitor warehouse quantities, predicted stock-outs, and unit margins.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white border border-[#E5E7EB] text-[13px] font-medium text-[#151c27] hover:bg-[#f4f6fb]"
          >
            <span className="material-symbols-outlined text-[16px] text-[#575e70]">file_download</span>
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#4f46e5] text-white text-[13px] font-medium hover:bg-[#3525cd]"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Product
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <span className="text-[11px] uppercase tracking-wider text-[#575e70] font-medium">Total Catalog</span>
          <div className="text-[22px] font-bold font-mono text-[#151c27] mt-1">{products.length} SKUs</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <span className="text-[11px] uppercase tracking-wider text-[#575e70] font-medium">Stock Valuation</span>
          <div className="text-[22px] font-bold font-mono text-[#151c27] mt-1 tabular-nums">
            {formatMoney(totalValuation)}
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <span className="text-[11px] uppercase tracking-wider text-amber-700 font-medium">Low Stock</span>
          <div className="text-[22px] font-bold font-mono text-[#151c27] mt-1">{lowCount} items</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <span className="text-[11px] uppercase tracking-wider text-[#ba1a1a] font-medium">Critical (&lt;48h)</span>
          <div className="text-[22px] font-bold font-mono text-[#ba1a1a] mt-1">{criticalCount} items</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#777587] text-[18px]">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full h-9 pl-9 pr-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[13px] text-[#151c27] focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[13px] text-[#151c27] focus:outline-none"
          >
            <option value="all">Stock Status: All</option>
            <option value="healthy">Healthy</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-9 px-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[13px] text-[#151c27] focus:outline-none"
        >
          <option value="stock">Sort: Stock Level</option>
          <option value="days">Sort: Est. Days Left</option>
          <option value="margin">Sort: Margin %</option>
          <option value="name">Sort: Name (A-Z)</option>
        </select>
      </div>

      {/* 6-Col Inventory Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider text-[#575e70]">
                <th className="py-3 px-5 font-medium">Product / SKU</th>
                <th className="py-3 px-5 font-medium">Category</th>
                <th className="py-3 px-5 font-medium">Cost / Price</th>
                <th className="py-3 px-5 font-medium">Stock</th>
                <th className="py-3 px-5 font-medium">Est. Days Left</th>
                <th className="py-3 px-5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]/60 text-[13px]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-[#151c27]">{p.name}</div>
                    <div className="text-[11px] font-mono text-[#575e70]">{p.sku}</div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="px-2 py-0.5 rounded-full bg-[#f4f6fb] border border-[#E5E7EB] text-[11px] text-[#464555]">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="font-mono text-[#151c27] tabular-nums">
                      {formatMoney(p.costPrice)} / {formatMoney(p.sellingPrice)}
                    </div>
                    <div className="text-[11px] text-[#575e70]">{p.marginPercent}% margin</div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="inline-flex items-center gap-2 font-mono tabular-nums">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          p.stockStatus === 'critical'
                            ? 'bg-[#ba1a1a]'
                            : p.stockStatus === 'low'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span className={p.stockStatus === 'critical' ? 'text-[#ba1a1a] font-semibold' : 'text-[#151c27]'}>
                        {p.stockQty} {p.unit}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`text-[12px] font-medium ${
                        p.stockStatus === 'critical'
                          ? 'text-[#ba1a1a]'
                          : p.stockStatus === 'low'
                          ? 'text-amber-700'
                          : 'text-[#575e70]'
                      }`}
                    >
                      {p.stockStatus === 'healthy' ? `Healthy (~${p.estimatedDaysLeft}d)` : `~${p.estimatedDaysLeft} days left`}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustProduct(p);
                        setAdjustDelta(0);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] text-[12px] font-medium text-[#151c27] hover:bg-[#f4f6fb]"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#575e70]">
                    No products match your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustProduct && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setAdjustProduct(null)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-md p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[#151c27]">Adjust Stock Units</h3>
                <p className="text-[12px] text-[#575e70]">
                  {adjustProduct.name} ({adjustProduct.sku})
                </p>
              </div>
              <button type="button" onClick={() => setAdjustProduct(null)} className="text-[#777587]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#464555] mb-1">Adjustment Reason</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full h-9 px-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[13px]"
              >
                <option>Cycle Count Correction</option>
                <option>Received Inbound Shipment</option>
                <option>Damaged / Spoilage</option>
                <option>Customer Return</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#464555] mb-1">Quantity Delta</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustDelta((d) => d - 1)}
                  className="w-9 h-9 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value) || 0)}
                  className="flex-1 h-9 text-center font-mono border border-[#E5E7EB] rounded-lg text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setAdjustDelta((d) => d + 1)}
                  className="w-9 h-9 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] font-bold"
                >
                  +
                </button>
              </div>
              <p className="text-center font-mono text-[12px] text-[#575e70] mt-2">
                Resulting stock: {Math.max(0, adjustProduct.stockQty + adjustDelta)} {adjustProduct.unit}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustProduct(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#575e70]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustSave}
                className="px-4 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {addOpen && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-lg p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-[15px] font-semibold text-[#151c27]">Add New Product</h3>
              <button type="button" onClick={() => setAddOpen(false)} className="text-[#777587]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded-lg bg-[#ffdad6]/50 text-[#93000a] text-[12px]">{formError}</div>
            )}

            <form onSubmit={handleAddProduct} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Product Name</label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Colombian Supremo Beans 250g"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">SKU</label>
                <input
                  required
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="SKU-BEV-098"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                >
                  <option>Beverages</option>
                  <option>Bakery</option>
                  <option>Snacks</option>
                  <option>Electronics</option>
                  <option>Essentials</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Unit Cost ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="4.50"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Selling Price ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="8.90"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Initial Stock Qty</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="24"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Supplier</label>
                <input
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  placeholder="Highland Roasters Supply"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#575e70]"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
