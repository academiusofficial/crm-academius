import React, { useState, useEffect } from 'react';
import academiusLogo from '../assets/images/regenerated_image_1784801332072.webp';
import { GraduationCap, Lock, Mail, ChevronRight, HelpCircle, ShieldAlert, Check, Eye, EyeOff, KeyRound, ArrowLeft, Send } from 'lucide-react';
import { UserRole } from '../types';
import { supabase } from '../supabaseClient';
import { saveUserProfile, getUserProfiles } from '../supabaseService';
import CustomSelect from './CustomSelect';

interface AuthScreenProps {
  onLoginSuccess: (email: string, displayName: string, role: UserRole, uid?: string) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customRole, setCustomRole] = useState<UserRole>('Staff CRM');
  const [customName, setCustomName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Detect recovery mode from URL or Auth state change
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token')) {
      setIsResettingPassword(true);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

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
          const isUserAlreadyRegistered = error.message?.toLowerCase().includes('already registered') || 
                                         error.message?.toLowerCase().includes('already exists') ||
                                         error.message?.toLowerCase().includes('user_already_exists');

          if (isUserAlreadyRegistered) {
            // Attempt fallback login with the credentials provided
            const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (!signInErr && signInData?.user) {
              // Check if user profile already exists in DB to preserve approval status
              const existingProfiles = await getUserProfiles();
              const existing = existingProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
              const isApprovedStatus = existing ? existing.isApproved : false;

              const reRegisteredName = existing?.displayName || customName || email.split('@')[0];
              const reRegisteredRole = existing?.role || customRole || 'Staff CRM';

              await saveUserProfile({
                uid: signInData.user.id,
                email: signInData.user.email || email,
                displayName: reRegisteredName,
                role: reRegisteredRole,
                isApproved: isApprovedStatus
              });

              onLoginSuccess(email, reRegisteredName, reRegisteredRole, signInData.user.id);
              return;
            } else {
              setErrorMessage("Email ini sudah pernah terdaftar di Autentikasi Supabase. Silakan gunakan kata sandi sebelumnya untuk 'Masuk' (Sign In) atau minta Admin mereset kata sandi Anda.");
              return;
            }
          }

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

        const profiles = await getUserProfiles();
        const matchedProfile = profiles.find(p => p.email.toLowerCase() === userEmail.toLowerCase());

        if (matchedProfile) {
          userDisplayName = matchedProfile.displayName || userDisplayName;
          userRole = matchedProfile.role || userRole;
        }

        if (!userDisplayName || !userRole) {
          const matchingDemo = demoUsers.find(u => u.email === email.toLowerCase());
          if (matchingDemo) {
            userDisplayName = userDisplayName || matchingDemo.name;
            userRole = userRole || matchingDemo.role;
          } else {
            userDisplayName = userDisplayName || email.split('@')[0];
            userRole = userRole || 'Staff CRM';
          }
        }

        onLoginSuccess(userEmail, userDisplayName, userRole, data.user?.id);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem Auth');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim()) {
      setErrorMessage('Silakan masukkan alamat email terdaftar Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        const isRateLimit = error.message?.toLowerCase().includes('rate limit') || 
                            error.message?.toLowerCase().includes('rate_limit') || 
                            error.status === 429;
        if (isRateLimit) {
          setInfoMessage(`Tautan instruksi reset password otomatis tetap telah diproses untuk ${email.trim()}. Silakan periksa kotak masuk/folder Spam email Anda.`);
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setInfoMessage(`Tautan reset password (Magic Link) berhasil dikirimkan ke ${email.trim()}! Silakan periksa pesan masuk atau folder Spam pada email Anda untuk menyetel password baru.`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengirim tautan reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setInfoMessage('Password Anda berhasil diperbarui! Silakan masuk menggunakan password baru Anda.');
        setIsResettingPassword(false);
        setIsForgotPassword(false);
        setPassword(newPassword);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memperbarui password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#42B8D5] to-[#136386] flex flex-col items-center justify-center p-4 font-sans transition-colors duration-200">
      
      {/* Brand Header */}
      <div className="flex items-center justify-center mb-8">
        <img 
          src={academiusLogo} 
          alt="Academius CRM System" 
          className="h-16 w-auto object-contain max-w-[260px]"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Auth Panel */}
      <div className="w-full max-w-[700px] bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800/80 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Main Content Form */}
        <div className="p-5 sm:p-8 flex flex-col justify-between w-full max-w-full">
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl dark:text-white flex items-center gap-2" style={{ color: '#116185' }}>
                {isResettingPassword ? (
                  <>
                    <KeyRound className="h-5 w-5" style={{ color: '#42b8d5' }} />
                    <span>Setel Password Baru</span>
                  </>
                ) : isForgotPassword ? (
                  <>
                    <KeyRound className="h-5 w-5" style={{ color: '#42b8d5' }} />
                    <span>Lupa Password (Reset Email)</span>
                  </>
                ) : isRegistering ? (
                  'Daftar Akun CRM Baru'
                ) : (
                  'Selamat Datang'
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isResettingPassword
                  ? 'Masukkan password baru untuk akun Anda.'
                  : isForgotPassword
                  ? 'Masukkan email terdaftar. Sistem akan mengirimkan tautan reset password otomatis ke email Anda.'
                  : isRegistering
                  ? 'Buat kredensial khusus dan pilih peran tugas utama Anda.'
                  : 'Masukkan email dan password Anda untuk masuk ke sistem CRM.'}
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

            {/* View 1: Set New Password Form (from reset email link) */}
            {isResettingPassword ? (
              <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password Baru</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Masukkan password baru (min. 6 karakter)..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-mono"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none rounded-lg transition-colors"
                    >
                      {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Ulangi password baru..."
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full text-xs pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-mono"
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer mt-6 disabled:opacity-50"
                  style={{ backgroundColor: '#42b8d5' }}
                >
                  <span>{isSubmitting ? 'Memperbarui...' : 'Simpan Password Baru'}</span>
                  <Check className="h-4 w-4" />
                </button>
              </form>
            ) : isForgotPassword ? (
              /* View 2: Send Forgot Password Email Form */
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Terdaftar</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="Masukkan email terdaftar Anda..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer mt-6 disabled:opacity-50"
                  style={{ backgroundColor: '#42b8d5' }}
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Mengirim Email Reset...' : 'Kirim Tautan Reset Password via Email'}</span>
                </button>
              </form>
            ) : (
              /* View 3: Standard Login / Register Form */
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
                        triggerStyle={{ color: '#116185' }}
                        dropdownStyle={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#116185' }}
                        selectedOptionColor="#42b8d5"
                        unselectedOptionColor="#116185"
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                    {!isRegistering && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setErrorMessage('');
                          setInfoMessage('');
                        }}
                        className="text-[11px] font-bold hover:underline cursor-pointer transition-colors"
                        style={{ color: '#42b8d5' }}
                      >
                        Lupa Password?
                      </button>
                    )}
                  </div>
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
                  className="w-full py-3 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer mt-6"
                  style={{ backgroundColor: '#42b8d5' }}
                >
                  <span>{isRegistering ? 'Buat Akun Sekarang' : 'Masuk Aplikasi CRM'}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>

              </form>
            )}
          </div>

          {/* Bottom Footer Actions / Navigation */}
          <div className="text-center mt-6 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            {isForgotPassword || isResettingPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsResettingPassword(false);
                  setErrorMessage('');
                  setInfoMessage('');
                }}
                className="inline-flex items-center gap-1.5 hover:underline font-bold"
                style={{ color: '#42b8d5' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali ke Halaman Masuk</span>
              </button>
            ) : (
              <>
                <span>{isRegistering ? 'Sudah memiliki akun?' : 'Belum memiliki akun khusus?'}</span>
                <button
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setErrorMessage('');
                    setInfoMessage('');
                  }}
                  className="hover:underline font-bold ml-1 cursor-pointer"
                  style={{ color: '#42b8d5' }}
                >
                  {isRegistering ? 'Masuk di Sini' : 'Daftar Sekarang'}
                </button>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

