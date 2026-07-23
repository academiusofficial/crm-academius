import React, { useState, useEffect } from 'react';
import academiusLogo from './assets/images/regenerated_image_1784801332072.webp';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import LeadsTable from './components/LeadsTable';
import KanbanBoard from './components/KanbanBoard';
import LeadModal from './components/LeadModal';
import LeadForm from './components/LeadForm';
import AuthScreen from './components/AuthScreen';
import ManageAdvisorsModal from './components/ManageAdvisorsModal';
import { UserRole, Lead, Task, ActivityLog, ChatMessage, PipelineStage, Organization, MentoringStage, CustomChecklistItem, UserProfile } from './types';
import MentoringKanbanBoard from './components/MentoringKanbanBoard';
import ChecklistSettings from './components/ChecklistSettings';
import ManageAccounts from './components/ManageAccounts';
import { 
  getLeads, saveLead, deleteLeadDoc, 
  getTasks, saveTask, deleteTaskDoc, 
  getActivityLogs, addActivityLog, 
  getChats, addChat, getOrganizations, getOrganizationMembers,
  clearAllCrmData, saveUserProfile, getUserProfiles
} from './supabaseService';
import { ClipboardCheck, Calendar, Search, Filter, ShieldAlert, Check, Trash2, GraduationCap, RefreshCw } from 'lucide-react';
import { getMakassarDateString, getMakassarTimeString } from './utils';
import { supabase } from './supabaseClient';

