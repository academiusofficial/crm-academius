import React, { useState } from 'react';
import { MentoringStage, CustomChecklistItem } from '../types';
import { Plus, Trash2, ClipboardList, RefreshCw, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface ChecklistSettingsProps {
  checklistTemplates: CustomChecklistItem[];
  onAddTemplate: (stage: MentoringStage, text: string) => void;
  onDeleteTemplate: (id: string) => void;
  onUpdateTemplate: (id: string, text: string, stage?: MentoringStage) => void;
  onResetTemplates: () => void;
}

const STAGES: MentoringStage[] = [
  'Persiapan',
  'Fase 1',
  'Fase 2',
  'Fase 3',
  'Fase 4',
  'Hasil Akhir'
];

export default function ChecklistSettings({
  checklistTemplates,
  onAddTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
  onResetTemplates
 }: ChecklistSettingsProps) {
  const [formStage, setFormStage] = useState<MentoringStage>('Persiapan');
  const [formText, setFormText] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Confirmation States
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingStage, setEditingStage] = useState<MentoringStage>('Persiapan');

  const handleStartEdit = (item: CustomChecklistItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
    setEditingStage(item.stage);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    onUpdateTemplate(id, editingText.trim(), editingStage);
    setEditingId(null);
    setEditingText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;

    onAddTemplate(formStage, formText.trim());
    setFormText('');
    setSuccessMessage(`Berhasil menambahkan item checklist untuk ${formStage}!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getStageLabel = (stage: MentoringStage) => {
    switch (stage) {
      case 'Persiapan':
        return 'PERSIAPAN (PROPOSAL RISET)';
      case 'Fase 1':
        return 'FASE 1 (KELAS MENTORING)';
      case 'Fase 2':
        return 'FASE 2 (KELAS IELTS)';
      case 'Fase 3':
        return 'FASE 3 (KELENGKAPAN BERKAS)';
      case 'Fase 4':
        return 'FASE 4 (PENDAFTARAN LoA)';
      case 'Hasil Akhir':
        return 'HASIL AKHIR (LoA)';
      default:
        return stage;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="font-display font-bold text-2xl text-slate-800 dark:text-white">
                Pengaturan Checklist Alur Mentoring
              </h2>
              <p className="hidden">
                Konfigurasi daftar tugas otomatis (To-Do list) yang muncul pada setiap tahap pembimbingan student.
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Setel Ulang ke Default</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-400 text-xs font-medium rounded-xl animate-in fade-in duration-200">
          ✨ {successMessage}
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Column */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#1d293d] border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800/80">
              ➕ Tambah To-Do Checklist Baru
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 pt-0">
              <div className="space-y-1.5 mb-[5px]">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Pilih Alur Tahap
                </label>
                <CustomSelect
                  value={formStage}
                  onChange={(val) => setFormStage(val as MentoringStage)}
                  options={STAGES.map((stg) => ({
                    value: stg,
                    label: getStageLabel(stg)
                  }))}
                  className="border border-[#e2e8f0] rounded-lg w-full"
                />
              </div>

              <div className="space-y-1.5 mb-[5px]">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Deskripsi To-Do Pekerjaan
                </label>
                <textarea
                  rows={4}
                  placeholder="Contoh: Menyelesaikan draf essay, mengumpulkan berkas IELTS, mendaftar di portal universitas target..."
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#f8fafc] dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={!formText.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Simpan Ke Pengaturan Checklist</span>
              </button>
            </form>
          </div>
        </div>

        {/* Templates Visualizations Column */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-[#1d293d] border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Daftar Checklist Aktif Per Tahap ({checklistTemplates.length})
              </h3>
              <p className="hidden">
                Berikut adalah struktur checklist tugas yang terpasang. Perubahan akan langsung diaplikasikan pada Kanban Board Mentoring masing-masing student secara real-time.
              </p>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
              {STAGES.map((stg, idx) => {
                const stageItems = checklistTemplates.filter(item => item.stage === stg);
                
                // Style overrides based on focused design specifications
                const bgClass = idx === 0 
                  ? "bg-[#f8fafc] dark:bg-slate-900/30" 
                  : "bg-slate-50/50 dark:bg-slate-900/30";
                  
                const borderClass = "border-0";

                return (
                  <div key={stg} className={`${bgClass} ${borderClass} rounded-xl p-4 space-y-2.5`}>
                    <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/40 pb-2">
                      <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                        {getStageLabel(stg)}
                      </span>
                      <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100/50 dark:border-blue-900/40">
                        {stageItems.length} Checklist
                      </span>
                    </div>

                    {stageItems.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic pl-1">Belum ada tugas checklist untuk tahap ini.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {stageItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 text-xs bg-white dark:bg-[#15202e] hover:bg-slate-50 dark:hover:bg-slate-800/40 px-3.5 py-2 rounded-xl border border-[#e2e8f0] dark:border-slate-800/80 transition-colors"
                          >
                            {editingId === item.id ? (
                              <div className="flex-1 flex flex-col md:flex-row gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="flex-1 text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                                  placeholder="Edit deskripsi..."
                                  autoFocus
                                />
                                <div className="flex items-center gap-1 shrink-0 self-end md:self-auto">
                                  <button
                                    onClick={() => handleSaveEdit(item.id)}
                                    disabled={!editingText.trim()}
                                    className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                                    title="Simpan"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    title="Batal"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-1 flex-1">
                                  • {item.text}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleStartEdit(item)}
                                    className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                                    title="Ubah Checklist"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(item.id)}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                                    title="Hapus Checklist"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1d293d] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h4 className="font-display font-bold text-base">Hapus Item Checklist?</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus item checklist ini dari daftar template secara permanen? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteTemplate(deleteConfirmId);
                  setDeleteConfirmId(null);
                  setSuccessMessage('Item checklist berhasil dihapus.');
                  setTimeout(() => setSuccessMessage(''), 3000);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1d293d] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-3">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h4 className="font-display font-bold text-base">Setel Ulang Checklist?</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Apakah Anda yakin ingin menyetel ulang seluruh checklist ke default bawaan sistem? Semua checklist kustom yang Anda buat akan terhapus.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onResetTemplates();
                  setResetConfirmOpen(false);
                  setSuccessMessage('Seluruh template checklist berhasil disetel ulang ke bawaan sistem.');
                  setTimeout(() => setSuccessMessage(''), 3000);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Setel Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
