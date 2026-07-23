import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface ManageAdvisorsModalProps {
  onClose: () => void;
  advisors: string[];
  onUpdateAdvisors: (newAdvisors: string[]) => void;
}

export default function ManageAdvisorsModal({ onClose, advisors, onUpdateAdvisors }: ManageAdvisorsModalProps) {
  const [newAdvisorName, setNewAdvisorName] = useState('');
  const [newAdvisorWhatsapp, setNewAdvisorWhatsapp] = useState('+62');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingWhatsapp, setEditingWhatsapp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newAdvisorName.trim();
    const trimmedWhatsapp = newAdvisorWhatsapp.trim();
    
    if (!trimmedName) {
      setErrorMsg('Nama advisor tidak boleh kosong');
      return;
    }
    
    // Check duplication based on name
    const nameExists = advisors.some(a => {
      const existingName = a.includes('|') ? a.split('|')[0] : a;
      return existingName.toLowerCase() === trimmedName.toLowerCase();
    });

    if (nameExists) {
      setErrorMsg('Nama advisor sudah terdaftar');
      return;
    }

    setErrorMsg('');
    const serialized = trimmedWhatsapp ? `${trimmedName}|${trimmedWhatsapp}` : trimmedName;
    const updated = [...advisors, serialized];
    onUpdateAdvisors(updated);
    setNewAdvisorName('');
    setNewAdvisorWhatsapp('+62');
  };

  const handleDelete = (indexToDelete: number) => {
    setDeleteIndex(indexToDelete);
  };

  const confirmDelete = () => {
    if (deleteIndex === null) return;
    const updated = advisors.filter((_, idx) => idx !== deleteIndex);
    onUpdateAdvisors(updated);
    if (editingIndex === deleteIndex) {
      setEditingIndex(null);
    }
    setDeleteIndex(null);
  };

  const handleStartEdit = (index: number) => {
    const item = advisors[index];
    const [name, whatsapp] = item.includes('|') ? item.split('|') : [item, ''];
    setEditingIndex(index);
    setEditingName(name);
    setEditingWhatsapp(whatsapp || '+62');
    setErrorMsg('');
  };

  const handleSaveEdit = (index: number) => {
    const trimmedName = editingName.trim();
    const trimmedWhatsapp = editingWhatsapp.trim();

    if (!trimmedName) {
      setErrorMsg('Nama advisor tidak boleh kosong');
      return;
    }

    // Check duplication with others
    const nameExists = advisors.some((a, idx) => {
      if (idx === index) return false;
      const existingName = a.includes('|') ? a.split('|')[0] : a;
      return existingName.toLowerCase() === trimmedName.toLowerCase();
    });

    if (nameExists) {
      setErrorMsg('Nama advisor sudah digunakan oleh PIC lain');
      return;
    }

    setErrorMsg('');
    const serialized = trimmedWhatsapp ? `${trimmedName}|${trimmedWhatsapp}` : trimmedName;
    const updated = [...advisors];
    updated[index] = serialized;
    onUpdateAdvisors(updated);
    setEditingIndex(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/45">
          <div>
            <h3 className="font-display font-bold text-base dark:text-white" style={{ color: '#116185' }}>
              Kelola PIC Advisor
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Tambah, edit, dan hapus daftar PIC penanggung jawab Lead beserta nomor WhatsApp.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form to Add */}
        <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nama PIC Advisor</label>
              <input
                type="text"
                placeholder="Masukkan nama advisor baru..."
                value={newAdvisorName}
                onChange={(e) => {
                  setNewAdvisorName(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nomor WhatsApp PIC</label>
              <input
                type="text"
                placeholder="+62812345678"
                value={newAdvisorWhatsapp}
                onChange={(e) => {
                  setNewAdvisorWhatsapp(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all duration-150 cursor-pointer"
              style={{ backgroundColor: '#42b8d5', borderWidth: '1px', borderStyle: 'solid', borderColor: '#42b8d5' }}
            >
              <Plus className="h-4 w-4" />
              <span>Tambah PIC Advisor</span>
            </button>
          </form>
          {errorMsg && (
            <p className="text-[11px] text-rose-500 font-medium mt-2 animate-in slide-in-from-top-1">
              ⚠️ {errorMsg}
            </p>
          )}
        </div>

        {/* Advisors List */}
        <div className="p-5 max-h-[280px] overflow-y-auto space-y-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block mb-1">
            Daftar PIC Aktif ({advisors.length})
          </span>
          
          {advisors.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl">
              Belum ada advisor terdaftar. Silakan tambahkan.
            </div>
          ) : (
            advisors.map((advisor, index) => {
              const [name, whatsapp] = advisor.includes('|') ? advisor.split('|') : [advisor, ''];
              return (
                <div 
                  key={index} 
                  className="flex items-start justify-between p-3 bg-slate-50/65 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-850 rounded-xl"
                >
                  {editingIndex === index ? (
                    <div className="flex-1 flex flex-col gap-2 mr-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Nama</label>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-850 dark:text-slate-150"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">WhatsApp</label>
                        <input
                          type="text"
                          value={editingWhatsapp}
                          onChange={(e) => setEditingWhatsapp(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-850 dark:text-slate-150 font-mono"
                        />
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Simpan</span>
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="p-1 px-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {name}
                      </p>
                      {whatsapp && (
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>📱</span> {whatsapp}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingIndex !== index && (
                      <button
                        onClick={() => handleStartEdit(index)}
                        className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title="Ubah PIC"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(index)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Advisor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info lock */}
        <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 border-t border-slate-150 dark:border-slate-850 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors duration-150 cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>

      {deleteIndex !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xs p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl animate-in zoom-in-95 duration-100/50">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-2.5 bg-rose-50 text-rose-600 dark:bg-rose-950/25 dark:text-rose-400 rounded-xl">
                <Trash2 className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">Hapus PIC Advisor</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Apakah Anda yakin ingin menghapus PIC Advisor{' '}
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    "{advisors[deleteIndex]?.includes('|') ? advisors[deleteIndex].split('|')[0] : advisors[deleteIndex]}"
                  </span>?
                </p>
              </div>
              <div className="flex items-center gap-2.5 w-full pt-1.5">
                <button
                  type="button"
                  onClick={() => setDeleteIndex(null)}
                  className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm transition cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
