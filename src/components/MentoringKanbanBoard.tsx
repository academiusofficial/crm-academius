import React, { useState, useEffect } from 'react';
import { Lead, MentoringStage, UserRole, CustomChecklistItem, UserProfile } from '../types';
import { getUserProfiles } from '../supabaseService';
import { getLeadStatus, formatIDR } from '../utils';
import CustomSelect from './CustomSelect';
import { 
  ArrowRight, 
  User, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  FileCheck,
  Award,
  GraduationCap,
  ClipboardList,
  Search,
  Filter,
  Plus,
  Trash2,
  Check,
  SlidersHorizontal,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Target,
  FileSearch
} from 'lucide-react';

interface MentoringKanbanBoardProps {
  leads: Lead[];
  onMentoringStageChange: (leadId: string, newMentoringStage: MentoringStage) => void;
  onOpenLead: (leadId: string) => void;
  onSaveLead: (lead: Lead) => void;
  userRole: UserRole;
  isArsul?: boolean;
  checklistTemplates?: CustomChecklistItem[];
  userName?: string;
  onAddLog?: (leadId: string, actionText: string) => void;
}

const FALLBACK_CHECKLIST_TEMPLATES: CustomChecklistItem[] = [
  { id: 'persiapan_1', stage: 'Persiapan', text: 'Menyusun proposal riset berdasarkan template.' },
  { id: 'persiapan_2', stage: 'Persiapan', text: 'Mengunggah proposal ke Google Drive.' },
  { id: 'persiapan_3', stage: 'Persiapan', text: 'Mentor mempelajari proposal sebelum sesi.' },
  { id: 'fase1_1', stage: 'Fase 1', text: 'Penyusunan outline essay/personal statement.' },
  { id: 'fase1_2', stage: 'Fase 1', text: 'Review draf essay pertama bersama Mentor 1.' },
  { id: 'fase1_3', stage: 'Fase 1', text: 'Pembahasan surat rekomendasi akademik.' },
  { id: 'fase2_1', stage: 'Fase 2', text: 'Diagnostic Test IELTS awal.' },
  { id: 'fase2_2', stage: 'Fase 2', text: 'Sesi bimbingan Writing & Speaking (IELTS).' },
  { id: 'fase2_3', stage: 'Fase 2', text: 'Sesi bimbingan Listening & Reading (IELTS).' },
  { id: 'fase3_1', stage: 'Fase 3', text: 'Mengumpulkan sertifikat IELTS terbaru.' },
  { id: 'fase3_2', stage: 'Fase 3', text: 'Finalisasi draf CV, Essay, dan LoR.' },
  { id: 'fase4_1', stage: 'Fase 4', text: 'Submit aplikasi ke universitas target 1.' },
  { id: 'fase4_2', stage: 'Fase 4', text: 'Submit aplikasi ke universitas target 2.' },
  { id: 'hasilakhir_1', stage: 'Hasil Akhir', text: 'Menerima berkas LoA resmi.' },
  { id: 'hasilakhir_2', stage: 'Hasil Akhir', text: 'Unggah berkas LoA ke sistem portal CRM.' }
];

let globalDraggedMentoringLeadId: string | null = null;

