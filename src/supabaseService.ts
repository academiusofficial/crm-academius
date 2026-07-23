import { supabase } from './supabaseClient';
import { Lead, Task, ActivityLog, ChatMessage, Organization, UserProfile } from './types';
import { initialLeads, initialTasks, initialLogs, initialChats } from './utils';

// Helper to get active authenticated user ID
async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// ---------------------- LEADS SERVICE ----------------------

export async function getLeads(organizationId?: string | null): Promise<Lead[]> {
  try {
    const userId = await getUserId();
    
    let leadsData: any[] = [];
    let fetchError: any = null;

    if (userId) {
      const { data, error } = await supabase.from('leads').select('*');
      if (error) {
        fetchError = error;
      } else {
        leadsData = data || [];
      }
    }

    // Seeding: Populate with initial leads if the database table is completely empty
    if (userId && !fetchError && leadsData.length === 0) {
      const hasSeeded = typeof window !== 'undefined' ? localStorage.getItem('academius_has_seeded_leads') : null;
      if (hasSeeded !== 'true' && initialLeads.length > 0) {
        console.log('Supabase leads table is empty. Seeding starting data...');
        const seeded = initialLeads.map(lead => ({
          ...lead,
          user_id: userId,
          organization_id: organizationId || null
        }));

        const { error: insertError } = await supabase
          .from('leads')
          .insert(seeded);

        if (!insertError) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('academius_has_seeded_leads', 'true');
          }
          leadsData = seeded;
        } else {
          if (insertError.message && insertError.message.includes('organization_id')) {
            const seededWithoutOrg = initialLeads.map(({ organization_id, ...lead }) => ({
              ...lead,
              user_id: userId
            }));
            const { error: retryError } = await supabase
              .from('leads')
              .insert(seededWithoutOrg);
            if (!retryError) {
              if (typeof window !== 'undefined') {
                localStorage.setItem('academius_has_seeded_leads', 'true');
              }
              leadsData = seededWithoutOrg;
            } else {
              console.error('Error seeding leads retry:', retryError);
              leadsData = [...initialLeads];
            }
          } else {
            console.error('Error seeding leads:', insertError);
            leadsData = [...initialLeads];
          }
        }
      }
    }

    // Robust Cache Fallback: If no user, or database query failed, or returned empty, load from cache
    if (leadsData.length === 0 || fetchError) {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('academius_cached_leads');
        if (cached) {
          try {
            leadsData = JSON.parse(cached);
            console.log('Loaded leads from local cache fallback:', leadsData.length);
          } catch (e) {
            console.error('Error parsing cached leads:', e);
          }
        }
      }
      
      if (leadsData.length === 0) {
        console.log('No leads found in database or cache. Falling back to initialLeads.');
        leadsData = [...initialLeads];
      }
    } else {
      // Save fresh data to local cache
      if (typeof window !== 'undefined') {
        localStorage.setItem('academius_cached_leads', JSON.stringify(leadsData));
      }
    }

    // Map fields back, ensuring nested "bant" is correctly typed
    return leadsData.map(row => {
      let extraData: any = {};
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`academius_extra_lead_data_${row.id}`);
        if (cached) {
          try {
            extraData = JSON.parse(cached);
          } catch (e) {
            console.error(e);
          }
        }
      }

      return {
        id: row.id,
        leadId: row.leadId,
        tanggalMasuk: row.tanggalMasuk,
        namaLengkap: row.namaLengkap,
        nomorWhatsApp: row.nomorWhatsApp,
        email: row.email,
        kota: row.kota,
        sumberLeads: row.sumberLeads,
        jenjangStudi: row.jenjangStudi,
        targetNegara: row.targetNegara,
        produkDiminati: row.produkDiminati,
        catatan: row.catatan,
        pic: row.pic,
        tanggalFollowUpTerakhir: row.tanggalFollowUpTerakhir,
        bant: row.bant,
        stage: row.stage,
        mentoringStage: row.mentoringStage !== undefined ? row.mentoringStage : (extraData.mentoringStage || 'Persiapan'),
        mentoringChecklist: row.mentoringChecklist !== undefined ? row.mentoringChecklist : (extraData.mentoringChecklist || {}),
        nilaiPotensi: Number(row.nilaiPotensi),
        lastUpdated: row.lastUpdated,
        organization_id: (row.organization_id !== undefined ? row.organization_id : extraData.organization_id) || undefined,
        creator_name: row.creator_name !== undefined ? row.creator_name : extraData.creator_name,
        creator_role: row.creator_role !== undefined ? row.creator_role : extraData.creator_role
      };
    }) as Lead[];
  } catch (err) {
    console.error('Error in getLeads service:', err);
    return initialLeads;
  }
}

