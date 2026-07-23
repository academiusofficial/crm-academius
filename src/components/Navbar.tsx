import React, { useState } from 'react';
import { 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  AlertTriangle,
  Flame,
  Clock,
  Briefcase,
  Trash2
} from 'lucide-react';
import { UserRole, Lead, Task, Organization } from '../types';
import { getLeadStatus, getMakassarDateString } from '../utils';
import CustomSelect from './CustomSelect';

interface NavbarProps {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  leads: Lead[];
  tasks: Task[];
  onOpenLead: (leadId: string) => void;
  organizations?: Organization[];
  selectedOrgId?: string | null;
  setSelectedOrgId?: (orgId: string | null) => void;
  orgMembers?: any[];
}

export default function Navbar({ 
  userRole, 
  setUserRole, 
  userName, 
  userEmail, 
  onLogout, 
  isDarkMode, 
  setIsDarkMode,
  leads,
  tasks,
  onOpenLead,
  organizations,
  selectedOrgId,
  setSelectedOrgId,
  orgMembers
}: NavbarProps) {
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_dismissed_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dismissNotification = (id: string) => {
    const newDismissed = [...dismissedNotificationIds, id];
    setDismissedNotificationIds(newDismissed);
    localStorage.setItem('crm_dismissed_notifications', JSON.stringify(newDismissed));
  };

  const clearAllNotifications = (idsToDismiss: string[]) => {
    const newDismissed = [...dismissedNotificationIds, ...idsToDismiss];
    setDismissedNotificationIds(newDismissed);
    localStorage.setItem('crm_dismissed_notifications', JSON.stringify(newDismissed));
  };

  // Compute live notifications
  const todayStr = getMakassarDateString(); // Current Makassar date
  const isGlobalAccess = userRole === 'Admin CRM' || userRole === 'Manager CRM';

  const isLeadBelongsToUser = (lead: Lead) => {
    if (isGlobalAccess) return true;
    if (lead.pic && lead.pic !== 'Unassigned') {
      const picName = lead.pic.split('|')[0].trim().toLowerCase();
      if (picName === userName.toLowerCase()) {
        return true;
      }
    }
    if (lead.creator_name && lead.creator_name.toLowerCase() === userName.toLowerCase()) {
      return true;
    }
    return false;
  };

  const isTaskBelongsToUser = (task: Task) => {
    if (isGlobalAccess) return true;
    if (task.pic && task.pic !== 'Unassigned') {
      const picName = task.pic.split('|')[0].trim().toLowerCase();
      if (picName === userName.toLowerCase()) {
        return true;
      }
    }
    return false;
  };

  const notifications: Array<{
    id: string;
    title: string;
    description: string;
    type: 'hot' | 'task' | 'reactivate' | 'followup';
    leadId?: string;
    actionLabel?: string;
  }> = [];

  // 1. Follow up today
  leads.forEach(lead => {
    if (lead.tanggalFollowUpTerakhir && lead.tanggalFollowUpTerakhir.startsWith(todayStr) && lead.stage !== 'Enrolled' && lead.stage !== 'Completed') {
      if (isLeadBelongsToUser(lead)) {
        notifications.push({
          id: `fu-${lead.id}`,
          title: '📆 Follow-up Hari Ini',
          description: `Jadwal follow-up untuk ${lead.namaLengkap} (${lead.targetNegara})`,
          type: 'followup',
          leadId: lead.id,
          actionLabel: 'Sapa WhatsApp'
        });
      }
    }
  });

  // 2. Hot Leads belum dihubungi
  leads.forEach(lead => {
    const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
    if (status === 'HOT' && (!lead.tanggalFollowUpTerakhir || lead.stage === 'New Lead')) {
      if (isLeadBelongsToUser(lead)) {
        notifications.push({
          id: `hot-contact-${lead.id}`,
          title: '🔥 Lead HOT Belum Dihubungi',
          description: `${lead.namaLengkap} mendesak dibantu ke ${lead.targetNegara}!`,
          type: 'hot',
          leadId: lead.id,
          actionLabel: 'Tindak Lanjut'
        });
      }
    }
  });

  // 3. Task overdue
  tasks.forEach(task => {
    if (task.status === 'Pending' && task.deadline < todayStr) {
      if (isTaskBelongsToUser(task)) {
        notifications.push({
          id: `task-od-${task.id}`,
          title: '🚨 Tugas Terlambat (Overdue)',
          description: `Tugas "${task.todo.slice(0, 30)}..." melewati deadline!`,
          type: 'task',
          leadId: task.leadId,
          actionLabel: 'Lihat Detail'
        });
      }
    }
  });

  // 4. Reaktivasi required
  leads.forEach(lead => {
    const status = getLeadStatus(lead.bant, lead.tanggalFollowUpTerakhir, lead.tanggalMasuk);
    if (status === 'REAKTIVASI') {
      if (isLeadBelongsToUser(lead)) {
        notifications.push({
          id: `reactivate-${lead.id}`,
          title: '🔄 Butuh Reaktivasi',
          description: `Sapa kembali ${lead.namaLengkap} (tidak ada interaksi >60 hari)`,
          type: 'reactivate',
          leadId: lead.id,
          actionLabel: 'Kirim Penawaran'
        });
      }
    }
  });

  const activeNotifications = notifications.filter(n => !dismissedNotificationIds.includes(n.id));

  const roles: UserRole[] = ['Admin CRM', 'Staff CRM', 'Manager CRM'];

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
      {/* Search Bar Placeholder or Title */}
      <div className="flex items-center gap-4">
        <h2 className="font-poppins font-semibold text-slate-800 dark:text-slate-100 text-lg sm:block hidden">
          Workspace CRM
        </h2>
        
        {organizations && organizations.length > 0 && setSelectedOrgId && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-sans text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium select-none shrink-0">Organisasi/Tim:</span>
              <CustomSelect
                id="active-org-selector-select"
                value={selectedOrgId || ''}
                onChange={(val) => setSelectedOrgId(val || null)}
                className="w-52"
                options={[
                  ...(userRole === 'Admin CRM' || userRole === 'Manager CRM' ? [{ value: '', label: 'Semua Organisasi (Global)' }] : []),
                  ...organizations.map(org => ({ value: org.id, label: org.name }))
                ]}
              />
            </div>
            
            {orgMembers !== undefined && (
              <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {orgMembers.length} Anggota Terdaftar
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        
        {/* Light/Dark Mode Switcher */}
        <button
          id="darkmode-toggle-btn"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/40 transition-colors"
          title="Toggle Tema"
        >
          {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        {/* Real-time Notification Alert Icon with Badge */}
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/40 transition-colors relative"
          >
            <Bell className="h-4.5 w-4.5" />
            {activeNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white font-sans text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {activeNotifications.length}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <>
              <div className="fixed inset-0 z-50Close" onClick={() => setShowNotificationMenu(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-55 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <h4 className="font-display font-bold text-sm text-slate-800 dark:text-white">Notifikasi Pengingat</h4>
                  {activeNotifications.length > 0 ? (
                    <button
                      onClick={() => clearAllNotifications(activeNotifications.map(n => n.id))}
                      className="text-[9px] bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-[#ff6467] px-2.5 py-1 rounded-full font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer border border-red-100/30 dark:border-red-900/20 shadow-sm"
                      title="Hapus Semua Pengingat"
                    >
                      <Trash2 className="h-3 w-3 text-[#ff6467]" style={{ color: '#ff6467' }} />
                      <span>Clear All ({activeNotifications.length})</span>
                    </button>
                  ) : (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase">
                      Bersih
                    </span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 font-sans">
                  {activeNotifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                      Tidak ada notifikasi mendesak saat ini. Semua terkendali!
                    </div>
                  ) : (
                    activeNotifications.map((notif) => (
                      <div key={notif.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex gap-2.5 items-start">
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'hot' && <Flame className="h-4 w-4 text-red-500 animate-pulse" />}
                          {notif.type === 'task' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          {notif.type === 'reactivate' && <Clock className="h-4 w-4 text-slate-500" />}
                          {notif.type === 'followup' && <Briefcase className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {notif.description}
                          </p>
                          {notif.leadId && (
                            <button
                              onClick={() => {
                                onOpenLead(notif.leadId!);
                                setShowNotificationMenu(false);
                              }}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1.5 block"
                            >
                              {notif.actionLabel || 'Tindak Lanjut & Detail'} →
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => dismissNotification(notif.id)}
                          className="p-1 text-slate-400 hover:text-[#ff6467] dark:text-slate-500 dark:hover:text-[#ff6467] hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Hapus Pengingat"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[#ff6467]" style={{ color: '#ff6467' }} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Log Out */}
        <button
          id="logout-btn"
          onClick={onLogout}
          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 border border-red-100/40 dark:border-red-900/30 transition-colors"
          title="Sign Out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  );
}
