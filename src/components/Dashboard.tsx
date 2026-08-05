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
  Shield,
  Search,
  X,
  Globe,
  Award,
  Briefcase,
  BarChart3,
  Filter
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

  // D. Leads per Month / Dynamic Lead Trend
  const monthlyChartData = React.useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const monthNamesIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const validLeadDates = leads
      .map(l => l.tanggalMasuk ? new Date(l.tanggalMasuk) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    if (validLeadDates.length === 0) return [];

    // Find min and max dates
    const sortedDates = [...validLeadDates].sort((a, b) => a.getTime() - b.getTime());
    const minDate = new Date(sortedDates[0].getFullYear(), sortedDates[0].getMonth(), 1);
    const maxDate = new Date(sortedDates[sortedDates.length - 1].getFullYear(), sortedDates[sortedDates.length - 1].getMonth(), 1);

    // Build contiguous sequence of month-year keys
    const countsByMonthYear: Record<string, { label: string; count: number }> = {};
    const curr = new Date(minDate);

    while (curr <= maxDate) {
      const year = curr.getFullYear();
      const monthIdx = curr.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      countsByMonthYear[key] = {
        label: monthNamesIndo[monthIdx],
        count: 0
      };
      curr.setMonth(curr.getMonth() + 1);
    }

    // Populate counts
    validLeadDates.forEach(d => {
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      if (countsByMonthYear[key]) {
        countsByMonthYear[key].count++;
      }
    });

    const sortedKeys = Object.keys(countsByMonthYear).sort();
    const years = new Set(sortedKeys.map(k => k.split('-')[0]));
    const hasMultipleYears = years.size > 1;

    return sortedKeys.map(key => {
      const item = countsByMonthYear[key];
      const year = key.split('-')[0];
      return {
        name: hasMultipleYears ? `${item.label} '${year.slice(2)}` : item.label,
        Leads: item.count
      };
    });
  }, [leads]);

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

  // State for active strategy statistics tab
  const [activeStatTab, setActiveStatTab] = React.useState<'stat1' | 'stat2' | 'stat3'>('stat1');

  // STATISTIK 1: Efisiensi & ROI Sumber Leads (Source Efficiency & Revenue Potential)
  const sourceDetailedStats = React.useMemo(() => {
    const map: Record<string, {
      source: string;
      total: number;
      enrolled: number;
      potential: number;
      hotCount: number;
    }> = {};

    leads.forEach(l => {
      const src = l.sumberLeads || 'Lainnya';
      if (!map[src]) {
        map[src] = { source: src, total: 0, enrolled: 0, potential: 0, hotCount: 0 };
      }
      map[src].total++;
      if (l.stage === 'Enrolled' || l.stage === 'Completed') {
        map[src].enrolled++;
      }
      if (l.stage !== 'Lost') {
        map[src].potential += (l.nilaiPotensi || 0);
      }
      const status = getLeadStatus(l.bant, l.tanggalFollowUpTerakhir, l.tanggalMasuk);
      if (status === 'HOT') {
        map[src].hotCount++;
      }
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        conversionRate: item.total > 0 ? Math.round((item.enrolled / item.total) * 100) : 0,
        sharePercent: leads.length > 0 ? Math.round((item.total / leads.length) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  // STATISTIK 2: Beban Kerja & Performa Staff PIC / Pendaftar
  const staffDetailedStats = React.useMemo(() => {
    const map: Record<string, {
      name: string;
      role: string;
      totalLeads: number;
      activeLeads: number;
      enrolledLeads: number;
      potentialValue: number;
    }> = {};

    allProfiles.forEach(p => {
      const key = p.displayName.trim().toUpperCase();
      map[key] = {
        name: p.displayName,
        role: (p.role === 'Manager' || p.role === 'Manager CRM') ? 'Manager CRM' : p.role,
        totalLeads: 0,
        activeLeads: 0,
        enrolledLeads: 0,
        potentialValue: 0
      };
    });

    leads.forEach(l => {
      const picName = l.creator_name || l.pic || 'Academius';
      const key = picName.trim().toUpperCase();
      if (!map[key]) {
        map[key] = {
          name: picName,
          role: l.creator_role || 'Staff CRM',
          totalLeads: 0,
          activeLeads: 0,
          enrolledLeads: 0,
          potentialValue: 0
        };
      }
      map[key].totalLeads++;
      if (['New Lead', 'Profiling', 'Konsultasi', 'Negotiation'].includes(l.stage)) {
        map[key].activeLeads++;
      }
      if (l.stage === 'Enrolled' || l.stage === 'Completed') {
        map[key].enrolledLeads++;
      }
      if (l.stage !== 'Lost') {
        map[key].potentialValue += (l.nilaiPotensi || 0);
      }
    });

    return Object.values(map)
      .map(p => ({
        ...p,
        conversionRate: p.totalLeads > 0 ? Math.round((p.enrolledLeads / p.totalLeads) * 100) : 0,
        workloadPercent: leads.length > 0 ? Math.round((p.totalLeads / leads.length) * 100) : 0
      }))
      .sort((a, b) => b.totalLeads - a.totalLeads);
  }, [leads, allProfiles]);

  // STATISTIK 3: Tren Jenjang Studi & Target Negara Populer
  const degreeCountryDetailedStats = React.useMemo(() => {
    const degreeMap: Record<string, {
      degree: string;
      total: number;
      enrolled: number;
      potential: number;
      countries: Record<string, number>;
    }> = {};

    leads.forEach(l => {
      const deg = l.jenjangStudi || 'Lainnya';
      const ctry = l.targetNegara || 'Umum';
      if (!degreeMap[deg]) {
        degreeMap[deg] = { degree: deg, total: 0, enrolled: 0, potential: 0, countries: {} };
      }
      degreeMap[deg].total++;
      if (l.stage === 'Enrolled' || l.stage === 'Completed') {
        degreeMap[deg].enrolled++;
      }
      if (l.stage !== 'Lost') {
        degreeMap[deg].potential += (l.nilaiPotensi || 0);
      }
      degreeMap[deg].countries[ctry] = (degreeMap[deg].countries[ctry] || 0) + 1;
    });

    return Object.values(degreeMap).map(item => {
      const sortedCountries = Object.entries(item.countries).sort((a, b) => b[1] - a[1]);
      const topCountryEntry = sortedCountries[0];
      return {
        degree: item.degree,
        total: item.total,
        enrolled: item.enrolled,
        potential: item.potential,
        conversionRate: item.total > 0 ? Math.round((item.enrolled / item.total) * 100) : 0,
        topCountry: topCountryEntry ? `${topCountryEntry[0]} (${topCountryEntry[1]} leads)` : '-',
        allCountries: sortedCountries.slice(0, 3).map(([c, cnt]) => `${c}: ${cnt}`).join(', ')
      };
    }).sort((a, b) => b.total - a.total);
  }, [leads]);

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
      const pendaftar = l.creator_name || l.pic || 'Academius';
      const key = pendaftar.trim().toUpperCase();
      if (!stats[key]) {
        stats[key] = { 
          leadsCount: 0, 
          mentoringCount: 0, 
          dates: [],
          role: l.creator_role || 'Admin CRM',
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
      if (l.creator_role) {
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

  const [pendaftarSearchQuery, setPendaftarSearchQuery] = React.useState<string>('');

  const searchedPendaftarStats = React.useMemo(() => {
    if (!pendaftarSearchQuery.trim()) return pendaftarStats;
    const q = pendaftarSearchQuery.toLowerCase().trim();
    return pendaftarStats.filter(row => 
      row.name.toLowerCase().includes(q) || 
      row.role.toLowerCase().includes(q) ||
      row.dateRange.toLowerCase().includes(q)
    );
  }, [pendaftarStats, pendaftarSearchQuery]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-slate-800 dark:text-white" style={{ color: '#136386' }}>
            Performance Overview
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Pantau perolehan leads, status kualifikasi BANT, dan efisiensi konversi sales konselor secara real-time.
          </p>
        </div>
        <button 
          type="button"
          className="bg-gradient-to-r from-[#42B8D5] to-[#136386] px-4 py-2 rounded-xl shadow-sm text-xs font-semibold text-white flex items-center gap-2.5 border-0 cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ color: '#ffffff', backgroundColor: '#ffffff' }}></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" style={{ color: '#ffffff', backgroundColor: '#ffffff' }}></span>
          </span>
          <span style={{ color: '#ffffff' }}>Waktu Makassar (WITA):</span>
          <span className="font-mono font-bold" style={{ color: '#ffffff' }}>{currentMakassarTime}</span>
        </button>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-4">
        {/* Total Leads */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 gap-1">
            <span className="text-sm font-semibold font-poppins uppercase tracking-wider truncate">Total Leads</span>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" style={{ color: '#42b8d5' }} />
          </div>
          <div className="mt-2 sm:mt-4 pr-0">
            <h3 className="font-semibold font-poppins text-lg sm:text-2xl" style={{ color: '#42b8d5' }}>{totalLeads}</h3>
            <p className="text-[9px] sm:text-[10px] font-mono mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 w-fit border-0 truncate max-w-full" style={{ backgroundColor: '#42b8d5', color: '#ffffff' }}>Masuk database</p>
          </div>
        </div>

        {/* Mentoring Student */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 gap-1">
            <span className="text-sm font-semibold font-poppins uppercase tracking-wider truncate">Mentoring Student</span>
            <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-4">
            <h3 className="font-semibold font-poppins text-lg sm:text-2xl" style={{ color: '#615fff' }}>{mentoringCount}</h3>
            <p className="text-[9px] sm:text-[10px] font-mono mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 w-fit border truncate max-w-full" style={{ backgroundColor: '#615fff', color: '#ffffff', borderColor: '#615fff' }}>Masuk Mentoring</p>
          </div>
        </div>

        {/* Hot Leads */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 gap-1">
            <span className="text-sm font-semibold font-poppins uppercase tracking-wider truncate">Hot Leads</span>
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-4">
            <h3 className="font-semibold font-poppins text-lg sm:text-2xl text-red-600 dark:text-red-400">{hotCount}</h3>
            <p className="text-[9px] sm:text-[10px] font-mono mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 w-fit border-0 truncate max-w-full" style={{ backgroundColor: '#ff6468', color: '#ffffff' }}>Skor BANT &ge; 10</p>
          </div>
        </div>

        {/* Warm Leads */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 gap-1">
            <span className="text-sm font-semibold font-poppins uppercase tracking-wider truncate">Warm Leads</span>
            <Leaf className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-4">
            <h3 className="font-semibold font-poppins text-lg sm:text-2xl text-amber-600 dark:text-amber-400">{warmCount}</h3>
            <p className="text-[9px] sm:text-[10px] font-mono mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 w-fit border-0 truncate max-w-full" style={{ backgroundColor: '#ffba00', color: '#ffffff' }}>Skor BANT 6 - 9</p>
          </div>
        </div>

        {/* Cold Leads */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 gap-1">
            <span className="text-sm font-semibold font-poppins uppercase tracking-wider truncate">Cold Leads</span>
            <Snowflake className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-4">
            <h3 className="font-semibold font-poppins text-lg sm:text-2xl text-blue-500">{coldCount}</h3>
            <p className="text-[9px] sm:text-[10px] font-mono mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 w-fit border-0 truncate max-w-full" style={{ backgroundColor: '#50a3ff', color: '#ffffff' }}>Skor BANT &le; 5</p>
          </div>
        </div>

        {/* Reaktivasi */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 gap-1">
            <span className="text-sm font-semibold font-poppins uppercase tracking-wider truncate">Reaktivasi</span>
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-4">
            <h3 className="font-semibold font-poppins text-lg sm:text-2xl text-slate-700 dark:text-slate-300">{reactivateCount}</h3>
            <p className="text-[9px] sm:text-[10px] font-mono mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 w-fit border-0 truncate max-w-full" style={{ backgroundColor: '#314158', color: '#ffffff' }}>Inaktif &gt; 60 hari</p>
          </div>
        </div>

        {/* Total Enrolled */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 gap-1">
            <span className="text-sm font-semibold font-poppins uppercase tracking-wider truncate">Enrolled</span>
            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-4">
            <h3 className="font-semibold font-poppins text-lg sm:text-2xl text-emerald-600 dark:text-emerald-400">{enrolledCount + completedCount}</h3>
            <p className="text-[9px] sm:text-[10px] font-mono mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 w-fit border-0 truncate max-w-full" style={{ backgroundColor: '#009966', color: '#ffffff' }}>Telah mendaftar</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/55 dark:border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 gap-1">
            <span className="text-sm font-semibold font-poppins uppercase tracking-wider truncate">Conv. Rate</span>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" style={{ color: '#42b8d5' }} />
          </div>
          <div className="mt-2 sm:mt-4">
            <h3 className="font-semibold font-poppins text-lg sm:text-2xl" style={{ color: '#42b8d5' }}>
              {conversionRate.toFixed(1)}%
            </h3>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5 sm:mt-1 truncate">Target global: 20%</p>
          </div>
        </div>
      </div>

      {/* Financial Potential Summary Card */}
      {isArsul || userRole === 'Admin CRM' ? (
        <div className="bg-gradient-to-r from-[#42B8D5] to-[#136386] p-6 rounded-2xl text-white shadow-md border-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-bold uppercase tracking-widest block" style={{ color: '#ffffff' }}>Total Nilai Potensi Pipeline</span>
              <button
                type="button"
                onClick={() => setShowPotentialValue(!showPotentialValue)}
                className="p-1 rounded hover:bg-white/10 text-white/80 transition-colors cursor-pointer flex items-center justify-center"
                title={showPotentialValue ? "Sembunyikan Potensi" : "Tampilkan Potensi"}
              >
                {showPotentialValue ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <h3 className="font-display font-bold text-3xl mt-2 tracking-tight">
              {showPotentialValue ? formatIDR(totalPotentialValue) : 'Rp ••••••••'}
            </h3>
            <p className="text-xs text-white mt-1" style={{ color: '#ffffff' }}>
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
      <div className="bg-gradient-to-r from-[#42B8D5] to-[#136386] p-6 rounded-2xl text-white shadow-md border-0 animate-in fade-in duration-300">
        {/* Card Header & Date Range Picker */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-blue-800/40 pb-4 mb-5">
          <div>
            <h4 className="text-sm font-semibold tracking-wide uppercase flex items-center gap-2" style={{ color: '#ffffff', borderColor: '#ffffff' }}>
              <Users className="h-4 w-4" style={{ color: '#ffffff' }} />
              Statistik Performance Sales & Mentoring
            </h4>
            <p className="text-[11px] mt-1" style={{ color: '#ffffff' }}>
              Berdasarkan tanggal masuk leads yang terdaftar di sistem.
            </p>
          </div>

          {/* Date Picker Filter Panel */}
          <div className="flex flex-col gap-2.5 text-xs w-full sm:max-w-md">
            {/* Elegant Search Input */}
            <div className="relative flex items-center w-full">
              <Search className="h-4 w-4 absolute left-3.5 pointer-events-none stroke-[2.2]" style={{ color: '#136386' }} />
              <input
                type="text"
                placeholder="Cari Pendaftar ..."
                value={pendaftarSearchQuery}
                onChange={(e) => setPendaftarSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-xs rounded-2xl border-0 outline-none transition-all placeholder:text-slate-400 font-semibold shadow-xs"
                style={{ backgroundColor: '#ffffff', color: '#136386' }}
              />
              {pendaftarSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPendaftarSearchQuery('')}
                  className="absolute right-3 hover:opacity-80 transition-opacity text-xs font-bold p-0.5 cursor-pointer flex items-center justify-center"
                >
                  <X className="h-4 w-4" style={{ color: '#42b8d5' }} />
                </button>
              )}
            </div>

            {/* Date Range Presets */}
            <div className="flex items-center justify-between rounded-2xl p-1.5 shadow-xs bg-white w-full gap-1">
              {[
                { id: 'all', label: 'Semua' },
                { id: '7days', line1: '7', line2: 'Hari' },
                { id: '30days', line1: '30', line2: 'Hari' },
                { id: 'thismonth', line1: 'Bulan', line2: 'Ini' },
                { id: 'custom', label: 'Custom' }
              ].map((p) => {
                const isActive = dateRangePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDateRangePreset(p.id)}
                    className="flex-1 py-1.5 px-0 rounded-xl font-semibold transition-all cursor-pointer flex flex-col items-center justify-center min-h-[42px] text-xs"
                    style={{
                      backgroundColor: isActive ? '#3da8ce' : 'transparent',
                      color: isActive ? '#ffffff' : '#136386'
                    }}
                  >
                    {p.line1 ? (
                      <div className="leading-tight text-center font-semibold">
                        <div>{p.line1}</div>
                        <div>{p.line2}</div>
                      </div>
                    ) : (
                      <span className="font-semibold">{p.label}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Range Picker */}
            {dateRangePreset === 'custom' && (
              <div 
                className="flex items-center justify-between gap-1.5 rounded-2xl px-3.5 py-2.5 shadow-xs w-full animate-in fade-in slide-in-from-top-1 duration-200 border-2 border-white"
                style={{
                  backgroundColor: '#3da8ce',
                  color: '#ffffff'
                }}
              >
                <Calendar className="h-5 w-5 shrink-0 text-white stroke-[2.2]" />
                <div className="flex items-center justify-center gap-1 flex-1">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-transparent text-white font-extrabold border-none outline-none focus:ring-0 text-xs w-[110px] p-0 text-center [color-scheme:dark] placeholder-white cursor-pointer"
                    style={{ color: '#ffffff' }}
                  />
                  <span className="font-extrabold text-white text-sm shrink-0">-</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-transparent text-white font-extrabold border-none outline-none focus:ring-0 text-xs w-[110px] p-0 text-center [color-scheme:dark] placeholder-white cursor-pointer"
                    style={{ color: '#ffffff' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-blue-800/50">
                <th className="pb-4 pr-4 text-xs font-bold uppercase tracking-wider font-sans">
                  <span className="inline-flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                    Pendaftar
                    <Users className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
                  </span>
                </th>
                <th className="pb-4 px-4 text-xs font-bold uppercase tracking-wider font-sans">
                  <span className="inline-flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                    Role
                    <Shield className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
                  </span>
                </th>
                <th className="pb-4 px-4 text-xs font-bold uppercase tracking-wider font-sans">
                  <span className="inline-flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                    Rentang Tanggal
                    <Calendar className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
                  </span>
                </th>
                <th className="pb-4 px-4 text-xs font-bold uppercase tracking-wider font-sans">
                  <span className="inline-flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                    Jumlah Leads
                    <Target className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
                  </span>
                </th>
                <th className="pb-4 px-4 text-xs font-bold uppercase tracking-wider font-sans">
                  <span className="inline-flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                    Jumlah Mentoring Student
                    <GraduationCap className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
                  </span>
                </th>
                <th className="pb-4 pl-4 text-xs font-bold uppercase tracking-wider font-sans">
                  <span className="inline-flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                    Conversion Rate
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-800/30">
              {searchedPendaftarStats.map((row, index) => (
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
                  <td className="py-4 px-4 font-sans font-bold text-[11px]" style={{ color: '#ffffff' }}>
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
              {searchedPendaftarStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-blue-300/80 text-sm font-medium">
                    {pendaftarSearchQuery ? `Tidak ada pendaftar yang cocok dengan "${pendaftarSearchQuery}"` : 'Belum ada data pendaftar dalam rentang tanggal ini.'}
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
          <h4 className="font-semibold font-poppins uppercase text-base text-slate-800 dark:text-white mb-4">Tren Masuk Leads (Studi Kasus)</h4>
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
          <h4 className="font-semibold font-poppins uppercase text-base text-slate-800 dark:text-white mb-4">Leads Berdasarkan Sumber</h4>
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
          <h4 className="font-semibold font-poppins uppercase text-base text-slate-800 dark:text-white mb-4">Target Negara Diminati</h4>
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
        
        {/* Dynamic Funnel representation (Hubspot / SaaS Style) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold font-poppins uppercase text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#42b8d5]" />
                Corong Konversi Leads
              </h4>
              <span className="text-[11px] font-semibold font-poppins px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#136386] dark:text-[#42b8d5]">
                Overall Conversion: {enrichedFunnelData[enrichedFunnelData.length - 1]?.conversionFromStart || 0}%
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1 font-poppins">
              Pelacakan tingkat konversi dan drop-off prospek dari pendaftaran awal hingga tahap Enrolled.
            </p>
          </div>

          <div className="mt-0 space-y-4 font-poppins">
            {enrichedFunnelData.map((stage, idx) => {
              const stageColors = ['#136386', '#2282a8', '#38bdf8', '#10b981'];
              const barColor = stageColors[idx % stageColors.length];
              const isLast = idx === enrichedFunnelData.length - 1;
              const nextStage = enrichedFunnelData[idx + 1];

              return (
                <div key={stage.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                      <span className="h-5 w-5 rounded-md flex items-center justify-center font-bold text-[10px] text-white shadow-xs" style={{ backgroundColor: barColor }}>
                        {idx + 1}
                      </span>
                      <span>{stage.stage}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {stage.count} <span className="text-slate-400 font-normal text-[11px]">Leads</span>
                      </span>
                      <span className="font-bold px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: `${barColor}15`, color: barColor }}>
                        {stage.conversionFromStart}%
                      </span>
                    </div>
                  </div>

                  {/* Progress / Funnel Bar */}
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${Math.max(stage.conversionFromStart, 4)}%`, 
                        backgroundColor: barColor 
                      }}
                    />
                  </div>

                  {/* Drop-off connector info between steps */}
                  {!isLast && nextStage && (
                    <div className="flex items-center justify-between pl-7 pr-1 text-[10px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                        ↓ Drop-off ke tahap selanjutnya
                      </span>
                      <span className="font-semibold text-red-500 dark:text-red-400">
                        -{nextStage.dropoffPercent}% ({nextStage.dropoff} leads gugur)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority daily sales recommendations (BANT HOT leads) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold font-poppins uppercase text-base text-slate-800 dark:text-white">🚀 Rekomendasi Prioritas Utama</h4>
              <span className="animate-pulse h-2 w-2 rounded-full bg-red-500" />
            </div>
            <p className="text-slate-400 text-xs mt-1 leading-snug">
              Daftar leads berkategori HOT yang membutuhkan tindak lanjut atau WhatsApp perkenalan segera pada hari ini.
            </p>
          </div>

          <div className="mt-6 flex-1 max-h-[280px] overflow-y-auto space-y-3.5 pr-2">
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
                          <span className="text-xs font-bold transition-colors" style={{ color: '#1d293d' }}>
                            {lead.namaLengkap}
                          </span>
                          <span className="px-1.5 py-0.5 rounded font-mono font-black text-[9px]" title="Skor BANT" style={{ color: '#ffffff', backgroundColor: '#42b8d5', borderWidth: '1px', borderStyle: 'solid', borderColor: '#42b8d5' }}>
                            Skor: {totalScore}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <button type="button" className="p-0 border-0 bg-transparent cursor-pointer flex items-center">
                            <Target className="h-3 w-3 shrink-0" style={{ color: '#42b8d5' }} />
                          </button>
                          <span style={{ color: '#136386' }}>{lead.jenjangStudi} {lead.targetNegara} &bull; {lead.produkDiminati}</span>
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
          <h4 className="font-semibold font-poppins uppercase text-base text-slate-800 dark:text-white mb-2">Tingkat Konversi Berdasarkan Produk</h4>
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
          <h4 className="font-semibold font-poppins uppercase text-base text-slate-800 dark:text-white mb-2">Tingkat Konversi Berdasarkan Sumber</h4>
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

      {/* Strategic Statistics & Business Intelligence Section (Statistik 1, 2, 3) */}
      <div className="bg-gradient-to-r from-[#42B8D5] to-[#136386] rounded-2xl p-6 text-white shadow-md border-0 space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/20 pb-4 mb-3">
          <div>
            <h3 className="font-semibold font-poppins text-base text-white uppercase flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-white" />
              Statistik Strategis & Insight CRM
            </h3>
            <p className="text-xs text-white/80 mt-1 font-poppins">
              Analisis performa mendalam untuk efisiensi kanal acquisition, efektivitas tim sales PIC, dan tren minat pendaftar.
            </p>
          </div>

          {/* Interactive Tabs for Statistik 1, 2, 3 - Matching image design */}
          <div className="w-full md:w-auto p-2 bg-white rounded-3xl flex items-center justify-between gap-2 font-poppins shadow-xs">
            <button
              type="button"
              onClick={() => setActiveStatTab('stat1')}
              className={`flex-1 md:flex-initial px-1 py-3 rounded-2xl text-xs font-semibold font-poppins transition-all cursor-pointer text-center leading-tight flex flex-col items-center justify-center min-w-[90px] ${
                activeStatTab === 'stat1'
                  ? 'bg-[#42b8d5] text-white shadow-md'
                  : 'text-[#136386] hover:bg-slate-100'
              }`}
            >
              <span>Efisiensi</span>
              <span>Sumber</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStatTab('stat2')}
              className={`flex-1 md:flex-initial px-1 py-3 rounded-2xl text-xs font-semibold font-poppins transition-all cursor-pointer text-center leading-tight flex flex-col items-center justify-center min-w-[90px] ${
                activeStatTab === 'stat2'
                  ? 'bg-[#42b8d5] text-white shadow-md'
                  : 'text-[#136386] hover:bg-slate-100'
              }`}
            >
              <span>Performa</span>
              <span>Staff</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStatTab('stat3')}
              className={`flex-1 md:flex-initial px-0 py-3 rounded-2xl text-xs font-semibold font-poppins transition-all cursor-pointer text-center leading-tight flex flex-col items-center justify-center min-w-[90px] ${
                activeStatTab === 'stat3'
                  ? 'bg-[#42b8d5] text-white shadow-md'
                  : 'text-[#136386] hover:bg-slate-100'
              }`}
            >
              <span>Jenjang</span>
              <span>& Negara</span>
            </button>
          </div>
        </div>

        {/* Tab 1 Content: Efisiensi & ROI Sumber Leads */}
        {activeStatTab === 'stat1' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="pt-0 border-0 space-y-1 font-poppins">
              <h4 className="text-[13px] font-semibold font-poppins uppercase tracking-wide text-white leading-snug">
                STATISTIK 1: MATRIKS ROI & EFISIENSI KANAL MARKETING / ACQUISITION CHANNEL
              </h4>
              <p className="text-xs text-white/80 font-medium">Total Kanal Active : {sourceDetailedStats.length}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-white/80 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Sumber / Channel</th>
                    <th className="py-2.5 px-3 text-center">Total Leads</th>
                    <th className="py-2.5 px-3 text-center">Prospek HOT 🔥</th>
                    <th className="py-2.5 px-3 text-center">Enrolled (Closed)</th>
                    <th className="py-2.5 px-3 text-center">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-poppins text-white">
                  {sourceDetailedStats.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/10 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-white/80" />
                        {item.source}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">{item.total}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded bg-red-500/80 text-white font-bold text-[10px]">
                          {item.hotCount} HOT
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-emerald-300">{item.enrolled}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded bg-white/20 text-white font-semibold text-[11px]">
                          {item.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Performa & Beban Kerja Staff PIC */}
        {activeStatTab === 'stat2' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="pt-0 border-0 space-y-1 font-poppins">
              <h4 className="text-[13px] font-semibold font-poppins uppercase tracking-wide text-white leading-snug">
                STATISTIK 2: PERFORMA & BEBAN KERJA TIM SALES / KONSELOR PIC
              </h4>
              <p className="text-xs text-white/80 font-medium">Total Staff : {staffDetailedStats.length}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-white/80 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Nama Staff / PIC</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Total Leads Handled</th>
                    <th className="py-2.5 px-3 text-center">Active Pipeline</th>
                    <th className="py-2.5 px-3 text-center">Enrolled (Closing)</th>
                    <th className="py-2.5 px-3 text-center">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-poppins text-white">
                  {staffDetailedStats.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/10 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        {item.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${
                          item.role === 'Admin CRM' 
                            ? 'bg-amber-400/20 text-amber-200 border-amber-300/30' 
                            : item.role === 'Manager' || item.role === 'Manager CRM'
                            ? 'bg-fuchsia-400/20 text-fuchsia-200 border-fuchsia-300/30'
                            : 'bg-sky-400/20 text-sky-200 border-sky-300/30'
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">{item.totalLeads}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded bg-white/20 text-white font-semibold text-[11px]">
                          {item.activeLeads}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-emerald-300">{item.enrolledLeads}</td>
                      <td className="py-3 px-3 text-center font-semibold text-white">
                        {item.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3 Content: Tren Jenjang & Target Negara Populer */}
        {activeStatTab === 'stat3' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="pt-0 border-0 space-y-1 font-poppins">
              <h4 className="text-[13px] font-semibold font-poppins uppercase tracking-wide text-white leading-snug">
                STATISTIK 3: MATRIKS MINAT JENJANG STUDI & NEGARA TUJUAN FAVORIT
              </h4>
              <p className="text-xs text-white/80 font-medium">Total Jenjang Teridentifikasi : {degreeCountryDetailedStats.length}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-white/80 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Jenjang Studi</th>
                    <th className="py-2.5 px-3 text-center">Total Peminat</th>
                    <th className="py-2.5 px-3">Negara Tujuan Favorit</th>
                    <th className="py-2.5 px-3 text-center">Enrolled (Closing)</th>
                    <th className="py-2.5 px-3 text-center">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 font-poppins text-white">
                  {degreeCountryDetailedStats.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/10 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-white" />
                        {item.degree}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">{item.total}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded bg-white/20 text-white font-semibold text-[11px]">
                          {item.topCountry}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-emerald-300">{item.enrolled}</td>
                      <td className="py-3 px-3 text-center font-semibold text-white">
                        {item.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
