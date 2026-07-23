import React, { useState, useEffect } from 'react';
import { X, Check, Eye, EyeOff } from 'lucide-react';
import { Lead, LeadSource, StudyLevel, PipelineStage, BantScore } from '../types';
import { formatIDR } from '../utils';
import CustomSelect from './CustomSelect';

interface LeadFormProps {
  lead?: Lead | null; // If provided, we are editing
  onSave: (lead: Lead) => void;
  onClose: () => void;
  userName: string;
  advisors?: string[];
  onManageAdvisorsClick?: () => void;
  isArsul?: boolean;
  userRole?: string;
}

export default function LeadForm({ lead, onSave, onClose, userName, advisors, onManageAdvisorsClick, isArsul, userRole }: LeadFormProps) {
  // Local Form state
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nomorWhatsApp, setNomorWhatsApp] = useState('+62');
  const [email, setEmail] = useState('');
  const [kota, setKota] = useState('');
  const [sumberLeads, setSumberLeads] = useState<LeadSource>('Meta Ads');
  const [jenjangStudi, setJenjangStudi] = useState<StudyLevel>('S2');
  const [targetNegara, setTargetNegara] = useState('');
  const [produkDiminati, setProdukDiminati] = useState('Mentoring Beasiswa');
  const [catatan, setCatatan] = useState('');
  const [pic, setPic] = useState(() => {
    if (lead) return lead.pic;
    if (userRole === 'Staff CRM' && userName) {
      const matched = advisors?.find(a => {
        const namePart = a.includes('|') ? a.split('|')[0] : a;
        return namePart === userName;
      });
      return matched || userName;
    }
    return 'Unassigned';
  });
  const [nilaiPotensi, setNilaiPotensi] = useState(15000000);
  const [showFormValue, setShowFormValue] = useState(false);
  const [stage, setStage] = useState<PipelineStage>('New Lead');

  // BANT scores
  const [budget, setBudget] = useState<1 | 2 | 3>(2);
  const [authority, setAuthority] = useState<1 | 2 | 3>(3);
  const [need, setNeed] = useState<1 | 2 | 3>(2);
  const [timeline, setTimeline] = useState<1 | 2 | 3>(2);

  // Load from editing lead if provided
  useEffect(() => {
    if (lead) {
      setNamaLengkap(lead.namaLengkap);
      setNomorWhatsApp(lead.nomorWhatsApp);
      setEmail(lead.email);
      setKota(lead.kota);
      setSumberLeads(lead.sumberLeads);
      setJenjangStudi(lead.jenjangStudi);
      setTargetNegara(lead.targetNegara);
      setProdukDiminati(lead.produkDiminati);
      setCatatan(lead.catatan);
      setPic(lead.pic);
      setNilaiPotensi(lead.nilaiPotensi);
      setStage(lead.stage);
      
      setBudget(lead.bant.budget);
      setAuthority(lead.bant.authority);
      setNeed(lead.bant.need);
      setTimeline(lead.bant.timeline);
    }
  }, [lead]);

  // Adjust potential value dynamically on product selection to save counselor input effort!
  const getProductDefaultValue = (productName: string): number => {
    switch (productName) {
      case 'Mentoring Beasiswa': return 15000000;
      case 'Mentoring Kuliah Luar Negeri': return 25000000;
      case 'IELTS Preparation': return 8500000;
      case 'Full Assistance': return 45000000;
      case 'Konsultasi': return 3500000;
      default: return 10000000;
    }
  };

  const handleProductChange = (val: string) => {
    setProdukDiminati(val);
    if (!lead) {
      // Auto estimate only on insertions
      setNilaiPotensi(getProductDefaultValue(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaLengkap.trim()) {
      alert('Nama lengkap wajib diisi');
      return;
    }

    if (!nomorWhatsApp.trim() || nomorWhatsApp === '+62') {
      alert('Nomor WhatsApp wajib diisi');
      return;
    }

    const savedLead: Lead = {
      id: lead ? lead.id : `lead_${Math.random().toString(36).substring(2, 9)}`,
      leadId: lead ? lead.leadId : `ACD-${Math.floor(1000 + Math.random() * 9000)}`,
      tanggalMasuk: lead ? lead.tanggalMasuk : new Date().toISOString(),
      namaLengkap,
      nomorWhatsApp,
      email,
      kota,
      sumberLeads,
      jenjangStudi,
      targetNegara,
      produkDiminati,
      catatan,
      pic: pic || 'Unassigned',
      tanggalFollowUpTerakhir: lead ? lead.tanggalFollowUpTerakhir : '',
      bant: { budget, authority, need, timeline },
      stage,
      nilaiPotensi: Number(nilaiPotensi),
      lastUpdated: new Date().toISOString()
    };

    onSave(savedLead);
  };

  const counselorOptions = advisors && advisors.length > 0
    ? ['Unassigned', ...advisors.filter(a => a !== 'Unassigned')]
    : [
        'Unassigned',
        'Rina Counselor',
        'Rian Counselor',
        'Andi Counselor'
      ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-display font-bold text-lg dark:text-white" style={{ color: '#116185' }}>
            {lead ? `Edit Data Lead (${lead.leadId})` : 'Input Data Lead Baru'}
          </h3>
          <button 
            id="close-form-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Nama Lengkap */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Nama Lengkap *</label>
              <input
                id="form-name-input"
                type="text"
                required
                placeholder="Nama Lengkap"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 font-sans"
              />
            </div>

            {/* Nomor WhatsApp */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Nomor WhatsApp *</label>
              <input
                id="form-whatsapp-input"
                type="text"
                required
                placeholder="+62812345678"
                value={nomorWhatsApp}
                onChange={(e) => setNomorWhatsApp(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 font-mono"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Email Address</label>
              <input
                id="form-email-input"
                type="email"
                placeholder="nama@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 font-mono"
              />
            </div>

            {/* Kota Asal */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Kota Domisili</label>
              <input
                id="form-city-input"
                type="text"
                placeholder="Daerah Domisili"
                value={kota}
                onChange={(e) => setKota(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 font-sans"
              />
            </div>

            {/* Sumber Leads */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Sumber Leads</label>
              <CustomSelect
                id="form-source-select"
                value={sumberLeads}
                onChange={(val) => setSumberLeads(val as LeadSource)}
                options={[
                  { value: 'Meta Ads', label: 'Meta Ads (Facebook/Instagram)' },
                  { value: 'Instagram Organik', label: 'Instagram Organik' },
                  { value: 'Referral', label: 'Referral/Rekomendasi' },
                  { value: 'Website', label: 'Website Form' },
                  { value: 'TikTok', label: 'TikTok Organik' },
                  { value: 'Event', label: 'Event / Webinar' },
                  { value: 'Lainnya', label: 'Lainnya' }
                ]}
              />
            </div>

            {/* Jenjang Studi */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Jenjang Studi Tujuan</label>
              <div className="grid grid-cols-3 gap-2">
                {(['S1', 'S2', 'S3'] as StudyLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setJenjangStudi(lvl)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      jenjangStudi === lvl 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Negara */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Target Negara Studi</label>
              <input
                id="form-country-input"
                type="text"
                placeholder="Negara Tujuan"
                value={targetNegara}
                onChange={(e) => setTargetNegara(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Produk Diminati */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Produk Diminati</label>
              <CustomSelect
                id="form-product-select"
                value={produkDiminati}
                onChange={(val) => handleProductChange(val)}
                options={[
                  { value: 'Mentoring Beasiswa', label: 'Mentoring Beasiswa (LPDP/Chevening)' },
                  { value: 'Mentoring Kuliah Luar Negeri', label: 'Mentoring Kuliah Luar Negeri' },
                  { value: 'IELTS Preparation', label: 'IELTS Preparation Package' },
                  { value: 'Full Assistance', label: 'Full Assistance Premium' },
                  { value: 'Konsultasi', label: 'Konsultasi / Sesi Klasik' }
                ]}
              />
            </div>

            {/* Nilai Potensi & Pipeline Stage Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
              {/* Nilai Potensi Transaksi */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Nilai Potensi Transaksi (IDR)</label>
                {isArsul || userRole === 'Admin CRM' ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id="form-value-input"
                        type={showFormValue ? "number" : "password"}
                        placeholder="Masukkan Angka"
                        value={nilaiPotensi}
                        onChange={(e) => setNilaiPotensi(Number(e.target.value))}
                        className="w-full text-xs p-2.5 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormValue(!showFormValue)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors cursor-pointer"
                        title={showFormValue ? "Sembunyikan Nilai" : "Tampilkan Nilai"}
                      >
                        {showFormValue ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold font-mono text-slate-500 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-slate-700/50">
                      {showFormValue ? formatIDR(nilaiPotensi) : 'Rp ••••••••'}
                    </div>
                  </div>
                ) : (
                  <div className="w-full text-xs p-2.5 bg-slate-100/50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 flex items-center gap-2 select-none">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    <span className="font-sans">Terproteksi</span>
                  </div>
                )}
              </div>

              {/* Pipeline Stage */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Tahap Penjualan (Pipeline)</label>
                <CustomSelect
                  id="form-stage-select"
                  value={stage}
                  onChange={(val) => setStage(val as PipelineStage)}
                  options={[
                    { value: 'New Lead', label: '1. New Lead' },
                    { value: 'Profiling', label: '2. Profiling' },
                    { value: 'Konsultasi', label: '3. Konsultasi' },
                    { value: 'Negotiation', label: '4. Negotiation' },
                    { value: 'Enrolled', label: '5. Enrolled' },
                    { value: 'Completed', label: '6. Completed' },
                    { value: 'Lost', label: '7. Lost / Tidak Konversi' },
                    { value: 'Reaktivasi 60 Hari', label: '8. Reaktivasi 60 Hari' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* BANT Qualification Questionnaire (Scattered grid) */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
            <div>
              <h4 className="font-display font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Kualifikasi Skor BANT</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Definisikan kesiapan kualifikasi prospek dalam 4 komponen dasar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* BUDGET */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">💰 Budget (Dana/Keuangan)</label>
                <CustomSelect
                  id="form-bant-budget"
                  value={budget}
                  onChange={(val) => setBudget(Number(val) as any)}
                  options={[
                    { value: 1, label: '1 - Tidak ada dana / belum memahami beasiswa' },
                    { value: 2, label: '2 - Sponsor sebagian / ada dana dan cari beasiswa' },
                    { value: 3, label: '3 - Dana siap kuliah mandiri / lolos beasiswa' }
                  ]}
                />
              </div>

              {/* AUTHORITY */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">👔 Authority (Keputusan)</label>
                <CustomSelect
                  id="form-bant-authority"
                  value={authority}
                  onChange={(val) => setAuthority(Number(val) as any)}
                  options={[
                    { value: 1, label: '1 - Belum bisa memutuskan sendiri' },
                    { value: 2, label: '2 - Butuh persetujuan orang tua / pasangan' },
                    { value: 3, label: '3 - Bisa mengambil keputusan sendiri sepenuhnya' }
                  ]}
                />
              </div>

              {/* NEED */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">🎯 Need (Kebutuhan Program)</label>
                <CustomSelect
                  id="form-bant-need"
                  value={need}
                  onChange={(val) => setNeed(Number(val) as any)}
                  options={[
                    { value: 1, label: '1 - Sekedar berselancar info dasar' },
                    { value: 2, label: '2 - Punya target kuliah tapi tidak mendesak' },
                    { value: 3, label: '3 - Target sangat jelas & butuh bimbingan sekarang' }
                  ]}
                />
              </div>

              {/* TIMELINE */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">⏱ Timeline (Target Waktu)</label>
                <CustomSelect
                  id="form-bant-timeline"
                  value={timeline}
                  onChange={(val) => setTimeline(Number(val) as any)}
                  options={[
                    { value: 1, label: '1 - Belum punya target waktu' },
                    { value: 2, label: '2 - Target kuliah 6 - 12 bulan ke depan' },
                    { value: 3, label: '3 - Target mendesak 1 - 3 bulan ke depan' }
                  ]}
                />
              </div>

            </div>
          </div>

          {/* Catatan Awal */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Catatan Tambahan & Latar Belakang Akademis</label>
            <textarea
              id="form-notes-textarea"
              rows={3}
              placeholder="Sebutkan latar belakang IPK kuliah asal, target program beasiswa LPDP atau Chevening, ketersediaan sertifikat IELTS, dsb..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 font-sans leading-relaxed"
            />
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800/85 flex justify-end gap-2 bg-slate-50/20">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 dark:border-slate-750 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
            >
              Batalkan
            </button>
            <button
              id="save-lead-submit-btn"
              type="submit"
              className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
              style={{ backgroundColor: '#42b8d5', borderWidth: '1px', borderStyle: 'solid', borderColor: '#42b8d5' }}
            >
              <Check className="h-4 w-4" />
              <span>Simpan Data Profil</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
