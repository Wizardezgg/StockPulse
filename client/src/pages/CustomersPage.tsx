import { useEffect, useMemo, useState } from 'react';
import { apiRequest, downloadCsv, formatMoney } from '../api/client';
import type { Customer } from '../types';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'due' | 'cleared'>('all');

  // Record Payment Modal
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // Add Customer Modal
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const loadCustomers = async () => {
    const res = await apiRequest<{ customers: Customer[] }>('/customers');
    setCustomers(res.customers);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
      const matchTab =
        filterTab === 'all' || (filterTab === 'due' ? c.totalDue > 0 : c.totalDue === 0);
      return matchQ && matchTab;
    });
  }, [customers, search, filterTab]);

  const totalOutstanding = customers.reduce((a, c) => a + c.totalDue, 0);
  const dueAccounts = customers.filter((c) => c.totalDue > 0).length;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer) return;
    await apiRequest(`/customers/${payCustomer.id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(payAmount) })
    });
    setPayCustomer(null);
    setPayAmount('');
    await loadCustomers();
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify({ name: newName, phone: newPhone, email: newEmail })
    });
    setAddOpen(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    await loadCustomers();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#151c27] tracking-tight">Customers &amp; Dues</h1>
          <p className="text-[13px] text-[#575e70] mt-0.5">
            Manage customer credit ledgers, receivables, and payment histories.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'stockpulse-customers.csv',
                filtered.map((c) => ({
                  Name: c.name,
                  Phone: c.phone,
                  TotalSpent: c.totalSpent,
                  OutstandingDue: c.totalDue,
                  LastPurchase: c.lastPurchaseAt
                }))
              )
            }
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
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Add Customer
          </button>
        </div>
      </div>

      {/* 3 Minimal KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <span className="text-[11px] uppercase tracking-wider text-[#575e70] font-semibold">Total Customers</span>
          <div className="text-[28px] font-bold font-mono text-[#151c27] mt-1">{customers.length}</div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <span className="text-[11px] uppercase tracking-wider text-[#575e70] font-semibold">
            Total Outstanding Dues
          </span>
          <div className="text-[28px] font-bold font-mono text-[#ba1a1a] mt-1 tabular-nums">
            {formatMoney(totalOutstanding)}
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <span className="text-[11px] uppercase tracking-wider text-[#575e70] font-semibold">
            Active Credit Accounts
          </span>
          <div className="text-[28px] font-bold font-mono text-emerald-600 mt-1">{dueAccounts} pending</div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#777587] text-[18px]">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or phone..."
              className="w-full h-9 pl-9 pr-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(['all', 'due', 'cleared'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTab(t)}
                className={`h-8 px-3 rounded-lg text-[12px] font-medium capitalize ${
                  filterTab === t ? 'bg-[#eef0ff] text-[#4f46e5]' : 'text-[#575e70] hover:bg-[#f4f6fb]'
                }`}
              >
                {t === 'due' ? `With Dues (${dueAccounts})` : t === 'cleared' ? 'Cleared' : `All (${customers.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider text-[#575e70]">
                <th className="py-3 px-5 font-medium">Customer</th>
                <th className="py-3 px-5 font-medium text-right">Total Spent</th>
                <th className="py-3 px-5 font-medium">Last Purchase</th>
                <th className="py-3 px-5 font-medium text-right">Outstanding Due</th>
                <th className="py-3 px-5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]/60 text-[13px]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-[#151c27]">{c.name}</div>
                    <div className="text-[12px] font-mono text-[#575e70]">{c.phone}</div>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums">{formatMoney(c.totalSpent)}</td>
                  <td className="py-3.5 px-5 text-[#575e70]">
                    {new Date(c.lastPurchaseAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td
                    className={`py-3.5 px-5 text-right font-mono font-semibold tabular-nums ${
                      c.totalDue > 0 ? 'text-[#ba1a1a]' : 'text-[#777587]'
                    }`}
                  >
                    {formatMoney(c.totalDue)}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {c.totalDue > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPayCustomer(c);
                          setPayAmount(String(c.totalDue));
                        }}
                        className="px-3 py-1 rounded-lg border border-[#E5E7EB] text-[12px] font-medium text-[#151c27] hover:bg-[#f4f6fb]"
                      >
                        Record Payment
                      </button>
                    ) : (
                      <span className="text-[12px] text-emerald-600 font-medium">Cleared</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {payCustomer && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPayCustomer(null)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-sm p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-[#151c27]">Record Payment</h3>
            <p className="text-[12px] text-[#575e70] mt-1">
              {payCustomer.name} • Outstanding: {formatMoney(payCustomer.totalDue)}
            </p>
            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payCustomer.totalDue}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayCustomer(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#575e70]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
                >
                  Apply Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {addOpen && (
        <div
          className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-xl w-full max-w-sm p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-[#151c27]">Add Customer</h3>
            <form onSubmit={handleAddCustomer} className="mt-4 space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Customer / Business Name</label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Harbor Bistro"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Phone</label>
                <input
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 555-0199"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#464555] mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="billing@bistro.co"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-[13px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] text-[#575e70]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4f46e5] text-white text-[12px] font-medium hover:bg-[#3525cd]"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
