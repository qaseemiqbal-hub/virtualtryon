'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, User, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        // Successful login, navigate to dashboard
        router.push('/admin/dashboard');
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 gradient-bg-glow flex items-center justify-center p-6 min-h-screen bg-[#060608]">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl relative"
      >
        {/* Glow behind */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-purple-500/5 to-pink-500/5 blur-2xl rounded-2xl" />

        {/* Brand header */}
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-xl tracking-wider">ADMIN CONTROL PORTAL</h2>
            <p className="text-neutral-500 text-xs mt-1 uppercase tracking-widest font-semibold">Secure Entry Only</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Username Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="E.g., admin"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-50 text-xs font-bold tracking-widest text-white uppercase py-4 rounded-xl transition-all shadow-lg shadow-purple-600/10 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                VERIFYING AUTHENTICATION...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                SECURE SIGN IN
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            ← Back to Fashion Studio
          </a>
        </div>

      </motion.div>
      
    </div>
  );
}
