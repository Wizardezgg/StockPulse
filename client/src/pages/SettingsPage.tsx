import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { StoreSettings } from '../types';

type SettingsTab = 'profile' | 'team' | 'tax' | 'notifications';

interface FormState {
  storeName: string;
  currency: string;
  defaultTaxRate: number;
  lowStockThreshold: number;
  address: string;
  phone: string;
}

export function SettingsPage() {
  const { user, settings, setSettings } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [form, setForm] = useState<FormState>({
    storeName: '',
    currency: 'USD',
    defaultTaxRate: 8.5,
    lowStockThreshold: 10,
    address: '',
    phone: ''
  });
  const [savedSnapshot, setSavedSnapshot] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [applyingThreshold, setApplyingThreshold] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const hydrate = (s: StoreSettings) => {
      const next: FormState = {
        storeName: s.storeName,
        currency: s.currency,
        defaultTaxRate: s.defaultTaxRate,
        lowStockThreshold: s.lowStockThreshold,
        address: s.address,
        phone: s.phone
      };
      setForm(next);
      setSavedSnapshot(next);
    };

    if (settings) {
      hydrate(settings);
    } else {
      apiRequest<{ settings: StoreSettings }>('/settings')
        .then((res) => {
          setSettings(res.settings);
          hydrate(res.settings);
        })
        .catch(() => {});
    }
  }, [settings, setSettings]);

  const isDirty = savedSnapshot ? JSON.stringify(form) !== JSON.stringify(savedSnapshot) : false;
  const canEdit = user?.role === 'owner' || user?.role === 'manager';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ settings: StoreSettings }>('/settings', {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      setSettings(res.settings);
      const next: FormState = {
        storeName: res.settings.storeName,
        currency: res.settings.currency,
        defaultTaxRate: res.settings.defaultTaxRate,
        lowStockThreshold: res.settings.lowStockThreshold,
        address: res.settings.address,
        phone: res.settings.phone
      };
      setForm(next);
      setSavedSnapshot(next);
      setNotice({ type: 'success', text: 'Store settings saved successfully.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save store settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (savedSnapshot) {
      setForm(savedSnapshot);
      setNotice(null);
    }
  };

  const handleApplyThresholdAll = async () => {
    if (!canEdit) return;
    setApplyingThreshold(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ success: boolean; updatedCount: number }>(
        '/settings/apply-threshold',
        {
          method: 'POST',
          body: JSON.stringify({ threshold: Number(form.lowStockThreshold) })
        }
      );
      setNotice({
        type: 'success',
        text: `Applied low-stock threshold (${form.lowStockThreshold}) across ${res.updatedCount} SKUs.`
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to apply threshold globally.'
      });
    } finally {
      setApplyingThreshold(false);
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'profile', label: 'Store Profile', icon: 'storefront' },
    { id: 'team', label: 'Team & Roles', icon: 'badge' },
    { id: 'tax', label: 'Tax & Invoice', icon: 'receipt' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications_active' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your store profile, global reorder thresholds, tax rules, and role permissions.
        </p>
      </div>

      {notice ? (
        <div
          className={`px-4 py-3 rounded-xl border text-sm flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-medium underline ml-4"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Navigation Tabs */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-[#4F46E5]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-9">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Store Profile &amp; Defaults</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Displayed on POS invoices, purchase orders, and stock alert rules.
                  </p>
                </div>
                {!canEdit ? (
                  <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                    Read-only ({user?.role})
                  </span>
                ) : null}
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Store Name</label>
                    <input
                      type="text"
                      value={form.storeName}
                      disabled={!canEdit}
                      onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5] disabled:bg-gray-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
                    <select
                      value={form.currency}
                      disabled={!canEdit}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5] disabled:bg-gray-50"
                    >
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (&euro;) - Euro</option>
                      <option value="GBP">GBP (&pound;) - British Pound</option>
                      <option value="BDT">BDT (&#2547;) - Bangladeshi Taka</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={form.phone}
                      disabled={!canEdit}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5] disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Default Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.defaultTaxRate}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, defaultTaxRate: Number(e.target.value) || 0 }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono-data text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5] disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Store Address</label>
                  <input
                    type="text"
                    value={form.address}
                    disabled={!canEdit}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5] disabled:bg-gray-50"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Global Low-Stock Reorder Threshold
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={form.lowStockThreshold}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lowStockThreshold: Math.max(1, Number(e.target.value) || 1) }))
                      }
                      className="w-full sm:w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono-data text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5] disabled:bg-gray-50"
                    />
                    <button
                      type="button"
                      disabled={!canEdit || applyingThreshold}
                      onClick={handleApplyThresholdAll}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-800 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      {applyingThreshold ? 'Applying...' : 'Apply to All Products'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Updates every existing SKU&apos;s minimum reorder threshold in one operation.
                  </p>
                </div>
              </div>

              {canEdit ? (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={!isDirty || saving}
                    onClick={handleDiscard}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : null}
            </form>
          ) : null}

          {activeTab === 'team' ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Team &amp; Role Permissions</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Signed in as <span className="font-medium text-gray-900">{user?.name}</span> ({user?.email})
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-[#4F46E5] text-xs font-semibold uppercase">
                  {user?.role}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    role: 'Owner',
                    summary: 'Full access to P&L analytics, store settings, POs, expenses, and RBAC.'
                  },
                  {
                    role: 'Manager',
                    summary: 'Inventory CRUD, stock adjustments, purchase orders, expenses, and settings.'
                  },
                  {
                    role: 'Cashier',
                    summary: 'POS checkout, invoice printing, customer credit lookup, and due payments.'
                  }
                ].map((r) => (
                  <div key={r.role} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div className="text-sm font-semibold text-gray-900">{r.role}</div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === 'tax' ? (
            <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Tax &amp; Invoice Rules</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure default POS checkout tax percentage and invoice header metadata.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Default Sales Tax (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.defaultTaxRate}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, defaultTaxRate: Number(e.target.value) || 0 }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono-data"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Invoice Currency</label>
                    <input
                      type="text"
                      value={form.currency}
                      disabled
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono-data bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-600 space-y-1">
                  <div className="font-semibold text-gray-900">{form.storeName || 'StockPulse Store'}</div>
                  <div>{form.address || 'No address set'}</div>
                  <div>{form.phone || 'No phone set'} · Tax Rate: {form.defaultTaxRate}%</div>
                </div>
              </div>
              {canEdit ? (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={!isDirty || saving}
                    onClick={handleDiscard}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-xs font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Tax Rules'}
                  </button>
                </div>
              ) : null}
            </form>
          ) : null}

          {activeTab === 'notifications' ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-base font-semibold text-gray-900">Smart Alert Rules</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatic alerts trigger in the top bar and Dashboard when stock days-left drops below 7 days.
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900">Critical Stock-Out Alert (&le; 3 days left)</div>
                    <div className="text-xs text-gray-500">Highlighted in red across Dashboard and Header</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200">
                  <div>
                    <div className="font-medium text-gray-900">
                      Low Stock Threshold ({form.lowStockThreshold} units default)
                    </div>
                    <div className="text-xs text-gray-500">Flags items needing Purchase Order replenishment</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                    Active
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
