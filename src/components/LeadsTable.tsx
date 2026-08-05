import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff,
  FolderPlus,
  RefreshCw,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSearch
} from 'lucide-react';
import { Lead, LeadSource, StudyLevel, UserRole, UserProfile } from '../types';
import { getUserProfiles } from '../supabaseService';
import { getLeadStatus, formatIDR, exportToCSV, getWhatsAppLink } from '../utils';
import CustomSelect from './CustomSelect';

const calculateLeadAge = (dateStr: string) => {
  if (!dateStr) return '0 Hari';
  const createdDate = new Date(dateStr);
  if (isNaN(createdDate.getTime())) return '0 Hari';
  const today = new Date();
  const diffTime = today.getTime() - createdDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays < 0 ? 0 : diffDays} Hari`;
};

interface LeadsTableProps {
  leads: Lead[];
  onOpenLead: (leadId: string) => void;
  onAddLeadClick: () => void;
  onDeleteLead: (leadId: string) => void;
  userRole: UserRole;
  userName: string;
  advisors?: string[];
  isArsul?: boolean;
}

export default function LeadsTable({ 
  leads, 
  onOpenLead, 
  onAddLeadClick, 
  onDeleteLead, 
  userRole, 
  userName,
  advisors,
  isArsul
}: LeadsTableProps) {
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
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPic, setFilterPic] = useState<string>(() => {
    if (userRole === 'Staff CRM') {
      const matched = advisors?.find(a => {
        const namePart = a.includes('|') ? a.split('|')[0] : a;
        return namePart === userName;
      });
      return matched || userName;
    }
    return 'ALL';
  });

  useEffect(() => {
    if (userRole === 'Staff CRM') {
      const matched = advisors?.find(a => {
        const namePart = a.includes('|') ? a.split('|')[0] : a;
        return namePart === userName;
      });
      setFilterPic(matched || userName);
    } else {
      setFilterPic('ALL');
    }
  }, [userRole, userName, advisors]);
  const [filterCountry, setFilterCountry] = useState<string>('ALL');
  const [filterProduct, setFilterProduct] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterAge, setFilterAge] = useState<string>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showPotentialValue, setShowPotentialValue] = useState(false);
  const [individualVisiblePotentials, setIndividualVisiblePotentials] = useState<Record<string, boolean>>({});

  // Sorting States
  const [sortField, setSortField] = useState<'tanggalMasuk' | 'namaLengkap' | 'totalScore' | 'nilaiPotensi'>('tanggalMasuk');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('ALL');
    setFilterPic('ALL');
    setFilterCountry('ALL');
    setFilterProduct('ALL');
    setFilterSource('ALL');
    setFilterAge('ALL');
    setSortField('tanggalMasuk');
    setSortOrder('desc');
  };

  // Toggle sorting function
  const handleSort = (field: 'tanggalMasuk' | 'namaLengkap' | 'totalScore' | 'nilaiPotensi') => {
    if (field === 'nilaiPotensi' && !(isArsul || userRole === 'Admin CRM')) return; // Prevent sorting by potential value if not Admin CRM
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Get unique options across all leads, advisors, and profiles for filters
  const picOptions = React.useMemo(() => {
    const rawOptions = [
      ...(advisors || []),
      ...leads.map(l => l.pic || 'Unassigned'),
      ...profiles.map(p => p.displayName)
    ];
    
    // We want to avoid duplicate names (e.g. "Arsul Saputra" and "Arsul Saputra|08123...")
    // Let's group them by the clean name (before the '|' character)
    const uniqueMap = new Map<string, string>();
    rawOptions.forEach(p => {
      if (!p || p === 'Unassigned') return;
      const cleanName = p.includes('|') ? p.split('|')[0] : p;
      const existing = uniqueMap.get(cleanName);
      // If we already have an option with '|' (phone info), we prefer to keep that. Otherwise we overwrite or set.
      if (!existing || (!existing.includes('|') && p.includes('|'))) {
        uniqueMap.set(cleanName, p);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [advisors, leads, profiles]);

  const countryOptions = Array.from(new Set(leads.map(l => l.targetNegara))).filter(Boolean);
  const productOptions = Array.from(new Set(leads.map(l => l.produkDiminati))).filter(Boolean);
  const sourceOptions = Array.from(new Set(leads.map(l => l.sumberLeads))).filter(Boolean);

  // Filtrasi Logis
  const filteredLeads = leads.filter(lead => {
    const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
    
    // Search query match
    const searchMatch = 
      lead.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.leadId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.nomorWhatsApp.includes(searchQuery) ||
      lead.kota.toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatch = filterStatus === 'ALL' || status === filterStatus;
    const picMatch = filterPic === 'ALL' || 
      lead.pic === filterPic || 
      (lead.pic && filterPic && lead.pic.split('|')[0] === filterPic.split('|')[0]) ||
      (filterPic === 'Unassigned' && !lead.pic);
    const countryMatch = filterCountry === 'ALL' || lead.targetNegara === filterCountry;
    const productMatch = filterProduct === 'ALL' || lead.produkDiminati === filterProduct;
    const sourceMatch = filterSource === 'ALL' || lead.sumberLeads === filterSource;

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

  // Sorting Logis
  const sortedLeads = React.useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'tanggalMasuk') {
        valA = new Date(a.tanggalMasuk).getTime();
        valB = new Date(b.tanggalMasuk).getTime();
      } else if (sortField === 'namaLengkap') {
        valA = a.namaLengkap.toLowerCase();
        valB = b.namaLengkap.toLowerCase();
      } else if (sortField === 'totalScore') {
        valA = a.bant.budget + a.bant.authority + a.bant.need + a.bant.timeline;
        valB = b.bant.budget + b.bant.authority + b.bant.need + b.bant.timeline;
      } else if (sortField === 'nilaiPotensi') {
        valA = a.nilaiPotensi;
        valB = b.nilaiPotensi;
      } else {
        return 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLeads, sortField, sortOrder]);

  const handleExportCSV = () => {
    const leadsToExport = (isArsul || userRole === 'Admin CRM')
      ? sortedLeads
      : sortedLeads.map(l => ({ ...l, nilaiPotensi: 0 }));
    exportToCSV(leadsToExport, `Academius_Leads_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Helper for status badge styling
  const renderSortableHeader = (
    label: string, 
    field: 'tanggalMasuk' | 'namaLengkap' | 'totalScore' | 'nilaiPotensi',
    align: 'left' | 'center' | 'right' = 'left'
  ) => {
    const isSortedThis = sortField === field;
    const isDisabled = field === 'nilaiPotensi' && !(isArsul || userRole === 'Admin CRM');

    if (isDisabled) {
      return (
        <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span className="font-poppins text-left text-white">{label}</span>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleSort(field)}
        className={`group flex items-center gap-1.5 hover:text-white/80 transition-colors font-bold ${
          align === 'center' ? 'mx-auto justify-center' : align === 'right' ? 'ml-auto justify-end' : 'justify-start text-left'
        }`}
      >
        <span className="font-poppins text-left text-white">{label}</span>
        {isSortedThis ? (
          sortOrder === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-white" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-white" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-white/60 opacity-70 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HOT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40 animate-pulse">
            🔥 HOT
          </span>
        );
      case 'WARM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
            🌤 WARM
          </span>
        );
      case 'COLD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
            ❄ COLD
          </span>
        );
      case 'REAKTIVASI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            🔄 REAKTIVASI
          </span>
        );
      default:
        return null;
    }
  };

  // Helper for pipeline stages colors
  const getStageBadge = (stage: string) => {
    let color = '#2b7fff';
    const stageLower = (stage || '').toLowerCase();
    
    if (stageLower === 'new leads' || stageLower.includes('new')) color = '#2b7fff';
    else if (stageLower === 'profiling' || stageLower.includes('profil')) color = '#00a6f4';
    else if (stageLower === 'konsultasi' || stageLower.includes('konsul')) color = '#f6339a';
    else if (stageLower === 'negotiation' || stageLower.includes('negotia')) color = '#fe9a00';
    else if (stageLower === 'enrolled' || stageLower.includes('enroll')) color = '#00bc7d';
    else if (stageLower === 'completed' || stageLower.includes('complete')) color = '#0084d1';
    else if (stageLower === 'lost' || stageLower.includes('lost')) color = '#ff2056';
    else if (stageLower === 'reaktivasi 60 hari' || stageLower.includes('reaktivasi')) color = '#615fff';
    
    return (
      <span 
        className="inline-flex px-2 py-0.5 rounded text-xs font-semibold font-poppins bg-white dark:bg-slate-800" 
        style={{ color, lineHeight: '16px' }}
      >
        {stage}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Title & Sub-title Header */}
      <div>
        <h2 className="font-display font-bold text-lg sm:text-xl text-slate-800 dark:text-white" style={{ color: '#136386' }}>
          Leads Database
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Kelola seluruh data calon mahasiswa, status kualifikasi BANT, penetapan PIC sales konselor, dan riwayat interaksi secara terpusat.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 overflow-hidden">
      
      {/* Table Action Controls */}
      <div 
        className="p-3.5 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4"
        style={{ background: 'linear-gradient(90deg, #3EB2CF 0%, #15688A 100%)' }}
      >
        
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="lead-search-input"
            type="text"
            placeholder="Cari nama, WhatsApp, email, atau kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 text-slate-800 font-poppins shadow-xs placeholder:text-slate-400"
          />
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 md:flex md:items-center gap-2.5 w-full md:w-auto">
          {/* Advanced Sliders trigger */}
          <button
            id="advanced-filters-btn"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold font-poppins rounded-2xl border-0 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs col-span-1 md:w-auto ${
              showAdvancedFilters || filterStatus !== 'ALL' || filterPic !== 'ALL' || filterCountry !== 'ALL' || filterProduct !== 'ALL' || filterSource !== 'ALL' || filterAge !== 'ALL'
                ? 'bg-white text-[#136386] ring-2 ring-white/80'
                : 'bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-700" />
            <span className="font-semibold font-poppins">Filter Lanjutan</span>
          </button>

          {/* Export to CSV/Excel */}
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold font-poppins bg-[#e8fbf3] hover:bg-[#d5f7e8] text-[#047857] border-0 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs col-span-1 md:w-auto"
            title="Download CSV untuk Excel"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#047857]" />
            <span className="font-semibold font-poppins">Ekspor CSV</span>
          </button>

          {/* New Admission Lead button */}
          {(userRole === 'Admin CRM' || userRole === 'Staff CRM' || userRole === 'Manager CRM' || isArsul) && (
            <button
              id="add-lead-btn"
              onClick={onAddLeadClick}
              className="col-span-2 md:col-span-1 w-full md:w-auto px-4 py-2.5 text-xs sm:text-sm font-semibold font-poppins text-white shadow-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-white/20"
              style={{ backgroundColor: '#38b2d0' }}
            >
              <FolderPlus className="h-4 w-4 text-white" />
              <span className="font-semibold font-poppins">Input Lead Baru</span>
            </button>
          )}
        </div>

      </div>

      {/* Advanced Filter Panel drop down */}
      {(showAdvancedFilters) && (
        <div className="p-3.5 sm:p-6 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 font-sans animate-in slide-in-from-top-4 duration-200">
          
          {/* Status BANT Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Skor Kategori BANT</label>
            <CustomSelect
              id="filter-status-select"
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
              options={[
                { value: 'ALL', label: 'Semua Kategori BANT' },
                { value: 'HOT', label: '🔥 HOT (≥ 10)' },
                { value: 'WARM', label: '🌤 WARM (6-9)' },
                { value: 'COLD', label: '❄ COLD (≤ 5)' },
                { value: 'REAKTIVASI', label: '🔄 REAKTIVASI (> 60 hari)' }
              ]}
            />
          </div>

          {/* PIC Counselor Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">PENDAFTAR</label>
            <CustomSelect
              id="filter-pic-select"
              className="border-0"
              value={filterPic}
              onChange={(val) => setFilterPic(val)}
              disabled={userRole === 'Staff CRM'}
              options={
                userRole === 'Staff CRM'
                  ? [{ value: filterPic, label: userName }]
                  : [
                      { value: 'ALL', label: 'Semua Pendaftar' },
                      ...picOptions.map(p => ({
                        value: p,
                        label: p.includes('|') ? p.split('|')[0] : p
                      }))
                    ]
              }
            />
          </div>

          {/* Country Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Target Negara</label>
            <CustomSelect
              id="filter-country-select"
              value={filterCountry}
              onChange={(val) => setFilterCountry(val)}
              options={[
                { value: 'ALL', label: 'Semua Negara' },
                ...countryOptions.map(c => ({ value: c, label: c }))
              ]}
            />
          </div>

          {/* Interested Product Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Produk Pilihan</label>
            <CustomSelect
              id="filter-product-select"
              value={filterProduct}
              onChange={(val) => setFilterProduct(val)}
              options={[
                { value: 'ALL', label: 'Semua Produk' },
                ...productOptions.map(p => ({ value: p, label: p }))
              ]}
            />
          </div>

          {/* Lead Source Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sumber Pendaftaran</label>
            <CustomSelect
              id="filter-source-select"
              value={filterSource}
              onChange={(val) => setFilterSource(val)}
              options={[
                { value: 'ALL', label: 'Semua Sumber' },
                ...sourceOptions.map(s => ({ value: s, label: s }))
              ]}
            />
          </div>

          {/* Usia Lead Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">USIA LEAD</label>
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

          {/* Clear Filters indicator */}
          <div className="col-span-full flex justify-end">
            <button
              onClick={resetFilters}
              className="text-xs text-red-600 hover:text-red-500 font-semibold flex items-center gap-1 py-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Semua Filter</span>
            </button>
          </div>

        </div>
      )}

      {/* Mobile Card List View */}
      <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 font-sans">
        {sortedLeads.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <span className="text-2xl block">🔍</span>
            <p className="font-semibold mt-2 text-xs">Tidak ada data leads ditemukan</p>
            <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan pencarian atau reset filter.</p>
          </div>
        ) : (
          sortedLeads.map((lead) => {
            const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
            const picInfo = getPicInfo(lead);

            return (
              <div 
                key={lead.id} 
                onClick={() => onOpenLead(lead.id)}
                className="p-4 bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800/40 transition-colors cursor-pointer space-y-3"
              >
                {/* Header: Name + Status Badge on left, Stage name on right */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h4 className="font-semibold font-poppins text-sm text-slate-900 dark:text-white truncate">
                      {lead.namaLengkap}
                    </h4>
                    <div className="shrink-0">
                      {getStatusBadge(status)}
                    </div>
                  </div>
                  <div className="shrink-0 font-bold font-poppins text-xs sm:text-sm text-[#2b7fff] dark:text-blue-400">
                    {lead.stage || 'New Lead'}
                  </div>
                </div>

                {/* Middle Rounded Gray Box */}
                <div className="bg-[#f8fafc] dark:bg-slate-800/60 p-3.5 rounded-2xl border border-[#e2e8f0] dark:border-slate-800 space-y-2.5">
                  {/* Line 1: WhatsApp + Sumber Leads */}
                  <div className="flex items-center justify-between gap-2">
                    <a 
                      href={getWhatsAppLink(lead.nomorWhatsApp)} 
                      target="_blank" 
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold font-poppins text-slate-900 dark:text-slate-100 hover:text-emerald-600 flex items-center gap-1.5 text-xs sm:text-sm"
                    >
                      <span className="text-slate-400 text-sm">💬</span>
                      <span className="font-semibold font-poppins">{lead.nomorWhatsApp}</span>
                    </a>
                    <span className="text-xs font-semibold font-poppins text-slate-700 dark:text-slate-200">
                      {lead.sumberLeads || 'Meta Ads'}
                    </span>
                  </div>

                  {/* Divider line */}
                  <div className="border-t border-slate-200/60 dark:border-slate-700/60" />

                  {/* Line 2: Jenjang/Target + Lead Age */}
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">🎓</span>
                      <span className="truncate font-semibold font-poppins text-slate-800 dark:text-slate-200">{lead.jenjangStudi} {lead.targetNegara ? `- ${lead.targetNegara}` : '-'}</span>
                    </div>
                    <span className="shrink-0 font-semibold font-poppins text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                      {calculateLeadAge(lead.tanggalMasuk)}
                    </span>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="space-y-1.5 pt-0.5">
                  {/* Pendaftar Line */}
                  <div className="text-xs text-[#90a1b9] font-medium font-poppins">
                    <span>Pendaftar: </span>
                    <span className="font-semibold font-poppins text-slate-800 dark:text-slate-100">{picInfo.name}</span>
                  </div>

                  {/* Potensi IDR with Eye + Action Icons */}
                  <div className="flex items-center justify-between pt-1">
                    {/* Left: IDR Potential Value + Eye Toggle */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="font-semibold font-poppins text-slate-900 dark:text-white text-xs">
                        {individualVisiblePotentials[lead.id] || showPotentialValue ? formatIDR(lead.nilaiPotensi) : 'Rp •••••••••'}
                      </span>
                      {(isArsul || userRole === 'Admin CRM') && (
                        <button
                          type="button"
                          onClick={() => {
                            setIndividualVisiblePotentials(prev => ({
                              ...prev,
                              [lead.id]: !(prev[lead.id] || showPotentialValue)
                            }));
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Toggle Tampilan Potensi IDR"
                        >
                          {(individualVisiblePotentials[lead.id] || showPotentialValue) ? (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Right: Detail (FileSearch) and Delete Action Icons */}
                    <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onOpenLead(lead.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        title="Detail Lead"
                      >
                        <FileSearch className="h-5 w-5 stroke-[1.75]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmationId(lead.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Hapus Lead"
                      >
                        <Trash2 className="h-5 w-5 stroke-[1.75]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Database Table Grid (Desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="border-b border-teal-700/30 text-xs font-bold text-white uppercase tracking-wider font-poppins" style={{ background: 'linear-gradient(90deg, #3EB2CF 0%, #15688A 100%)' }}>
              <th className="p-4 pl-6 text-white font-poppins">{renderSortableHeader('NAMA LENGKAP', 'namaLengkap')}</th>
              <th className="p-4 text-white font-poppins">KONTAK</th>
              <th className="p-4 text-white font-poppins">{renderSortableHeader('KATEGORI BANT', 'totalScore')}</th>
              <th className="p-4 text-left text-white font-poppins">SUMBER</th>
              <th className="p-4 text-white font-poppins">RENCANA STUDI</th>
              <th className="p-4 text-white font-poppins">PENDAFTAR</th>
              <th className="p-4 text-white font-poppins">TAHAP PIPELINE</th>
              <th className="p-4 text-white font-poppins">USIA LEADS</th>
              <th className="p-4 text-left text-white font-poppins">
                <div className="flex items-center justify-start gap-1.5">
                  {renderSortableHeader('POTENSI TRANSAKSI', 'nilaiPotensi', 'left')}
                  {(isArsul || userRole === 'Admin CRM') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPotentialValue(!showPotentialValue);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-white transition-colors cursor-pointer"
                      title={showPotentialValue ? "Sembunyikan Potensi Transaksi" : "Tampilkan Potensi Transaksi"}
                    >
                      {showPotentialValue ? <Eye className="h-3.5 w-3.5 text-white" /> : <EyeOff className="h-3.5 w-3.5 text-white" />}
                    </button>
                  )}
                </div>
              </th>
              <th className="p-4 pr-6 text-left text-white font-poppins">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
            {sortedLeads.length === 0 ? (
               <tr>
                <td colSpan={10} className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <span className="text-3xl block">🔍</span>
                  <p className="font-semibold mt-3 text-sm">Tidak ada data leads ditemukan</p>
                  <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">Coba sesuaikan kata pencarian atau bersihkan filter lanjutan.</p>
                </td>
              </tr>
            ) : (
              sortedLeads.map((lead) => {
                const totalScore = lead.bant.budget + lead.bant.authority + lead.bant.need + lead.bant.timeline;
                const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
                const formatTanggal = new Date(lead.tanggalMasuk).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'Asia/Makassar'
                });

                return (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer group"
                    onClick={() => onOpenLead(lead.id)}
                  >
                    {/* Nama */}
                    <td className="p-4 pl-6 text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                      <div className="font-poppins font-semibold text-sm">{lead.namaLengkap}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5 font-poppins" style={{ lineHeight: '14px' }}>
                        {lead.email}
                      </div>
                    </td>

                    {/* Konten Kontak */}
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <a 
                          href={getWhatsAppLink(lead.nomorWhatsApp)} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-bold text-[#1d293d] dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 group/wa transition-colors"
                          title={`Hubungi ${lead.namaLengkap} via WhatsApp`}
                        >
                          <span className="font-poppins font-bold text-[#1d293d] dark:text-slate-100">{lead.nomorWhatsApp}</span>
                          <span className="p-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all">
                            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.83.001-2.624-1.023-5.091-2.884-6.953C16.593 1.959 14.12 1.037 11.5 1.03c-5.448 0-9.873 4.413-9.876 9.831-.001 1.983.518 3.921 1.503 5.642l-1.001 3.655 3.743-.982zm11.332-6.536c-.305-.153-1.796-.886-2.073-.987-.278-.101-.481-.153-.683.153-.201.305-.78.987-.956 1.189-.176.201-.351.228-.656.076-.305-.153-1.288-.475-2.454-1.515-.907-.808-1.52-1.807-1.698-2.112-.178-.305-.019-.47.133-.622.137-.137.305-.357.458-.536.152-.178.203-.305.305-.508.102-.203.05-.381-.025-.533-.076-.152-.683-1.644-.936-2.253-.246-.593-.497-.513-.683-.522-.177-.008-.38-.01-.583-.01-.203 0-.533.076-.812.381-.279.305-1.066 1.041-1.066 2.54 0 1.498 1.091 2.946 1.243 3.149.152.203 2.147 3.279 5.2 4.59.726.311 1.293.498 1.734.638.73.232 1.393.2 1.917.12.584-.087 1.796-.734 2.049-1.442.253-.707.253-1.314.177-1.442-.076-.128-.278-.203-.583-.356z"/>
                            </svg>
                          </span>
                        </a>
                      </div>
                      <div className="text-[10px] text-[#90a1b9] dark:text-slate-400 font-normal mt-0.5 font-poppins" style={{ lineHeight: '14px' }}>{lead.kota}</div>
                    </td>

                    {/* Kategori status BANT */}
                    <td className="p-4 whitespace-nowrap" title={`Detail BANT - Budget: ${lead.bant.budget}, Authority: ${lead.bant.authority}, Need: ${lead.bant.need}, Timeline: ${lead.bant.timeline}`}>
                      <div>{getStatusBadge(status)}</div>
                      <div className="text-[10px] text-[#90a1b9] dark:text-slate-400 mt-1 font-poppins font-normal" style={{ lineHeight: '14px' }}>
                        {totalScore} Poin
                      </div>
                    </td>

                    {/* Sumber */}
                    <td className="p-4 text-left">
                      <span className="inline-flex px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded font-semibold font-poppins text-[#1d293d] dark:text-slate-200">
                        {lead.sumberLeads}
                      </span>
                    </td>

                    {/* Rencana Studi */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 font-poppins">{lead.jenjangStudi} - {lead.targetNegara}</div>
                      <div className="text-[10px] text-[#90a1b9] mt-0.5 font-poppins" style={{ lineHeight: '14px' }}>{lead.produkDiminati}</div>
                    </td>

                     {/* PIC Counselor */}
                     <td className="p-4">
                       <div className="flex flex-col">
                         {(() => {
                           const picInfo = getPicInfo(lead);
                           return (
                             <>
                               <span className="font-semibold font-poppins text-slate-800 dark:text-slate-100 text-xs leading-4">
                                 {picInfo.name}
                               </span>
                               <span className="text-[10px] font-normal text-[#90a1b9] mt-0.5 uppercase tracking-wider leading-[14px]">
                                 {picInfo.role}
                               </span>
                               {picInfo.phone && (
                                 <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                                   📱 {picInfo.phone}
                                 </span>
                               )}
                             </>
                           );
                         })()}
                       </div>
                     </td>

                    {/* Tahap Pipeline */}
                    <td className="p-4">
                      {getStageBadge(lead.stage)}
                    </td>

                    {/* Usia Leads */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-semibold text-[#1d293d] dark:text-slate-200 font-poppins">
                        {calculateLeadAge(lead.tanggalMasuk)}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-poppins" style={{ lineHeight: '14px' }}>
                        {formatTanggal}
                      </div>
                    </td>

                    {/* Nilai Pontensi */}
                    <td className="p-4 text-left font-semibold text-slate-800 dark:text-slate-100 font-poppins">
                      {isArsul || userRole === 'Admin CRM' ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="min-w-[85px] inline-block font-semibold font-poppins">
                            {individualVisiblePotentials[lead.id] || showPotentialValue ? formatIDR(lead.nilaiPotensi) : 'Rp ••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIndividualVisiblePotentials(prev => ({
                                ...prev,
                                [lead.id]: !prev[lead.id]
                              }));
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            title={individualVisiblePotentials[lead.id] ? "Sembunyikan Potensi" : "Tampilkan Potensi"}
                          >
                            {individualVisiblePotentials[lead.id] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-sans text-xs font-normal">Terproteksi</span>
                      )}
                    </td>

                    {/* Controls */}
                    <td className="p-4 text-left pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-start gap-1.5">
                        <button
                          onClick={() => onOpenLead(lead.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="Lihat Detail Halaman Lead"
                        >
                          <FileSearch className="h-4 w-4" />
                        </button>
                        
                        {/* Allow all users to delete leads directly with confirmation */}
                        <button
                          onClick={() => {
                            setDeleteConfirmationId(lead.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors animate-fade-in"
                          title="Hapus Lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Database Quick Stats */}
      <div className="p-4 border-t border-slate-200/55 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>
          Menampilkan <span className="font-bold text-slate-700 dark:text-white">{filteredLeads.length}</span> dari <span className="font-bold text-slate-700 dark:text-white">{leads.length}</span> total database leads.
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block animate-pulse" />
            <span>🔥 HOT = Budget + Authority + Need + Timeline &ge; 10</span>
          </span>
        </div>
      </div>
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
                    onDeleteLead(deleteConfirmationId);
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
