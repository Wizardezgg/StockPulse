import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StockPulseLogo } from '../components/StockPulseLogo';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('sarah.lin@stockpulse.io');
  const [password, setPassword] = useState('Password123!');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#FAFAFA] text-[#151c27] px-4 py-8">
      <div className="h-4 sm:h-8" aria-hidden="true" />

      <main className="w-full flex justify-center items-center">
        <div className="w-full max-w-[400px] bg-white border border-[#E5E7EB] rounded-xl p-8 shadow-sm">
          <header className="text-left">
            <StockPulseLogo />
            <h1 className="text-lg font-semibold text-[#151c27] mt-6 tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-xs text-[#575e70] mt-1 leading-relaxed">
              Welcome back. Enter your credentials to access the register &amp; inventory.
            </p>
          </header>

          {error && (
            <div className="mt-4 p-2.5 rounded-lg bg-[#ffdad6]/50 border border-[#ba1a1a]/20 text-[#93000a] text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#151c27] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.lin@stockpulse.io"
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#151c27] placeholder:text-[#777587] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-[#151c27]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#4f46e5] hover:text-[#3525cd] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 pr-10 text-sm text-[#151c27] placeholder:text-[#777587] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#777587] hover:text-[#151c27]"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center pt-0.5">
              <input
                id="remember-device"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-[#E5E7EB] text-[#4f46e5] focus:ring-[#4f46e5]"
              />
              <label htmlFor="remember-device" className="ml-2.5 block text-xs text-[#575e70] cursor-pointer">
                Remember this device for 30 days
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-60"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <footer className="mt-7 pt-5 border-t border-[#E5E7EB]/60 text-center">
            <p className="text-xs text-[#575e70]">
              New to StockPulse?{' '}
              <Link to="/register" className="text-[#4f46e5] font-medium hover:underline">
                Create a store account
              </Link>
            </p>
          </footer>
        </div>
      </main>

      <footer className="w-full flex items-center justify-center gap-2 text-[11px] text-[#777587] py-4">
        <span>StockPulse v2.4</span>
        <span>•</span>
        <div className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
          <span className="text-[#575e70]">System Operational</span>
        </div>
      </footer>
    </div>
  );
}
