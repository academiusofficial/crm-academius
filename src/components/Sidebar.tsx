import React from 'react';
import academiusLogo from '../assets/images/regenerated_image_1784801332072.webp';
import { 
  LayoutDashboard, 
  UsersRound, 
  KanbanSquare, 
  ClipboardCheck, 
  GraduationCap,
  Sparkles,
  Home,
  PlusCircle,
  UserCog,
  Trash2,
  ClipboardList
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userName: string;
  userEmail?: string;
  onAddLeadClick: () => void;
  onManageAdvisorsClick: () => void;
  onClearDatabaseClick?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, userRole, userName, userEmail, onAddLeadClick, onManageAdvisorsClick, onClearDatabaseClick }: SidebarProps) {
  const isArsul = userEmail?.toLowerCase() === 'academius.official@gmail.com';
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads Database', icon: UsersRound },
    { id: 'pipeline', label: 'Kanban Pipeline', icon: KanbanSquare },
    { id: 'mentoring', label: 'Kanban Pipeline (Mentoring)', icon: GraduationCap },
    { id: 'checklist-settings', label: 'Pengaturan Checklist', icon: ClipboardList },
    { id: 'tasks', label: 'Task List & Reminders', icon: ClipboardCheck },
    ...((userRole === 'Admin CRM' || isArsul) ? [{ id: 'manage-accounts', label: 'Manage Akun', icon: UserCog }] : [])
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-colors duration-200 shrink-0">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-[#42B8D5]/30 bg-gradient-to-r from-[#42B8D5] to-[#136386] text-white flex items-center justify-start">
        <img 
          src={academiusLogo} 
          alt="Academius CRM System" 
          className="h-[47px] ml-[15px] w-auto object-contain"
          style={{ marginLeft: '15px', height: '47px' }}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* User Quick Info */}
      <div className="p-4 mx-4 my-3 bg-white dark:bg-slate-800 rounded-xl border-0 flex items-center gap-3">
        <div 
          className="h-10 w-10 rounded-full flex items-center justify-center font-bold font-display text-sm border border-[#42B8D5]/30"
          style={{ backgroundColor: '#d8f0ff', color: '#42B8D5' }}
        >
          {userName.slice(0, 2).toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-poppins font-bold truncate" style={{ color: '#136386' }}>{userName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span 
              className="h-1.5 w-1.5 rounded-full" 
              style={{ backgroundColor: '#42B8D5', color: '#42B8D5' }}
            ></span>
            <span 
              className="text-[10px] font-sans font-bold tracking-wider uppercase"
              style={{ color: '#42B8D5' }}
            >
              {(() => {
                const rawRole = isArsul ? 'Admin CRM' : userRole;
                if (rawRole === 'Admin CRM') return 'Admin CRM';
                if (rawRole === 'Manager CRM') return 'Manager CRM';
                return 'Staff CRM';
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              id={`sidebar-tab-${item.id}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive 
                  ? 'bg-[#42B8D5] text-white shadow-sm shadow-[#42B8D5]/20 dark:bg-[#42B8D5] dark:text-white' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
              }`}
              style={{
                backgroundColor: isActive ? '#42B8D5' : undefined
              }}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} style={{ color: !isActive ? '#136386' : undefined }} />
              <span 
                className={`${item.id === 'dashboard' ? 'font-poppins' : 'font-sans'} font-medium`} 
                style={{
                  color: isActive ? '#ffffff' : '#136386',
                  ...(item.id === 'mentoring' ? { textAlign: 'left' } : {})
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        
        {/* Shortcut menu block for direct lead addition */}
        <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
          <button
            id="sidebar-add-lead-btn"
            onClick={onAddLeadClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-[#ffffff] hover:bg-slate-50 text-[#45556c] border border-slate-200/80 shadow-sm transition-all duration-150 active:scale-95 group"
          >
            <PlusCircle className="h-5 w-5 text-[#90a1b9] group-hover:scale-110 transition-transform duration-150" />
            <span className="font-sans font-medium text-[#45556c]">Input Lead Baru</span>
          </button>

        </div>
      </nav>

      {/* Footer Branding Note */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
        <div className="flex justify-center items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Sparkles className="h-3 w-3 animate-pulse" style={{ color: '#42b8d5' }} />
          <span>Intelligent Educational CRM</span>
        </div>
      </div>
    </aside>
  );
}
