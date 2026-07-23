import React, { useState, useEffect } from 'react';
import { Lead, PipelineStage, UserRole, UserProfile } from '../types';
import { getUserProfiles } from '../supabaseService';
import { getLeadStatus, formatIDR } from '../utils';
import CustomSelect from './CustomSelect';
import { 
  Flame, 
  ArrowRight, 
  User, 
  CircleDollarSign, 
  Trash2,
  Search,
  Filter,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ClipboardList,
  MessagesSquare,
  Handshake,
  CheckSquare,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Target,
  FileSearch
} from 'lucide-react';

interface KanbanBoardProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: PipelineStage) => void;
  onOpenLead: (leadId: string) => void;
  onDeleteLead?: (leadId: string) => void;
  userRole: UserRole;
  isArsul?: boolean;
}

let globalDraggedPipelineLeadId: string | null = null;

export default function KanbanBoard({ leads, onStageChange, onOpenLead, onDeleteLead, userRole, isArsul }: KanbanBoardProps) {
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
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

  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredDetailId, setHoveredDetailId] = useState<string | null>(null);

  // Advanced Filter States (aligned with LeadsTable)
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPic, setFilterPic] = useState<string>('ALL');
  const [filterCountry, setFilterCountry] = useState<string>('ALL');
  const [filterProduct, setFilterProduct] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterAge, setFilterAge] = useState<string>('ALL');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Read advisors list
  const advisors = React.useMemo<string[]>(() => {
    const saved = localStorage.getItem('academius_advisors');
    return saved ? JSON.parse(saved) : [];
  }, []);

  // Unique options across all sources for filters (matching LeadsTable exactly)
  const picOptions = React.useMemo(() => {
    const rawOptions = [
      ...advisors,
      ...leads.map(l => l.pic || 'Unassigned'),
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
  }, [advisors, leads, profiles]);

  const countryOptions = React.useMemo(() => {
    return Array.from(new Set(leads.map(l => l.targetNegara).filter(Boolean))).sort();
  }, [leads]);

  const productOptions = React.useMemo(() => {
    return Array.from(new Set(leads.map(l => l.produkDiminati).filter(Boolean))).sort();
  }, [leads]);

  const sourceOptions = React.useMemo(() => {
    return Array.from(new Set(leads.map(l => l.sumberLeads).filter(Boolean))).sort();
  }, [leads]);

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

  // Filter leads dynamically based on active filters
  const filteredLeads = React.useMemo(() => {
    return leads.filter(lead => {
      // 1. Search Query (matches name, ID, or city, or PIC)
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
  }, [leads, searchTerm, filterStatus, filterPic, filterCountry, filterProduct, filterSource, filterAge]);

  const stages: PipelineStage[] = [
    'New Lead',
    'Profiling',
    'Konsultasi',
    'Negotiation',
    'Enrolled',
    'Completed',
    'Lost',
    'Reaktivasi 60 Hari'
  ];

  // Drag States for styling
  const [activeOverStage, setActiveOverStage] = useState<PipelineStage | null>(null);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    globalDraggedPipelineLeadId = id;
  };

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    setActiveOverStage(stage);
  };

  const handleDragLeave = () => {
    setActiveOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    setActiveOverStage(null);
    const leadId = e.dataTransfer.getData('text/plain') || globalDraggedPipelineLeadId;
    if (leadId) {
      onStageChange(leadId, targetStage);
    }
    globalDraggedPipelineLeadId = null;
  };

  // Touch Screen Drag and Drop Handlers for Mobile compatibility
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    globalDraggedPipelineLeadId = id;
  };

  const handleTouchEnd = (e: React.TouchEvent, currentStage: PipelineStage) => {
    if (!globalDraggedPipelineLeadId) return;
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const column = element?.closest('[data-stage]');
    if (column) {
      const targetStage = column.getAttribute('data-stage') as PipelineStage;
      if (targetStage && targetStage !== currentStage) {
        onStageChange(globalDraggedPipelineLeadId, targetStage);
      }
    }
    globalDraggedPipelineLeadId = null;
  };

  // Prepare colors for each stage header bottom border
  const getStageColor = (stage: PipelineStage) => {
    switch (stage) {
      case 'New Lead': return 'border-t-blue-500';
      case 'Profiling': return 'border-t-sky-500';
      case 'Konsultasi': return 'border-t-pink-500';
      case 'Negotiation': return 'border-t-amber-500';
      case 'Enrolled': return 'border-t-emerald-500';
      case 'Completed': return 'border-t-sky-600';
      case 'Lost': return 'border-t-rose-500';
      case 'Reaktivasi 60 Hari': return 'border-t-indigo-500';
      default: return 'border-t-slate-300';
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

  const getStageIcon = (stage: PipelineStage) => {
    switch (stage) {
      case 'New Lead': return Sparkles;
      case 'Profiling': return ClipboardList;
      case 'Konsultasi': return MessagesSquare;
      case 'Negotiation': return Handshake;
      case 'Enrolled': return CheckSquare;
      case 'Completed': return CheckCircle2;
      case 'Lost': return XCircle;
      case 'Reaktivasi 60 Hari': return RefreshCw;
      default: return Sparkles;
    }
  };

  const getStageTextColor = (stage: PipelineStage) => {
    switch (stage) {
      case 'New Lead': return 'text-blue-500 dark:text-blue-400';
      case 'Profiling': return 'text-sky-500 dark:text-sky-400';
      case 'Konsultasi': return 'text-pink-500 dark:text-pink-400';
      case 'Negotiation': return 'text-amber-500 dark:text-amber-400';
      case 'Enrolled': return 'text-emerald-500 dark:text-emerald-400';
      case 'Completed': return 'text-sky-600 dark:text-sky-450';
      case 'Lost': return 'text-rose-500 dark:text-rose-400';
      case 'Reaktivasi 60 Hari': return 'text-indigo-500 dark:text-indigo-400';
      default: return 'text-slate-555';
    }
  };

  const getStageSubtitleColor = (stage: PipelineStage) => {
    switch (stage) {
      case 'New Lead': return '#2b7fff';
      case 'Profiling': return '#00a6f4';
      case 'Konsultasi': return '#f6339a';
      case 'Negotiation': return '#fe9a00';
      case 'Enrolled': return '#00bc7d';
      case 'Completed': return '#0084d1';
      case 'Lost': return '#ff2056';
      case 'Reaktivasi 60 Hari': return '#615fff';
      default: return '#64748b';
    }
  };

  const getStageSubtitle = (stage: PipelineStage) => {
    switch (stage) {
      case 'New Lead': return 'Perkenalan Program';
      case 'Profiling': return 'Pendaftaran Data Diri';
      case 'Konsultasi': return 'Tanya Jawab Program';
      case 'Negotiation': return 'Kesepakatan Harga';
      case 'Enrolled': return 'Pembayaran Program';
      case 'Completed': return 'Selesai';
      case 'Lost': return 'Leads Hilang';
      case 'Reaktivasi 60 Hari': return 'Aktivasi Kembali';
      default: return '';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Title & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 dark:text-white">
            Karban Pipeline (Sales)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Pindahkan leads antar status secara interaktif. Seret (Drag) kartu lead dan lepas (Drop) ke status berikutnya.
          </p>
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
              Kriteria Filter Sales Leads
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
          // Filter leads belonging to this stage
          const stageLeads = filteredLeads.filter(l => l.stage === stage);
          
          const isOverThisColumn = activeOverStage === stage;

          return (
            <div
              key={stage}
              data-stage={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
              className={`w-72 shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/40 dark:border-slate-800/85 transition-all duration-150 flex flex-col ${
                isOverThisColumn 
                  ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/10 scale-[1.01]' 
                  : ''
              }`}
            >
              {/* Column Header */}
              <div className={`border-t-4 ${getStageColor(stage)} pt-3.5 mb-4 flex flex-col justify-between`}>
                <div className="flex justify-between items-start pr-1">
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 truncate">
                      {React.createElement(getStageIcon(stage), {
                        className: `h-4 w-4 ${getStageTextColor(stage)} shrink-0`
                      })}
                      <h3 className="font-display font-bold text-[13px] text-slate-800 dark:text-slate-100 uppercase tracking-wider truncate">
                        {stage}
                      </h3>
                    </div>
                    {/* Subtitle */}
                    <div className="truncate pt-[5px]">
                      <span 
                        className="inline-block bg-[#f8fafc] dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider truncate"
                        style={{ color: getStageSubtitleColor(stage) }}
                      >
                        {getStageSubtitle(stage)}
                      </span>
                    </div>
                  </div>
                  <span 
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono shrink-0 mt-0.5"
                    style={{ backgroundColor: getStageSubtitleColor(stage), color: '#f8fafc' }}
                  >
                    {stageLeads.length}
                  </span>
                </div>
              </div>

              {/* Column Body View list */}
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[400px] pr-1.5 scrollbar-thin">
                {stageLeads.length === 0 ? (
                  <div className="h-48 border border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl flex items-center justify-center p-4 text-center">
                    <span className="text-[10px] font-semibold text-slate-400 italic">Seret lead ke sini</span>
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
                        className="bg-white dark:bg-[#1d293d] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/80 cursor-grab active:cursor-grabbing group select-none"
                      >
                        {/* ID + BANT */}
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
                        <h4 className="font-display font-semibold text-[13px] text-slate-900 dark:text-white tracking-tight leading-snug mb-1.5">
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

                        {/* Footer Card */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                          {/* PIC - Hidden per focus request */}
                          <div className="hidden items-center gap-1 text-[10px] text-slate-400 dark:text-slate-300 truncate max-w-[50%]">
                            <User className="h-3 w-3 inline text-slate-400 dark:text-slate-300 shrink-0" />
                            <span className="font-semibold truncate">
                              {lead.pic && lead.pic.includes('|') ? lead.pic.split('|')[0] : (lead.pic || 'Unassigned')}
                            </span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                            {onDeleteLead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmationId(lead.id);
                                }}
                                className="p-1.5 text-[#ff6467] dark:text-[#ff6467] hover:bg-red-50/80 dark:hover:bg-red-950/25 rounded-lg transition-colors cursor-pointer"
                                style={{ color: '#ff6467' }}
                                title="Hapus Lead"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-[#ff6467] dark:text-[#ff6467]" style={{ color: '#ff6467' }} />
                              </button>
                            )}
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

      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 border border-slate-200/80 dark:border-slate-800/85 shadow-2xl animate-in zoom-in-95 duration-100 text-left">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl">
                <Trash2 className="h-6 w-6 animate-pulse" />
              </div>
              <div className="text-center">
                <h4 className="font-display font-bold text-base text-slate-800 dark:text-white">Konfirmasi Penghapusan</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data lead{' '}
                  <span className="font-bold text-red-600 dark:text-red-400">
                    "{leads.find((l) => l.id === deleteConfirmationId)?.namaLengkap}"
                  </span>{' '}
                  ini secara permanen? Seluruh riwayat chat, log, dan tugas terkait akan terhapus dari database.
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
                    if (onDeleteLead && deleteConfirmationId) {
                      onDeleteLead(deleteConfirmationId);
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
