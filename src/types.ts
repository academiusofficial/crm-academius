export type UserRole = 'Admin CRM' | 'Staff CRM' | 'Manager CRM';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  isApproved?: boolean;
}

export interface BantScore {
  budget: 1 | 2 | 3;       // 1: low/uninformed, 2: partial, 3: ready/docs
  authority: 1 | 2 | 3;    // 1: no decision, 2: needs parent/partner, 3: self
  need: 1 | 2 | 3;         // 1: info-only, 2: clear target/not urgent, 3: urgent assistance/ready
  timeline: 1 | 2 | 3;     // 1: no target, 2: 6-12 months, 3: 1-3 months
}

export type LeadLabel = 'HOT' | 'WARM' | 'COLD' | 'REAKTIVASI';

export type PipelineStage = 
  | 'New Lead'
  | 'Profiling'
  | 'Konsultasi'
  | 'Negotiation'
  | 'Enrolled'
  | 'Completed'
  | 'Lost'
  | 'Reaktivasi 60 Hari';

export type MentoringStage =
  | 'Persiapan'
  | 'Fase 1'
  | 'Fase 2'
  | 'Fase 3'
  | 'Fase 4'
  | 'Hasil Akhir';

export type LeadSource = 
  | 'Meta Ads'
  | 'Instagram Organik'
  | 'Referral'
  | 'Website'
  | 'TikTok'
  | 'Event'
  | 'Lainnya';

export type StudyLevel = 'S1' | 'S2' | 'S3';

export interface Lead {
  id: string; // Document ID
  leadId: string; // Custom sequential prefix, e.g., ACD-1002
  tanggalMasuk: string; // ISO date string
  namaLengkap: string;
  nomorWhatsApp: string;
  email: string;
  kota: string;
  sumberLeads: LeadSource;
  jenjangStudi: StudyLevel;
  targetNegara: string;
  produkDiminati: string;
  catatan: string;
  pic: string; // Name or UID of Counselor
  tanggalFollowUpTerakhir: string; // ISO date string or empty
  bant: BantScore;
  stage: PipelineStage;
  mentoringStage?: MentoringStage;
  mentoringChecklist?: {
    persiapan1?: boolean;
    persiapan2?: boolean;
    persiapan3?: boolean;
    [key: string]: boolean | undefined;
  };
  nilaiPotensi: number; // Potential Deal Value in IDR
  lastUpdated: string; // ISO date string
  organization_id?: string; 
  excludeFromMentoring?: boolean;
  creator_name?: string;
  creator_role?: string;
}

export interface Task {
  id: string;
  leadId: string;
  leadName: string;
  todo: string;
  deadline: string; // YYYY-MM-DD
  pic: string;
  status: 'Pending' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
}

export interface ActivityLog {
  id: string;
  leadId: string;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  user: string; // Name or email
  role: UserRole;
  aktivitas: string;
}

export interface ChatMessage {
  id: string;
  leadId: string;
  sender: 'counselor' | 'lead';
  timestamp: string; // ISO date string
  text: string;
  type: 'whatsapp' | 'notes' | 'email';
}

export interface AIInsightCache {
  leadId: string;
  prediction: string;          // Probability of closing % & reason
  recommendedFollowUp: string; // Step-by-step follow up strategy
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  draftEmail: string;          // Custom email draft
  lastGenerated: string;
}

// Tambahkan Interface Baru di akhir file /src/types.ts
export interface Organization {
  id: string;
  name: string;
  created_at?: string;
}

export interface CustomChecklistItem {
  id: string;
  stage: MentoringStage;
  text: string;
}







