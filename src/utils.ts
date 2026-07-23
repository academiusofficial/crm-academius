import { Lead, LeadLabel, Task, ActivityLog, ChatMessage } from './types';

/**
 * Returns a string representation of the current date or specified date in Asia/Makassar timezone.
 * Format: "YYYY-MM-DD"
 */
export function getMakassarDateString(date: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return dtf.format(date);
}

/**
 * Returns a string representation of the current time or specified time in Asia/Makassar timezone.
 * Format: "HH:MM:SS" (24-hour)
 */
export function getMakassarTimeString(date: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return dtf.format(date);
}

/**
 * Formats an ISO string or any Date into a friendly Makassar timezone (WITA) presentation format.
 * E.g., "new Date().toISOString()" -> "20 Juni 2026, 18:07 WITA" or "2026-06-20 18:07 WITA"
 */
export function formatToMakassarDateTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';
  
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
    minute: '2-digit'
  });

  return `${dtfDate.format(date)} pada ${dtfTime.format(date)} WITA`;
}

// Calculate lead category status based on BANT score and activity date
export function getLeadStatus(bant: { budget: number; authority: number; need: number; timeline: number }, tanggalFollowUpTerakhir: string, tanggalMasuk: string): LeadLabel {
  const lastActiveStr = tanggalFollowUpTerakhir || tanggalMasuk;
  const lastActiveDate = new Date(lastActiveStr);
  const today = new Date(); // Use active time
  
  const diffTime = Math.abs(today.getTime() - lastActiveDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));


  if (diffDays > 60) {
    return 'REAKTIVASI';
  }

  const totalScore = bant.budget + bant.authority + bant.need + bant.timeline;
  
  if (totalScore >= 10) return 'HOT';
  if (totalScore >= 6) return 'WARM';
  return 'COLD';
}

export interface ProgramDetails {
  name: 'FAST TRACK' | 'NURTURING' | 'EDUKASI' | 'REAKTIVASI';
  badgeColor: string;
  tasks: string[];
}

export function getFollowUpProgram(status: LeadLabel): ProgramDetails {
  switch (status) {
    case 'HOT':
      return {
        name: 'FAST TRACK',
        badgeColor: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
        tasks: [
          'Follow up pada hari yang sama (Maksimal 2 jam setelah input)',
          'Prioritas tinggi di dashboard Counselor',
          'Reminder otomatis WhatsApp 2 jam pertama',
          'Atur jadwal Discovery Call 15 menit'
        ]
      };
    case 'WARM':
      return {
        name: 'NURTURING',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        tasks: [
          'Follow up berkala setiap 2-3 hari sekali',
          'Kirim PDF materi edukasi panduan kuliah / beasiswa',
          'Kirim WhatsApp story sukses alumni Universitas target',
          'Undang ke webinar gratis terdekat'
        ]
      };
    case 'COLD':
      return {
        name: 'EDUKASI',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        tasks: [
          'Broadcast newsletter mingguan setiap hari Kamis',
          'Kirim artikel blog tips menulis motivation letter / essay',
          'Kirim promo kursus IELTS / TOEFL preparation',
          'Retargeting lewat email automation'
        ]
      };
    case 'REAKTIVASI':
      return {
        name: 'REAKTIVASI',
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        tasks: [
          'Kirim pesan personal sapaan hangat oleh PIC khusus',
          'Beri penawaran review berkas gratis (Resume / Motivation Letter)',
          'Update info beasiswa luar negeri terbaru (e.g. LPDP, Chevening, MEXT)',
          'Telepon ulang untuk konfirmasi rencana studi terupdate'
        ]
      };
  }
}

// Rupiah currency formatter
export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

// Convert data to Excel-compatible CSV and trigger download
export function exportToCSV(leads: Lead[], filename: string = 'academius_leads.csv'): void {
  // Column Headers
  const headers = [
    'Lead ID',
    'Tanggal Masuk',
    'Nama Lengkap',
    'WhatsApp',
    'Email',
    'Kota',
    'Sumber',
    'Jenjang Studi',
    'Target Negara',
    'Produk Diminati',
    'PIC',
    'Tanggal Follow Up Terakhir',
    'Budget Score',
    'Authority Score',
    'Need Score',
    'Timeline Score',
    'Total Score',
    'Status Lead',
    'Tahap Pipeline',
    'Nilai Potensi (IDR)',
    'Catatan'
  ];

  const rows = leads.map(lead => {
    const totalScore = lead.bant.budget + lead.bant.authority + lead.bant.need + lead.bant.timeline;
    const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
    return [
      lead.leadId,
      lead.tanggalMasuk,
      lead.namaLengkap,
      lead.nomorWhatsApp,
      lead.email,
      lead.kota,
      lead.sumberLeads,
      lead.jenjangStudi,
      lead.targetNegara,
      lead.produkDiminati,
      lead.pic,
      lead.tanggalFollowUpTerakhir || '-',
      lead.bant.budget,
      lead.bant.authority,
      lead.bant.need,
      lead.bant.timeline,
      totalScore,
      status,
      lead.stage,
      lead.nilaiPotensi,
      lead.catatan.replace(/"/g, '""') // Escape quotes
    ];
  });

  // Build CSV content
  const BOM = '\uFEFF'; // Excel UTF-8 BOM
  let csvContent = BOM + headers.map(h => `"${h}"`).join(',') + '\n';
  
  rows.forEach(row => {
    csvContent += row.map(cell => {
      if (cell === null || cell === undefined) return '""';
      const cellStr = String(cell);
      return `"${cellStr.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    }).join(',') + '\n';
  });

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Elegant initial mock data to seed the CRM
export const initialLeads: Lead[] = [];

export const initialTasks: Task[] = [];

export const initialLogs: ActivityLog[] = [];

export const initialChats: ChatMessage[] = [];

/**
 * Clean up a phone number and generate a correct WhatsApp wa.me link.
 * Handles country code prefixing and stripping of invalid characters.
 */
export function getWhatsAppLink(phone: string, text?: string): string {
  if (!phone) return '#';
  // Remove all non-digit characters except maybe plus
  let cleaned = phone.replace(/\D/g, '');
  // If starts with 0, convert to Indonesian country code 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  // If it starts with 8, pre-pend 62 (assuming Indonesian mobile format)
  if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  
  const baseUrl = `https://wa.me/${cleaned}`;
  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  }
  return baseUrl;
}


