import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Search, 
  AlertTriangle,
  UserPlus,
  RefreshCw,
  Clock
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { getUserProfiles, saveUserProfile, deleteUserProfile } from '../supabaseService';

interface ManageAccountsProps {
  currentUserEmail?: string;
  onAddLog?: (actionText: string) => void;
  onProfileUpdated?: (updatedProfile: UserProfile) => void;
}

export default function ManageAccounts({ currentUserEmail, onAddLog, onProfileUpdated }: ManageAccountsProps) {
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Modal Edit state
  const [editingAccount, setEditingAccount] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Staff CRM');
  const [editApproved, setEditApproved] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Modal Delete State
  const [deletingAccount, setDeletingAccount] = useState<UserProfile | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getUserProfiles();
      setAccounts(data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat daftar akun.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleEditClick = (account: UserProfile) => {
    setEditingAccount(account);
    setEditName(account.displayName);
    setEditEmail(account.email);
    setEditRole(account.role);
    setEditApproved(account.isApproved !== false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleToggleApproval = async (account: UserProfile) => {
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updatedProfile: UserProfile = {
        ...account,
        isApproved: !account.isApproved
      };
      await saveUserProfile(updatedProfile);
      setAccounts(prev => prev.map(acc => acc.uid === account.uid ? updatedProfile : acc));
      const statusText = updatedProfile.isApproved ? 'disetujui' : 'ditunda kembali';
      setSuccessMsg(`Akun ${account.displayName} berhasil ${statusText}.`);
      if (onAddLog) {
        onAddLog(`Mengubah status persetujuan akun ${account.displayName} menjadi ${updatedProfile.isApproved ? 'DISETUJUI' : 'PENDING'}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengubah status persetujuan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedName || !trimmedEmail) {
      setErrorMsg('Nama lengkap dan Email wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updatedProfile: UserProfile = {
        ...editingAccount,
        displayName: trimmedName,
        email: trimmedEmail,
        role: editRole,
        isApproved: editApproved
      };

      await saveUserProfile(updatedProfile);
      
      // Update local state
      setAccounts(prev => prev.map(acc => acc.uid === editingAccount.uid ? updatedProfile : acc));
      setSuccessMsg(`Berhasil memperbarui profil akun ${trimmedName}.`);
      setEditingAccount(null);

      if (onAddLog) {
        onAddLog(`Memperbarui profil akun: ${trimmedName} (${editRole})`);
      }

      // Automatically update the user session if their own profile or any profile role gets updated
      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleDeleteConfirm = async () => {
    if (!deletingAccount) return;

    if (deletingAccount.email.toLowerCase() === currentUserEmail?.toLowerCase()) {
      setErrorMsg('Anda tidak dapat menghapus akun Anda sendiri.');
      setDeletingAccount(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteUserProfile(deletingAccount.uid);
      setAccounts(prev => prev.filter(acc => acc.uid !== deletingAccount.uid));
      setSuccessMsg(`Berhasil menghapus akun ${deletingAccount.displayName}.`);
      
      if (onAddLog) {
        onAddLog(`Menghapus akun CRM: ${deletingAccount.displayName} (${deletingAccount.email})`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus akun.');
    } finally {
      setIsSubmitting(false);
      setDeletingAccount(null);
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const q = searchQuery.toLowerCase();
    return (
      acc.displayName.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-800 dark:text-white flex items-center gap-2">
            <span>Kelola Akun Sistem CRM</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Hak istimewa Admin CRM untuk mengelola akun staf, menetapkan peran/role, dan memperbarui informasi profil.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchAccounts}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition duration-150 cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          

        </div>
      </div>

      {/* Alerts */}
      <div className="empty:hidden space-y-3">
        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/30 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs font-semibold animate-in slide-in-from-top-2">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 rounded-2xl flex items-start gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in slide-in-from-top-2">
            <Check className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-600" />
            <p>{successMsg}</p>
          </div>
        )}
      </div>

      {/* Main Content Card with accounts list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Search Bar section */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama, email, atau role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
          <span className="text-[11px] text-slate-400 font-medium font-poppins ml-auto">
            Menampilkan {filteredAccounts.length} dari {accounts.length} akun terdaftar
          </span>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-xs text-slate-400">Sedang memuat data akun...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <User className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold">Tidak ada akun ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 pl-6">Profil Nama / Staf</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Peran / Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Aksi Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAccounts.map((account) => {
                  const isSelf = account.email.toLowerCase() === currentUserEmail?.toLowerCase();
                  
                  // Role badges style
                  let badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                  if (account.role === 'Admin CRM') {
                    badgeStyle = "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30";
                  } else if (account.role === 'Manager CRM') {
                    badgeStyle = "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30";
                  } else if (account.role === 'Staff CRM') {
                    badgeStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30";
                  }

                  return (
                    <tr 
                      key={account.uid}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors group"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center font-bold text-xs">
                            {account.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              {account.displayName}
                              {isSelf && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider scale-95">
                                  Anda
                                </span>
                              )}
                            </span>
                            {/* UID hidden for minimalist display */}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{account.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 ${badgeStyle}`}>
                          <Shield className="h-3 w-3" />
                          {account.role === 'Admin CRM' ? 'Admin CRM' : account.role === 'Manager CRM' ? 'Manager CRM' : 'Staff CRM'}
                        </span>
                      </td>
                      <td className="p-4">
                        {account.isApproved ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                            <Check className="h-3 w-3" />
                            Disetujui
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30">
                            <Clock className="h-3 w-3 animate-pulse" />
                            Tertunda
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleApproval(account)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              account.isApproved
                                ? 'hover:bg-amber-50 hover:text-amber-600 text-slate-400'
                                : 'hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 font-bold'
                            }`}
                            title={account.isApproved ? 'Tunda Persetujuan' : 'Setujui Akun'}
                          >
                            <Check className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleEditClick(account)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                            title="Edit Profil"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              if (isSelf) {
                                setErrorMsg('Anda tidak bisa menghapus akun login Anda saat ini.');
                                return;
                              }
                              setDeletingAccount(account);
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf 
                                ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' 
                                : 'hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600'
                            }`}
                            disabled={isSelf}
                            title={isSelf ? 'Tidak dapat menghapus diri sendiri' : 'Hapus Akun'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Edit Account */}
      {editingAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="font-display font-black text-base text-slate-800 dark:text-white">
                  Edit Profil Akun
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ubah data dasar personal dan hak penugasan level akses sistem.
                </p>
              </div>
              <button 
                onClick={() => setEditingAccount(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    placeholder="Contoh: Alim Bahri"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Alamat Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Peran / Role Akses</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Admin CRM', 'Manager CRM', 'Staff CRM'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all text-center ${
                        editRole === r
                          ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-300 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {r === 'Admin CRM' ? 'Admin CRM' : r === 'Manager CRM' ? 'Manager CRM' : 'Staff CRM'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  {editRole === 'Admin CRM' && '💡 Admin CRM memiliki akses global penuh mengontrol leads, tim, dan audit.'}
                  {editRole === 'Manager CRM' && '💡 Manager CRM memiliki kontrol penuh atas tim, leads, dan bypass kualifikasi.'}
                  {(editRole === 'Conslor' || editRole === 'Conselor' || editRole === 'Staff CRM') && '💡 Staff CRM dibatasi hanya mengelola data leads yang ada.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Status Persetujuan Akses</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditApproved(!editApproved)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editApproved ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        editApproved ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {editApproved ? 'Akun Disetujui (Aktif)' : 'Akun Ditunda (Membutuhkan Persetujuan)'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                >
                  {isSubmitting ? (
                    <div className="h-3 w-3 border-2 border-white/30 border-b-white rounded-full animate-spin" />
                  ) : <Check className="h-4 w-4" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal Delete Confirmation */}
      {deletingAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-2xl">
                <Trash2 className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-800 dark:text-white">Hapus Akun Staf</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Apakah Anda benar-benar yakin ingin menghapus akun staf{' '}
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    "{deletingAccount.displayName}"
                  </span>?
                  Tindakan ini tidak bisa dibatalkan dan pengguna tidak akan bisa masuk ke sistem kembali.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingAccount(null)}
                  className="flex-1 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1"
                >
                  {isSubmitting && <div className="h-3 w-3 border-2 border-white/30 border-b-white rounded-full animate-spin" />}
                  <span>Hapus Permanen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
