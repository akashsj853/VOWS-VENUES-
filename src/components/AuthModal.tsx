import React, { useState } from 'react';
import { ShieldCheck, KeyRound, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { ModalShell, GoldButton } from './ui/LuxuryPrimitives';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthModal({
  initialMode = 'login',
  onClose,
  onSuccess,
}: {
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess?: (role: 'USER' | 'ADMIN') => void;
}) {
  const { login, register, refreshUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      onSuccess?.(user.role);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await register({ name, email, phone, password });
      if (res.verificationToken) {
        // Automatically verify or offer verification notice
        await apiFetch('/api/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token: res.verificationToken }),
        }).catch(() => {});
        await refreshUser();
      }
      onSuccess?.(res.user.role);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string; resetTokenPreview?: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setInfo(
        res.resetTokenPreview
          ? `${res.message} Your reset code: ${res.resetTokenPreview}`
          : res.message
      );
      if (res.resetTokenPreview) {
        setResetToken(res.resetTokenPreview);
      }
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Unable to process request.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token: resetToken, newPassword }),
      });
      setInfo(res.message);
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'USER' | 'ADMIN') => {
    setMode('login');
    setError('');
    if (role === 'ADMIN') {
      setEmail('admin@vowsandvenues.com');
      setPassword('Admin@1234');
    } else {
      setEmail('priya.sharma@example.com');
      setPassword('User@1234');
    }
  };

  return (
    <ModalShell
      title={
        mode === 'login'
          ? 'Member & Concierge Sign In'
          : mode === 'register'
            ? 'Create Member Account'
            : mode === 'forgot'
              ? 'Recover Account Access'
              : 'Set New Password'
      }
      subtitle="Access your reservations, payment receipts, and venue calendar."
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* Mode Switcher */}
        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#100B08] border border-white/12 rounded-sm">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 text-xs uppercase tracking-[0.14em] rounded-sm cursor-pointer transition-colors ${
                mode === 'login'
                  ? 'bg-[#D6B65B] text-[#100B08] font-semibold'
                  : 'text-[#B9AA99] hover:text-[#FFFFFF]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 text-xs uppercase tracking-[0.14em] rounded-sm cursor-pointer transition-colors ${
                mode === 'register'
                  ? 'bg-[#D6B65B] text-[#100B08] font-semibold'
                  : 'text-[#B9AA99] hover:text-[#FFFFFF]'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-sm text-xs text-rose-200">
            {error}
          </div>
        )}
        {info && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/35 rounded-sm text-xs text-emerald-200 flex items-start gap-2">
            <MailCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError('');
                }}
                className="text-[#E8CB72] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <GoldButton type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </GoldButton>

            {/* Quick Demo Credentials */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <span className="block text-[11px] uppercase tracking-[0.14em] text-[#B9AA99]">
                Quick Demo Access
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('USER')}
                  className="px-3 py-2 bg-[#21150F] border border-white/12 rounded-sm text-xs text-[#F6EBD8] hover:border-[#D6B65B] cursor-pointer text-left"
                >
                  <span className="block font-medium">Member Demo</span>
                  <span className="text-[10px] text-[#B9AA99]">priya.sharma@example.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('ADMIN')}
                  className="px-3 py-2 bg-[#21150F] border border-white/12 rounded-sm text-xs text-[#E8CB72] hover:border-[#D6B65B] cursor-pointer text-left"
                >
                  <span className="block font-medium inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Admin Demo
                  </span>
                  <span className="text-[10px] text-[#B9AA99]">admin@vowsandvenues.com</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Full Name
              </label>
              <input
                id="reg-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ananya Verma"
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ananya@example.com"
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-phone" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Phone Number
              </label>
              <input
                id="reg-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 44110"
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-pass" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Password (min 6 characters)
              </label>
              <input
                id="reg-pass"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8] focus:border-[#D6B65B] focus:outline-none"
              />
            </div>
            <GoldButton type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Member Account'}
            </GoldButton>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-xs text-[#B9AA99] leading-relaxed">
              Enter your registered email address to generate a temporary password reset code.
            </p>
            <div>
              <label htmlFor="forgot-email" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Registered Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
              />
            </div>
            <div className="flex items-center gap-3">
              <GoldButton type="submit" className="flex-1" disabled={loading}>
                Send Reset Code
              </GoldButton>
              <GoldButton type="button" variant="outline" onClick={() => setMode('login')}>
                Back
              </GoldButton>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="reset-code" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                Reset Code
              </label>
              <input
                id="reset-code"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm font-mono-num text-[#F6EBD8]"
              />
            </div>
            <div>
              <label htmlFor="reset-new-pass" className="block text-xs uppercase tracking-wider text-[#B9AA99] mb-1.5">
                New Password
              </label>
              <input
                id="reset-new-pass"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#100B08] border border-white/15 rounded-sm px-3.5 py-2.5 text-sm text-[#F6EBD8]"
              />
            </div>
            <GoldButton type="submit" className="w-full" disabled={loading}>
              <KeyRound className="w-4 h-4" />
              <span>Update Password</span>
            </GoldButton>
          </form>
        )}
      </div>
    </ModalShell>
  );
}