export default function MentoringKanbanBoard({ 
  leads, 
  onMentoringStageChange, 
  onOpenLead, 
  onSaveLead,
  userRole, 
  isArsul,
  checklistTemplates = [],
  userName = 'Counselor',
  onAddLog
}: MentoringKanbanBoardProps) {

  const actualTemplates = checklistTemplates && checklistTemplates.length > 0 ? checklistTemplates : FALLBACK_CHECKLIST_TEMPLATES;

  const handleToggleChecklistItem = (lead: Lead, itemKey: string, isChecked: boolean) => {
    if (!onSaveLead) return;
    const currentChecklist = lead.mentoringChecklist || {};
    const updatedChecklist = {
      ...currentChecklist,
      [itemKey]: isChecked
    };

    const currentStage = lead.mentoringStage || 'Persiapan';
    const currentStageTemplates = actualTemplates.filter(t => t.stage === currentStage);

    const getToggleKey = (id: string) => {
      if (id === 'persiapan_1') return 'persiapan1';
      if (id === 'persiapan_2') return 'persiapan2';
      if (id === 'persiapan_3') return 'persiapan3';
      return id;
    };

    const allCompleted = currentStageTemplates.length > 0 && currentStageTemplates.every(template => {
      const toggleKey = getToggleKey(template.id);
      return !!updatedChecklist[toggleKey];
    });

    if (isChecked && allCompleted) {
      const STAGES_ORDER: MentoringStage[] = ['Persiapan', 'Fase 1', 'Fase 2', 'Fase 3', 'Fase 4', 'Hasil Akhir'];
      const currentIndex = STAGES_ORDER.indexOf(currentStage);
      if (currentIndex !== -1 && currentIndex < STAGES_ORDER.length - 1) {
        const nextStage = STAGES_ORDER[currentIndex + 1];
        
        const updatedLead: Lead = {
          ...lead,
          mentoringStage: nextStage,
          mentoringChecklist: updatedChecklist,
          lastUpdated: new Date().toISOString()
        };
        onSaveLead(updatedLead);

        if (onAddLog) {
          onAddLog(lead.id, `Aktivitas mentoring "${itemKey}" diselesaikan.`);
          onAddLog(lead.id, `🎉 Semua checklist untuk tahap "${currentStage}" telah selesai! Sistem secara otomatis memindahkan status mentoring ${lead.namaLengkap} ke tahap berikutnya: "${nextStage}".`);
        }
      } else {
        const updatedLead: Lead = {
          ...lead,
          mentoringChecklist: updatedChecklist,
          lastUpdated: new Date().toISOString()
        };
        onSaveLead(updatedLead);
        if (onAddLog) {
          onAddLog(lead.id, `Aktivitas mentoring "${itemKey}" diselesaikan.`);
        }
      }
    } else {
      const updatedLead: Lead = {
        ...lead,
        mentoringChecklist: updatedChecklist,
        lastUpdated: new Date().toISOString()
      };
      onSaveLead(updatedLead);
      if (onAddLog) {
        onAddLog(lead.id, `${isChecked ? 'Menyelesaikan' : 'Membatalkan penyelesaian'} aktivitas mentoring "${itemKey}".`);
      }
    }
  };

  const handleRemoveFromMentoring = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !onSaveLead) return;
    const updatedLead: Lead = {
      ...lead,
      excludeFromMentoring: true,
      lastUpdated: new Date().toISOString()
    };
    onSaveLead(updatedLead);
  };

  // Filter leads to show only those with sales stage 'Completed' and not excluded
  const completedLeads = leads.filter(l => l.stage === 'Completed' && !l.excludeFromMentoring);

  const stages: MentoringStage[] = [
    'Persiapan',
    'Fase 1',
    'Fase 2',
    'Fase 3',
    'Fase 4',
    'Hasil Akhir'
  ];

  // Drag States for styling
  const [activeOverStage, setActiveOverStage] = useState<MentoringStage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Advanced Filter States (aligned with LeadsTable)
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPic, setFilterPic] = useState<string>('ALL');
  const [filterCountry, setFilterCountry] = useState<string>('ALL');
  const [filterProduct, setFilterProduct] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterAge, setFilterAge] = useState<string>('ALL');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [hoveredDetailId, setHoveredDetailId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    getUserProfiles()
      .then((data) => {
        if (data) setProfiles(data);
      })
      .catch((err) => console.warn('Gagal memuat profil untuk pencarian role:', err));
  }, []);

  const getPicRole = (picName: string): string => {
    if (!picName || picName === 'Unassigned') return '';
    const cleanPicName = picName.includes('|') ? picName.split('|')[0] : picName;
    
    // Find matching profile by displayName
    const matchedProfile = profiles.find(p => p.displayName.toLowerCase() === cleanPicName.toLowerCase());
    if (matchedProfile) {
      const r = matchedProfile.role;
      if (r === 'Admin CRM') return 'Admin CRM';
      if (r === 'Manager') return 'Manager CRM';
      return 'Staff CRM';
    }
    
    // Fallback heuristic check if not found in db profiles
    const lowerName = cleanPicName.toLowerCase();
    if (lowerName.includes('manager')) return 'Manager CRM';
    if (lowerName.includes('admin') || lowerName.includes('owner')) return 'Admin CRM';
    return 'Staff CRM'; // Default to Staff CRM role
  };

  const getPicInfo = (lead: Lead) => {
    let name = '';
    let role = '';
    let phone = '';

    if (lead.pic && lead.pic !== 'Unassigned') {
      const parts = lead.pic.split('|');
      name = parts[0];
      role = getPicRole(lead.pic);
      if (parts[1]) {
        phone = parts[1];
      }
    } else {
      // Unassigned fallback to creator or Academius/Admin CRM
      name = lead.creator_name || 'Academius';
      const rawRole = lead.creator_role || 'Admin CRM';
      role = rawRole === 'Admin CRM' ? 'Admin CRM' : rawRole === 'Manager' ? 'Manager CRM' : 'Staff CRM';
    }

    return { name, role, phone };
  };

  // Read advisors list
  const advisors = React.useMemo<string[]>(() => {
    const saved = localStorage.getItem('academius_advisors');
    return saved ? JSON.parse(saved) : [];
  }, []);

  // Unique options across all sources for filters (matching LeadsTable exactly)
  const picOptions = React.useMemo(() => {
    const rawOptions = [
      ...advisors,
      ...completedLeads.map(l => l.pic || 'Unassigned'),
      ...profiles.map(p => p.displayName)
    ];
    
    const uniqueMap = new Map<string, string>();
    rawOptions.forEach(p => {
      if (!p || p === 'Unassigned') return;
      const cleanName = p.includes('|') ? p.split('|')[0] : p;
      const existing = uniqueMap.get(cleanName);
      if (!existing || (!existing.includes('|') && p.includes('|'))) {
        uniqueMap.set(cleanName, p);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [advisors, completedLeads, profiles]);

  const countryOptions = React.useMemo(() => {
    return Array.from(new Set(completedLeads.map(l => l.targetNegara).filter(Boolean))).sort();
  }, [completedLeads]);

  const productOptions = React.useMemo(() => {
    return Array.from(new Set(completedLeads.map(l => l.produkDiminati).filter(Boolean))).sort();
  }, [completedLeads]);

  const sourceOptions = React.useMemo(() => {
    return Array.from(new Set(completedLeads.map(l => l.sumberLeads).filter(Boolean))).sort();
  }, [completedLeads]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterPic('ALL');
    setFilterCountry('ALL');
    setFilterProduct('ALL');
    setFilterSource('ALL');
    setFilterAge('ALL');
  };

  const isAnyFilterActive = 
    searchTerm !== '' ||
    filterStatus !== 'ALL' ||
    filterPic !== 'ALL' ||
    filterCountry !== 'ALL' ||
    filterProduct !== 'ALL' ||
    filterSource !== 'ALL' ||
    filterAge !== 'ALL';

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    globalDraggedMentoringLeadId = id;
  };

  const handleDragOver = (e: React.DragEvent, stage: MentoringStage) => {
    e.preventDefault();
    setActiveOverStage(stage);
  };

  const handleDragLeave = () => {
    setActiveOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: MentoringStage) => {
    e.preventDefault();
    setActiveOverStage(null);
    const leadId = e.dataTransfer.getData('text/plain') || globalDraggedMentoringLeadId;
    if (leadId) {
      onMentoringStageChange(leadId, targetStage);
    }
    globalDraggedMentoringLeadId = null;
  };

  // Touch Screen Drag and Drop Handlers for Mobile compatibility
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    globalDraggedMentoringLeadId = id;
  };

  const handleTouchEnd = (e: React.TouchEvent, currentStage: MentoringStage) => {
    if (!globalDraggedMentoringLeadId) return;
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const column = element?.closest('[data-stage]');
    if (column) {
      const targetStage = column.getAttribute('data-stage') as MentoringStage;
      if (targetStage && targetStage !== currentStage) {
        onMentoringStageChange(globalDraggedMentoringLeadId, targetStage);
      }
    }
    globalDraggedMentoringLeadId = null;
  };

  const getStageSubtitleColor = (stage: MentoringStage) => {
    switch (stage) {
      case 'Persiapan': return '#00bba7';
      case 'Fase 1': return '#2b7fff';
      case 'Fase 2': return '#00b8db';
      case 'Fase 3': return '#615fff';
      case 'Fase 4': return '#7f22fe';
      case 'Hasil Akhir': return '#1d293d';
      default: return '#64748b';
    }
  };

  // Get Column Colors and info matching the Alur Proses Mentoring image
  const getStageHeaderStyles = (stage: MentoringStage) => {
    switch (stage) {
      case 'Persiapan':
        return {
          borderClass: 'border-t-teal-500',
          bgClass: 'bg-teal-50 dark:bg-teal-950/10',
          textClass: 'text-teal-700 dark:text-teal-400',
          badge: 'PROPOSAL RISET',
          icon: BookOpen,
          summary: 'Proposal riset wajib diselesaikan oleh student sebelum memulai kelas.'
        };
      case 'Fase 1':
        return {
          borderClass: 'border-t-blue-500',
          bgClass: 'bg-blue-50 dark:bg-blue-950/10',
          textClass: 'text-blue-700 dark:text-blue-400',
          badge: 'KELAS MENTORING',
          icon: GraduationCap,
          summary: 'Total 6 kali pertemuan (Mentor 1: 2x, Mentor 2: 4x).'
        };
      case 'Fase 2':
        return {
          borderClass: 'border-t-cyan-500',
          bgClass: 'bg-cyan-50 dark:bg-cyan-950/10',
          textClass: 'text-cyan-700 dark:text-cyan-400',
          badge: 'KELAS IELTS',
          icon: ClipboardList,
          summary: 'Total 20 kali pertemuan untuk mengoptimalkan IELTS score.'
        };
      case 'Fase 3':
        return {
          borderClass: 'border-t-indigo-500',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/10',
          textClass: 'text-indigo-700 dark:text-indigo-400',
          badge: 'KELENGKAPAN BERKAS',
          icon: FileCheck,
          summary: 'Mengumpulkan berkas & revisi perbaikan pendaftaran.'
        };
      case 'Fase 4':
        return {
          borderClass: 'border-t-violet-600',
          bgClass: 'bg-violet-50 dark:bg-violet-950/10',
          textClass: 'text-violet-700 dark:text-violet-400',
          badge: 'PENDAFTARAN LoA',
          icon: Award,
          summary: 'Proses pendaftaran universitas dikerjakan oleh Admin Academius.'
        };
      case 'Hasil Akhir':
        return {
          borderClass: 'border-t-slate-800',
          bgClass: 'bg-slate-100 dark:bg-slate-800/40',
          textClass: 'text-slate-800 dark:text-slate-300',
          badge: 'HASIL AKHIR (LoA)',
          icon: CheckCircle2,
          summary: 'Penerbitan LoA Conditional atau LoA Unconditional.'
        };
      default:
        return {
          borderClass: 'border-t-slate-300',
          bgClass: 'bg-slate-50',
          textClass: 'text-slate-600',
          badge: '',
          icon: GraduationCap,
          summary: ''
        };
    }
  };

  // Render tiny badge for BANT Category
  const getBantSymbol = (status: string) => {
    switch (status) {
      case 'HOT':
        return <span className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 text-[9px] font-extrabold px-1.5 py-0.5 rounded">🔥 HOT</span>;
      case 'WARM':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 text-[9px] font-extrabold px-1.5 py-0.5 rounded">🌤 WARM</span>;
      case 'COLD':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 text-[9px] font-extrabold px-1.5 py-0.5 rounded">❄ COLD</span>;
      case 'REAKTIVASI':
        return <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/50 text-[9px] font-extrabold px-1.5 py-0.5 rounded">🔄 RECT</span>;
      default:
        return null;
    }
  };

  // Filter leads dynamically based on active filters
  const filteredLeads = React.useMemo(() => {
    return completedLeads.filter(lead => {
      // 1. Search Match
      const searchMatch = !searchTerm ? true : (
        lead.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
        lead.leadId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.kota && lead.kota.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.pic && lead.pic.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // 2. Status BANT (using getLeadStatus helper)
      const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
      const statusMatch = filterStatus === 'ALL' || status === filterStatus;

      // 3. Pendaftar (PIC Advisor)
      const picMatch = filterPic === 'ALL' || 
        lead.pic === filterPic || 
        (lead.pic && filterPic && lead.pic.split('|')[0] === filterPic.split('|')[0]) ||
        (filterPic === 'Unassigned' && !lead.pic);

      // 4. Target Negara
      const countryMatch = filterCountry === 'ALL' || lead.targetNegara === filterCountry;

      // 5. Produk Diminati
      const productMatch = filterProduct === 'ALL' || lead.produkDiminati === filterProduct;

      // 6. Sumber Leads
      const sourceMatch = filterSource === 'ALL' || lead.sumberLeads === filterSource;

      // 7. Usia Lead
      let ageMatch = true;
      if (filterAge !== 'ALL') {
        const masukDate = new Date(lead.tanggalMasuk);
        const diffTime = Date.now() - masukDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (filterAge === 'TODAY') {
          ageMatch = diffDays < 1;
        } else if (filterAge === 'UNDER_3') {
          ageMatch = diffDays < 3;
        } else if (filterAge === 'UNDER_7') {
          ageMatch = diffDays < 7;
        } else if (filterAge === 'UNDER_14') {
          ageMatch = diffDays < 14;
        } else if (filterAge === 'UNDER_30') {
          ageMatch = diffDays < 30;
        } else if (filterAge === 'OVER_30') {
          ageMatch = diffDays >= 30;
        }
      }

      return searchMatch && statusMatch && picMatch && countryMatch && productMatch && sourceMatch && ageMatch;
    });
  }, [completedLeads, searchTerm, filterStatus, filterPic, filterCountry, filterProduct, filterSource, filterAge]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 font-sans">
      
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="font-display font-bold text-2xl dark:text-white" style={{ color: '#136386' }}>
                Kanban Pipeline (Mentoring)
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                Pindahkan leads antar status secara interaktif. Seret (Drag) kartu lead dan lepas (Drop) ke status berikutnya.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Advanced Toggle Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Cari nama, ID, domisili, PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showAdvanced || isAnyFilterActive
                ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400'
                : 'bg-white border-[#e2e8f0] text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter Lanjutan</span>
            {isAnyFilterActive && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-white dark:bg-[#1d293d] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-2 duration-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Kriteria Filter Siswa Mentoring
            </h3>
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Semua Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 font-sans">
            {/* Status BANT Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">STATUS BANT</label>
              <CustomSelect
                id="filter-status-select"
                value={filterStatus}
                onChange={(val) => setFilterStatus(val)}
                options={[
                  { value: 'ALL', label: 'Semua Status' },
                  { value: 'HOT', label: '🔥 HOT' },
                  { value: 'WARM', label: '🌤 WARM' },
                  { value: 'COLD', label: '❄ COLD' },
                  { value: 'REAKTIVASI', label: '🔄 REAKTIVASI' }
                ]}
              />
            </div>

            {/* Pendaftar PIC Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PENDAFTAR</label>
              <CustomSelect
                id="filter-pic-select"
                value={filterPic}
                onChange={(val) => setFilterPic(val)}
                options={[
                  { value: 'ALL', label: 'Semua Pendaftar' },
                  ...picOptions.map(p => ({
                    value: p,
                    label: p.includes('|') ? p.split('|')[0] : p
                  }))
                ]}
              />
            </div>

            {/* Target Negara */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TARGET NEGARA</label>
              <CustomSelect
                id="filter-country-select"
                value={filterCountry}
                onChange={(val) => setFilterCountry(val)}
                options={[
                  { value: 'ALL', label: 'Semua Negara' },
                  ...countryOptions.map(negara => ({ value: negara, label: negara }))
                ]}
              />
            </div>

            {/* Produk Diminati */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PRODUK DIMINATI</label>
              <CustomSelect
                id="filter-product-select"
                value={filterProduct}
                onChange={(val) => setFilterProduct(val)}
                options={[
                  { value: 'ALL', label: 'Semua Produk' },
                  ...productOptions.map(produk => ({ value: produk, label: produk }))
                ]}
              />
            </div>

            {/* Sumber Leads */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SUMBER LEAD</label>
              <CustomSelect
                id="filter-source-select"
                value={filterSource}
                onChange={(val) => setFilterSource(val)}
                options={[
                  { value: 'ALL', label: 'Semua Sumber' },
                  ...sourceOptions.map(sumber => ({ value: sumber, label: sumber }))
                ]}
              />
            </div>

            {/* Usia Leads */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">USIA LEAD</label>
              <CustomSelect
                id="filter-age-select"
                value={filterAge}
                onChange={(val) => setFilterAge(val)}
                options={[
                  { value: 'ALL', label: 'Semua Usia Lead' },
                  { value: 'TODAY', label: 'Baru Hari Ini (< 1 hari)' },
                  { value: 'UNDER_3', label: '< 3 Hari' },
                  { value: 'UNDER_7', label: '< 7 Hari' },
                  { value: 'UNDER_14', label: '< 14 Hari' },
                  { value: 'UNDER_30', label: '< 30 Hari' },
                  { value: 'OVER_30', label: '≥ 30 Hari' }
                ]}
              />
            </div>
          </div>
        </div>
      )}



      {/* Board Columns Viewport container */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 scrollbar-thin">
        {stages.map((stage) => {
          // Get specific config for this column
          const stageConfig = getStageHeaderStyles(stage);
          const ColumnIcon = stageConfig.icon;

          // Filter leads belonging to this mentoring stage (default empty is treated as 'Persiapan')
          const stageLeads = filteredLeads.filter(l => {
            const currentMStage = l.mentoringStage || 'Persiapan';
            return currentMStage === stage;
          });

          const isOverThisColumn = activeOverStage === stage;

          return (
            <div
              key={stage}
              data-stage={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
              className={`w-80 shrink-0 bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/80 transition-all duration-150 flex flex-col ${
                isOverThisColumn 
                  ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/10 scale-[1.01]' 
                  : ''
              }`}
            >
              {/* Column Header */}
              <div className={`border-t-4 ${stageConfig.borderClass} pt-3.5 mb-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <ColumnIcon className={`h-4 w-4 ${stageConfig.textClass}`} />
                      <h3 className="font-display font-bold text-[13px] text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        {stage}
                      </h3>
                    </div>
                    <span 
                      className="inline-block mt-1 bg-[#f8fafc] dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ color: getStageSubtitleColor(stage) }}
                    >
                      {stageConfig.badge}
                    </span>
                  </div>
                  <span 
                    className="text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono"
                    style={{ backgroundColor: getStageSubtitleColor(stage), color: '#f8fafc' }}
                  >
                    {stageLeads.length}
                  </span>
                </div>
                
                {/* Visual Column Summary Guide from image */}
                <p className="text-[10px] text-slate-400 dark:text-slate-400 italic mt-2.5 leading-relaxed bg-white dark:bg-slate-900/30 p-2 rounded-lg border border-slate-150/40 dark:border-slate-800">
                  {stageConfig.summary}
                </p>
              </div>

              {/* Column Body View list */}
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[400px] pr-1.5 scrollbar-thin">
                {stageLeads.length === 0 ? (
                  <div className="h-48 border border-dashed border-slate-200 dark:border-slate-800/50 rounded-xl flex flex-col items-center justify-center p-4 text-center bg-white/40 dark:bg-transparent">
                    <span className="text-[10px] font-semibold text-slate-400 italic">Seret student ke sini</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
                    const totalScore = lead.bant.budget + lead.bant.authority + lead.bant.need + lead.bant.timeline;

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onTouchStart={(e) => handleTouchStart(e, lead.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, stage)}
                        onClick={() => onOpenLead(lead.id)}
                        className="bg-white dark:bg-[#1d293d] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/70 hover:shadow-md cursor-grab active:cursor-grabbing group transition-all duration-150 select-none"
                      >
                        {/* ID + Tag */}
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900" 
                              style={{ color: getStageSubtitleColor(stage) }}
                            >
                              {new Date(lead.tanggalMasuk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span 
                              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded font-mono font-extrabold text-[9px] border border-slate-100 dark:border-slate-800" 
                              style={{ color: getStageSubtitleColor(stage) }}
                              title="Skor BANT"
                            >
                              Skor: {totalScore}
                            </span>
                          </div>
                          {getBantSymbol(status)}
                        </div>

                        {/* Name */}
                        <h4 className="font-display font-semibold text-[13px] text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight leading-snug mb-1.5">
                          {lead.namaLengkap}
                        </h4>

                        {/* Study & Target */}
                        <div className="flex items-start gap-1.5 text-[10px] text-slate-600 dark:text-slate-300 mt-1.5 whitespace-normal leading-relaxed">
                          <Target className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                          <span>{lead.jenjangStudi} {lead.targetNegara} &bull; <span className="font-semibold" style={{ color: '#000000' }}>{lead.produkDiminati}</span></span>
                        </div>

                        {/* PIC Advisor */}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 min-w-0">
                          <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <div className="flex items-center gap-1 min-w-0 flex-wrap">
                            {(() => {
                              const picInfo = getPicInfo(lead);
                              return (
                                <span className="font-semibold text-slate-800 dark:text-slate-100 text-[10px]">
                                  {picInfo.name} <span className="font-normal text-[#90a1b9] tracking-normal">({picInfo.role})</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>





                        {/* Dynamic Checklist Section inside Card */}
                        {(() => {
                          const stageTemplates = actualTemplates.filter(t => t.stage === stage);
                          if (stageTemplates.length === 0) return null;
                          return (
                            <div 
                              className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40" 
                              onClick={(e) => e.stopPropagation()} 
                              onDragStart={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchEnd={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <span 
                                className="text-[10px] font-bold block mb-2 tracking-wide uppercase"
                                style={{ color: getStageSubtitleColor(stage) }}
                              >
                                Checklist {stage === 'Hasil Akhir' ? 'Hasil Akhir (LoA)' : stage}:
                              </span>
                              <div className="space-y-2">
                                {stageTemplates.map((template) => {
                                  // Map old hardcoded fields or use item.id directly
                                  const isChecked = !!lead.mentoringChecklist?.[template.id] ||
                                    (template.id === 'persiapan_1' && !!lead.mentoringChecklist?.persiapan1) ||
                                    (template.id === 'persiapan_2' && !!lead.mentoringChecklist?.persiapan2) ||
                                    (template.id === 'persiapan_3' && !!lead.mentoringChecklist?.persiapan3);

                                  const toggleKey = (template.id === 'persiapan_1') ? 'persiapan1' :
                                                    (template.id === 'persiapan_2') ? 'persiapan2' :
                                                    (template.id === 'persiapan_3') ? 'persiapan3' : template.id;

                                  return (
                                    <label 
                                      key={template.id} 
                                      className="flex items-start gap-2 text-[10px] text-slate-600 dark:text-slate-350 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onTouchStart={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleToggleChecklistItem(lead, toggleKey, e.target.checked);
                                        }}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer accent-blue-600 shrink-0"
                                      />
                                      <span className={isChecked ? "line-through text-slate-400 dark:text-slate-550" : ""}>
                                        {template.text}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Footer Card */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                          {/* PIC - Hidden per focus request */}
                          <div className="hidden items-center gap-1 text-[10px] text-slate-400 dark:text-slate-300 truncate max-w-[65%]">
                            <User className="h-3 w-3 inline text-slate-400 dark:text-slate-300 shrink-0" />
                            <span className="font-semibold truncate">
                              {lead.pic && lead.pic.includes('|') ? lead.pic.split('|')[0] : (lead.pic || 'Unassigned')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmationId(lead.id);
                              }}
                              className="p-1 text-[#ff6467] hover:bg-red-50/80 dark:hover:bg-red-950/25 rounded-lg transition-colors cursor-pointer"
                              style={{ color: '#ff6467' }}
                              title="Hapus dari Pipeline Mentoring"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenLead(lead.id);
                              }}
                              onMouseEnter={() => setHoveredDetailId(lead.id)}
                              onMouseLeave={() => setHoveredDetailId(null)}
                              className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 shrink-0 cursor-pointer"
                              style={{
                                borderWidth: '0px',
                                backgroundColor: hoveredDetailId === lead.id ? '#eff6ff' : '#ffffff',
                                borderStyle: 'solid',
                                borderColor: hoveredDetailId === lead.id ? '#bfdbfe' : '#f1f5f9',
                                color: hoveredDetailId === lead.id ? '#1d4ed8' : '#2563eb'
                              }}
                            >
                              <FileSearch className="h-3 w-3" />
                              <span style={{ fontWeight: 'normal' }}>Detail</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State Help Guide when zero leads in Completed */}
      {completedLeads.length === 0 && (
        <div className="text-center p-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl max-w-xl mx-auto space-y-3.5">
          <span className="text-4xl block">💡</span>
          <h4 className="font-display font-bold text-slate-800 dark:text-white">Belum Ada Student di Pipeline Mentoring</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Halaman ini menampilkan student program mentoring yang datanya diambil dari leads berstatus <span className="font-bold text-emerald-600">Completed</span> pada Sales Pipeline.
          </p>
          <div className="pt-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/45 px-3 py-1.5 rounded-full">
              Silakan pindahkan prospek di Kanban Pipeline ke tahap Completed terlebih dahulu.
            </span>
          </div>
        </div>
      )}

      {/* Delete/Remove Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 border border-slate-200/80 dark:border-slate-800/85 shadow-2xl animate-in zoom-in-95 duration-100 text-left">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl">
                <Trash2 className="h-6 w-6 animate-pulse" />
              </div>
              <div className="text-center">
                <h4 className="font-display font-bold text-base text-slate-800 dark:text-white">Hapus dari Mentoring</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin mengeluarkan siswa{' '}
                  <span className="font-bold text-red-600 dark:text-red-400">
                    "{leads.find((l) => l.id === deleteConfirmationId)?.namaLengkap}"
                  </span>{' '}
                  dari pipeline mentoring? Data leads di sales pipeline/CRM tetap aman dan utuh.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationId(null)}
                  className="flex-1 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200/50 dark:border-slate-700/50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmationId) {
                      handleRemoveFromMentoring(deleteConfirmationId);
                    }
                    setDeleteConfirmationId(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md shadow-red-500/10 transition cursor-pointer text-center"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
