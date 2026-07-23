import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  PhoneCall, 
  Calendar, 
  Plus, 
  Trash2, 
  Clock, 
  User, 
  BadgeHelp,
  Copy,
  Check,
  AlertOctagon,
  MessageSquare,
  ClipboardList,
  History,
  Activity,
  Award,
  Edit2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Lead, ChatMessage, Task, ActivityLog, AIInsightCache, PipelineStage, UserRole, BantScore, MentoringStage, CustomChecklistItem, UserProfile } from '../types';
import { getLeadStatus, getFollowUpProgram, formatIDR, getWhatsAppLink } from '../utils';
import { getUserProfiles } from '../supabaseService';
import LeadForm from './LeadForm';
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

interface LeadModalProps {
  leadId: string;
  leads: Lead[];
  onSaveLead: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
  onClose: () => void;
  chats: ChatMessage[];
  onAddChat: (chat: ChatMessage) => void;
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
  logs: ActivityLog[];
  onAddLog: (actionText: string) => void;
  userRole: UserRole;
  userName: string;
  advisors?: string[];
  onManageAdvisorsClick?: () => void;
  isArsul?: boolean;
  checklistTemplates?: CustomChecklistItem[];
}

export default function LeadModal({
  leadId,
  leads,
  onSaveLead,
  onDeleteLead,
  onClose,
  chats,
  onAddChat,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  logs,
  onAddLog,
  userRole,
  userName,
  advisors,
  onManageAdvisorsClick,
  isArsul,
  checklistTemplates
}: LeadModalProps) {
  // Retrieve the actual active Lead
  const lead = leads.find(l => l.id === leadId);
  const actualTemplates = checklistTemplates || FALLBACK_CHECKLIST_TEMPLATES;

  if (!lead) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl max-w-sm text-center shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-805">Lead id tidak ditemukan!</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Tutup</button>
        </div>
      </div>
    );
  }

  // Local state copy for reactive BANT adjusting
  const [budget, setBudget] = useState<1 | 2 | 3>(lead.bant.budget);
  const [authority, setAuthority] = useState<1 | 2 | 3>(lead.bant.authority);
  const [need, setNeed] = useState<1 | 2 | 3>(lead.bant.need);
  const [timeline, setTimeline] = useState<1 | 2 | 3>(lead.bant.timeline);
  const [pic, setPic] = useState<string>(lead.pic);
  const [stage, setStage] = useState<PipelineStage>(lead.stage);
  const [mentoringStage, setMentoringStage] = useState<MentoringStage>(lead.mentoringStage || 'Persiapan');
  const [selectedChecklistStage, setSelectedChecklistStage] = useState<MentoringStage>(lead.mentoringStage || 'Persiapan');
  const [nilaiPotensi, setNilaiPotensi] = useState<number>(lead.nilaiPotensi);
  const [showModalValue, setShowModalValue] = useState<boolean>(false);
  const [showEditForm, setShowEditForm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

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

  const getPicInfo = (currentPic: string) => {
    let name = '';
    let role = '';
    let phone = '';

    if (currentPic && currentPic !== 'Unassigned') {
      const parts = currentPic.split('|');
      name = parts[0];
      role = getPicRole(currentPic);
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

  // Sub-tabs in modal detail panel
  const [activeSubTab, setActiveSubTab] = useState<'chats' | 'tasks' | 'logs'>('tasks');

  // Input states
  const [chatInput, setChatInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Task Editing Local States
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTodo, setEditingTaskTodo] = useState<string>('');
  const [editingTaskDeadline, setEditingTaskDeadline] = useState<string>('');
  const [editingTaskPriority, setEditingTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // AI states
  const [aiInsight, setAiInsight] = useState<AIInsightCache | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Synchronize when leadId changes or database updates occurs
  useEffect(() => {
    setBudget(lead.bant.budget);
    setAuthority(lead.bant.authority);
    setNeed(lead.bant.need);
    setTimeline(lead.bant.timeline);
    setPic(lead.pic);
    setStage(lead.stage);
    setMentoringStage(lead.mentoringStage || 'Persiapan');
    setSelectedChecklistStage(lead.mentoringStage || 'Persiapan');
    setNilaiPotensi(lead.nilaiPotensi);
    setAiInsight(null); // Clear previous AI caching to ensure fresh insights are asked or cached correctly
  }, [leadId, lead]);

  const totalScore = budget + authority + need + timeline;
  const computedStatus = getLeadStatus({ budget, authority, need, timeline }, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);

  // Handle saving of updated details (Stage, PIC, Potential value or BANT sliders)
  const syncAttributesToDatabase = (updatedFields: Partial<Lead>) => {
    const updatedLead: Lead = {
      ...lead,
      ...updatedFields,
      lastUpdated: new Date().toISOString()
    };
    onSaveLead(updatedLead);
  };

  const handleBantChange = (type: 'budget' | 'authority' | 'need' | 'timeline', value: 1 | 2 | 3) => {
    let newBudget = budget;
    let newAuthority = authority;
    let newNeed = need;
    let newTimeline = timeline;

    if (type === 'budget') { setBudget(value); newBudget = value; }
    if (type === 'authority') { setAuthority(value); newAuthority = value; }
    if (type === 'need') { setNeed(value); newNeed = value; }
    if (type === 'timeline') { setTimeline(value); newTimeline = value; }

    const oldStatus = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
    const newStatus = getLeadStatus({ budget: newBudget, authority: newAuthority, need: newNeed, timeline: newTimeline }, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);

    const updatedBantRef: BantScore = { budget: newBudget, authority: newAuthority, need: newNeed, timeline: newTimeline };
    syncAttributesToDatabase({ bant: updatedBantRef });

    let logMessage = `${userName} merevisi skor BANT ${type.toUpperCase()} menjadi ${value}. (Skor total: ${newBudget + newAuthority + newNeed + newTimeline})`;
    if (oldStatus !== newStatus) {
      logMessage += ` & Kategori kelayakan berubah dari ${oldStatus} menjadi ${newStatus}!`;
    }
    onAddLog(logMessage);
  };

  const handleToggleChecklistItem = (itemKey: string, isChecked: boolean, itemText?: string) => {
    const currentChecklist = lead.mentoringChecklist || {};
    const updatedChecklist = {
      ...currentChecklist,
      [itemKey]: isChecked
    };

    const defaultTexts: { [key: string]: string } = {
      persiapan1: "Menyusun proposal riset berdasarkan template dan panduan dari admin.",
      persiapan2: "Mengunggah proposal ke Google Drive yang telah disediakan.",
      persiapan3: "Mentor mempelajari proposal sebelum sesi mentoring dimulai."
    };

    const finalLabel = itemText || defaultTexts[itemKey] || `Aktivitas ${itemKey}`;
    onAddLog(`${userName} ${isChecked ? 'menyelesaikan' : 'membatalkan penyelesaian'} aktivitas mentoring: "${finalLabel}"`);

    // Automatic Stage Transition logic
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
        setMentoringStage(nextStage);
        setSelectedChecklistStage(nextStage);
        
        syncAttributesToDatabase({
          mentoringChecklist: updatedChecklist,
          mentoringStage: nextStage
        });

        onAddLog(`🎉 Semua checklist untuk tahap "${currentStage}" telah selesai! Sistem secara otomatis memindahkan status mentoring ${lead.namaLengkap} ke tahap berikutnya: "${nextStage}".`);
      } else {
        syncAttributesToDatabase({
          mentoringChecklist: updatedChecklist
        });
      }
    } else {
      syncAttributesToDatabase({
        mentoringChecklist: updatedChecklist
      });
    }
  };

  // Chat message submission
  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newChat: ChatMessage = {
      id: `chat_${Math.random().toString(36).substring(2, 9)}`,
      leadId: lead.id,
      sender: 'counselor',
      timestamp: new Date().toISOString(),
      text: chatInput,
      type: 'whatsapp'
    };

    // Keep the typed text before clearing the state to construct the WA link
    const messageText = chatInput;

    onAddChat(newChat);
    setChatInput('');

    // Update follow up date on lead
    syncAttributesToDatabase({
      tanggalFollowUpTerakhir: new Date().toISOString()
    });

    onAddLog(`${userName} mengirim pesan sapaan WhatsApp ke ${lead.namaLengkap}: "${messageText.slice(0, 40)}..."`);

    // Redirect to real WhatsApp chat with pre-filled message
    const waLink = getWhatsAppLink(lead.nomorWhatsApp, messageText);
    window.open(waLink, '_blank');
  };

  // Add Task submission
  const handleTaskAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    const newTask: Task = {
      id: `task_${Math.random().toString(36).substring(2, 9)}`,
      leadId: lead.id,
      leadName: lead.namaLengkap,
      todo: taskInput,
      deadline: taskDeadline || new Date().toISOString().slice(0, 10),
      pic: pic === 'Unassigned' ? userName : pic,
      status: 'Pending',
      priority: taskPriority
    };

    onAddTask(newTask);
    setTaskInput('');
    setTaskDeadline('');

    onAddLog(`${userName} menambahkan tugas baru untuk ${lead.namaLengkap}: "${taskInput}"`);
  };

  // Trigger Gemini AI insights API on backend
  const fetchGeminiInsight = async () => {
    setIsAiLoading(true);
    setAiError('');
    setAiInsight(null);

    const currentChats = chats.filter(c => c.leadId === lead.id);

    try {
      const response = await fetch('/api/gemini-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead: {
            ...lead,
            bant: { budget, authority, need, timeline },
            stage,
            nilaiPotensi
          },
          chats: currentChats
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi AI di server backend. Silakan coba kembali.');
      }

      const result = await response.json();
      setAiInsight(result);
      onAddLog(`System AI berhasil men-generate rekomendasi prioritas closing & draf follow up untuk ${lead.namaLengkap}.`);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Terjadi kegagalan komunikasi dengan server');
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl h-[92vh] shadow-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Dynamic header row */}
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-850 bg-slate-50/60 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Round Avatar initials representing study interest */}
            <div className="h-12 w-12 bg-blue-600 dark:bg-blue-500 rounded-2xl text-white font-bold font-display text-base flex flex-col items-center justify-center shadow-sm">
              <span>{lead.jenjangStudi}</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold">{lead.targetNegara.slice(0, 3)}</span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display font-black text-xl text-slate-800 dark:text-white leading-tight">
                  {lead.namaLengkap}
                </h3>
                <span className="font-mono text-xs font-bold text-slate-400">
                  {lead.leadId}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono tracking-wider ${
                  computedStatus === 'HOT' ? 'bg-red-150 text-red-700 animate-pulse' :
                  computedStatus === 'WARM' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400' :
                  computedStatus === 'COLD' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-350'
                }`}>
                  {computedStatus === 'HOT' ? '🔥 HOT' : computedStatus === 'WARM' ? '🌤 WARM' : computedStatus === 'COLD' ? '❄ COLD' : '🔄 REAKTIVASI'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Terdaftar: {new Date(lead.tanggalMasuk).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })}</span>
                <span>&bull;</span>
                <span className="font-semibold text-[#90a1b9] dark:text-[#90a1b9] flex items-center gap-1.5">
                  Pendaftar: 
                  {(() => {
                    const picInfo = getPicInfo(pic);
                    return (
                      <span className="inline-flex items-center gap-1 bg-[#f8fafc] dark:bg-[#f8fafc] text-black dark:text-black border border-[#f8fafc] px-2 py-0.5 rounded text-[10px] font-bold">
                        {picInfo.name} <span className="text-[#90a1b9] dark:text-[#90a1b9] font-normal tracking-normal">({picInfo.role})</span>
                      </span>
                    );
                  })()}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="edit-lead-modal-btn"
              onClick={() => setShowEditForm(true)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/25 dark:hover:bg-blue-950/40 dark:text-blue-400 border border-blue-150/40 dark:border-blue-900/30 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
              title="Edit Data Lengkap Lead"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Profil</span>
            </button>

            {(userRole === 'Admin CRM' || userRole === 'Staff CRM' || userRole === 'Manager CRM' || isArsul) && onDeleteLead && (
              <button
                id="delete-lead-modal-btn"
                onClick={() => {
                  setShowDeleteConfirm(true);
                }}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/25 dark:hover:bg-red-950/40 dark:text-red-400 border border-red-150/40 dark:border-red-900/35 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
                title="Hapus Lead dari Database"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Lead</span>
              </button>
            )}

            <button
              id="close-lead-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Double-Panel Grid Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          
          {/* Left Panel: Profile Detail, Sliders, and Program tasklists */}
          <div className="lg:col-span-5 p-6 space-y-6 overflow-y-auto max-h-full font-sans">
            
            {/* Sales Pipeline Stage & PIC & potential IDR Dropdowns */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wildest block mb-1">Tahap Pipeline</label>
                <CustomSelect
                  id="modal-stage-select"
                  className="w-[170px]"
                  value={stage}
                  onChange={(val) => {
                    const nextStg = val as PipelineStage;
                    setStage(nextStg);
                    syncAttributesToDatabase({ stage: nextStg });
                    onAddLog(`${userName} memperbarui status penjualan ${lead.namaLengkap} menjadi ${nextStg}`);
                  }}
                  options={[
                    { value: 'New Lead', label: 'New Lead' },
                    { value: 'Profiling', label: 'Profiling' },
                    { value: 'Konsultasi', label: 'Konsultasi' },
                    { value: 'Negotiation', label: 'Negotiation' },
                    { value: 'Enrolled', label: 'Enrolled' },
                    { value: 'Completed', label: 'Completed' },
                    { value: 'Lost', label: 'Lost' },
                    { value: 'Reaktivasi 60 Hari', label: 'Reaktivasi 60 Hari' }
                  ]}
                />
              </div>

              {stage === 'Completed' ? (
                <div>
                  <label className="text-[10px] font-bold text-blue-500 uppercase tracking-wildest block mb-1">Tahap Mentoring</label>
                  <CustomSelect
                    id="modal-mentoring-stage-select"
                    className="w-[170px]"
                    value={mentoringStage}
                    onChange={(val) => {
                      const nextMentoringStg = val as MentoringStage;
                      setMentoringStage(nextMentoringStg);
                      syncAttributesToDatabase({ mentoringStage: nextMentoringStg });
                      onAddLog(`${userName} memperbarui status mentoring ${lead.namaLengkap} menjadi [${nextMentoringStg}]`);
                    }}
                    options={[
                      { value: 'Persiapan', label: 'Persiapan' },
                      { value: 'Fase 1', label: 'Fase 1 (Kelas Mentoring)' },
                      { value: 'Fase 2', label: 'Fase 2 (Kelas IELTS)' },
                      { value: 'Fase 3', label: 'Fase 3 (Kelengkapan Berkas)' },
                      { value: 'Fase 4', label: 'Fase 4 (Pendaftaran LoA)' },
                      { value: 'Hasil Akhir', label: 'Hasil Akhir' }
                    ]}
                  />
                </div>
              ) : (
                <div className="hidden">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wildest block">PIC Counselor</label>
                    {onManageAdvisorsClick && userRole !== 'Staff CRM' && (
                      <button
                        type="button"
                        onClick={onManageAdvisorsClick}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-indigo-400 dark:hover:text-indigo-350 active:scale-95 transition-all duration-150"
                      >
                        <span>Edit Daftar PIC</span>
                      </button>
                    )}
                  </div>
                  <CustomSelect
                    id="modal-pic-select"
                    className="w-[170px]"
                    value={pic}
                    onChange={(val) => {
                      const nextPic = val as string;
                      setPic(nextPic);
                      syncAttributesToDatabase({ pic: nextPic });
                      onAddLog(`${userName} mengalihkan penanganan ${lead.namaLengkap} ke PIC ${nextPic}`);
                    }}
                    disabled={userRole === 'Staff CRM'}
                    options={[
                      { value: 'Unassigned', label: 'Belum Ada PIC' },
                      ...(advisors && advisors.length > 0 ? advisors.filter(a => a !== 'Unassigned') : ['Rina Counselor', 'Rian Counselor', 'Andi Counselor']).map((adv) => {
                        const nameOnly = adv.includes('|') ? adv.split('|')[0] : adv;
                        return { value: adv, label: nameOnly };
                      })
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Profile Detail Contacts Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-[#e2e8f0] dark:border-slate-800 space-y-2 text-xs">
              <h4 className="font-display font-extrabold text-[11px] text-slate-400 uppercase tracking-wider block mb-2 leading-[15px]">Profil Kontak Akademis</h4>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Nomor WhatsApp:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span className="font-bold">{lead.nomorWhatsApp}</span>
                  <a href={getWhatsAppLink(lead.nomorWhatsApp)} target="_blank" rel="noreferrer" className="text-emerald-500 hover:scale-110 ml-0.5" title="Hubungi via WhatsApp"><PhoneCall className="h-3.5 w-3.5" /></a>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Email Utama:</span>
                <span className="font-mono text-slate-755 dark:text-slate-300 font-bold">{lead.email || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Domisili:</span>
                <span className="font-bold text-slate-755 dark:text-slate-300">{lead.kota || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Sumber Leads:</span>
                <span className="font-bold text-slate-755 dark:text-slate-350">{lead.sumberLeads || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Usia Leads:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{calculateLeadAge(lead.tanggalMasuk)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Produk Keinginan:</span>
                <span className="font-bold text-slate-755 dark:text-slate-350">{lead.produkDiminati}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Catatan Intro:</span>
              </div>
              <p className="text-[11px] italic text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-[#e2e8f0] dark:border-slate-800/80 leading-relaxed font-sans">
                {lead.catatan || 'Belum ada catatan intro mendaftar.'}
              </p>
            </div>

            {/* BANT Sliders Questionnaire (Visual, extremely premium) */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-850 dark:to-slate-800/40 rounded-2xl border border-[#e2e8f0] dark:border-slate-850/80 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-display font-black text-[#90a1b9] text-[11px] uppercase tracking-wider leading-[15px] w-[245px]">Scoring Kualifikasi BANT</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5 w-[247px]">Edit slider kualifikasi prospek untuk memperbarui skor.</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase leading-[15px]">TOTAL SKOR</span>
                  <span className="font-display font-black text-lg text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">{totalScore} / 12</span>
                </div>
              </div>

              {/* BUDGET slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-350">💰 Budget: {budget}</span>
                  <span className="text-[10px] text-slate-400 italic font-medium">
                    {budget === 1 ? 'Dana Belum Memadai' : budget === 2 ? 'Sebagian / Cari Beasiswa' : 'Dana Siap / Lolos'}
                  </span>
                </div>
                <input
                  type="range" min="1" max="3" step="1"
                  value={budget}
                  onChange={(e) => handleBantChange('budget', Number(e.target.value) as any)}
                  className="w-full accent-blue-600 dark:accent-blue-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* AUTHORITY slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-350">👔 Authority: {authority}</span>
                  <span className="text-[10px] text-slate-400 italic font-medium">
                    {authority === 1 ? 'Belum Bisa Mandiri' : authority === 2 ? 'Butuh Ortu/Pasangan' : 'Bisa Mutuskan Sendiri'}
                  </span>
                </div>
                <input
                  type="range" min="1" max="3" step="1"
                  value={authority}
                  onChange={(e) => handleBantChange('authority', Number(e.target.value) as any)}
                  className="w-full accent-blue-600 dark:accent-blue-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* NEED slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-350">🎯 Need: {need}</span>
                  <span className="text-[10px] text-slate-400 italic font-medium">
                    {need === 1 ? 'Sekadar Cari Info' : need === 2 ? 'Ada Rencana / Tak Urgen' : 'Butuh Bimbingan Sekarang'}
                  </span>
                </div>
                <input
                  type="range" min="1" max="3" step="1"
                  value={need}
                  onChange={(e) => handleBantChange('need', Number(e.target.value) as any)}
                  className="w-full accent-blue-600 dark:accent-blue-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* TIMELINE slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-350">⏱ Timeline: {timeline}</span>
                  <span className="text-[10px] text-slate-400 italic font-medium">
                    {timeline === 1 ? 'Belum Ada Target' : timeline === 2 ? 'Target 6-12 Bulan' : 'Paling Mendesak (1-3 Bln)'}
                  </span>
                </div>
                <input
                  type="range" min="1" max="3" step="1"
                  value={timeline}
                  onChange={(e) => handleBantChange('timeline', Number(e.target.value) as any)}
                  className="w-full accent-blue-600 dark:accent-blue-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

            </div>

            {/* Auto program task list or Mentoring Checklist - Hidden per user request */}
            {null}

          </div>

          {/* Right Panel: AI Insights, Interactive WhatsApp Sim, Tasks, Timeline logs */}
          <div className="lg:col-span-7 flex flex-col h-full bg-white dark:bg-slate-900 pr-1.5">
            
            {/* AI Insights Top Segment */}
            {true && (
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/20 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                      <h4 className="font-display font-extrabold text-base text-slate-800 dark:text-white">
                        Asisten AI Admission Predictor
                      </h4>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-snug">
                      Analisis kemungkinan closing, deteksi risiko, rekomendasi personal, dan rancang draf tindak lanjut WhatsApp secara instan dengan LLM **Gemini 2.5**.
                    </p>
                  </div>

                  <button
                    id="generate-ai-insight-btn"
                    onClick={fetchGeminiInsight}
                    disabled={isAiLoading}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 shrink-0 active:scale-95 disabled:opacity-40 select-none cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-white" />
                    <span>{isAiLoading ? 'Menganalisis Prospektus...' : 'Minta Analisis AI'}</span>
                  </button>
                </div>

                {/* Loader */}
                {isAiLoading && (
                  <div className="mt-5 p-5 bg-indigo-50/50 dark:bg-indigo-950/25 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/40 flex flex-col items-center justify-center text-center gap-3">
                    <div className="h-8 w-8 relative flex items-center justify-center">
                      <span className="absolute animate-ping h-6 w-6 rounded-full bg-indigo-400 opacity-75" />
                      <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">Asisten Academius sedang membaca data pendaftar...</p>
                      <p className="text-[10px] text-indigo-450 dark:text-indigo-500 font-mono mt-1">Membaca kualifikasi BANT &bull; Menganalisis riwayat obrolan WhatsApp</p>
                    </div>
                  </div>
                )}

                {/* Error block */}
                {aiError && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                    <AlertOctagon className="h-4.5 w-4.5 text-red-600 dark:text-red-400 shrink-0" />
                    <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {aiError}
                    </span>
                  </div>
                )}

                {/* AI Output Result Card */}
                {aiInsight && !isAiLoading && (
                  <div className="mt-5 p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40 space-y-4 font-sans animate-in fade-in duration-300">
                    
                    {/* Row 1: Closing Chance and Risk badges */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-indigo-100/50 dark:border-indigo-900/30">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-indigo-400 block font-bold">ANALISIS CLOSING PROBA</span>
                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 mt-1">
                          {aiInsight.prediction}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[10px] text-indigo-400 uppercase font-bold">RISIKO HILANG:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          aiInsight.riskLevel === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                          aiInsight.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800 animate-pulse'
                        }`}>
                          {aiInsight.riskLevel}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Bullet steps suggestions */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-indigo-400 block font-bold">REKOMENDASI PRIORITAS SALES</span>
                      <div className="space-y-1.5">
                        {aiInsight.recommendedFollowUp.split('\n').filter(Boolean).map((stg, i) => (
                          <p key={i} className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {stg}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Row 3: Drag template copy follow up */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-indigo-400 block font-bold">DRAF FOLLOW UP SMART WHATSAPP</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => copyToClipboard(aiInsight.draftEmail)}
                            className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-indigo-150 rounded flex items-center gap-1 select-none cursor-pointer"
                          >
                            {copiedDraft ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedDraft ? 'Copied' : 'Salin Draf'}</span>
                          </button>
                          <a
                            href={getWhatsAppLink(lead.nomorWhatsApp, aiInsight.draftEmail)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded flex items-center gap-1 cursor-pointer select-none"
                            title="Kirim draf ini langsung ke WhatsApp lead"
                          >
                            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.83.001-2.624-1.023-5.091-2.884-6.953C16.593 1.959 14.12 1.037 11.5 1.03c-5.448 0-9.873 4.413-9.876 9.831-.001 1.983.518 3.921 1.503 5.642l-1.001 3.655 3.743-.982zm11.332-6.536c-.305-.153-1.796-.886-2.073-.987-.278-.101-.481-.153-.683.153-.201.305-.78.987-.956 1.189-.176.201-.351.228-.656.076-.305-.153-1.288-.475-2.454-1.515-.907-.808-1.52-1.807-1.698-2.112-.178-.305-.019-.47.133-.622.137-.137.305-.357.458-.536.152-.178.203-.305.305-.508.102-.203.05-.381-.025-.533-.076-.152-.683-1.644-.936-2.253-.246-.593-.497-.513-.683-.522-.177-.008-.38-.01-.583-.01-.203 0-.533.076-.812.381-.279.305-1.066 1.041-1.066 2.54 0 1.498 1.091 2.946 1.243 3.149.152.203 2.147 3.279 5.2 4.59.726.311 1.293.498 1.734.638.73.232 1.393.2 1.917.12.584-.087 1.796-.734 2.049-1.442.253-.707.253-1.314.177-1.442-.076-.128-.278-.203-.583-.356z"/>
                            </svg>
                            <span>Kirim ke WA</span>
                          </a>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100/30 text-[11px] font-mono text-slate-700 dark:text-slate-350 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {aiInsight.draftEmail}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* Sub Tabs Selection (Chats, Tasks, Timeline logs) */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-1 select-none shrink-0 font-sans bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setActiveSubTab('tasks')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                  activeSubTab === 'tasks'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                <span>Rencana Tugas & To-Do</span>
                {tasks.filter(t => t.leadId === lead.id && t.status === 'Pending').length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                )}
              </button>

              <button
                onClick={() => setActiveSubTab('chats')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                  activeSubTab === 'chats'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Simulasi Chat WhatsApp</span>
              </button>

              <button
                onClick={() => setActiveSubTab('logs')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                  activeSubTab === 'logs'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <History className="h-4 w-4" />
                <span>Activity Timeline</span>
              </button>
            </div>

            {/* Sub Tabs Variable Viewport Area */}
            <div className="flex-1 p-6 overflow-y-auto max-h-full flex flex-col justify-between">
              
              {/* PAGE 1: WHATSAPP CHAT SIMULATOR */}
              {activeSubTab === 'chats' && (
                <div className="flex flex-col h-full justify-between gap-4">
                  {/* Chat logs */}
                  <div className="flex-1 space-y-4 max-h-60 overflow-y-auto pr-1.5 scrollbar-thin">
                    {chats.filter(c => c.leadId === lead.id).length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-10 text-center text-slate-400 text-xs font-sans">
                        <span>💬</span>
                        <p className="mt-2 font-medium">Belum ada riwayat percakapan.</p>
                        <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1">Kirim pesan pembuka WhatsApp di bawah untuk memulai simulasi chat!</p>
                      </div>
                    ) : (
                      chats.filter(c => c.leadId === lead.id).map((chat) => (
                        <div 
                          key={chat.id} 
                          className={`flex ${chat.sender === 'counselor' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                            chat.sender === 'counselor'
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/50 dark:border-slate-750/30'
                          }`}>
                            <p className="font-sans font-medium whitespace-pre-wrap">{chat.text}</p>
                            <span className={`block text-[9px] text-right mt-1.5 font-mono ${
                              chat.sender === 'counselor' ? 'text-blue-150/70' : 'text-slate-400'
                            }`}>
                              {new Date(chat.timestamp).toLocaleTimeString('id-ID', { hour: 'numeric', minute: 'numeric', timeZone: 'Asia/Makassar' })} WITA
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Chat send bar */}
                  <form onSubmit={handleChatSend} className="pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2.5 font-sans">
                    <input
                      id="chat-simulator-input"
                      type="text"
                      placeholder={`Kirim WhatsApp balasan personal ke ${lead.namaLengkap}...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 p-2.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-705 dark:text-slate-200 border border-[#e2e8f0] dark:border-slate-700"
                    />
                    <button
                      id="chat-simulate-send-btn"
                      type="submit"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 hover:shadow-md animate-transition cursor-pointer"
                      title="Simulasi Kirim WhatsApp"
                    >
                      <Send className="h-4 w-4" />
                      <span>Kirim WA</span>
                    </button>
                  </form>
                </div>
              )}

              {/* PAGE 2: TASK LIST & MANAGEMENT */}
              {activeSubTab === 'tasks' && (() => {
                return (
                  <div className="space-y-6 flex flex-col h-full justify-between">
                    {/* Task List viewport */}
                    <div className="flex-1 space-y-5 pr-2 overflow-y-auto max-h-[290px] scrollbar-thin font-sans">
                      
                      {/* Section 1: Custom To-Do List */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <span>📌</span> Tugas To-Do CRM
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-850 text-slate-500 font-bold">
                            {tasks.filter(t => t.leadId === lead.id).length} Tugas
                          </span>
                        </div>

                        {tasks.filter(t => t.leadId === lead.id).length === 0 ? (
                          <div className="py-4 bg-slate-50/40 dark:bg-slate-800/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center text-slate-400 text-[11px]">
                            <span>📝</span>
                            <p className="mt-1 font-medium text-slate-400">Belum ada tugas CRM yang dibuat.</p>
                          </div>
                        ) : (
                          tasks.filter(t => t.leadId === lead.id).map((task) => (
                            editingTaskId === task.id ? (
                              <div 
                                key={task.id} 
                                className="p-3 bg-blue-50/30 dark:bg-slate-800/80 border border-blue-100/40 dark:border-slate-700 rounded-xl flex flex-col gap-3 font-sans"
                              >
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingTaskTodo}
                                    onChange={(e) => setEditingTaskTodo(e.target.value)}
                                    className="w-full p-2 text-xs bg-white dark:bg-slate-900 rounded-lg focus:outline-none border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                    placeholder="Deskripsi rencana tugas / To-Do..."
                                    required
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[9px] text-slate-400 dark:text-slate-500 block mb-0.5">Deadline</label>
                                      <input
                                        type="date"
                                        value={editingTaskDeadline}
                                        onChange={(e) => setEditingTaskDeadline(e.target.value)}
                                        className="w-full p-1.5 text-[11px] bg-white dark:bg-slate-900 rounded-md focus:outline-none border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-slate-400 dark:text-slate-500 block mb-0.5">Prioritas</label>
                                      <CustomSelect
                                        direction="up"
                                        value={editingTaskPriority}
                                        onChange={(val) => setEditingTaskPriority(val as 'High' | 'Medium' | 'Low')}
                                        options={[
                                          { value: 'High', label: 'Tinggi (High)' },
                                          { value: 'Medium', label: 'Sedang (Medium)' },
                                          { value: 'Low', label: 'Rendah (Low)' }
                                        ]}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => setEditingTaskId(null)}
                                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg flex items-center gap-1 transition"
                                  >
                                    <X className="h-3 w-3" />
                                    Batal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!editingTaskTodo.trim()) return;
                                      const updated: Task = {
                                        ...task,
                                        todo: editingTaskTodo,
                                        deadline: editingTaskDeadline,
                                        priority: editingTaskPriority
                                      };
                                      onUpdateTask(updated);
                                      onAddLog(`${userName} memperbarui tugas To-Do "${task.todo}" menjadi "${editingTaskTodo}" dengan deadline ${editingTaskDeadline}`);
                                      setEditingTaskId(null);
                                    }}
                                    className="px-2 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1 transition-all"
                                  >
                                    <Check className="h-3 w-3" />
                                    Simpan
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                key={task.id} 
                                className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={task.status === 'Completed'}
                                    onChange={() => {
                                      onToggleTask(task.id);
                                      onAddLog(`${userName} menandai tugas To-Do "${task.todo}" untuk ${lead.namaLengkap} sebagai ${task.status === 'Pending' ? 'SELESAI' : 'TERTUNDA'}`);
                                    }}
                                    className="h-4.5 w-4.5 accent-blue-600 rounded text-xs cursor-pointer"
                                  />
                                  <div>
                                    <p className={`text-xs font-bold ${task.status === 'Completed' ? 'line-through text-slate-400 italic' : 'text-slate-800 dark:text-slate-105'}`}>
                                      {task.todo}
                                    </p>
                                    <p className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold font-mono mt-0.5 flex items-center gap-1.5">
                                      <span>📅 Deadline: {task.deadline}</span>
                                      <span>&bull;</span>
                                      <span className={`font-sans font-extrabold px-1 rounded uppercase ${
                                        task.priority === 'High' ? 'bg-red-50 text-red-700' :
                                        task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                        'bg-blue-50 text-blue-600'
                                      }`}>
                                        {task.priority} Priority
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingTaskId(task.id);
                                      setEditingTaskTodo(task.todo);
                                      setEditingTaskDeadline(task.deadline);
                                      setEditingTaskPriority(task.priority);
                                    }}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 dark:text-slate-400 rounded-lg transition-colors"
                                    title="Edit tugas"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      onDeleteTask(task.id);
                                      onAddLog(`${userName} menghapus To-Do tugas "${task.todo}" milik ${lead.namaLengkap}`);
                                    }}
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )
                          ))
                        )}
                      </div>

                      {/* Section 2: Mentoring Checklist */}
                      {lead.stage === 'Completed' && (
                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                              <span>🎓</span> Checklist Mentoring
                            </span>
                            
                            {/* Phase selection tabs inside checklist */}
                            <div className="flex flex-wrap gap-1">
                              {(['Persiapan', 'Fase 1', 'Fase 2', 'Fase 3', 'Fase 4', 'Hasil Akhir'] as MentoringStage[]).map((stg) => {
                                const isCurrent = lead.mentoringStage === stg || (!lead.mentoringStage && stg === 'Persiapan');
                                const isActive = selectedChecklistStage === stg;
                                return (
                                  <button
                                    key={stg}
                                    type="button"
                                    onClick={() => setSelectedChecklistStage(stg)}
                                    className={`text-[9px] px-2 py-0.5 font-bold rounded-full transition-all cursor-pointer ${
                                      isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400'
                                    } ${isCurrent ? 'ring-1 ring-blue-400' : ''}`}
                                    title={isCurrent ? `${stg} (Fase Aktif Lead)` : stg}
                                  >
                                    {stg} {isCurrent && '🎯'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Checklist Items list */}
                          <div className="bg-slate-50/55 dark:bg-slate-850/40 border border-slate-100/60 dark:border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
                            {actualTemplates.filter(t => t.stage === selectedChecklistStage).length === 0 ? (
                              <p className="text-[11px] text-slate-400 text-center py-2">Tidak ada item checklist untuk tahap ini.</p>
                            ) : (
                              actualTemplates.filter(t => t.stage === selectedChecklistStage).map((template) => {
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
                                    className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        handleToggleChecklistItem(toggleKey, e.target.checked, template.text);
                                      }}
                                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer accent-blue-600 shrink-0"
                                    />
                                    <span className={`${isChecked ? "line-through text-slate-400 dark:text-slate-500 italic" : "font-medium text-slate-700 dark:text-slate-200"}`}>
                                      {template.text}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                  {/* Task Addition panel */}
                  <form onSubmit={handleTaskAdd} className="pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 grid grid-cols-1 sm:grid-cols-12 gap-3 font-sans">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        placeholder="Tambahkan aktivitas to-do baru..."
                        required
                        value={taskInput}
                        onChange={(e) => setTaskInput(e.target.value)}
                        className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none border border-slate-200/40 dark:border-slate-700"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="date"
                        value={taskDeadline}
                        onChange={(e) => setTaskDeadline(e.target.value)}
                        className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-850 rounded-xl focus:outline-none border border-slate-200/40 dark:border-slate-700 font-mono text-slate-600"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <CustomSelect
                        direction="up"
                        value={taskPriority}
                        onChange={(val: any) => setTaskPriority(val)}
                        options={[
                          { value: 'High', label: 'Tinggi' },
                          { value: 'Medium', label: 'Sedang' },
                          { value: 'Low', label: 'Rendah' }
                        ]}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <button
                        type="submit"
                        className="w-full h-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center p-2 cursor-pointer"
                        title="Tambahkan Tugas"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                </div>
              )})()}

              {/* PAGE 3: TIMELINE logs filtered for this lead */}
              {activeSubTab === 'logs' && (
                <div className="space-y-4 max-h-[290px] overflow-y-auto pr-2 scrollbar-thin font-sans">
                  {logs.filter(l => l.leadId === lead.id).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-10 text-center text-slate-400 text-xs">
                      <p className="font-semibold font-sans">Belum ada linimasa terekam untuk lead ini.</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Sistem menyatat perubahan status BANT, revisi pic, dan chat secara otomatis</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-5 space-y-5 py-2">
                      {logs.filter(l => l.leadId === lead.id).map((log) => (
                        <div key={log.id} className="relative">
                          {/* Chronological dots */}
                          <span className="absolute -left-7 top-0.5 bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-900 h-3 w-3 rounded-full flex items-center justify-center text-blue-600" />
                          <div className="space-y-1">
                            <p className="text-xs text-slate-755 dark:text-slate-300 font-medium leading-relaxed">
                              {log.aktivitas}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono flex items-center gap-1.5 uppercase font-bold">
                              <span>📅 {log.tanggal} at {log.jam}</span>
                              <span>&bull;</span>
                              <span>Staff: {log.user} ({log.role})</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {showEditForm && (
        <LeadForm
          lead={lead}
          onSave={(updatedLead) => {
            onSaveLead(updatedLead);
            setShowEditForm(false);
          }}
          onClose={() => setShowEditForm(false)}
          userName={userName}
          advisors={advisors}
          onManageAdvisorsClick={onManageAdvisorsClick}
          isArsul={isArsul}
          userRole={userRole}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
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
                    "{lead.namaLengkap}"
                  </span>{' '}
                  ini secara permanen? Seluruh riwayat chat, log, dan tugas terkait akan terhapus dari database.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200/50 dark:border-slate-700/50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteLead) {
                      onDeleteLead(lead.id);
                    }
                    setShowDeleteConfirm(false);
                    onClose();
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
