import { useEffect, useMemo, useState } from 'react';
import { apiRequest, formatMoney } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Customer, PaymentMethod, Product, Sale } from '../types';

interface CartLine {
  product: Product;
  qty: number;
}

export function PosCheckoutPage() {
  const { settings } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidInput, setPaidInput] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [pRes, cRes] = await Promise.all([
      apiRequest<{ products: Product[] }>('/products'),
      apiRequest<{ customers: Customer[] }>('/customers')
    ]);
    setProducts(pRes.products);
    setCustomers(cRes.customers);
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = category === 'All' || p.category === category;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [products, category, search]);

  const addToCart = (product: Product) => {
    setError('');
    if (product.stockQty <= 0) {
      setError(`${product.name} is out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stockQty) {
          setError(`Only ${product.stockQty} units available for ${product.name}.`);
          return prev;
        }
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setError('');
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.product.id !== productId) return line;
          const next = line.qty + delta;
          if (next > line.product.stockQty) {
            setError(`Only ${line.product.stockQty} units available.`);
            return line;
          }
          return { ...line, qty: next };
        })
        .filter((line) => line.qty > 0)
    );
  };

  const taxRate = settings?.defaultTaxRate ?? 8.25;
  const subtotal = Number(cart.reduce((acc, l) => acc + l.product.sellingPrice * l.qty, 0).toFixed(2));
  const safeDiscount = Math.min(subtotal, Math.max(0, discount));
  const taxable = Math.max(0, subtotal - safeDiscount);
  const tax = Number(((taxable * taxRate) / 100).toFixed(2));
  const total = Number((taxable + tax).toFixed(2));

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanCode.trim().toLowerCase();
    const match = products.find(
      (p) => p.barcode.toLowerCase() === code || p.sku.toLowerCase() === code
    );
    if (!match) {
      setError(`No product found for code "${scanCode}"`);
      return;
    }
    addToCart(match);
    setScanCode('');
    setScanOpen(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'due' && !selectedCustomerId) {
      setError('Select a named customer when recording a credit due.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const paidAmount =
        paymentMethod === 'due'
          ? Math.max(0, Math.min(total, Number(paidInput) || 0))
          : total;

      const res = await apiRequest<{ sale: Sale }>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId || undefined,
          items: cart.map((l) => ({ productId: l.product.id, qty: l.qty })),
          discount: safeDiscount,
          paymentMethod,
          paidAmount
        })
      });

      setReceiptSale(res.sale);
      setCart([]);
      setDiscount(0);
      setPaidInput('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-7rem)]">
      {/* LEFT PANEL: Product Catalog (65%) */}
      <div className="w-full lg:w-[65%] flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777587] text-[18px]">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or scan barcode..."
              className="w-full h-10 pl-9 pr-12 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#151c27] placeholder:text-[#777587] focus:outline-none focus:border-[#4f46e5]"
            />
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              title="Scan Barcode / SKU"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded text-[#575e70] hover:text-[#151c27] hover:bg-[#f4f6fb]"
            >
              <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors shrink-0 ${
                category === cat
                  ? 'bg-[#4f46e5] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#464555] hover:bg-[#f4f6fb]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Minimal 3-Col Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addToCart(p)}
              disabled={p.stockQty <= 0}
              className="text-left group bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col justify-between h-28 hover:border-[#4f46e5] transition-all disabled:opacity-50"
            >
              <div>
                <div className="text-[14px] font-semibold text-[#151c27] group-hover:text-[#4f46e5] line-clamp-1">
                  {p.name}
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    p.stockQty <= 5 ? 'text-[#ba1a1a] font-medium' : 'text-[#575e70]'
                  }`}
                >
                  {p.stockQty} left
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]/50 w-full">
                <span className="text-[15px] font-semibold text-[#151c27] tabular-nums">
                  {formatMoney(p.sellingPrice)}
                </span>
                <span className="text-[11px] font-medium text-[#4f46e5] opacity-0 group-hover:opacity-100 transition-opacity">
                  + Add
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Active Cart (35%) */}
      <div className="w-full lg:w-[35%] bg-white border border-[#E5E7EB] rounded-xl flex flex-col justify-between">
        <div>
          <div className="p-4 border-b border-[#E5E7EB] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#151c27]">Current Sale</h2>
                <span className="px-2 py-0.5 rounded-full bg-[#f4f6fb] text-[#575e70] text-[11px] font-medium tabular-nums">
                  {cart.reduce((a, l) => a + l.qty, 0)} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[12px] text-[#ba1a1a] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-9 px-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[13px] text-[#151c27] focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.totalDue > 0 ? `Due: ${formatMoney(c.totalDue)}` : 'No Due'})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mx-4 mt-3 p-2.5 rounded-lg bg-[#ffdad6]/50 text-[#93000a] text-[12px] font-medium">
              {error}
            </div>
          )}

          {/* Cart Items */}
          <div className="divide-y divide-[#E5E7EB]/60 px-4 max-h-[320px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-[#575e70]">
                Select products on the left to build a sale.
              </div>
            ) : (
              cart.map((line) => (
                <div key={line.product.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[#151c27] truncate">{line.product.name}</div>
                    <div className="text-[11px] font-mono text-[#575e70]">
                      {formatMoney(line.product.sellingPrice)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-[#E5E7EB] rounded-md bg-[#FAFAFA]">
                      <button
                        type="button"
                        onClick={() => updateQty(line.product.id, -1)}
                        className="w-6 h-6 text-[#575e70] hover:text-[#151c27]"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono text-[12px] tabular-nums">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.product.id, 1)}
                        className="w-6 h-6 text-[#575e70] hover:text-[#151c27]"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-16 text-right font-mono text-[13px] font-semibold tabular-nums">
                      {formatMoney(line.product.sellingPrice * line.qty)}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(line.product.id, -line.qty)}
                      className="text-[#777587] hover:text-[#ba1a1a]"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Checkout Summary */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#FAFAFA]/60 space-y-3 rounded-b-xl">
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between text-[#575e70]">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[#575e70]">
              <span>Discount ($)</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-20 h-7 px-2 text-right font-mono text-[12px] bg-white border border-[#E5E7EB] rounded focus:outline-none focus:border-[#4f46e5]"
              />
            </div>
            <div className="flex justify-between text-[#575e70]">
              <span>Tax ({taxRate}%)</span>
              <span className="font-mono tabular-nums">{formatMoney(tax)}</span>
            </div>
            <div className="flex justify-between text-[16px] font-bold text-[#151c27] pt-1 border-t border-[#E5E7EB]">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatMoney(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {(['cash', 'card', 'mobile', 'due'] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-1.5 rounded-lg text-[12px] font-medium capitalize border transition-colors ${
                  paymentMethod === method
                    ? 'bg-[#eef0ff] border-[#4f46e5] text-[#4f46e5]'
                    : 'bg-white border-[#E5E7EB] text-[#464555] hover:bg-[#f4f6fb]'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {paymentMethod === 'due' && (
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-[#575e70]">Amount Paid Now ($):</span>
              <input
                type="number"
                min={0}
                max={total}
                step="0.01"
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                placeholder="0.00"
                className="w-28 h-8 px-2 text-right font-mono bg-white border border-[#E5E7EB] rounded focus:outline-none focus:border-[#4f46e5]"
              />
            </div>
          )}

          <button
            type="button"
            disabled={cart.length === 0 || submitting}
            onClick={handleCheckout}
            className="w-full py-2.5 px-4 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-[13px] font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {submitting ? 'Processing...' : `Complete Sale • ${formatMoney(total)}`}
          </button>
        </div>
      </div>

      {/* Barcode / SKU Scanner Modal */}
      {scanOpen && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setScanOpen(false)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-sm p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-[#151c27]">Scan Barcode or Enter SKU</h3>
            <p className="text-[12px] text-[#575e70] mt-1">
              Try <code className="font-mono bg-[#f4f6fb] px-1 rounded">SKU-BEV-001</code> or{' '}
              <code className="font-mono bg-[#f4f6fb] px-1 rounded">890100100042</code>
            </p>
            <form onSubmit={handleBarcodeSubmit} className="mt-4 space-y-3">
              <input
                autoFocus
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="Scan or type barcode / SKU..."
                className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono focus:outline-none focus:border-[#4f46e5]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScanOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#575e70]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium"
                >
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Receipt Modal */}
      {receiptSale && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setReceiptSale(null)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                  Sale Completed
                </span>
                <h3 className="text-[16px] font-semibold text-[#151c27]">{receiptSale.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptSale(null)}
                className="p-1 text-[#777587] hover:text-[#151c27] no-print"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="py-3 text-[12px] text-[#575e70] flex justify-between">
              <span>Customer: {receiptSale.customerName}</span>
              <span className="capitalize">Method: {receiptSale.paymentMethod}</span>
            </div>
            <div className="border-t border-b border-[#E5E7EB] py-3 space-y-2 text-[13px]">
              {receiptSale.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span className="font-mono tabular-nums">{formatMoney(it.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 space-y-1 text-[13px]">
              <div className="flex justify-between font-bold text-[#151c27]">
                <span>Total</span>
                <span className="font-mono">{formatMoney(receiptSale.totalAmount)}</span>
              </div>
              {receiptSale.dueAmount > 0 && (
                <div className="flex justify-between text-[#ba1a1a] font-medium">
                  <span>Remaining Due</span>
                  <span className="font-mono">{formatMoney(receiptSale.dueAmount)}</span>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setReceiptSale(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#575e70]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