export default function App() {
  // Authentication State
  const [user, setUser] = useState<{ email: string; displayName: string; role: UserRole; isApproved?: boolean } | null>(() => {
    const cached = localStorage.getItem('academius_session');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.email) {
          const emailLower = parsed.email.toLowerCase();
          if (emailLower === 'academius.official@gmail.com') {
            parsed.role = 'Admin CRM';
            parsed.isApproved = true;
          }
        }
        return parsed;
      } catch (e) {
        console.error('Error parsing session:', e);
      }
    }
    return null;
  });

  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const isArsul = user?.email?.toLowerCase() === 'academius.official@gmail.com';

  // Sync window.location.pathname changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Fetch real-time Supabase Auth state, protect private views, and handle auth session changes
  useEffect(() => {
    const syncSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setUser(null);
          localStorage.removeItem('academius_session');
          if (window.location.pathname !== '/login') {
            window.history.pushState({}, '', '/login');
            setCurrentPath('/login');
          }
        } else {
          const userEmail = session.user.email || '';
          const userDisplayName = session.user.user_metadata?.displayName || userEmail.split('@')[0];
          let userRole = (session.user.user_metadata?.role as UserRole) || 'Staff CRM';
          
          const profiles = await getUserProfiles();
          const matchedProfile = profiles.find(p => p.email.toLowerCase() === userEmail.toLowerCase());
          const isApproved = (userEmail.toLowerCase() === 'academius.official@gmail.com')
            ? true
            : (matchedProfile ? matchedProfile.isApproved !== false : (userEmail.toLowerCase() === 'alim.bahri@academius.com'));

          setUser({ email: userEmail, displayName: userDisplayName, role: userRole, isApproved });
          localStorage.setItem('academius_session', JSON.stringify({ email: userEmail, displayName: userDisplayName, role: userRole, isApproved }));
          
          // Save profile to database so it is registered in accounts list
          saveUserProfile({
            uid: session.user.id,
            email: userEmail,
            displayName: userDisplayName,
            role: userRole,
            isApproved
          });
          
          if (window.location.pathname === '/login') {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
          }
        }
      } catch (err) {
        console.error('Error verifying active session:', err);
      }
    };
    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const userEmail = session.user.email || '';
        const userDisplayName = session.user.user_metadata?.displayName || userEmail.split('@')[0];
        let userRole = (session.user.user_metadata?.role as UserRole) || 'Staff CRM';
        
        const profiles = await getUserProfiles();
        const matchedProfile = profiles.find(p => p.email.toLowerCase() === userEmail.toLowerCase());
        const isApproved = (userEmail.toLowerCase() === 'academius.official@gmail.com')
          ? true
          : (matchedProfile ? matchedProfile.isApproved !== false : (userEmail.toLowerCase() === 'alim.bahri@academius.com'));

        setUser({ email: userEmail, displayName: userDisplayName, role: userRole, isApproved });
        localStorage.setItem('academius_session', JSON.stringify({ email: userEmail, displayName: userDisplayName, role: userRole, isApproved }));
        
        // Save profile to database so it is registered in accounts list
        saveUserProfile({
          uid: session.user.id,
          email: userEmail,
          displayName: userDisplayName,
          role: userRole,
          isApproved
        });
        
        if (window.location.pathname === '/login') {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }
      } else {
        setUser(null);
        localStorage.removeItem('academius_session');
        if (window.location.pathname !== '/login') {
          window.history.pushState({}, '', '/login');
          setCurrentPath('/login');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Global CRM Database State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  
  // Deklarasikan di dalam komponen App di /src/App.tsx
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    return localStorage.getItem('academius_active_org_id') || null;
  });
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [successToast, setSuccessToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: ''
  });

  const triggerSuccessToast = (message: string) => {
    setSuccessToast({ show: true, message });
    setTimeout(() => {
      setSuccessToast(prev => prev.message === message ? { show: false, message: '' } : prev);
    }, 4000);
  };

  // Navigation & Modal toggles
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showAddLeadForm, setShowAddLeadForm] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Advisors List State (Persisted in localStorage)
  const [advisors, setAdvisors] = useState<string[]>(() => {
    const saved = localStorage.getItem('academius_advisors');
    return saved ? JSON.parse(saved) : ['Rina Counselor', 'Rian Counselor', 'Andi Counselor'];
  });
  const [showManageAdvisors, setShowManageAdvisors] = useState<boolean>(false);

  // Sync advisors state with LocalStorage
  useEffect(() => {
    localStorage.setItem('academius_advisors', JSON.stringify(advisors));
  }, [advisors]);

  // Confirmation States
  const [showClearDbConfirm, setShowClearDbConfirm] = useState(false);

  // Checklist Templates State
  const [checklistTemplates, setChecklistTemplates] = useState<CustomChecklistItem[]>(() => {
    const cached = localStorage.getItem('academius_mentoring_checklist_templates');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(e);
      }
    }
    return [
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
  });

  const handleAddChecklistTemplate = (stage: MentoringStage, text: string) => {
    const newItem: CustomChecklistItem = {
      id: `custom_${stage.toLowerCase().replace(/\s+/g, '')}_${Date.now()}`,
      stage,
      text
    };
    const updated = [...checklistTemplates, newItem];
    setChecklistTemplates(updated);
    localStorage.setItem('academius_mentoring_checklist_templates', JSON.stringify(updated));
  };

  const handleDeleteChecklistTemplate = (id: string) => {
    const updated = checklistTemplates.filter(item => item.id !== id);
    setChecklistTemplates(updated);
    localStorage.setItem('academius_mentoring_checklist_templates', JSON.stringify(updated));
  };

  const handleUpdateChecklistTemplate = (id: string, updatedText: string, updatedStage?: MentoringStage) => {
    const updated = checklistTemplates.map(item => {
      if (item.id === id) {
        return {
          ...item,
          text: updatedText,
          ...(updatedStage ? { stage: updatedStage } : {})
        };
      }
      return item;
    });
    setChecklistTemplates(updated);
    localStorage.setItem('academius_mentoring_checklist_templates', JSON.stringify(updated));
  };

  const handleResetChecklistTemplates = () => {
    const defaults = [
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
    setChecklistTemplates(defaults);
    localStorage.setItem('academius_mentoring_checklist_templates', JSON.stringify(defaults));
  };

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('academius_darkmode');
    return saved === 'true';
  });

  // Fetch Database on user authentication
  useEffect(() => {
    if (user) {
      loadCrmDatabase();
    }
  }, [user]);

  // Dark Mode Syncing
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('academius_darkmode', String(isDarkMode));
  }, [isDarkMode]);

  // Cari fungsi loadCrmDatabase di /src/App.tsx dan update:
  const loadCrmDatabase = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil daftar organisasi/tim yang terafiliasi
      const orgList = await getOrganizations();
      setOrganizations(orgList);
      
      // Tentukan org default pertama jika user belum memilih sama sekali (Staff CRM wajib terikat ke tim tertentu)
      let activeOrg = selectedOrgId;
      if (user?.role === 'Staff CRM' && !activeOrg && orgList.length > 0) {
        activeOrg = orgList[0].id;
        setSelectedOrgId(activeOrg);
        localStorage.setItem('academius_active_org_id', activeOrg);
      }

      // 2. Ambil leads berdasarkan organisasi aktif
      const leadsData = await getLeads(activeOrg);
      setLeads(leadsData);
      
      // 3. Ambil list anggota tim aktif
      const membersData = await getOrganizationMembers(activeOrg);
      setOrgMembers(membersData);
      
      // Ambil tasks, logs dll seperti biasa...
      const tasksData = await getTasks();
      setTasks(tasksData);
      const logsData = await getActivityLogs();
      setLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Pastikan memicu reload database ketika user mengganti pilihan tim aktif
  useEffect(() => {
    if (user) {
      loadCrmDatabase();
    }
  }, [user, selectedOrgId]); // Perhatikan dependensi "selectedOrgId" ditambahkan di sini

  const handleLogin = async (email: string, displayName: string, role: UserRole, uid?: string) => {
    const profiles = await getUserProfiles();
    const matchedProfile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    const isApproved = (email.toLowerCase() === 'academius.official@gmail.com')
      ? true
      : (matchedProfile ? matchedProfile.isApproved !== false : (email.toLowerCase() === 'alim.bahri@academius.com'));

    const sessionUser = { email, displayName, role, isApproved };
    setUser(sessionUser);
    localStorage.setItem('academius_session', JSON.stringify(sessionUser));
    
    // Save profile to database so it is registered in accounts list
    saveUserProfile({
      uid: uid || matchedProfile?.uid || `user_${Date.now()}`,
      email,
      displayName,
      role,
      isApproved
    });

    // Add login log
    appendAuditLog('System Access', role, `Staf ${displayName} (${role}) berhasil login ke sistem CRM.`);

    // Redirect the user to the Home page ("/")
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
  };

  const handleLogout = async () => {
    if (user) {
      appendAuditLog('System Access', user.role, `Staf ${user.displayName} keluar dari sesi CRM.`);
    }
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('academius_session');
    setActiveTab('dashboard');

    if (window.location.pathname !== '/login') {
      window.history.pushState({}, '', '/login');
      setCurrentPath('/login');
    }
  };

  // Helper code to inject Activity Logs
  const appendAuditLog = async (targetLeadId: string, role: UserRole, actionText: string) => {
    const formatTime = getMakassarTimeString();
    const formatDate = getMakassarDateString();

    const newLog: ActivityLog = {
      id: `log_${Math.random().toString(36).substring(2, 9)}`,
      leadId: targetLeadId,
      tanggal: formatDate,
      jam: formatTime,
      user: user ? user.displayName : 'System Admin CRM',
      role: user ? user.role : 'Admin CRM',
      aktivitas: actionText
    };

    await addActivityLog(newLog);
    // Reload logs
    const updatedLogs = await getActivityLogs();
    setLogs(updatedLogs);
  };

  // ---------------------- DATABASE MANIPULATIONS ----------------------

  // Save / Update Lead Handler
  // Cari fungsi handleSaveLead di /src/App.tsx
  const handleSaveLead = async (savedLead: Lead) => {
    const isNew = !leads.some(l => l.id === savedLead.id);

    // Sembari menyimpan, pastikan kita mengikat dengan tim aktif (jika buat baru)
    const leadWithOrg: Lead = {
      ...savedLead,
      organization_id: savedLead.organization_id || selectedOrgId || undefined,
      creator_name: savedLead.creator_name || (isNew ? (user?.displayName || 'Staff CRM') : undefined),
      creator_role: savedLead.creator_role || (isNew ? (user?.role || 'Admin CRM') : undefined)
    };

    // Panggil service untuk menyimpan ke database cloud Supabase
    await saveLead(leadWithOrg);
    
    // Refresh database lokal di state React
    await loadCrmDatabase();

    // Close the form modal
    setShowAddLeadForm(false);

     // Write audit activity log
    const logText = isNew 
      ? `Staf memasukkan lead baru bernama ${savedLead.namaLengkap} (${savedLead.jenjangStudi} ke ${savedLead.targetNegara}) melalui ${savedLead.sumberLeads}`
      : `Staf memperbarui biodata lengkap profil milik ${savedLead.namaLengkap}`;
    
    await appendAuditLog(savedLead.id, user?.role || 'Staff CRM', logText);

    // Trigger success notification toast
    const msg = isNew 
      ? `Berhasil menambahkan data lead baru: ${savedLead.namaLengkap}`
      : `Berhasil memperbarui data lead: ${savedLead.namaLengkap}`;
    triggerSuccessToast(msg);
  };

  // Delete Lead Handler (Admin CRM only!)
  const handleDeleteLead = async (leadId: string) => {
    const leadToDelete = leads.find(l => l.id === leadId);
    if (!leadToDelete) return;

    await deleteLeadDoc(leadId);
    await loadCrmDatabase();

    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
    }

    await appendAuditLog('leads_database', user?.role || 'Admin CRM', `Menghapus data lead "${leadToDelete.namaLengkap}" (${leadToDelete.leadId}) dari database.`);
  };

  // Drag and drop Stage change handler
  const handleStageChange = async (leadId: string, newStage: PipelineStage) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    const oldStage = targetLead.stage;
    const updatedLead: Lead = {
      ...targetLead,
      stage: newStage,
      lastUpdated: new Date().toISOString()
    };

    await saveLead(updatedLead);
    await loadCrmDatabase();

    const logText = `Mengubah status jalur pipeline ${targetLead.namaLengkap} dari [${oldStage}] menjadi [${newStage}]`;
    await appendAuditLog(leadId, user?.role || 'Staff CRM', logText);
  };

  // Drag and drop Mentoring Stage change handler
  const handleMentoringStageChange = async (leadId: string, newMentoringStage: MentoringStage) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    const oldStage = targetLead.mentoringStage || 'Persiapan';
    const updatedLead: Lead = {
      ...targetLead,
      mentoringStage: newMentoringStage,
      lastUpdated: new Date().toISOString()
    };

    await saveLead(updatedLead);
    await loadCrmDatabase();

    const logText = `Mengubah status mentoring ${targetLead.namaLengkap} dari [${oldStage}] menjadi [${newMentoringStage}]`;
    await appendAuditLog(leadId, user?.role || 'Staff CRM', logText);
  };

  // Chats Handlers
  const handleAddChatMessage = async (chat: ChatMessage) => {
    await addChat(chat);
    if (selectedLeadId) {
      const updatedChats = await getChats(selectedLeadId);
      setChats(updatedChats);
    }
  };

  // Tasks Handlers
  const handleAddTaskMessage = async (task: Task) => {
    await saveTask(task);
    const freshTasks = await getTasks();
    setTasks(freshTasks);
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      status: task.status === 'Pending' ? 'Completed' : 'Pending'
    };

    await saveTask(updatedTask);
    const freshTasks = await getTasks();
    setTasks(freshTasks);
  };

  const handleClearDatabase = async () => {
    setIsLoading(true);
    try {
      await clearAllCrmData();
      setLeads([]);
      setTasks([]);
      setLogs([]);
      setChats([]);
      triggerSuccessToast("Seluruh data CRM berhasil dihapus permanently.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTaskMessage = async (taskId: string) => {
    await deleteTaskDoc(taskId);
    const freshTasks = await getTasks();
    setTasks(freshTasks);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    await saveTask(updatedTask);
    const freshTasks = await getTasks();
    setTasks(freshTasks);
  };

  // Open detail modal with live chats prefetching
  const handleOpenLeadDetails = async (leadId: string) => {
    setSelectedLeadId(leadId);
    const chatData = await getChats(leadId);
    setChats(chatData);
  };

  // Filter leads based on logged-in counselor if role is Staff CRM, or show all for Admin CRM
  const displayedLeads = React.useMemo(() => {
    if (user?.role === 'Staff CRM') {
      return leads.filter(l => {
        const picName = l.pic && l.pic.includes('|') ? l.pic.split('|')[0] : l.pic;
        const matchesPic = picName === user.displayName;
        const matchesOrg = !selectedOrgId || l.organization_id === selectedOrgId;
        return matchesPic && matchesOrg;
      });
    }
    // Jika Admin CRM atau Manager CRM, filter berdasarkan selectedOrgId jika diset.
    // Jika tidak diset (Semua Organisasi / Global), tampilkan seluruh data leads secara lengkap!
    if (user?.role === 'Admin CRM' || user?.role === 'Manager CRM') {
      if (!selectedOrgId) return leads;
      return leads.filter(l => l.organization_id === selectedOrgId || !l.organization_id);
    }
    return leads;
  }, [leads, user, selectedOrgId]);

  // Filter tasks based on logged-in counselor if role is Staff CRM, or show all for Admin CRM/Manager
  const displayedTasks = React.useMemo(() => {
    if (user?.role === 'Staff CRM') {
      return tasks.filter(t => {
        const picName = t.pic && t.pic.includes('|') ? t.pic.split('|')[0] : t.pic;
        const matchesPic = picName === user.displayName;
        const associatedLead = leads.find(l => l.id === t.leadId);
        const matchesOrg = !selectedOrgId || (associatedLead && associatedLead.organization_id === selectedOrgId);
        return matchesPic && matchesOrg;
      });
    }
    if (user?.role === 'Admin CRM' || user?.role === 'Manager CRM') {
      if (!selectedOrgId) return tasks;
      return tasks.filter(t => {
        const associatedLead = leads.find(l => l.id === t.leadId);
        return !associatedLead || !associatedLead.organization_id || associatedLead.organization_id === selectedOrgId;
      });
    }
    return tasks;
  }, [tasks, leads, user, selectedOrgId]);

  // Render view controller based on sidebar active tab
  const renderTabContent = () => {
    if (isLoading && leads.length === 0) {
      return (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
          <span className="text-xs">Menghubungkan ke database Academius...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            leads={displayedLeads} 
            onOpenLead={handleOpenLeadDetails}
            userRole={user?.role || 'Staff CRM'}
            isArsul={isArsul}
            userName={user?.displayName || ''}
          />
        );
      case 'leads':
        return (
          <LeadsTable
            leads={displayedLeads}
            onOpenLead={handleOpenLeadDetails}
            onAddLeadClick={() => setShowAddLeadForm(true)}
            onDeleteLead={handleDeleteLead}
            userRole={user?.role || 'Staff CRM'}
            userName={user?.displayName || 'Staff'}
            advisors={advisors}
            isArsul={isArsul}
          />
        );
      case 'pipeline':
        return (
          <KanbanBoard
            leads={displayedLeads}
            onStageChange={handleStageChange}
            onOpenLead={handleOpenLeadDetails}
            onDeleteLead={handleDeleteLead}
            userRole={user?.role || 'Staff CRM'}
            isArsul={isArsul}
          />
        );
      case 'mentoring':
        return (
          <MentoringKanbanBoard
            leads={displayedLeads}
            onMentoringStageChange={handleMentoringStageChange}
            onOpenLead={handleOpenLeadDetails}
            onSaveLead={handleSaveLead}
            userRole={user?.role || 'Staff CRM'}
            isArsul={isArsul}
            checklistTemplates={checklistTemplates}
            userName={user?.displayName || 'Counselor'}
            onAddLog={async (leadId, txt) => {
              await appendAuditLog(leadId, user?.role || 'Staff CRM', txt);
            }}
          />
        );
      case 'checklist-settings':
        return (
          <ChecklistSettings
            checklistTemplates={checklistTemplates}
            onAddTemplate={handleAddChecklistTemplate}
            onDeleteTemplate={handleDeleteChecklistTemplate}
            onUpdateTemplate={handleUpdateChecklistTemplate}
            onResetTemplates={handleResetChecklistTemplates}
          />
        );
      case 'tasks':
        return renderDedicatedTasksSection();
      case 'manage-accounts':
        return (
          <ManageAccounts 
            currentUserEmail={user?.email}
            onAddLog={async (txt) => {
              await appendAuditLog('system_accounts', user?.role || 'Admin CRM', txt);
            }}
            onProfileUpdated={(updatedProfile) => {
              const isCurrentUser = user && user.email.toLowerCase() === updatedProfile.email.toLowerCase();
              
              if (isCurrentUser) {
                const sessionUser = {
                  email: updatedProfile.email,
                  displayName: updatedProfile.displayName,
                  role: updatedProfile.role,
                  isApproved: updatedProfile.isApproved !== false
                };
                setUser(sessionUser);
                localStorage.setItem('academius_session', JSON.stringify(sessionUser));
                appendAuditLog('System Access', updatedProfile.role, `Profil sendiri diperbarui: ${updatedProfile.displayName} (${updatedProfile.role}).`);
                
                // Reload database for the new user context
                loadCrmDatabase();
                
                // If the new role doesn't have access to ManageAccounts, redirect to dashboard
                const isArsul = updatedProfile.email.toLowerCase() === 'academius.official@gmail.com';
                if (updatedProfile.role !== 'Admin CRM' && !isArsul) {
                  setActiveTab('dashboard');
                }
                
                triggerSuccessToast(`Berhasil memperbarui profil Anda sendiri!`);
              } else {
                // If editing another user's profile, we stay logged in as the current admin
                // Just refresh the CRM database to make sure any local views reflect the changes
                loadCrmDatabase();
                triggerSuccessToast(`Berhasil memperbarui profil akun ${updatedProfile.displayName}.`);
              }
            }}
          />
        );
      default:
        return <div>Halaman tidak ditemukan</div>;
    }
  };

  // Dedicated full-page tasks management screen inside 'tasks' tab
  const renderDedicatedTasksSection = () => {
    const pendingTasks = displayedTasks.filter(t => t.status === 'Pending');
    const completedTasks = displayedTasks.filter(t => t.status === 'Completed');

    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-300 font-sans">
        <div>
          <h2 className="font-display font-black text-2xl dark:text-white" style={{ color: '#136386' }}>Daftar Penugasan & Reminders</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Eksplorasi seluruh to-do list follow up, cetak reminders hari ini, dan tandai kelar pekerjaan.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main task list display */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl overflow-hidden p-6 space-y-6">
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-800 dark:text-slate-200">Tugas Aktif Terlayani</h3>
              <p className="text-slate-400 text-xs mt-1 border border-[#e2e8f0] dark:border-slate-800/80 rounded-lg px-2.5 py-0.5 w-fit bg-slate-50/40 dark:bg-slate-900/20 font-sans">Total {pendingTasks.length} tugas menunggu respon dari total {displayedTasks.length} to-do.</p>
            </div>

            <div className="space-y-4">
              {pendingTasks.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl text-slate-400 italic text-xs">
                  Sempurna! Semua renana tugas follow up counselor telah diselesaikan dengan baik.
                </div>
              ) : (
                pendingTasks.map(task => (
                  <div key={task.id} className="p-4 bg-slate-50 dark:bg-slate-850/50 hover:bg-blue-50/20 dark:hover:bg-slate-800 rounded-2xl border border-[#e2e8f0] dark:border-slate-800 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={false}
                        onChange={() => {
                          handleToggleTaskStatus(task.id);
                          appendAuditLog(task.leadId, user?.role || 'Staff CRM', `Menyelesaikan tugas To-Do "${task.todo}" untuk ${task.leadName}`);
                        }}
                        className="h-5 w-5 rounded accent-blue-600 cursor-pointer"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{task.todo}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-semibold font-mono">
                          <span className="text-blue-600 dark:text-blue-400 font-sans font-bold hover:underline cursor-pointer" onClick={() => handleOpenLeadDetails(task.leadId)}>
                            🎯 Lead: {task.leadName}
                          </span>
                          <span>&bull;</span>
                          <span>📆 Deadline: {task.deadline}</span>
                          <span>&bull;</span>
                          <span className={`px-1.5 rounded uppercase ${
                            task.priority === 'High' ? 'bg-red-50 text-red-600' :
                            task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>{task.priority} Priority</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        handleDeleteTaskMessage(task.id);
                        appendAuditLog(task.leadId, user?.role || 'Staff CRM', `Menghapus tugas To-Do "${task.todo}" milik ${task.leadName}`);
                      }}
                      className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg group-hover:opacity-100 opacity-20 transition-all duration-150"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Completed Tasks Log */}
            {completedTasks.length > 0 && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Tugas Selesai (Completed Log)</h4>
                <div className="space-y-3.5 opacity-60">
                  {completedTasks.map(task => (
                    <div key={task.id} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox"
                          checked={true}
                          onChange={() => {
                            handleToggleTaskStatus(task.id);
                            appendAuditLog(task.leadId, user?.role || 'Staff CRM', `Mengaktifkan kembali tugas To-Do "${task.todo}" untuk ${task.leadName}`);
                          }}
                          className="h-4 w-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-through italic">{task.todo}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Sapa: {task.leadName} &bull; Selesai dikerjakan</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Quick Stats panel for task deadlines */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="font-display font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider block">Statistik Hari Ini</h4>
            
            <div className="p-4 bg-red-50/40 dark:bg-red-950/10 border border-red-100 dark:border-red-950 rounded-2xl flex items-center gap-3.5">
              <span className="text-2xl shrink-0">📆</span>
              <div>
                <span className="text-[10px] font-bold text-red-700/80 uppercase block">DEADLINE HARI INI: {getMakassarDateString()}</span>
                <span className="font-display font-black text-base text-red-800 dark:text-red-400 mt-0.5 block">
                  {displayedTasks.filter(t => t.status === 'Pending' && t.deadline === getMakassarDateString()).length} Tugas
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3.5">
              <span className="text-2xl shrink-0">🔥</span>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">PRIORITAS TINGGI</span>
                <span className="font-display font-black text-base text-slate-705 dark:text-slate-200 mt-0.5 block">
                  {displayedTasks.filter(t => t.status === 'Pending' && t.priority === 'High').length} Tugas
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  };

  // Secure Role authorization screens logic
  if (!user || currentPath === '/login') {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  // Check if account is approved by Owner CRM
  if (user.isApproved === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#42B8D5] to-[#136386] flex flex-col items-center justify-center p-6 font-sans transition-colors duration-200">
        <div className="flex items-center justify-center mb-8">
          <img 
            src={academiusLogo} 
            alt="Academius CRM System" 
            className="h-16 w-auto object-contain max-w-[260px]"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200/50 dark:border-slate-800/80 text-center space-y-6 animate-in zoom-in-95 duration-250">
          <div className="mx-auto h-16 w-16 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center border border-amber-100 dark:border-amber-900/40">
            <ShieldAlert className="h-8 w-8 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-display font-extrabold text-lg text-slate-805 dark:text-white">Persetujuan Akun Tertunda</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Halo <span className="font-bold text-slate-800 dark:text-slate-100">{user.displayName}</span>, pendaftaran Anda berhasil disimpan. Namun, level akses peran <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold dark:bg-amber-950/35 dark:text-amber-300">{user.role === 'Admin CRM' ? 'Admin CRM' : user.role === 'Manager CRM' ? 'Manager CRM' : 'Staff CRM'}</span> memerlukan persetujuan manual dari Admin CRM sebelum Anda dapat masuk ke dalam sistem.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold font-mono leading-relaxed">
            STATUS: MENUNGGU PERSETUJUAN DARI ADMIN
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={async () => {
                // Refresh status
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  const profiles = await getUserProfiles();
                  const matchedProfile = profiles.find(p => p.email.toLowerCase() === session.user.email?.toLowerCase());
                  const isApproved = (session.user.email?.toLowerCase() === 'academius.official@gmail.com')
                    ? true
                    : (matchedProfile ? matchedProfile.isApproved !== false : false);
                  if (isApproved) {
                    const updatedUser = { ...user, isApproved: true };
                    setUser(updatedUser);
                    localStorage.setItem('academius_session', JSON.stringify(updatedUser));
                  } else {
                    triggerSuccessToast("Status akun Anda masih pending. Hubungi Owner CRM.");
                  }
                } else {
                  // Fallback for local simulation users
                  const profiles = await getUserProfiles();
                  const matchedProfile = profiles.find(p => p.email.toLowerCase() === user.email.toLowerCase());
                  const isApproved = (user.email.toLowerCase() === 'academius.official@gmail.com')
                    ? true
                    : (matchedProfile ? matchedProfile.isApproved !== false : false);
                  if (isApproved) {
                    const updatedUser = { ...user, isApproved: true };
                    setUser(updatedUser);
                    localStorage.setItem('academius_session', JSON.stringify(updatedUser));
                  } else {
                    triggerSuccessToast("Status akun Anda masih pending. Hubungi Owner CRM.");
                  }
                }
              }}
              className="w-full py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              style={{ backgroundColor: '#42b8d5' }}
            >
              <RefreshCw className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
              <span>Perbarui Status Persetujuan</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Keluar Sesi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Sidebar Navigation Left panel */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={user.role}
        userName={user.displayName}
        userEmail={user.email}
        onAddLeadClick={() => setShowAddLeadForm(true)}
        onManageAdvisorsClick={() => setShowManageAdvisors(true)}
        onClearDatabaseClick={() => setShowClearDbConfirm(true)}
      />

      {/* Main viewport Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navbar */}
        <Navbar 
          userRole={user.role}
          setUserRole={(newRole) => {
            const updatedUser = { ...user, role: newRole };
            setUser(updatedUser);
            localStorage.setItem('academius_session', JSON.stringify(updatedUser));
            appendAuditLog('role_mutations', user.role, `Staf mendelegasikan perpindahan role simulasi menjadi: [${newRole}]`);
          }}
          userName={user.displayName}
          userEmail={user.email}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          leads={leads}
          tasks={tasks}
          onOpenLead={handleOpenLeadDetails}
          organizations={organizations}
          selectedOrgId={selectedOrgId}
          setSelectedOrgId={setSelectedOrgId}
          orgMembers={orgMembers}
        />

        {/* Content Box */}
        <main className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-thin">
          {renderTabContent()}
        </main>

      </div>

      {/* Lead Detail Page modal */}
      {selectedLeadId && (
        <LeadModal
          leadId={selectedLeadId}
          leads={leads}
          onSaveLead={handleSaveLead}
          onDeleteLead={handleDeleteLead}
          onClose={() => setSelectedLeadId(null)}
          chats={chats}
          onAddChat={handleAddChatMessage}
          tasks={tasks}
          onAddTask={handleAddTaskMessage}
          onToggleTask={handleToggleTaskStatus}
          onDeleteTask={handleDeleteTaskMessage}
          onUpdateTask={handleUpdateTask}
          logs={logs}
          onAddLog={async (txt) => {
            await appendAuditLog(selectedLeadId, user.role, txt);
          }}
          userRole={user.role}
          userName={user.displayName}
          advisors={advisors}
          onManageAdvisorsClick={isArsul || user.role === 'Staff CRM' ? undefined : () => setShowManageAdvisors(true)}
          isArsul={isArsul}
          checklistTemplates={checklistTemplates}
        />
      )}

      {/* Adding Lead Modal Form */}
      {showAddLeadForm && (
        <LeadForm
          onSave={handleSaveLead}
          onClose={() => setShowAddLeadForm(false)}
          userName={user.displayName}
          advisors={advisors}
          onManageAdvisorsClick={isArsul || user.role === 'Staff CRM' ? undefined : () => setShowManageAdvisors(true)}
          isArsul={isArsul}
          userRole={user.role}
        />
      )}

      {/* Manage Advisors Modal */}
      {showManageAdvisors && !isArsul && (
        <ManageAdvisorsModal
          advisors={advisors}
          onUpdateAdvisors={setAdvisors}
          onClose={() => setShowManageAdvisors(false)}
        />
      )}

      {/* Custom Confirmation Modal for Permanent DB Clearance */}
      {showClearDbConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1d293d] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h4 className="font-display font-bold text-base">Hapus Seluruh Data CRM?</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus seluruh data CRM secara permanen? Tindakan ini tidak dapat dibatalkan dan akan membersihkan database Anda.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearDbConfirm(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  setShowClearDbConfirm(false);
                  await handleClearDatabase();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast Notification */}
      {successToast.show && (
        <div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-200 dark:border-slate-800 max-w-sm border-l-4 border-l-emerald-500 animate-in fade-in slide-in-from-top-4 duration-300"
          id="success-toast-container"
        >
          <div className="bg-emerald-100 dark:bg-emerald-950/50 p-2 rounded-xl flex items-center justify-center">
            <Check className="h-4 text-emerald-600 dark:text-emerald-450 stroke-[3]" />
          </div>
          <div className="flex-1">
            <h4 className="font-display font-bold text-[10px] uppercase tracking-wider text-emerald-650 dark:text-emerald-450">Berhasil</h4>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 leading-snug">{successToast.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}