export async function saveLead(lead: Lead): Promise<void> {
  try {
    const userId = await getUserId();

    // Cache extra fields locally
    if (typeof window !== 'undefined') {
      localStorage.setItem(`academius_extra_lead_data_${lead.id}`, JSON.stringify({
        mentoringStage: lead.mentoringStage || 'Persiapan',
        mentoringChecklist: lead.mentoringChecklist || {},
        organization_id: lead.organization_id || null,
        creator_name: lead.creator_name || null,
        creator_role: lead.creator_role || null
      }));

      // Immediately sync with local cache so we have real-time offline availability
      const cached = localStorage.getItem('academius_cached_leads');
      if (cached) {
        try {
          const list = JSON.parse(cached) as any[];
          const idx = list.findIndex(l => l.id === lead.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...lead };
          } else {
            list.push(lead);
          }
          localStorage.setItem('academius_cached_leads', JSON.stringify(list));
        } catch (e) {
          console.error('Error updating cached leads:', e);
        }
      } else {
        localStorage.setItem('academius_cached_leads', JSON.stringify([lead]));
      }
    }

    if (!userId) {
      console.warn('No user ID found, saved lead locally in cache only');
      return;
    }

    let payload: any = {
      ...lead,
      user_id: userId
    };

    if (payload.organization_id === "") {
      payload.organization_id = null;
    }

    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
      attempts++;
      const { error } = await supabase
        .from('leads')
        .upsert(payload);

      if (!error) {
        success = true;
        break;
      }

      console.warn(`Upsert attempt ${attempts} failed:`, error.message);

      const match = error.message.match(/Could not find the '([^']+)' column/);
      if (match && match[1]) {
        const missingColumn = match[1];
        console.log(`Removing missing column '${missingColumn}' from payload and retrying...`);
        delete payload[missingColumn];
      } else if (error.message && error.message.includes('organization_id')) {
        delete payload.organization_id;
      } else {
        throw error;
      }
    }
  } catch (err) {
    console.error('Error saving lead:', err);
    throw err;
  }
}

export async function deleteLeadDoc(leadId: string): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;

    // Delete tasks associated with this lead first (to satisfy potential foreign key constraints and clean up db)
    await supabase
      .from('tasks')
      .delete()
      .eq('leadId', leadId);

    // Delete chats associated with this lead
    await supabase
      .from('chats')
      .delete()
      .eq('leadId', leadId);

    // Delete logs associated with this lead
    await supabase
      .from('logs')
      .delete()
      .eq('leadId', leadId);

    // Delete the lead document itself
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) throw error;
  } catch (err) {
    console.error('Error in deleteLeadDoc service:', err);
  }
}

// ---------------------- TASKS SERVICE ----------------------

export async function getTasks(): Promise<Task[]> {
  try {
    const userId = await getUserId();
    
    let tasksData: any[] = [];
    let fetchError: any = null;

    if (userId) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*');
      if (error) {
        fetchError = error;
      } else {
        tasksData = data || [];
      }
    }

    if (userId && !fetchError && tasksData.length === 0) {
      console.log('Supabase tasks table is empty. Seeding starting tasks...');
      if (initialTasks.length > 0) {
        const seeded = initialTasks.map(task => ({
          ...task,
          user_id: userId
        }));

        const { error: insertError } = await supabase
          .from('tasks')
          .insert(seeded);

        if (!insertError) {
          tasksData = seeded;
        } else {
          console.error('Error seeding tasks:', insertError);
          tasksData = [...initialTasks];
        }
      }
    }

    if (tasksData.length === 0 || fetchError) {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('academius_cached_tasks');
        if (cached) {
          try {
            tasksData = JSON.parse(cached);
          } catch (e) {
            console.error('Error parsing cached tasks:', e);
          }
        }
      }
      if (tasksData.length === 0) {
        tasksData = [...initialTasks];
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('academius_cached_tasks', JSON.stringify(tasksData));
      }
    }

    return tasksData as Task[];
  } catch (err) {
    console.error('Error in getTasks service:', err);
    return initialTasks;
  }
}

