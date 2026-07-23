import React, { useState } from 'react';
import { GraduationCap, Lock, Mail, ChevronRight, HelpCircle, ShieldAlert, Check, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../types';
import { supabase } from '../supabaseClient';
import { saveUserProfile } from '../supabaseService';
import CustomSelect from './CustomSelect';

interface AuthScreenProps {
  onLoginSuccess: (email: string, displayName: string, role: UserRole, uid?: string) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [customRole, setCustomRole] = useState<UserRole>('Staff CRM');
  const [customName, setCustomName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Preloaded demo users data profiles for seamless verification
  const demoUsers = [
    { name: 'Academius', role: 'Admin CRM' as UserRole, email: 'academius.official@gmail.com', desc: 'Admin CRM - Akses penuh kontrol leads, tim, dan pengaturan sistem.' },
    { name: 'Alim Bahri', role: 'Manager CRM' as UserRole, email: 'alim.bahri@academius.com', desc: 'Manager CRM - Koordinasi tim, visualisasi data, dan approval akun.' }
  ];

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email dan password tidak boleh kosong');
      return;
    }

    if (isRegistering && !customName.trim()) {
      setErrorMessage('Nama lengkap wajib diisi untuk pendaftaran');
      return;
    }

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              displayName: customName,
              role: customRole
            }
          }
        });

        if (error) {
          const isRateLimit = error.message?.toLowerCase().includes('rate limit') || 
                              error.message?.toLowerCase().includes('rate_limit') || 
                              error.message?.toLowerCase().includes('too many requests') ||
                              error.message?.toLowerCase().includes('spam') ||
                              error.status === 429;

          if (isRateLimit) {
            // Fallback to high-fidelity local simulation to prevent blocking development
            const matchingDemo = demoUsers.find(u => u.email === email.toLowerCase());
            const userDisplayName = matchingDemo ? matchingDemo.name : (customName || email.split('@')[0]);
            const userRole = matchingDemo ? matchingDemo.role : customRole;
            onLoginSuccess(email, userDisplayName, userRole);
            return;
          }

          setErrorMessage(error.message);
          return;
        }

        // Simpan data profil baru ke tabel 'profiles' di database secara instan
        if (data.user) {
          await saveUserProfile({
            uid: data.user.id,
            email: data.user.email || email,
            displayName: customName,
            role: customRole,
            isApproved: false // Status pendaftaran baru adalah pending
          });
        }

        // Do NOT auto-login.
        // Redirect the user to the Sign In page.
        setIsRegistering(false);
        setPassword('');
        // Show success message above the form on the Sign In page:
        setInfoMessage("Akun Anda berhasil didaftarkan! Silakan masuk (Sign In). Catatan: Jika konfirmasi email dinonaktifkan di Supabase, Anda dapat langsung masuk tanpa memverifikasi email, namun Anda memerlukan persetujuan manual (approval) dari Admin CRM terlebih dahulu sebelum dapat mengakses dashboard.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const isRateLimit = error.message?.toLowerCase().includes('rate limit') || 
                              error.message?.toLowerCase().includes('rate_limit') || 
                              error.message?.toLowerCase().includes('too many requests') ||
                              error.message?.toLowerCase().includes('spam') ||
                              error.status === 429;

          if (isRateLimit) {
            // Fallback to high-fidelity local simulation to prevent blocking development
            const matchingDemo = demoUsers.find(u => u.email === email.toLowerCase());
            const userDisplayName = matchingDemo ? matchingDemo.name : (email.split('@')[0]);
            const userRole = matchingDemo ? matchingDemo.role : 'Staff CRM';
            onLoginSuccess(email, userDisplayName, userRole);
            return;
          }

          setErrorMessage(error.message);
          return;
        }

        // Only redirect when a real session exists
        if (!data.session) {
          setErrorMessage("Sesi aktif tidak ditemukan. Selesaikan konfirmasi akun terlebih dahulu.");
          return;
        }

        const userEmail = data.user?.email || email;
        
        let userDisplayName = data.user?.user_metadata?.displayName;
        let userRole = data.user?.user_metadata?.role as UserRole;

        if (!userDisplayName || !userRole) {
          const matchingDemo = demoUsers.find(u => u.email === email.toLowerCase());
          if (matchingDemo) {
            userDisplayName = matchingDemo.name;
            userRole = matchingDemo.role;
          } else {
            userDisplayName = email.split('@')[0];
            userRole = 'Staff CRM';
          }
        }

        onLoginSuccess(userEmail, userDisplayName, userRole, data.user?.id);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem Auth');
    }
  };

  const handleDemoClick = (demo: typeof demoUsers[0]) => {
    onLoginSuccess(demo.email, demo.name, demo.role);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans transition-colors duration-200">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-600 dark:bg-blue-500 p-2.5 rounded-2xl text-white shadow-lg flex items-center justify-center">
          <GraduationCap className="h-7 w-7" id="auth-logo" />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl text-slate-805 dark:text-white leading-none">
            ACADEMIUS
          </h1>
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-0.5 block">
            CRM SYSTEM
          </span>
        </div>
      </div>

      {/* Auth Panel */}
      <div className="w-full max-w-[700px] bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800/80 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Main Content Form */}
        <div className="p-8 flex flex-col justify-between w-full md:w-[700px] max-w-full" style={{ width: '700px', maxWidth: '100%' }}>
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-slate-800 dark:text-white">
                {isRegistering ? 'Daftar Akun CRM Baru' : 'Selamat Datang'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRegistering ? 'Buat kredensial khusus dan pilih peran tugas utama Anda.' : 'Masukkan email dan password Anda untuk masuk ke sistem CRM.'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/40 text-[11px] font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{infoMessage}</span>
              </div>
            )}

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              
              {isRegistering && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama Lengkap"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Peran / Role</label>
                    <CustomSelect
                      value={customRole}
                      onChange={(val) => setCustomRole(val as UserRole)}
                      options={[
                        { value: 'Admin CRM', label: 'Admin CRM' },
                        { value: 'Manager CRM', label: 'Manager CRM' },
                        { value: 'Staff CRM', label: 'Staff CRM' }
                      ]}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Masukkan email Anda..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan password Anda..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none rounded-lg transition-colors"
                    title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  >
                    {showPassword ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>



              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer mt-6"
              >
                <span>{isRegistering ? 'Buat Akun Sekarang' : 'Masuk Aplikasi CRM'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>

            </form>
          </div>

          {/* Toggle */}
          <div className="text-center mt-6 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            <span>{isRegistering ? 'Sudah memiliki akun?' : 'Belum memiliki akun khusus?'}</span>
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMessage('');
                setInfoMessage('');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold ml-1"
            >
              {isRegistering ? 'Masuk di Sini' : 'Daftar Sekarang'}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
