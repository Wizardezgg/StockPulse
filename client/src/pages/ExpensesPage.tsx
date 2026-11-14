import { useEffect, useMemo, useState } from 'react';
import { apiRequest, downloadCsv, formatMoney } from '../api/client';
import type { Expense, ExpenseCategory } from '../types';

const CATEGORIES: Array<'All' | ExpenseCategory> = ['All', 'Rent', 'Utilities', 'Salaries', 'Logistics', 'Supplies', 'Other'];

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'All' | ExpenseCategory>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Rent');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Bank Direct Debit');
  const [vendorNote, setVendorNote] = useState('');

  const loadExpenses = async () => {
    const res = await apiRequest<{ expenses: Expense[] }>('/expenses');
    setExpenses(res.expenses);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      const matchCat = catFilter === 'All' || e.category === catFilter;
      const matchQ =
        !q || e.title.toLowerCase().includes(q) || e.vendorNote.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [expenses, catFilter, search]);

  const totalSpend = expenses.reduce((a, e) => a + e.amount, 0);
  const topCategory = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const e of expenses) {
      byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);
    }
    let best = { name: 'None', total: 0 };
    for (const [name, total] of byCat.entries()) {
      if (total > best.total) best = { name, total };
    }
    return best;
  }, [expenses]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setAmount('');
    setCategory('Supplies');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Bank Direct Debit');
    setVendorNote('');
    setModalOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setTitle(exp.title);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setDate(exp.date);
    setPaymentMethod(exp.paymentMethod);
    setVendorNote(exp.vendorNote);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      amount: Number(amount),
      category,
      date,
      paymentMethod,
      vendorNote
    };
    if (editing) {
      await apiRequest(`/expenses/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiRequest('/expenses', { method: 'POST', body: JSON.stringify(payload) });
    }
    setModalOpen(false);
    await loadExpenses();
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/expenses/${id}`, { method: 'DELETE' });
    await loadExpenses();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#151c27] tracking-tight">Expenses</h1>
          <p className="text-[13px] text-[#575e70] mt-0.5">
            Track operating costs, recurring bills, and ledger disbursements.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'stockpulse-expenses.csv',
                filtered.map((e) => ({
                  Date: e.date,
                  Title: e.title,
                  Category: e.category,
                  Amount: e.amount,
                  Method: e.paymentMethod,
                  Note: e.vendorNote
                }))
              )
            }
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white border border-[#E5E7EB] text-[13px] font-medium text-[#151c27] hover:bg-[#f4f6fb]"
          >
            <span className="material-symbols-outlined text-[16px] text-[#575e70]">download</span>
            Export CSV
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#4f46e5] text-white text-[13px] font-medium hover:bg-[#3525cd]"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Log Expense
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <span className="text-[11px] uppercase tracking-wider text-[#575e70] font-semibold">
            Total Expenses (This Month)
          </span>
          <div className="text-[28px] font-bold font-mono text-[#151c27] mt-1 tabular-nums">
            {formatMoney(totalSpend)}
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <span className="text-[11px] uppercase tracking-wider text-[#575e70] font-semibold">Largest Category</span>
          <div className="text-[20px] font-semibold text-[#151c27] mt-2">
            {topCategory.name}{' '}
            <span className="font-mono text-[#575e70] text-[15px]">({formatMoney(topCategory.total)})</span>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <span className="text-[11px] uppercase tracking-wider text-[#575e70] font-semibold">
            Recorded Entries
          </span>
          <div className="text-[28px] font-bold font-mono text-[#151c27] mt-1">{expenses.length} items</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777587] text-[16px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expense title or vendor..."
            className="w-full h-9 pl-9 pr-3 bg-white border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] p-1 rounded-lg overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                catFilter === cat ? 'bg-[#eef0ff] text-[#4f46e5]' : 'text-[#575e70] hover:text-[#151c27]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider text-[#575e70]">
                <th className="py-3 px-5 font-medium">Date</th>
                <th className="py-3 px-5 font-medium">Expense Title</th>
                <th className="py-3 px-5 font-medium">Category</th>
                <th className="py-3 px-5 font-medium text-right">Amount</th>
                <th className="py-3 px-5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]/60 text-[13px]">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-3.5 px-5 font-mono text-[12px] text-[#575e70] whitespace-nowrap">{exp.date}</td>
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-[#151c27]">{exp.title}</div>
                    <div className="text-[12px] text-[#575e70]">{exp.vendorNote}</div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f4f6fb] border border-[#E5E7EB] text-[11px] font-medium text-[#151c27]">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-semibold tabular-nums">
                    {formatMoney(exp.amount)}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(exp)}
                      className="p-1.5 rounded text-[#575e70] hover:text-[#151c27] hover:bg-[#f4f6fb]"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(exp.id)}
                      className="p-1.5 rounded text-[#575e70] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-[#151c27]">
              {editing ? 'Edit Expense' : 'Log New Expense'}
            </h3>
            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Expense Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Retail Space Rent - June"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#464555] mb-1">Amount ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#464555] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#464555] mb-1">Date</label>
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#464555] mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                  >
                    <option>Bank Direct Debit</option>
                    <option>Company Card</option>
                    <option>ACH Transfer</option>
                    <option>Petty Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Vendor / Note</label>
                <input
                  value={vendorNote}
                  onChange={(e) => setVendorNote(e.target.value)}
                  placeholder="e.g. Metro Property Trust"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#575e70]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