export async function saveTask(task: Task): Promise<void> {
  try {
    const userId = await getUserId();

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('academius_cached_tasks');
      if (cached) {
        try {
          const list = JSON.parse(cached) as any[];
          const idx = list.findIndex(t => t.id === task.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...task };
          } else {
            list.push(task);
          }
          localStorage.setItem('academius_cached_tasks', JSON.stringify(list));
        } catch (e) {
          console.error('Error updating cached tasks:', e);
        }
      } else {
        localStorage.setItem('academius_cached_tasks', JSON.stringify([task]));
      }
    }

    if (!userId) return;

    const payload = {
      ...task,
      user_id: userId
    };

    const { error } = await supabase
      .from('tasks')
      .upsert(payload);

    if (error) throw error;
  } catch (err) {
    console.error('Error in saveTask service:', err);
  }
}

export async function deleteTaskDoc(taskId: string): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('academius_cached_tasks');
      if (cached) {
        try {
          const list = JSON.parse(cached) as any[];
          const filtered = list.filter(t => t.id !== taskId);
          localStorage.setItem('academius_cached_tasks', JSON.stringify(filtered));
        } catch (e) {
          console.error('Error deleting from cached tasks:', e);
        }
      }
    }

    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  } catch (err) {
    console.error('Error in deleteTaskDoc service:', err);
  }
}

// ---------------------- ACTIVITY LOG SERVICE ----------------------

export async function getActivityLogs(): Promise<ActivityLog[]> {
  try {
    const userId = await getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('logs')
      .select('*');

    if (error) throw error;

    const dbLogs = (data || []) as ActivityLog[];

    // Retrieve local system logs
    const localLogsStr = localStorage.getItem('academius_system_logs');
    const localLogs: ActivityLog[] = localLogsStr ? JSON.parse(localLogsStr) : [];

    const merged = [...dbLogs, ...localLogs];

    // Sort descending by date & time
    const sorted = [...merged];
    sorted.sort((a, b) => {
      const dateA = `${a.tanggal}T${a.jam}`;
      const dateB = `${b.tanggal}T${b.jam}`;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return sorted;
  } catch (err) {
    console.warn('Error fetching Supabase logs, falling back to local memory:', err);
    const localLogsStr = localStorage.getItem('academius_system_logs');
    return localLogsStr ? JSON.parse(localLogsStr) : [];
  }
}

export async function addActivityLog(log: ActivityLog): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;

    // Check if leadId is a valid lead in the database to satisfy the foreign key constraint
    const { data: leadCheck, error: checkError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', log.leadId)
      .maybeSingle();

    if (!checkError && leadCheck) {
      // It's a valid lead log, store in Supabase
      const payload = {
        ...log,
        user_id: userId
      };

      const { error } = await supabase
        .from('logs')
        .insert(payload);

      if (error) throw error;
    } else {
      // It is a system-wide or non-existent lead log, store in local storage
      const localLogsStr = localStorage.getItem('academius_system_logs');
      const localLogs: ActivityLog[] = localLogsStr ? JSON.parse(localLogsStr) : [];
      localLogs.push(log);
      localStorage.setItem('academius_system_logs', JSON.stringify(localLogs));
    }
  } catch (err) {
    console.warn('Unable to write log to Supabase, saving to local storage instead:', err);
    const localLogsStr = localStorage.getItem('academius_system_logs');
    const localLogs: ActivityLog[] = localLogsStr ? JSON.parse(localLogsStr) : [];
    localLogs.push(log);
    localStorage.setItem('academius_system_logs', JSON.stringify(localLogs));
  }
}

// ---------------------- CHAT CHANNELS SERVICE ----------------------

export async function getChats(leadId: string): Promise<ChatMessage[]> {
  try {
    const userId = await getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('leadId', leadId);

    if (error) throw error;

    // Seed chats only if chats for this leadId (or table seed) are empty
    if (!data || data.length === 0) {
      // Check if general chats exist of any lead, if not, we seed starting chats
      const { count } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        console.log('Supabase chats table is empty. Seeding starting chats...');
        if (initialChats.length > 0) {
          const seeded = initialChats.map(chat => ({
            ...chat,
            user_id: userId
          }));

          await supabase
            .from('chats')
            .insert(seeded);
        }

        return initialChats.filter(c => c.leadId === leadId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
      return [];
    }

    return (data as ChatMessage[]).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (err) {
    console.error('Error in getChats service:', err);
    return [];
  }
}

export async function addChat(chat: ChatMessage): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;

    const payload = {
      ...chat,
      user_id: userId
    };

    const { error } = await supabase
      .from('chats')
      .insert(payload);

    if (error) throw error;
  } catch (err) {
    console.error('Error in addChat service:', err);
  }
}

// Clear all CRM database tables globally to wipe out initial or current data
export async function clearAllCrmData(): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;

    // Delete all rows in child and parent tables by triggering deletes with non-matching dummy filters
    await supabase.from('tasks').delete().neq('id', 'delete_all_placeholder');
    await supabase.from('chats').delete().neq('id', 'delete_all_placeholder');
    await supabase.from('logs').delete().neq('id', 'delete_all_placeholder');
    await supabase.from('leads').delete().neq('id', 'delete_all_placeholder');

    if (typeof window !== 'undefined') {
      localStorage.setItem('academius_has_seeded_leads', 'true');
    }
  } catch (err) {
    console.error('Error in clearAllCrmData service:', err);
    throw err;
  }
}


