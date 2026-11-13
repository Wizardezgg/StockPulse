import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StockPulseLogo } from '../components/StockPulseLogo';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ name, storeName, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFAFA] text-[#151c27]">
      <header className="w-full pt-6 px-6 flex items-center justify-between">
        <Link to="/login">
          <StockPulseLogo size="sm" />
        </Link>
        <span className="text-[11px] font-medium text-[#575e70]">v2.4.0-stable</span>
      </header>

      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px] bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-8 flex flex-col">
          <div className="flex flex-col items-start mb-6">
            <div className="mb-4">
              <StockPulseLogo />
            </div>
            <h1 className="text-[20px] font-semibold text-[#151c27] tracking-tight">
              Create your store account
            </h1>
            <p className="text-[14px] text-[#575e70] mt-1">
              Start managing inventory and sales in minutes.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-[#ffdad6]/50 border border-[#ba1a1a]/20 text-[#93000a] text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full-name" className="text-[12px] font-medium text-[#151c27]">
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Lin"
                className="w-full h-[42px] px-3.5 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#151c27] placeholder:text-[#777587] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="store-name" className="text-[12px] font-medium text-[#151c27]">
                Business / Store Name
              </label>
              <input
                id="store-name"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Apex Retail Co."
                className="w-full h-[42px] px-3.5 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#151c27] placeholder:text-[#777587] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="work-email" className="text-[12px] font-medium text-[#151c27]">
                Work Email
              </label>
              <input
                id="work-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-[42px] px-3.5 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#151c27] placeholder:text-[#777587] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[12px] font-medium text-[#151c27]">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-[42px] pl-3.5 pr-10 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#151c27] placeholder:text-[#777587] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute right-2.5 p-1 text-[#575e70] hover:text-[#151c27]"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[42px] mt-2 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-[14px] font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{submitting ? 'Creating account...' : 'Create Account'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[13px] text-[#575e70]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#4f46e5] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-4 bg-[#f4f6fb] rounded-lg p-3 flex flex-col gap-1 items-center text-center">
            <div className="flex items-center gap-1.5 text-[11px] text-[#575e70]">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">lock</span>
              <span>256-bit TLS encrypted connection</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[#575e70] text-[11px]">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>SYSTEMS OPERATIONAL</span>
        </div>
        <span>© 2026 StockPulse Corp</span>
      </footer>
    </div>
  );
}
