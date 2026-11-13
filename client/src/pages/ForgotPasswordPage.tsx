import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { StockPulseLogo } from '../components/StockPulseLogo';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setSentMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#FAFAFA] text-[#151c27] px-4 py-8">
      <div className="h-4 sm:h-8" aria-hidden="true" />

      <main className="w-full flex justify-center items-center">
        <div className="w-full max-w-[400px] bg-white border border-[#E5E7EB] rounded-xl p-8 shadow-sm">
          <StockPulseLogo />
          <h1 className="text-lg font-semibold text-[#151c27] mt-6 tracking-tight">
            Reset your password
          </h1>
          <p className="text-xs text-[#575e70] mt-1 leading-relaxed">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {error && (
            <div className="mt-4 p-2.5 rounded-lg bg-[#ffdad6]/50 text-[#93000a] text-xs font-medium">
              {error}
            </div>
          )}

          {sentMessage && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">mark_email_read</span>
              <span>{sentMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-medium text-[#151c27] mb-1.5">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.lin@stockpulse.io"
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#151c27] placeholder:text-[#777587] focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-sm font-medium shadow-sm transition-all disabled:opacity-60"
            >
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E5E7EB]/60 text-center">
            <Link to="/login" className="text-xs font-medium text-[#4f46e5] hover:underline">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </main>

      <footer className="w-full flex items-center justify-center gap-2 text-[11px] text-[#777587] py-4">
        <span>StockPulse v2.4</span>
      </footer>
    </div>
  );
}
