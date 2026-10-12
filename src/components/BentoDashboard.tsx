'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Calendar, 
  Clock, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  FileText, 
  Sheet, 
  ExternalLink,
  ArrowRight,
  TrendingUp,
  MapPin,
  UserCheck,
  Send,
  Check,
  Building2,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { Task, AppSettings, AttendanceRecord } from '@/types';
import { formatDateToIndonesian, getHariFromDate } from '@/lib/dateUtils';

interface BentoDashboardProps {
  tasks: Task[];
  settings: AppSettings | null;
  onOpenNewTask: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  onTaskUpdated?: () => void;
}

export default function BentoDashboard({
  tasks,
  settings,
  onOpenNewTask,
  onOpenReport,
  onOpenSettings,
  onTaskUpdated
}: BentoDashboardProps) {
  // Live clock & date state
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('2026-10-12');
  const [hariIni, setHariIni] = useState<string>('Senin');

  // Attendance state
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [jamMasukInput, setJamMasukInput] = useState('07:45');
  const [jamPulangInput, setJamPulangInput] = useState('16:30');
  const [attendanceStatus, setAttendanceStatus] = useState<'Hadir' | 'Izin' | 'Sakit' | 'Libur'>('Hadir');

  // Quick task input state
  const [quickTaskText, setQuickTaskText] = useState('');
  const [isSubmittingQuickTask, setIsSubmittingQuickTask] = useState(false);

  // Profile Card Pagination Slide (Card 6)
  const [profileSlide, setProfileSlide] = useState<number>(0);

  // Initialize date & clock on client
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dStr = `${year}-${month}-${day}`;
      setCurrentDateStr(dStr);
      setHariIni(getHariFromDate(dStr));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Attendance
  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAttendanceList(data.data);
        const todayRec = data.data.find((r: AttendanceRecord) => r.tanggal === currentDateStr);
        setTodayAttendance(todayRec || null);
      }
    } catch (e) {
      console.error('Error fetching attendance:', e);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentDateStr]);

  // Calculate Days of PKL since 3 Agustus 2026
  const pklStartDate = new Date('2026-08-03T00:00:00');
  const todayDate = new Date();
  
  // Total elapsed calendar days
  const diffTime = Math.max(0, todayDate.getTime() - pklStartDate.getTime());
  const totalDaysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Working days (Senin - Jumat) from 3 Agustus 2026
  let workingDaysElapsed = 0;
  const cur = new Date('2026-08-03T00:00:00');
  while (cur <= todayDate) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysElapsed++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Target estimate (90 calendar days)
  const targetDays = 90;
  const progressPercent = Math.min(100, Math.round((totalDaysElapsed / targetDays) * 100));

  // Today's tasks & overall statistics
  const todayTasks = tasks.filter((t) => t.tanggal === currentDateStr);
  const completedTasks = tasks.filter((t) => t.status === 'Selesai');
  const inProgressTasks = tasks.filter((t) => t.status === 'Sedang Berjalan');

  // Handle Quick Attendance
  const handleRecordAttendance = async (statusOverride?: 'Hadir' | 'Izin' | 'Sakit' | 'Libur') => {
    try {
      setIsSubmittingAttendance(true);
      const chosenStatus = statusOverride || attendanceStatus;
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: currentDateStr,
          status: chosenStatus,
          jamMasuk: jamMasukInput,
          jamPulang: jamPulangInput,
          keterangan: `Presensi ${chosenStatus} di ${settings?.profile.tempatPkl || 'Yayasan Kesehatan Pertamina'}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.data);
        setShowAttendanceModal(false);
        fetchAttendance();
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err) {
      console.error('Failed to save attendance:', err);
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Handle Quick Task Add
  const handleQuickTaskAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;

    try {
      setIsSubmittingQuickTask(true);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: currentDateStr,
          hari: hariIni,
          waktu: `${currentTime.slice(0, 5) || '08:00'} - Selesai`,
          tugas: quickTaskText.trim(),
          user: settings?.profile.namaSiswa || 'Staf IT',
          tempat: settings?.profile.defaultTempat || 'Ruang IT / Server',
          status: 'Sedang Berjalan',
          kendala: '-',
          tindakan: '-'
        })
      });
      const data = await res.json();
      if (data.success) {
        setQuickTaskText('');
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (e) {
      console.error('Failed to add quick task:', e);
    } finally {
      setIsSubmittingQuickTask(false);
    }
  };

  // Quick toggle status for task in Card 4
  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'Selesai' ? 'Sedang Berjalan' : 'Selesai';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: nextStatus })
      });
      if (res.ok && onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Short month formatting (e.g. "Okt 12" / "Mar 19")
  const getBentoDateFormatted = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const parts = currentDateStr.split('-');
    if (parts.length === 3) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${months[monthIndex] || 'Okt'} ${day}`;
    }
    return 'Okt 12';
  };

  const studentName = settings?.profile.namaSiswa || 'Fakhri Zainul Arifin';
  const mentorName = settings?.profile.userDuDi || 'Ahmad Fauzi, S.Kom';
  const teacherName = settings?.profile.pembimbingPkl || 'Ristina Eka Salsabila';
  const placeName = settings?.profile.tempatPkl || 'Yayasan Kesehatan Pertamina';

  return (
    <div className="mb-8 space-y-5">
      {/* =========================================================================
          TOP BENTO ROW: 3 CARDS (Matching Reference Top Row)
          - Card 1: 2x2 Avatars Grid + "29 New Messages / Tugas Selesai"
          - Card 2: Glowing Red Flame + "Weekly Trending" / "Opportunities" + Circular Arrow
          - Card 3: "Wednesday" + "Mar 19" + User status pill
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* ===== CARD 1 (Top Left, col-span-3): 2x2 Avatars & Metrics Summary ===== */}
        <div className="md:col-span-12 lg:col-span-3 bento-card bento-card-interactive p-6 flex flex-col justify-between min-h-[220px]">
          {/* 2x2 Avatars Grid */}
          <div className="flex justify-center sm:justify-start">
            <div className="grid grid-cols-2 gap-2.5 w-fit">
              {/* Avatar 1 */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 p-0.5 shadow-2xs">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" 
                  alt="Member"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              {/* Avatar 2 */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 p-0.5 shadow-2xs">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" 
                  alt="Member"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              {/* Avatar 3 */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 p-0.5 shadow-2xs">
                <img 
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" 
                  alt="Member"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              {/* Avatar 4 */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 p-0.5 shadow-2xs">
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" 
                  alt="Member"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Metric label matching "29 New Messages + 12 People" */}
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-bold text-[#14151a] tracking-tight">
              {completedTasks.length} Tugas Selesai
            </h3>
            <p className="text-xs text-[#8e8e99] mt-0.5 font-medium">
              +{inProgressTasks.length} Sedang Berjalan · Tim IT
            </p>
          </div>
        </div>

        {/* ===== CARD 2 (Top Middle, col-span-5): Glowing Flame + Weekly Focus + Round Arrow ===== */}
        <div className="md:col-span-12 lg:col-span-5 bento-card bento-card-interactive p-7 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
          {/* Subtle background hairline */}
          <div className="absolute top-0 right-1/4 w-px h-full bg-black/[0.02]" />

          {/* Glowing Flame Badge (Exact match to reference red radiant glowing icon) */}
          <div>
            <div className="flame-badge mb-4">
              <div className="w-12 h-12 rounded-full bg-[#ef4444] text-white flex items-center justify-center relative z-10 shadow-[0_4px_16px_rgba(239,68,68,0.35)]">
                <Flame className="w-6 h-6 fill-white" />
              </div>
            </div>

            <p className="text-xs font-medium text-[#8e8e99] tracking-normal mb-1">
              Fokus & Target PKL
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#14151a] tracking-tight">
              Infrastruktur IT
            </h3>
            <p className="text-xs text-[#71717a] mt-1 font-normal line-clamp-1">
              {placeName}
            </p>
          </div>

          {/* Bottom Row: Day progress pill & Circular Arrow Button */}
          <div className="flex items-center justify-between pt-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f2f3f7] text-[11px] font-semibold text-[#52525b]">
              <span>Hari ke-{totalDaysElapsed}</span>
              <span className="text-[#a1a1aa]">·</span>
              <span>{progressPercent}% Target</span>
            </div>

            {/* Circular Arrow Button (like bottom right arrow in reference) */}
            <button
              onClick={onOpenNewTask}
              title="Tambah Catatan Tugas"
              className="w-10 h-10 rounded-full bg-[#f2f3f7] hover:bg-[#14151a] text-[#14151a] hover:text-white flex items-center justify-center transition-all duration-200 group-hover:scale-105"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ===== CARD 3 (Top Right, col-span-4): Day + Big Date + Mini User Pill ===== */}
        <div className="md:col-span-12 lg:col-span-4 bento-card bento-card-interactive p-7 flex flex-col justify-between min-h-[220px]">
          <div>
            {/* Day name (e.g. Wednesday / Senin) */}
            <p className="text-sm font-medium text-[#8e8e99]">
              {hariIni}
            </p>

            {/* Huge Date (e.g. Mar 19 / Okt 12) */}
            <h3 className="text-4xl sm:text-5xl font-bold text-[#14151a] tracking-tight mt-1">
              {getBentoDateFormatted()}
            </h3>

            {/* Live Clock */}
            <div className="mt-2 flex items-center gap-2 text-xs font-mono font-medium text-[#71717a]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentTime || '08:00:00'} WIB</span>
            </div>
          </div>

          {/* Bottom user pill matching "Happy Birthday! Luis vona" */}
          <div className="pt-3 border-t border-black/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#14151a] leading-tight">
                  {todayAttendance ? `Hadir: ${todayAttendance.jamMasuk || '07:45'} WIB` : 'Presensi Hari Ini'}
                </p>
                <p className="text-[11px] text-[#8e8e99] leading-tight">
                  {todayAttendance ? studentName.split(' ')[0] : 'Belum tercatat'}
                </p>
              </div>
            </div>

            {/* Attendance trigger button */}
            {todayAttendance ? (
              <button
                onClick={() => setShowAttendanceModal(true)}
                className="text-[11px] font-semibold text-[#71717a] hover:text-[#14151a] px-2.5 py-1 rounded-full hover:bg-[#f2f3f7] transition-colors"
              >
                Ubah
              </button>
            ) : (
              <button
                onClick={() => handleRecordAttendance('Hadir')}
                disabled={isSubmittingAttendance}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#14151a] text-white hover:bg-black transition-colors"
              >
                Absen
              </button>
            )}
          </div>
        </div>

      </div>

      {/* =========================================================================
          MIDDLE & BOTTOM BENTO ROW (Matching Reference Layout)
          - Left Column (Card 4): Tall Card "Find friends" / "Aktivitas Harian" with list & round "+" buttons
          - Right 2 Columns:
            - Card 5: Hero Wide Card "Thriving Tech Community" style with faded image
            - Sub-grid:
              - Card 6: "AI suggestions" / Profile card with 3 pagination dots
              - Card 7: "Product Update" / Google Sheets preview card
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ===== CARD 4 (Left Column, col-span-5): "Find friends" Style Tall Card ===== */}
        <div className="lg:col-span-5 bento-card p-7 flex flex-col justify-between">
          <div>
            {/* Top Row: "Find friends" header + Avatar stack + "+ Catat" pill button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#14151a] tracking-tight">
                Aktivitas Harian
              </h3>

              <div className="flex items-center gap-2">
                {/* Micro avatar stack */}
                <div className="flex -space-x-1.5 overflow-hidden items-center">
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-300 overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-400 overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-[#8e8e99] pl-1 font-semibold">+2</span>
                </div>

                {/* Pill button "+ Add" */}
                <button
                  onClick={onOpenNewTask}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#f2f3f7] hover:bg-[#e6e7ec] text-[#14151a] transition-colors"
                >
                  <span>Tambah</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Inline Task Input */}
            <form onSubmit={handleQuickTaskAdd} className="mb-4 flex items-center gap-2">
              <input
                type="text"
                value={quickTaskText}
                onChange={(e) => setQuickTaskText(e.target.value)}
                placeholder="Catat tugas hari ini..."
                className="flex-1 text-xs px-4 py-2.5 rounded-full bg-[#f2f3f7] hover:bg-[#eaebee] focus:bg-white focus:ring-2 focus:ring-[#14151a]/15 focus:outline-hidden transition-all text-[#14151a] placeholder:text-[#a1a1aa]"
              />
              <button
                type="submit"
                disabled={isSubmittingQuickTask || !quickTaskText.trim()}
                className="w-9 h-9 rounded-full bg-[#14151a] text-white hover:bg-black disabled:opacity-30 transition-all flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Dotted separator line (exact match to reference card 4) */}
            <div className="border-t border-dashed border-black/10 my-4" />

            {/* Sub-header: "Other members" + "25 friends" */}
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-[#14151a]">Daftar Tugas Terkini</span>
              <span className="text-[#8e8e99] font-medium">{todayTasks.length} tugas hari ini</span>
            </div>

            {/* List of Tasks with round avatars & circular "+" buttons */}
            <div className="space-y-3">
              {(todayTasks.length > 0 ? todayTasks.slice(0, 4) : tasks.slice(0, 4)).map((t, idx) => {
                const isDone = t.status === 'Selesai';
                return (
                  <div
                    key={t.id || idx}
                    className="flex items-center justify-between p-2 -mx-2 rounded-2xl hover:bg-[#f2f3f7]/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar / Icon circle */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isDone 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>

                      {/* Title & subtitle */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold leading-tight truncate ${
                          isDone ? 'text-[#71717a] line-through' : 'text-[#14151a]'
                        }`}>
                          {t.tugas}
                        </p>
                        <p className="text-[11px] text-[#8e8e99] mt-0.5 truncate">
                          {t.waktu} · {t.tempat || 'Ruang IT'} · {t.user || 'Staf'}
                        </p>
                      </div>
                    </div>

                    {/* Circular Action Button (+) */}
                    <button
                      onClick={() => handleToggleTaskStatus(t)}
                      title={isDone ? 'Tandai sedang berjalan' : 'Tandai selesai'}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ml-2 ${
                        isDone 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-[#f2f3f7] text-[#71717a] hover:bg-[#14151a] hover:text-white'
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}

              {tasks.length === 0 && (
                <div className="py-8 text-center text-xs text-[#8e8e99]">
                  Belum ada tugas yang dicatat. Mulai ketik di kolom atas.
                </div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 mt-2 border-t border-black/[0.04] flex items-center justify-between text-[11px] text-[#8e8e99]">
            <span>Lokasi: {settings?.profile.defaultTempat || 'Ruang IT / Server'}</span>
            <span className="font-semibold text-[#14151a]">{hariIni}</span>
          </div>
        </div>

        {/* ===== RIGHT COLUMN (col-span-7): HERO CARD 5 + SUB-GRID (CARD 6 & CARD 7) ===== */}
        <div className="lg:col-span-7 flex flex-col gap-5 justify-between">
          
          {/* ===== CARD 5 (Wide Hero Card): "Thriving Tech Community" Style ===== */}
          <div className="bento-card relative overflow-hidden p-8 sm:p-9 flex flex-col justify-between min-h-[220px]">
            {/* Background Graphic on the right fading to white (Exact match to reference photo fade) */}
            <div className="absolute right-0 top-0 bottom-0 w-3/5 sm:w-1/2 pointer-events-none">
              <Image
                src="/images/tech_community.jpg"
                alt="Tech Office"
                fill
                className="object-cover object-right opacity-80"
                priority
              />
              {/* Soft Gradient Fade from White to Transparent */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent" />
            </div>

            {/* Left Content */}
            <div className="relative z-10 max-w-sm sm:max-w-md">
              <h3 className="text-xl sm:text-2xl font-bold text-[#14151a] tracking-tight">
                Portal Monitoring PKL
              </h3>
              <p className="text-xs sm:text-sm text-[#71717a] mt-2 leading-relaxed">
                Pencatatan kegiatan harian praktikum kerja lapangan SMK TI BAZMA, sinkronisasi otomatis Google Sheets & ekspor rekap laporan resmi.
              </p>

              {/* Dark Pill CTA Button */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenReport}
                  className="px-6 py-2.5 rounded-full bg-[#14151a] hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Cetak Laporan PDF
                </button>
                {settings?.google.spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${settings.google.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#14151a] border border-black/[0.06] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Buka Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#71717a]" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ===== SUB-GRID: CARD 6 (AI suggestions profile) & CARD 7 (Product Update preview) ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* ===== CARD 6: "AI suggestions" Style Profile Card with Pagination Dots ===== */}
            <div className="bento-card bento-card-interactive p-6 flex flex-col justify-between items-center text-center min-h-[200px]">
              <div className="w-full text-left">
                <p className="text-xs font-medium text-[#8e8e99]">
                  {profileSlide === 0 ? 'Peserta PKL' : profileSlide === 1 ? 'Pembimbing Industri' : 'Pembimbing Sekolah'}
                </p>
              </div>

              {/* Centered Avatar */}
              <div className="my-2 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full p-1 bg-gradient-to-tr from-slate-200 to-slate-100 shadow-2xs mb-2 relative">
                  <img
                    src={
                      profileSlide === 0 
                        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                        : profileSlide === 1 
                          ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                          : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
                    }
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                <h4 className="text-sm font-bold text-[#14151a] leading-tight">
                  {profileSlide === 0 ? studentName : profileSlide === 1 ? mentorName : teacherName}
                </h4>
                <p className="text-xs text-[#0284c7] font-medium mt-0.5">
                  {profileSlide === 0 
                    ? '@smktibazma · XII SIJA' 
                    : profileSlide === 1 
                      ? '@pertamina · DU/DI Mentor' 
                      : '@sekolah · Guru Pembimbing'}
                </p>
              </div>

              {/* Interactive Pagination Dots (exact match to reference card 6) */}
              <div className="flex items-center gap-1.5 pt-1">
                {[0, 1, 2].map((dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setProfileSlide(dotIdx)}
                    className={`h-1.5 rounded-full transition-all ${
                      profileSlide === dotIdx 
                        ? 'w-4 bg-[#14151a]' 
                        : 'w-1.5 bg-[#d4d4d9] hover:bg-[#a1a1aa]'
                    }`}
                    title={`Slide ${dotIdx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* ===== CARD 7: "Product Update - 2029" Style Card with Architectural Preview ===== */}
            <div className="bento-card bento-card-interactive p-6 flex flex-col justify-between min-h-[200px]">
              <div>
                <h4 className="text-sm font-bold text-[#14151a] tracking-tight">
                  Google Sheet Cloud Sync
                </h4>
                <p className="text-xs text-[#8e8e99] mt-0.5 line-clamp-1">
                  {settings?.google.isConfigured ? 'Status koneksi aktif & tersinkron' : 'Konfigurasi Google API siap'}
                </p>
              </div>

              {/* Image Preview Box with rounded corners */}
              <div className="my-3 rounded-2xl overflow-hidden relative h-24 w-full bg-slate-100 border border-black/[0.04]">
                <Image
                  src="/images/architecture_preview.jpg"
                  alt="Cloud Architecture"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[10px]">
                  <span className="font-semibold bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full">
                    Database PKL
                  </span>
                  <span className="bg-emerald-500/90 backdrop-blur-xs text-white px-2 py-0.5 rounded-full font-medium">
                    Online
                  </span>
                </div>
              </div>

              {/* Footer metadata: Date, comment/stats count, author avatar */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-[#8e8e99]">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#a1a1aa]" />
                    <span>{settings?.profile.bulanPelaksanaan || 'Okt 2026'}</span>
                  </span>
                  <span>·</span>
                  <span>{tasks.length} log</span>
                </div>

                <div className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-2xs">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80"
                    alt="Author"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Attendance Detail Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-6 animate-in fade-in zoom-in-95 shadow-2xl border border-black/[0.04]">
            <h3 className="text-base font-bold text-[#14151a] mb-1">
              Catat Presensi Harian
            </h3>
            <p className="text-xs text-[#71717a] mb-4">
              {hariIni}, {formatDateToIndonesian(currentDateStr)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#52525b] mb-2">
                  Status Kehadiran
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Hadir', 'Izin', 'Sakit', 'Libur'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAttendanceStatus(st)}
                      className={`py-2 text-xs font-semibold rounded-full transition-all ${
                        attendanceStatus === st
                          ? 'bg-[#14151a] text-white shadow-xs'
                          : 'bg-[#f2f3f7] text-[#52525b] hover:bg-[#e4e4e7]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {attendanceStatus === 'Hadir' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#52525b] mb-1.5">
                      Jam Masuk
                    </label>
                    <input
                      type="text"
                      value={jamMasukInput}
                      onChange={(e) => setJamMasukInput(e.target.value)}
                      placeholder="07:45"
                      className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-[#f2f3f7] focus:bg-white focus:ring-2 focus:ring-[#14151a]/10 focus:outline-hidden text-[#14151a]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#52525b] mb-1.5">
                      Jam Pulang
                    </label>
                    <input
                      type="text"
                      value={jamPulangInput}
                      onChange={(e) => setJamPulangInput(e.target.value)}
                      placeholder="16:30"
                      className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-[#f2f3f7] focus:bg-white focus:ring-2 focus:ring-[#14151a]/10 focus:outline-hidden text-[#14151a]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#71717a] hover:bg-[#f2f3f7] rounded-full"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleRecordAttendance()}
                  disabled={isSubmittingAttendance}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#14151a] hover:bg-black rounded-full transition-colors shadow-xs"
                >
                  {isSubmittingAttendance ? 'Menyimpan...' : 'Simpan Presensi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
