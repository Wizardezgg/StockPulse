import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StockPulseLogo } from './StockPulseLogo';
import { apiRequest } from '../api/client';
import type { DashboardPayload } from '../types';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
  { to: '/pos', label: 'POS Checkout', icon: 'point_of_sale' },
  { to: '/inventory', label: 'Inventory', icon: 'shelves' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: 'local_shipping' },
  { to: '/customers', label: 'Customers & Dues', icon: 'group' },
  { to: '/expenses', label: 'Expenses', icon: 'receipt_long' },
  { to: '/analytics', label: 'Analytics', icon: 'insights' },
  { to: '/settings', label: 'Settings', icon: 'settings' }
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, settings, logout } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [alerts, setAlerts] = useState<DashboardPayload['reorderPredictions']>([]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    apiRequest<DashboardPayload>('/dashboard?days=30')
      .then((res) => setAlerts(res.reorderPredictions))
      .catch(() => {});
  }, []);

  const initials = (user?.name || 'SL')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/inventory?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#151c27]">
      {/* Fixed Left Sidebar (220px) matching Stitch design */}
      <aside className="fixed left-0 top-0 h-full w-[220px] bg-white border-r border-[#E5E7EB] z-50 flex flex-col justify-between select-none no-print">
        <div className="flex flex-col">
          <div className="h-14 px-5 flex items-center justify-between border-b border-[#E5E7EB]">
            <StockPulseLogo size="sm" />
          </div>
          <nav className="flex flex-col gap-1 p-2.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                    isActive
                      ? 'bg-[#eef0ff] text-[#4f46e5] font-medium'
                      : 'text-[#464555] hover:bg-[#f4f6fb] hover:text-[#151c27]'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Store & User Profile Card */}
        <div className="p-2.5 border-t border-[#E5E7EB] flex flex-col gap-2">
          <div className="px-2.5 py-1.5 rounded-lg bg-[#f4f6fb] border border-[#E5E7EB]/60 flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#575e70] truncate">
              {settings?.storeName || user?.storeName || 'StockPulse Store'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-1" />
          </div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#d9dff5] text-[#141b2b] text-[12px] font-semibold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-medium text-[#151c27] truncate">{user?.name || 'Sarah Lin'}</span>
                <span className="text-[11px] text-[#575e70] capitalize truncate">{user?.role || 'Owner'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="p-1 rounded text-[#777587] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="pl-[220px]">
        {/* Fixed Top Header Bar (56px) */}
        <header className="fixed top-0 left-[220px] right-0 h-14 bg-white border-b border-[#E5E7EB] z-40 flex items-center justify-between px-6 no-print">
          <form onSubmit={handleGlobalSearch} className="w-72">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#777587] text-[16px]">
                search
              </span>
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, product... (Press /)"
                className="w-full h-8 pl-8 pr-8 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[13px] text-[#151c27] placeholder:text-[#777587] focus:outline-none focus:border-[#4f46e5] focus:ring-0"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#777587] bg-white border border-[#E5E7EB] px-1 rounded">
                /
              </kbd>
            </div>
          </form>

          <div className="flex items-center gap-3 relative">
            <button
              type="button"
              onClick={() => navigate('/pos')}
              className="flex items-center gap-1.5 h-8 px-3.5 bg-[#4f46e5] text-white rounded-lg text-[12px] font-medium hover:bg-[#3525cd] transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Sale</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNotifs((v) => !v)}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[#464555] hover:bg-[#f4f6fb] hover:text-[#151c27] transition-colors"
              aria-label="Smart stock alerts"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-11 w-80 bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                  <span className="text-[12px] font-semibold text-[#151c27]">Smart Reorder Alerts</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifs(false);
                      navigate('/inventory?status=low');
                    }}
                    className="text-[11px] font-medium text-[#4f46e5] hover:underline"
                  >
                    View Inventory
                  </button>
                </div>
                <div className="mt-2 flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="text-[12px] text-[#575e70] py-3 text-center">All inventory levels healthy.</p>
                  ) : (
                    alerts.map((a) => (
                      <div key={a.productId} className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB]/60">
                        <div className="min-w-0 pr-2">
                          <div className="text-[12px] font-medium text-[#151c27] truncate">{a.name}</div>
                          <div className="text-[11px] text-[#575e70]">
                            {a.stockQty} {a.unit} left • Suggest +{a.suggestedOrderQty}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            a.urgency === 'critical' ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          ~{a.estimatedDaysLeft}d
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Container */}
        <main className="pt-14 min-h-screen">
          <div className="max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