// Masukkan fungsi baru ini ke dalam /src/supabaseService.ts

// Ambil daftar organisasi yang berhak diakses pengguna
export async function getOrganizations(): Promise<Organization[]> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*');
    
    if (error) throw error;
    return data as Organization[];
  } catch (err) {
    console.error('Error fetching organizations:', err);
    return [];
  }
}

// Ambil jumlah atau daftar anggota organisasi/tim yang terdaftar
export async function getOrganizationMembers(organizationId?: string | null): Promise<any[]> {
  try {
    if (!organizationId) {
      // Jika tidak ada org ID spesifik, coba ambil semua dari tabel organization_members
      const { data, error } = await supabase
        .from('organization_members')
        .select('*');
      if (error) throw error;
      return data || [];
    }
    
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId);
      
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching organization members:', err);
    return [];
  }
}

// ---------------------- ACCOUNTS (USER PROFILES) SERVICE ----------------------

export async function getUserProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) throw error;
    
    return (data as UserProfile[]) || [];
  } catch (err) {
    console.warn('Supabase profiles query failed, falling back to LocalStorage:', err);
    const local = localStorage.getItem('academius_user_profiles');
    return local ? JSON.parse(local) : [];
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const local = localStorage.getItem('academius_user_profiles');
  const list: UserProfile[] = local ? JSON.parse(local) : [];
  const existing = list.find(p => p.uid === profile.uid || p.email.toLowerCase() === profile.email.toLowerCase());
  
  // Determine isApproved status
  let finalApproved = profile.isApproved;
  if (finalApproved === undefined) {
    if (profile.email.toLowerCase() === 'academius.official@gmail.com' || 
        profile.email.toLowerCase() === 'alim.bahri@academius.com') {
      finalApproved = true;
    } else if (existing && existing.isApproved !== undefined) {
      finalApproved = existing.isApproved;
    } else {
      finalApproved = false; // New registration starts as pending/unapproved
    }
  }

  const updatedProfile: UserProfile = {
    ...profile,
    isApproved: finalApproved
  };

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert(updatedProfile);
      
    if (error) throw error;
  } catch (err) {
    console.error('Error saving user profile to Supabase:', err);
    throw err;
  } finally {
    const index = list.findIndex(p => p.uid === updatedProfile.uid || p.email.toLowerCase() === updatedProfile.email.toLowerCase());
    if (index >= 0) {
      list[index] = updatedProfile;
    } else {
      list.push(updatedProfile);
    }
    localStorage.setItem('academius_user_profiles', JSON.stringify(list));
  }
}

export async function deleteUserProfile(uid: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('uid', uid);
      
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting user profile from Supabase:', err);
    throw err;
  } finally {
    const local = localStorage.getItem('academius_user_profiles');
    if (local) {
      const list: UserProfile[] = JSON.parse(local);
      const filtered = list.filter(p => p.uid !== uid);
      localStorage.setItem('academius_user_profiles', JSON.stringify(filtered));
    }
  }
}

