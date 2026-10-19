'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Building2,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Award,
  TrendingUp,
  FileText,
  Printer,
  Edit3,
  Save,
  RotateCcw,
  UserCheck,
  ClipboardList,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  Briefcase,
  Layers,
  Fingerprint,
  Mail,
  QrCode
} from 'lucide-react';
import { AppSettings, ProfileSettings, Task, AttendanceRecord } from '@/types';
import { calculateTotalHariPKL, formatDateToIndonesian, getCurrentDateString } from '@/lib/dateUtils';
import FloatingActionMenu from '@/components/FloatingActionMenu';
import SettingsModal from '@/components/SettingsModal';
import GoogleGuideModal from '@/components/GoogleGuideModal';

export default function ProfilePage() {
  const router = useRouter();

  // Data states
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'analytics' | 'edit'>('overview');

  // Modals state for FloatingActionMenu
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState<ProfileSettings>({
    namaSiswa: '',
    nis: '',
    sekolah: '',
    tempatPkl: '',
    bulanPelaksanaan: '',
    pembimbingPkl: '',
    userDuDi: '',
    pesertaPkl: '',
    defaultTempat: '',
    managerIt: '',
    periodePkl: '',
    tanggalMulaiPkl: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ID Card flip/modal state
  const [showIdCardModal, setShowIdCardModal] = useState(false);

  // Fetch initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, tasksRes, attRes] = await Promise.all([
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/attendance').then(r => r.json())
      ]);

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
        const p = settingsRes.data.profile || {};
        setFormData({
          namaSiswa: p.namaSiswa || 'Fakhri Zainul Arifin',
          nis: p.nis || '2324009',
          sekolah: p.sekolah || 'SMK TI BAZMA',
          tempatPkl: p.tempatPkl || 'Yayasan Kesehatan Pertamina',
          bulanPelaksanaan: p.bulanPelaksanaan || 'Oktober 2026',
          pembimbingPkl: p.pembimbingPkl || 'Muhammad Dzikri Fauzan',
          userDuDi: p.userDuDi || 'Achmad Fauzy',
          pesertaPkl: p.pesertaPkl || 'Fakhri Zainul Arifin',
          defaultTempat: p.defaultTempat || 'IT Operational',
          managerIt: p.managerIt || 'Bagus Dwi Laksono',
          periodePkl: p.periodePkl || '2026-2027',
          tanggalMulaiPkl: p.tanggalMulaiPkl || '2026-08-03'
        });
      }
      if (tasksRes.success) setTasks(tasksRes.data);
      if (attRes.success) setAttendance(attRes.data);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const profile = settings?.profile || formData;

  // Analytics & Calculations
  const stats = useMemo(() => {
    const todayStr = getCurrentDateString();
    const startDate = profile.tanggalMulaiPkl || '2026-08-03';
    const totalHariPkl = calculateTotalHariPKL(todayStr, startDate);

    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;

    attendance.forEach(r => {
      const s = (r.status || '').toLowerCase().trim();
      if (s === 'hadir') hadir++;
      else if (s === 'izin') izin++;
      else if (s === 'sakit') sakit++;
      else if (s === 'alpha') alpha++;
    });

    const totalRecorded = hadir + izin + sakit + alpha;
    const attendanceRate = totalRecorded > 0 ? Math.round((hadir / totalRecorded) * 100) : 100;

    const completedTasks = tasks.filter(t => t.status === 'Selesai').length;
    const inProgressTasks = tasks.filter(t => t.status === 'Sedang Berjalan').length;
    const syncedTasks = tasks.filter(t => t.isSyncedToSheet).length;

    return {
      totalHariPkl,
      hadir,
      izin,
      sakit,
      alpha,
      totalRecorded,
      attendanceRate,
      totalTasks: tasks.length,
      completedTasks,
      inProgressTasks,
      syncedTasks
    };
  }, [profile.tanggalMulaiPkl, attendance, tasks]);

  // Handle Save Form
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: formData })
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setSaveToast({ message: 'Profil peserta PKL berhasil diperbarui!', type: 'success' });
        setActiveTab('overview');
        setTimeout(() => setSaveToast(null), 5000);
      } else {
        throw new Error(data.message || 'Gagal menyimpan');
      }
    } catch (err: any) {
      setSaveToast({ message: err.message || 'Terjadi kesalahan saat menyimpan.', type: 'error' });
      setTimeout(() => setSaveToast(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForm = () => {
    if (settings?.profile) {
      setFormData(settings.profile);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f3f7] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Memuat Profil PKL...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f3f7] pb-24 pt-6 sm:pt-8 text-slate-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── Top Navigation Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Profil Peserta PKL
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif Magang
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Periode {profile.periodePkl || '2026-2027'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kartu identitas resmi, penempatan kerja industri, dan roster pembimbing
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowIdCardModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-500" />
              <span>Kartu ID Card</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-black text-white shadow-xs transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Profil</span>
            </button>
          </div>
        </div>

        {/* ── Toast Notification ── */}
        {saveToast && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1 ${
              saveToast.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{saveToast.message}</span>
            </div>
            <button
              onClick={() => setSaveToast(null)}
              className="text-slate-400 hover:text-slate-700 text-base leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Hero Identity Showcase Card (Bento Style) ── */}
        <div className="bento-card p-6 sm:p-8 bg-white relative overflow-hidden rounded-[2.2rem] border border-black/[0.04] shadow-sm">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
            {/* 3D Profile Badge Graphic */}
            <div className="relative shrink-0 group">
              <div className="w-40 h-40 sm:w-48 sm:h-48 relative flex items-center justify-center p-2 rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50/40 border border-amber-200/60 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/Profile.png"
                  alt="Avatar 3D PKL"
                  className="w-full h-full object-contain filter drop-shadow-xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2"
                />
              </div>
              <button
                onClick={() => setShowIdCardModal(true)}
                className="mt-3 w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
                <span>Lihat Digital Pass</span>
              </button>
            </div>

            {/* Profile Info Details */}
            <div className="flex-1 space-y-3 text-center lg:text-left">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60">
                  Peserta Praktik Kerja Lapangan
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">
                  {profile.namaSiswa || 'Fakhri Zainul Arifin'}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                  NIS: <span className="font-mono text-slate-800">{profile.nis || '2324009'}</span> · {profile.sekolah || 'SMK TI BAZMA'}
                </p>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  {profile.tempatPkl || 'Yayasan Kesehatan Pertamina'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {profile.defaultTempat || 'IT Operational'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  07:30 - 16:00 WIB
                </span>
              </div>

              {/* Mentors Preview Inline */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-1 text-xs text-slate-500">
                <div>
                  Pembimbing: <strong className="text-slate-800 font-semibold">{profile.pembimbingPkl}</strong>
                </div>
                <div>
                  Mentor DUDI: <strong className="text-slate-800 font-semibold">{profile.userDuDi}</strong>
                </div>
                <div>
                  Manager IT: <strong className="text-slate-800 font-semibold">{profile.managerIt || 'Bagus Dwi Laksono'}</strong>
                </div>
              </div>
            </div>

            {/* Quick KPI Pillars */}
            <div className="w-full lg:w-auto shrink-0 grid grid-cols-3 lg:grid-cols-1 gap-2.5 sm:gap-3">
              <div className="bg-[#f8f9fa] border border-slate-200/80 rounded-2xl p-3.5 text-center min-w-[120px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total PKL</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {stats.totalHariPkl} <span className="text-xs font-medium text-slate-500">Hari</span>
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Sejak 3 Agt 2026</p>
              </div>

              <div className="bg-[#f8f9fa] border border-slate-200/80 rounded-2xl p-3.5 text-center min-w-[120px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kehadiran</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                  {stats.hadir} <span className="text-xs font-medium text-slate-500">Hari</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{stats.attendanceRate}% Presensi</p>
              </div>

              <div className="bg-[#f8f9fa] border border-slate-200/80 rounded-2xl p-3.5 text-center min-w-[120px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tugas Terdata</p>
                <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">
                  {stats.totalTasks} <span className="text-xs font-medium text-slate-500">Tugas</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{stats.completedTasks} Selesai</p>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* ── Modal Digital Trainee ID Card (Printable) ── */}
      {showIdCardModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowIdCardModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Lanyard Top Bar */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-4 rounded-b-lg bg-emerald-600 shadow-sm" />
              <div className="w-20 h-1.5 rounded-full bg-slate-300 mt-1" />
            </div>

            {/* Header Instansi */}
            <div className="text-center mt-3 pb-3 border-b border-slate-100">
              <p className="text-[10px] font-extrabold tracking-widest text-emerald-700 uppercase">
                YAYASAN KESEHATAN PERTAMINA
              </p>
              <p className="text-[9px] text-slate-400 font-semibold tracking-wide">
                TRAINEE PASS · IT OPERATIONAL
              </p>
            </div>

            {/* Photo Avatar */}
            <div className="my-5 flex flex-col items-center">
              <div className="w-28 h-28 rounded-2xl bg-amber-50 p-2 border-2 border-amber-300/80 shadow-md flex items-center justify-center relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/Profile.png"
                  alt="Student Pass"
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-base font-black text-slate-900 mt-3 text-center">
                {profile.namaSiswa}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-500">
                NIS: {profile.nis}
              </p>
              <span className="mt-1 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                Siswa PKL SMK TI BAZMA
              </span>
            </div>

            {/* Details Table */}
            <div className="bg-slate-50 rounded-2xl p-3 text-[11px] space-y-1 text-slate-600 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Periode:</span>
                <span className="font-bold text-slate-800">{profile.periodePkl || '2026-2027'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unit:</span>
                <span className="font-bold text-slate-800">{profile.defaultTempat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mentor:</span>
                <span className="font-bold text-slate-800">{profile.userDuDi}</span>
              </div>
            </div>

            {/* Barcode Mock */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
              <div className="w-full h-8 bg-slate-900 rounded flex items-center justify-around px-2 py-1">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full bg-white"
                    style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2)}px` }}
                  />
                ))}
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1 tracking-widest">
                * PKL-2324009-YAKES-PERTAMINA *
              </span>
            </div>

            <button
              onClick={() => setShowIdCardModal(false)}
              className="mt-5 w-full py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── Global Floating Action Menu ── */}
      <FloatingActionMenu
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        unsyncedCount={tasks.filter(t => !t.isSyncedToSheet).length}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onSaveSettings={async (newSettings) => {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
          });
          loadData();
        }}
      />

      <GoogleGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
