import React from 'react';
import { 
  Users, 
  Flame, 
  Leaf, 
  Snowflake, 
  RotateCcw, 
  CheckCircle, 
  TrendingUp, 
  ArrowRight,
  ChevronRight,
  TrendingDown,
  Eye,
  EyeOff,
  Target,
  GraduationCap,
  Calendar,
  Shield
} from 'lucide-react';
import { Lead, UserRole, UserProfile } from '../types';
import { getLeadStatus, formatIDR } from '../utils';
import { getUserProfiles } from '../supabaseService';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, 
  CartesianGrid, Tooltip, 
  ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface DashboardProps {
  leads: Lead[];
  onOpenLead: (leadId: string) => void;
  userRole: UserRole;
  isArsul?: boolean;
  userName?: string;
}

export default function Dashboard({ leads, onOpenLead, userRole, isArsul, userName }: DashboardProps) {
  const [currentMakassarTime, setCurrentMakassarTime] = React.useState<string>('-');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dtfDate = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const dtfTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Makassar',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCurrentMakassarTime(`${dtfDate.format(now)} ${dtfTime.format(now)} WITA`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [allProfiles, setAllProfiles] = React.useState<UserProfile[]>([]);

  React.useEffect(() => {
    let active = true;
    const fetchProfiles = async () => {
      try {
        const data = await getUserProfiles();
        if (active) {
          setAllProfiles(data);
        }
      } catch (err) {
        console.error('Error fetching profiles in dashboard:', err);
      }
    };
    fetchProfiles();
    return () => {
      active = false;
    };
  }, []);

  const [showPotentialValue, setShowPotentialValue] = React.useState(false);

  // Date Range Picker States for Pendaftar Stats Table
  const [dateRangePreset, setDateRangePreset] = React.useState<string>('all');
  const [customStartDate, setCustomStartDate] = React.useState<string>('');
  const [customEndDate, setCustomEndDate] = React.useState<string>('');

  // 1. Calculate Metrics
  const totalLeads = leads.length;
  
  let hotCount = 0;
  let warmCount = 0;
  let coldCount = 0;
  let reactivateCount = 0;
  let enrolledCount = 0;
  let completedCount = 0;
  let totalPotentialValue = 0;

  leads.forEach(lead => {
    const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
    if (status === 'HOT') hotCount++;
    else if (status === 'WARM') warmCount++;
    else if (status === 'COLD') coldCount++;
    else if (status === 'REAKTIVASI') reactivateCount++;

    if (lead.stage === 'Enrolled') enrolledCount++;
    if (lead.stage === 'Completed') completedCount++;

    // Sum potential value for active or successful deals
    if (lead.stage !== 'Lost') {
      totalPotentialValue += lead.nilaiPotensi;
    }
  });

  const conversionRate = totalLeads > 0 ? ((enrolledCount + completedCount) / totalLeads) * 100 : 0;
  const mentoringCount = leads.filter(l => l.stage === 'Completed' && !l.excludeFromMentoring).length;

  // 2. Prepare Chart Data
  // A. Leads by Source
  const sourceCounts: Record<string, number> = {};
  leads.forEach(l => {
    sourceCounts[l.sumberLeads] = (sourceCounts[l.sumberLeads] || 0) + 1;
  });
  const sourceChartData = Object.keys(sourceCounts).map(source => ({
    name: source,
    value: sourceCounts[source]
  }));

  const COLORS = ['#1E40AF', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

  // B. Leads by Country
  const countryCounts: Record<string, number> = {};
  leads.forEach(l => {
    countryCounts[l.targetNegara] = (countryCounts[l.targetNegara] || 0) + 1;
  });
  const countryChartData = Object.keys(countryCounts).map(country => ({
    country,
    count: countryCounts[country]
  })).sort((a, b) => b.count - a.count);

  // C. Leads by Product
  const productCounts: Record<string, number> = {};
  leads.forEach(l => {
    productCounts[l.produkDiminati] = (productCounts[l.produkDiminati] || 0) + 1;
  });
  const productChartData = Object.keys(productCounts).map(product => ({
    product,
    count: productCounts[product]
  })).sort((a, b) => b.count - a.count);

  // D. Leads per Month (Mock grouped or based on dates)
  // For the demo we group by the parsed month string
  const monthlyCounts: Record<string, number> = {
    'Maret': 0, 'April': 0, 'Mei': 0, 'Juni': 0
  };
  leads.forEach(l => {
    const date = new Date(l.tanggalMasuk);
    const monthIndex = date.getMonth(); // 2: March, 4: May, 5: June
    if (monthIndex === 2) monthlyCounts['Maret']++;
    else if (monthIndex === 3) monthlyCounts['April']++;
    else if (monthIndex === 4) monthlyCounts['Mei']++;
    else if (monthIndex === 5) monthlyCounts['Juni']++;
  });
  const monthlyChartData = Object.keys(monthlyCounts).map(month => ({
    name: month,
    Leads: monthlyCounts[month]
  }));

  // E. Stage conversion funnel calculations
  const funnelStages = ['New Lead', 'Profiling', 'Konsultasi', 'Enrolled'];
  const funnelData = funnelStages.map((stageName) => {
    // A lead counts in the funnel if it has reached at least this stage
    // For simplicity, we count the current stage counts
    const count = leads.filter(l => l.stage === stageName || 
      (stageName === 'New Lead' && l.stage !== 'Lost') ||
      (stageName === 'Profiling' && ['Profiling', 'Konsultasi', 'Negotiation', 'Enrolled', 'Completed'].includes(l.stage)) ||
      (stageName === 'Konsultasi' && ['Konsultasi', 'Negotiation', 'Enrolled', 'Completed'].includes(l.stage)) ||
      (stageName === 'Enrolled' && ['Enrolled', 'Completed'].includes(l.stage))
    ).length;

    return {
      stage: stageName,
      count
    };
  });

  // Calculate funnel percentage and dropoff
  const maxLeadsInFunnel = funnelData[0]?.count || 1;
  const enrichedFunnelData = funnelData.map((stage, idx) => {
    const prevCount = idx === 0 ? maxLeadsInFunnel : funnelData[idx - 1].count;
    const dropoff = idx === 0 ? 0 : prevCount - stage.count;
    const dropoffPercent = idx === 0 ? 0 : Math.round((dropoff / prevCount) * 100);
    const conversionFromStart = Math.round((stage.count / maxLeadsInFunnel) * 100);

    return {
      ...stage,
      conversionFromStart,
      dropoffPercent,
      dropoff
    };
  });

  // F. Conversion per Source
  const sourceEnrolled: Record<string, { total: number; enrolled: number }> = {};
  leads.forEach(l => {
    if (!sourceEnrolled[l.sumberLeads]) {
      sourceEnrolled[l.sumberLeads] = { total: 0, enrolled: 0 };
    }
    sourceEnrolled[l.sumberLeads].total++;
    if (l.stage === 'Enrolled' || l.stage === 'Completed') {
      sourceEnrolled[l.sumberLeads].enrolled++;
    }
  });
  const sourceConvChartData = Object.keys(sourceEnrolled).map(src => ({
    name: src,
    'Conversion Rate %': Math.round((sourceEnrolled[src].enrolled / sourceEnrolled[src].total) * 100)
  }));

  // G. Conversion per Product
  const productEnrolled: Record<string, { total: number; enrolled: number }> = {};
  leads.forEach(l => {
    if (!productEnrolled[l.produkDiminati]) {
      productEnrolled[l.produkDiminati] = { total: 0, enrolled: 0 };
    }
    productEnrolled[l.produkDiminati].total++;
    if (l.stage === 'Enrolled' || l.stage === 'Completed') {
      productEnrolled[l.produkDiminati].enrolled++;
    }
  });
  const productConvChartData = Object.keys(productEnrolled).map(prod => ({
    name: prod,
    'Conversion Rate %': Math.round((productEnrolled[prod].enrolled / productEnrolled[prod].total) * 100)
  }));

  // Calculate lead dynamic list for priorities
  const priorityLeads = leads
    .filter(l => getLeadStatus(l.bant, l.tanggalFollowUpTerakhir, l.tanggalMasuk) === 'HOT' && l.stage !== 'Enrolled' && l.stage !== 'Completed' && l.stage !== 'Lost')
    .slice(0, 5);

  // Calculate filtered leads for the Pendaftar Stats Table
  const filteredPendaftarLeads = React.useMemo(() => {
    return leads.filter(l => {
      if (!l.tanggalMasuk) return true;
      const leadDate = new Date(l.tanggalMasuk);
      if (isNaN(leadDate.getTime())) return true;

      let start: Date | null = null;
      let end: Date | null = null;

      if (dateRangePreset === '7days') {
        start = new Date();
        start.setDate(start.getDate() - 7);
        end = new Date();
      } else if (dateRangePreset === '30days') {
        start = new Date();
        start.setDate(start.getDate() - 30);
        end = new Date();
      } else if (dateRangePreset === 'thismonth') {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (dateRangePreset === 'custom') {
        if (customStartDate) {
          start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
        }
        if (customEndDate) {
          end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
        }
      }

      if (start && leadDate < start) return false;
      if (end && leadDate > end) return false;
      return true;
    });
  }, [leads, dateRangePreset, customStartDate, customEndDate]);

  // Calculate Pendaftar Stats Table Data
  const pendaftarStats = React.useMemo(() => {
    const stats: Record<string, { 
      leadsCount: number; 
      mentoringCount: number; 
      dates: Date[];
      role: string;
      displayName: string;
    }> = {};

    // Pre-populate with all registered profiles so everyone shows up in the table even with 0 leads
    allProfiles.forEach(p => {
      const key = p.displayName.trim().toUpperCase();
      stats[key] = {
        leadsCount: 0,
        mentoringCount: 0,
        dates: [],
        role: (p.role === 'Manager' || p.role === 'Manager CRM') ? 'Manager CRM' : p.role,
        displayName: p.displayName
      };
    });

    filteredPendaftarLeads.forEach(l => {
      const pendaftar = (userRole === 'Staff CRM' && userName) ? userName : (l.creator_name || 'Academius');
      const key = pendaftar.trim().toUpperCase();
      if (!stats[key]) {
        stats[key] = { 
          leadsCount: 0, 
          mentoringCount: 0, 
          dates: [],
          role: (userRole === 'Staff CRM') ? 'Staff CRM' : (l.creator_role || 'Admin CRM'),
          displayName: pendaftar
        };
      }
      stats[key].leadsCount++;
      if (l.stage === 'Completed' && !l.excludeFromMentoring) {
        stats[key].mentoringCount++;
      }
      if (l.tanggalMasuk) {
        const d = new Date(l.tanggalMasuk);
        if (!isNaN(d.getTime())) {
          stats[key].dates.push(d);
        }
      }
      if (l.creator_role && userRole !== 'Staff CRM') {
        stats[key].role = l.creator_role;
      }
    });

    let result = Object.entries(stats).map(([key, data]) => {
      const rate = data.leadsCount > 0 ? (data.mentoringCount / data.leadsCount) * 100 : 0;
      
      // Determine the date range string for this specific pendaftar's leads in the filtered subset
      let dateRangeStr = '-';
      if (data.dates.length > 0) {
        const sortedDates = [...data.dates].sort((a, b) => a.getTime() - b.getTime());
        const minDate = sortedDates[0];
        const maxDate = sortedDates[sortedDates.length - 1];
        
        const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        const formatYearOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        
        if (minDate.getFullYear() === maxDate.getFullYear()) {
          if (minDate.getMonth() === maxDate.getMonth() && minDate.getDate() === maxDate.getDate()) {
            dateRangeStr = minDate.toLocaleDateString('id-ID', formatYearOptions);
          } else {
            dateRangeStr = `${minDate.toLocaleDateString('id-ID', formatOptions)} - ${maxDate.toLocaleDateString('id-ID', formatYearOptions)}`;
          }
        } else {
          dateRangeStr = `${minDate.toLocaleDateString('id-ID', formatYearOptions)} - ${maxDate.toLocaleDateString('id-ID', formatYearOptions)}`;
        }
      }

      return {
        name: data.displayName,
        leadsCount: data.leadsCount,
        mentoringCount: data.mentoringCount,
        conversionRate: `${Math.round(rate)}%`,
        dateRange: dateRangeStr,
        role: data.role
      };
    });

    if (userRole === 'Staff CRM') {
      const targetName = (userName || 'Staff CRM').toUpperCase();
      result = result.filter(row => row.name.toUpperCase() === targetName);
    }

    return result.sort((a, b) => b.leadsCount - a.leadsCount);
  }, [filteredPendaftarLeads, userRole, userName, allProfiles]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 dark:text-white">
            Performance Overview
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Pantau perolehan leads, status kualifikasi BANT, dan efisiensi konversi sales konselor secara real-time.
          </p>
        </div>
        <div 
          className="bg-gradient-to-r from-blue-900 to-indigo-950 px-4 py-2 rounded-xl shadow-sm border border-blue-900 text-xs font-semibold text-white flex items-center gap-2.5"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ color: '#00bba7', backgroundColor: '#00bba7' }}></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" style={{ color: '#00bba7', backgroundColor: '#00bba7' }}></span>
          </span>
          <span style={{ color: '#8ec5ff' }}>Waktu Makassar (WITA):</span>
          <span className="font-mono font-bold" style={{ color: '#ffffff' }}>{currentMakassarTime}</span>
        </div>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {/* Total Leads */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-4 pr-0">
            <h3 className="font-display font-bold text-2xl text-slate-800 dark:text-white">{totalLeads}</h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1 border border-[#e2e8f0] dark:border-slate-800 rounded px-1.5 py-0.5 w-fit">Masuk database</p>
          </div>
        </div>

        {/* Mentoring Student */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Mentoring Student</span>
            <GraduationCap className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-indigo-600 dark:text-indigo-400">{mentoringCount}</h3>
            <p className="text-[10px] text-indigo-500/90 font-mono mt-1 border border-[#e2e8f0] dark:border-slate-800 rounded px-1.5 py-0.5 w-fit">Masuk Mentoring</p>
          </div>
        </div>

        {/* Hot Leads */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Hot Leads</span>
            <Flame className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-red-600 dark:text-red-400">{hotCount}</h3>
            <p className="text-[10px] text-red-400/90 font-mono mt-1 border border-[#e2e8f0] dark:border-slate-800 rounded px-1.5 py-0.5 w-fit">Skor BANT &ge; 10</p>
          </div>
        </div>

        {/* Warm Leads */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Warm Leads</span>
            <Leaf className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-amber-600 dark:text-amber-400">{warmCount}</h3>
            <p className="text-[10px] text-amber-400/90 font-mono mt-1 border border-[#e2e8f0] dark:border-slate-800 rounded px-1.5 py-0.5 w-fit">Skor BANT 6 - 9</p>
          </div>
        </div>

        {/* Cold Leads */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Cold Leads</span>
            <Snowflake className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-blue-500">{coldCount}</h3>
            <p className="text-[10px] text-blue-400/90 font-mono mt-1 border border-[#e2e8f0] dark:border-slate-800 rounded px-1.5 py-0.5 w-fit">Skor BANT &le; 5</p>
          </div>
        </div>

        {/* Reaktivasi */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Reaktivasi</span>
            <RotateCcw className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-slate-700 dark:text-slate-300">{reactivateCount}</h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1 border border-[#e2e8f0] dark:border-slate-800 rounded px-1.5 py-0.5 w-fit">Inaktif &gt; 60 hari</p>
          </div>
        </div>

        {/* Total Enrolled */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Enrolled</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-emerald-600 dark:text-emerald-400">{enrolledCount + completedCount}</h3>
            <p className="text-[10px] text-emerald-400 font-mono mt-1 border border-[#e2e8f0] dark:border-slate-800 rounded px-1.5 py-0.5 w-fit">Telah mendaftar</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/55 dark:border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Conv. Rate</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-4">
            <h3 className="font-display font-bold text-2xl text-blue-600 dark:text-blue-400">
              {conversionRate.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Target global: 20%</p>
          </div>
        </div>
      </div>

      {/* Financial Potential Summary Card */}
      {isArsul || userRole === 'Admin CRM' ? (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md border border-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-blue-300 text-xs font-bold uppercase tracking-widest block">Total Nilai Potensi Pipeline</span>
              <button
                type="button"
                onClick={() => setShowPotentialValue(!showPotentialValue)}
                className="p-1 rounded hover:bg-white/10 text-blue-200 transition-colors cursor-pointer flex items-center justify-center"
                title={showPotentialValue ? "Sembunyikan Potensi" : "Tampilkan Potensi"}
              >
                {showPotentialValue ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <h3 className="font-display font-bold text-3xl mt-2 tracking-tight">
              {showPotentialValue ? formatIDR(totalPotentialValue) : 'Rp ••••••••'}
            </h3>
            <p className="text-xs text-blue-200 mt-1">
              Akumulasi nilai potensi transaksi dari seluruh leads aktif di pipeline (tidak termasuk status Lost).
            </p>
          </div>
          <div style={{ display: 'none' }} className="hidden">
            <span>hidden-element</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-100/50 border border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800 p-5 rounded-2xl text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Akumulasi Nilai Potensi Pipeline Terproteksi</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Sesuai kebijakan keamanan, akun Anda tidak diperkenankan untuk melihat rangkuman data keuangan.</p>
            </div>
          </div>
          <div style={{ display: 'none' }} className="hidden">
            <span>hidden-element</span>
          </div>
        </div>
      )}

      {/* Pendaftar Stats Table */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md border border-blue-900/60 animate-in fade-in duration-300">
        {/* Card Header & Date Range Picker */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-blue-800/40 pb-4 mb-5">
          <div>
            <h4 className="text-sm font-semibold tracking-wide uppercase text-[#8ec5ff] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#8ec5ff]" />
              Statistik Sales Konselor (Pendaftar)
            </h4>
            <p className="text-[11px] text-blue-200/70 mt-1">
              Berdasarkan tanggal masuk leads yang terdaftar di sistem.
            </p>
          </div>

          {/* Date Picker Filter Panel */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex bg-blue-950/80 border border-blue-800/60 rounded-lg p-0.5">
              {[
                { id: 'all', label: 'Semua' },
                { id: '7days', label: '7 Hari' },
                { id: '30days', label: '30 Hari' },
                { id: 'thismonth', label: 'Bulan Ini' },
                { id: 'custom', label: 'Custom' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDateRangePreset(p.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    dateRangePreset === p.id 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-blue-300 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {dateRangePreset === 'custom' && (
              <div className="flex items-center gap-2 bg-blue-950/80 border border-blue-800/60 rounded-lg px-2.5 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <Calendar className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-white border-none outline-none focus:ring-0 w-24 p-0 text-xs [color-scheme:dark]"
                  placeholder="Mulai"
                />
                <span className="text-blue-400 font-semibold">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-white border-none outline-none focus:ring-0 w-24 p-0 text-xs [color-scheme:dark]"
                  placeholder="Akhir"
                />
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-blue-800/50">
                <th className="pb-4 pr-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8ec5ff] font-sans">
                  <span className="inline-flex items-center gap-1.5">
                    Pendaftar
                    <Users className="h-3.5 w-3.5 text-[#8ec5ff]/70" />
                  </span>
                </th>
                <th className="pb-4 px-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8ec5ff] font-sans">
                  <span className="inline-flex items-center gap-1.5">
                    Role
                    <Shield className="h-3.5 w-3.5 text-[#8ec5ff]/70" />
                  </span>
                </th>
                <th className="pb-4 px-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8ec5ff] font-sans">
                  <span className="inline-flex items-center gap-1.5">
                    Rentang Tanggal
                    <Calendar className="h-3.5 w-3.5 text-[#8ec5ff]/70" />
                  </span>
                </th>
                <th className="pb-4 px-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8ec5ff] font-sans">
                  <span className="inline-flex items-center gap-1.5">
                    Jumlah Leads
                    <Target className="h-3.5 w-3.5 text-[#8ec5ff]/70" />
                  </span>
                </th>
                <th className="pb-4 px-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8ec5ff] font-sans">
                  <span className="inline-flex items-center gap-1.5">
                    Jumlah Mentoring Student
                    <GraduationCap className="h-3.5 w-3.5 text-[#8ec5ff]/70" />
                  </span>
                </th>
                <th className="pb-4 pl-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8ec5ff] font-sans">
                  <span className="inline-flex items-center gap-1.5">
                    Conversion Rate
                    <TrendingUp className="h-3.5 w-3.5 text-[#8ec5ff]/70" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-800/30">
              {pendaftarStats.map((row, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 pr-4 font-sans font-bold text-[12px] text-white">
                    {row.name}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase font-sans ${
                      row.role === 'Admin CRM' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : row.role === 'Manager' || row.role === 'Manager CRM'
                        ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {row.role === 'Admin CRM' ? 'Admin CRM' : row.role === 'Manager CRM' || row.role === 'Manager' ? 'Manager CRM' : 'Staff CRM'}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-sans font-bold text-[11px] text-blue-200/95">
                    {row.dateRange}
                  </td>
                  <td className="py-4 px-4 font-sans font-bold text-[12px] text-blue-100">
                    {row.leadsCount}
                  </td>
                  <td className="py-4 px-4 font-sans font-bold text-[12px] text-blue-100">
                    {row.mentoringCount}
                  </td>
                  <td className="py-4 pl-4 font-sans font-bold text-[12px] text-emerald-400">
                    {row.conversionRate}
                  </td>
                </tr>
              ))}
              {pendaftarStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-blue-300/60 text-sm animate-pulse">
                    Belum ada data pendaftar dalam rentang tanggal ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Block Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Area Chart: Leads per Month */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800">
          <h4 className="font-display font-bold text-base text-slate-800 dark:text-white mb-4">Tren Masuk Leads (Studi Kasus)</h4>
          <div className="h-60 w-full font-mono text-[11px]">
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#fff' 
                  }} 
                />
                <Area type="monotone" dataKey="Leads" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie/Donut Chart: Leads By Source */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800">
          <h4 className="font-display font-bold text-base text-slate-800 dark:text-white mb-4">Leads Berdasarkan Sumber</h4>
          <div className="h-60 w-full font-mono text-[11px] flex flex-col items-center justify-center">
            {sourceChartData.length === 0 ? (
              <span className="text-slate-400 text-xs">Belum ada data</span>
            ) : (
              <ResponsiveContainer width="100%" height={240} minWidth={0}>
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px', 
                      color: '#fff' 
                    }} 
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center" 
                    iconSize={8} 
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart: Leads By Country */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800">
          <h4 className="font-display font-bold text-base text-slate-800 dark:text-white mb-4">Target Negara Diminati</h4>
          <div className="h-60 w-full font-mono text-[11px]">
            {countryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240} minWidth={0}>
                <BarChart data={countryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis type="number" stroke="#94A3B8" />
                  <YAxis type="category" dataKey="country" stroke="#94A3B8" width={75} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px', 
                      color: '#fff' 
                    }} 
                  />
                  <Bar dataKey="count" fill="#1E40AF" radius={[0, 4, 4, 0]}>
                    {countryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Conversion Funnel and Dynamic list of priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dynamic Funnel representation (Hubspot Style) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 lg:col-span-7 flex flex-col">
          <div>
            <h4 className="font-display font-bold text-base text-slate-800 dark:text-white">Corong Konversi (SaaS Funnel)</h4>
            <p className="text-slate-400 text-xs mt-1 leading-snug">
              Melatih tracking Drop-off rate prospek dari pendaftaran awal hingga pendaftaran kursus (Enrolled).
            </p>
          </div>

          <div className="flex-1 mt-6 flex flex-col justify-around gap-3.5 pr-2 font-sans">
            {enrichedFunnelData.map((stage, idx) => (
              <div key={stage.stage} className="relative flex items-center">
                {/* Horizontal Funnel Bar */}
                <div className="w-1/3 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="h-5 w-5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md flex items-center justify-center font-bold font-display text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="truncate">{stage.stage}</span>
                </div>

                <div className="flex-1 relative h-9 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200/30">
                  {/* Fill Level */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center pl-4 text-white text-xs font-bold transition-all duration-500 ease-out" 
                    style={{ width: `${stage.conversionFromStart || 5}%` }}
                  >
                    {stage.count} Leads ({stage.conversionFromStart}%)
                  </div>
                </div>

                {/* Drop off rates metrics */}
                {idx > 0 ? (
                  <div className="w-24 pl-4 text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-red-500 dark:text-red-400 block">
                      &darr; {stage.dropoffPercent}% Lost
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      -{stage.dropoff} drop-off
                    </span>
                  </div>
                ) : (
                  <div className="w-24 pl-4 text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-500 block">
                      Baseline
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      100% Entry
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Priority daily sales recommendations (BANT HOT leads) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-base text-slate-800 dark:text-white">🚀 Rekomendasi Prioritas Utama</h4>
              <span className="animate-pulse h-2 w-2 rounded-full bg-red-500" />
            </div>
            <p className="text-slate-400 text-xs mt-1 leading-snug">
              Daftar leads berkategori HOT yang membutuhkan tindak lanjut atau WhatsApp perkenalan segera pada hari ini.
            </p>
          </div>

          <div className="mt-6 flex-1 space-y-3.5 pr-2">
            {priorityLeads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                <span className="text-4xl">🌤</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-3">Tidak ada Leads HOT aktif tanpa aktivitas hari ini.</p>
              </div>
            ) : (
              priorityLeads.map((lead) => {
                const totalScore = lead.bant.budget + lead.bant.authority + lead.bant.need + lead.bant.timeline;
                return (
                  <div 
                    key={lead.id}
                    onClick={() => onOpenLead(lead.id)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center font-bold">
                        🔥
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {lead.namaLengkap}
                          </h5>
                          <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded font-mono font-black text-[9px]" title="Skor BANT">
                            Skor: {totalScore}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Target className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />
                          <span>{lead.jenjangStudi} {lead.targetNegara} &bull; {lead.produkDiminati}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Product and Source Conversion Metrics Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar: Conversion by Product */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800">
          <h4 className="font-display font-bold text-base text-slate-800 dark:text-white mb-2">Tingkat Konversi Berdasarkan Produk</h4>
          <p className="text-slate-400 text-xs mb-4">Menganalisis minat produk yang memiliki tingkat enrollment akhir tertinggi.</p>
          <div className="h-60 w-full font-mono text-[11px]">
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <BarChart data={productConvChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" unit="%" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#fff' 
                  }} 
                />
                <Bar dataKey="Conversion Rate %" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar: Conversion by Source */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800">
          <h4 className="font-display font-bold text-base text-slate-800 dark:text-white mb-2">Tingkat Konversi Berdasarkan Sumber</h4>
          <p className="text-slate-400 text-xs mb-4">Mengetahui efektivitas pendanaan iklan Meta Ads vs media organik TikTok.</p>
          <div className="h-60 w-full font-mono text-[11px]">
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <BarChart data={sourceConvChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" unit="%" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#fff' 
                  }} 
                />
                <Bar dataKey="Conversion Rate %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
