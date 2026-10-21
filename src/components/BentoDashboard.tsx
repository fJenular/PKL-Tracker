'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  UserCheck,
  ClipboardList,
  ArrowRight,
  Calendar,
  MapPin,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  Compass,
  Plus,
  Camera,
  LogOut,
  AlertTriangle,
  AlertCircle,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  ChevronDown,
  FileText,
  RefreshCw,
  Settings
} from 'lucide-react';
import { Task, AppSettings, AttendanceRecord } from '@/types';
import { formatDateToIndonesian, getHariFromDate, getCurrentDateString } from '@/lib/dateUtils';
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { TactileButton } from "@/components/TactileButton";
import SmartPKLAbsenModal from "@/components/SmartPKLAbsenModal";
import ClockOutSelfieModal from "@/components/ClockOutSelfieModal";
import { alarmManager } from "@/lib/alarmAudio";

interface BentoDashboardProps {
  tasks: Task[];
  settings: AppSettings | null;
  onOpenNewTask?: () => void;
  onTaskUpdated?: () => void;
  onOpenReport?: () => void;
  onOpenSettings?: () => void;
  onSyncAll?: () => void;
  isSyncing?: boolean;
  unsyncedCount?: number;
}

export default function BentoDashboard({
  tasks,
  settings,
  onOpenNewTask,
  onTaskUpdated,
  onOpenReport,
  onOpenSettings,
  onSyncAll,
  isSyncing = false,
  unsyncedCount = 0
}: BentoDashboardProps) {
  const router = useRouter();
  // Live clock & date state
  const [hours, setHours] = useState<string>('00');
  const [minutes, setMinutes] = useState<string>('00');
  const [seconds, setSeconds] = useState<string>('00');
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [hariIni, setHariIni] = useState<string>('KAM');
  const [dayNumber, setDayNumber] = useState<string>('15');
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [isAttendanceLoaded, setIsAttendanceLoaded] = useState(false);

  // SmartPKL & Absen Pulang states
  const [isSmartPKLModalOpen, setIsSmartPKLModalOpen] = useState(false);
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
  const [pulangSuccessMsg, setPulangSuccessMsg] = useState<string | null>(null);

  // Alarm states (Pagi: 07:30 - 08:00, Pulang: 16:00)
  const [isAlarmMuted, setIsAlarmMuted] = useState(false);
  const [hasPlayedMorningAlarm, setHasPlayedMorningAlarm] = useState(false);
  const [hasPlayedAfternoonAlarm, setHasPlayedAfternoonAlarm] = useState(false);
  const [isMorningAlarmDismissed, setIsMorningAlarmDismissed] = useState(false);
  const [isAfternoonAlarmDismissed, setIsAfternoonAlarmDismissed] = useState(false);

  // Initialize live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setHours(h);
      setMinutes(m);
      setSeconds(s);
      setCurrentSeconds(now.getSeconds());

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dStr = `${year}-${month}-${day}`;
      setCurrentDateStr(dStr);
      setDayNumber(day);

      const fullHari = getHariFromDate(dStr);
      // Short 3-letter day uppercase (e.g. 'SEL', 'RAB', 'KAM') for Zen Dots
      setHariIni(fullHari ? fullHari.slice(0, 3).toUpperCase() : 'RAB');

      // PKL days elapsed
      const pklStart = new Date('2026-08-03T00:00:00');
      const diffMs = Math.max(0, now.getTime() - pklStart.getTime());
      setTotalDaysElapsed(Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
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
        let mergedList = [...data.data];
        try {
          const stored = JSON.parse(localStorage.getItem('attendance_clockout') || '{}');
          Object.keys(stored).forEach((dateKey) => {
            const localData = stored[dateKey];
            const idx = mergedList.findIndex((r) => r.tanggal === dateKey);
            if (idx >= 0) {
              if (!mergedList[idx].jamPulang && localData.jamPulang) {
                mergedList[idx] = { ...mergedList[idx], jamPulang: localData.jamPulang, selfieClockOut: true };
              }
            } else if (localData.jamPulang) {
              mergedList.push({
                tanggal: dateKey,
                status: localData.status || 'Hadir',
                jamMasuk: localData.jamMasuk || '07:45',
                jamPulang: localData.jamPulang,
                keterangan: localData.keterangan || 'Presensi PKL Hari Ini',
                selfieClockOut: true,
              });
            }
          });
        } catch {
          // ignore
        }
        setAttendanceList(mergedList);
        const todayKey = currentDateStr || getCurrentDateString();
        const todayRec = mergedList.find((r: AttendanceRecord) => r.tanggal === todayKey);
        setTodayAttendance(todayRec || null);
      }
    } catch (e) {
      console.error('Error fetching attendance:', e);
    } finally {
      setIsAttendanceLoaded(true);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentDateStr]);

  // Profile data
  const studentName = settings?.profile.namaSiswa || 'Fakhri Zainul Arifin';
  const studentNis = settings?.profile.nis || '2324009';
  const schoolName = settings?.profile.sekolah || 'SMK TI BAZMA';
  const placeName = settings?.profile.tempatPkl || 'Yayasan Kesehatan Pertamina';
  const defaultPlace = settings?.profile.defaultTempat || 'Ruang IT / Server';
  const mentorName = settings?.profile.pembimbingPkl || 'Ristina Eka Salsabila';

  // Otomatis pecah nama menjadi 2 suku kata per baris
  const studentNameWords = studentName.trim().split(/\s+/).filter(Boolean);
  const studentNameChunks: string[] = [];
  for (let i = 0; i < studentNameWords.length; i += 2) {
    studentNameChunks.push(studentNameWords.slice(i, i + 2).join(' '));
  }

  // Task stats
  const completedTasks = tasks.filter((t) => t.status === 'Selesai');
  const inProgressTasks = tasks.filter((t) => t.status === 'Sedang Berjalan');

  // Calculate Days of PKL since 3 Agustus 2026
  const [totalDaysElapsed, setTotalDaysElapsed] = useState<number>(0);

  // Analog dial angle rotates continuously with current seconds (6deg per sec)
  const dialAngle = currentSeconds * 6;

  // Time & attendance status computations
  const currentHour = parseInt(hours, 10);
  const currentMinute = parseInt(minutes, 10);
  const currentTimeInMinutes = (isNaN(currentHour) ? 0 : currentHour) * 60 + (isNaN(currentMinute) ? 0 : currentMinute);

  // Alarm Pagi: HANYA aktif pada rentang 07:30 WIB s/d 08:00 WIB (450 - 480 menit).
  // Di atas jam 08:00 WIB, alarm pagi TIDAK AKAN PERNAH berbunyi!
  const isMorningAlarmTime = currentTimeInMinutes >= 450 && currentTimeInMinutes <= 480;

  // Alarm Pulang: Jam 16:00 WIB s/d 18:00 WIB (960 - 1080 menit)
  const isAfterWork = currentTimeInMinutes >= 960;
  const isAfternoonAlarmTime = currentTimeInMinutes >= 960 && currentTimeInMinutes <= 1080;

  const hasCheckedIn = Boolean(
    todayAttendance &&
    todayAttendance.jamMasuk &&
    todayAttendance.jamMasuk !== '-' &&
    todayAttendance.jamMasuk !== ''
  );
  const hasCheckedOut = Boolean(
    todayAttendance?.jamPulang &&
    todayAttendance.jamPulang !== '-' &&
    todayAttendance.jamPulang !== ''
  );

  // Status Alarm Aktif:
  // WAJIB membaca data dulu (isAttendanceLoaded === true) dan HANYA berbunyi jika belum absen!
  const isMorningAlarmActive = isAttendanceLoaded && isMorningAlarmTime && !hasCheckedIn;
  const isAfternoonAlarmActive = isAttendanceLoaded && isAfternoonAlarmTime && !hasCheckedOut;

  // Auto trigger alarm sound & notification
  useEffect(() => {
    if (isMorningAlarmActive && !hasPlayedMorningAlarm && !isAlarmMuted && !isMorningAlarmDismissed) {
      alarmManager.playAlarm('morning');
      alarmManager.sendNotification(
        '🚨 Alarm Presensi Masuk (07:30 - 08:00 WIB)',
        'Waktu sudah melewati 07:30 WIB dan kamu belum melakukan absensi masuk PKL hari ini!'
      );
      setHasPlayedMorningAlarm(true);
    }
  }, [isMorningAlarmActive, hasPlayedMorningAlarm, isAlarmMuted, isMorningAlarmDismissed]);

  useEffect(() => {
    if (isAfternoonAlarmActive && !hasPlayedAfternoonAlarm && !isAlarmMuted && !isAfternoonAlarmDismissed) {
      alarmManager.playAlarm('afternoon');
      alarmManager.sendNotification(
        '🔔 Alarm Presensi Pulang (16:00 WIB)',
        'Jam kerja PKL hari ini telah selesai (16:00 WIB). Waktunya absen pulang!'
      );
      setHasPlayedAfternoonAlarm(true);
    }
  }, [isAfternoonAlarmActive, hasPlayedAfternoonAlarm, isAlarmMuted, isAfternoonAlarmDismissed]);

  // Buka modal selfie absen pulang
  const handleOpenClockOut = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setIsClockOutModalOpen(true);
  };

  // Dipanggil setelah selfie absen pulang berhasil
  const handleClockOutSuccess = async (jamPulang: string) => {
    setIsClockOutModalOpen(false);
    // Hentikan alarm pulang
    alarmManager.stopAlarm('afternoon');
    await fetchAttendance();
    onTaskUpdated?.();
    setPulangSuccessMsg(`Selfie absen pulang pukul ${jamPulang} WIB berhasil! Selamat beristirahat 🎉`);
    setTimeout(() => setPulangSuccessMsg(null), 7000);
  };

  return (
    <div className="space-y-2 sm:space-y-5">
      {/* ===== SUCCESS TOAST ===== */}
      {pulangSuccessMsg && (
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600 shrink-0" />
            <span>{pulangSuccessMsg}</span>
          </div>
          <button
            onClick={() => setPulangSuccessMsg(null)}
            className="text-emerald-700/60 hover:text-emerald-900 text-base leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ===== ALARM BANNER PAGI (Jam >= 07:30 & Belum Absen Masuk) ===== */}
      {isMorningAlarmActive && !isMorningAlarmDismissed && (
        <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-rose-500/15 via-orange-500/15 to-amber-500/15 border-2 border-rose-400/80 p-2.5 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md animate-bounce ring-2 sm:ring-4 ring-rose-400/30">
              <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-rose-600 text-white uppercase tracking-wider shadow-xs animate-pulse">
                  🚨 ALARM 07:30 WIB
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-rose-800">
                  Wajib Presensi Masuk
                </span>
              </div>
              <h4 className="text-xs sm:text-base font-bold text-slate-900 mt-0.5 sm:mt-1">
                Kamu Belum Absen Hari Ini!
              </h4>
              <p className="hidden sm:block text-xs text-slate-600 mt-0.5">
                Jam telah melewati batas alarm <strong>07:30 WIB</strong>. Segera lakukan Absen Masuk selfie terintegrasi SmartPKL BAZMA.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 pt-0.5 sm:pt-0">
            <button
              onClick={() => {
                const nextMuted = !isAlarmMuted;
                setIsAlarmMuted(nextMuted);
                if (!nextMuted) alarmManager.playAlarm('morning');
              }}
              className="px-2.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs"
              title={isAlarmMuted ? 'Bunyikan Alarm' : 'Matikan Suara Alarm'}
            >
              {isAlarmMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 animate-pulse" />}
              <span>{isAlarmMuted ? 'Muted' : 'Tes Suara'}</span>
            </button>
            <button
              onClick={() => setIsSmartPKLModalOpen(true)}
              className="px-3 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-1 sm:gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Camera size={12} strokeWidth={2.5} />
              <span>Absen Masuk Sekarang</span>
            </button>
            <button
              onClick={() => { setIsMorningAlarmDismissed(true); alarmManager.stopAlarm('morning'); }}
              className="p-1 sm:p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer ml-auto sm:ml-0"
              title="Tutup Peringatan"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ===== ALARM BANNER PULANG (Jam >= 16:00 & Belum Absen Pulang) ===== */}
      {isAfternoonAlarmActive && !isAfternoonAlarmDismissed && (
        <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-emerald-500/15 border-2 border-orange-400/80 p-2.5 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md animate-bounce ring-2 sm:ring-4 ring-orange-400/30">
              <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-orange-600 text-white uppercase tracking-wider shadow-xs animate-pulse">
                  🔔 ALARM 16:00 WIB
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-orange-800">
                  Waktunya Pulang PKL
                </span>
              </div>
              <h4 className="text-xs sm:text-base font-bold text-slate-900 mt-0.5 sm:mt-1">
                Waktunya Absen Pulang!
              </h4>
              <p className="hidden sm:block text-xs text-slate-600 mt-0.5">
                Jam kerja PKL hari ini telah selesai (pukul 16:00 WIB). Cukup 1 klik tanpa kamera untuk konfirmasi absen pulang di Task Tracker.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 pt-0.5 sm:pt-0">
            <button
              onClick={() => {
                const nextMuted = !isAlarmMuted;
                setIsAlarmMuted(nextMuted);
                if (!nextMuted) alarmManager.playAlarm('afternoon');
              }}
              className="px-2.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs"
              title={isAlarmMuted ? 'Bunyikan Alarm' : 'Matikan Suara Alarm'}
            >
              {isAlarmMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 animate-pulse" />}
              <span>{isAlarmMuted ? 'Muted' : 'Tes Suara'}</span>
            </button>
            <button
              onClick={handleOpenClockOut}
              className="px-3 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center gap-1 sm:gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Camera size={12} strokeWidth={2.5} />
              <span>Selfie Absen Pulang</span>
            </button>
            <button
              onClick={() => { setIsAfternoonAlarmDismissed(true); alarmManager.stopAlarm('afternoon'); }}
              className="p-1 sm:p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer ml-auto sm:ml-0"
              title="Tutup Peringatan"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MOBILE VIEW (< sm): TINKOFF / SUPERAPP INSPIRED CARDS (Exact Screenshot)
          ========================================================================= */}
      <div className="sm:hidden space-y-3 pb-20 select-none">
        {/* Top Header Location Bar (Like "Москва ⌵" in screenshot) */}
        <div className="flex items-center justify-between px-1 pt-1 text-white">
          <div className="w-8" />
          <div 
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-xs font-bold tracking-tight text-white truncate max-w-[220px]">
              {placeName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          </div>
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center hover:bg-blue-600/50 transition-colors cursor-pointer"
            title="Pengaturan"
          >
            <Sparkles className="w-4 h-4 fill-blue-400" />
          </button>
        </div>

        {/* 1. Hero Banner: Soft Sky-Blue Gradient (Like "Все сервисы теперь в Городе") */}
        <Link
          href="/profile"
          className="block relative overflow-hidden rounded-[1.6rem] bg-gradient-to-r from-[#4d95e8] via-[#61a5f0] to-[#73b4f6] p-4 text-white shadow-lg active:scale-[0.99] transition-transform"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 pr-1">
              <h3 className="text-sm font-bold leading-tight tracking-tight text-white">
                Profil Siswa &amp; Penugasan
              </h3>
              <p className="text-[11px] text-white/90 leading-snug mt-1 line-clamp-2">
                {studentName} · {placeName} ({defaultPlace})
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-xs text-[9px] font-semibold text-white border border-white/20">
                  Pembimbing: {mentorName}
                </span>
              </div>
            </div>

            {/* Right 3D Badge */}
            <div className="relative shrink-0 w-13 h-13 bg-white/20 backdrop-blur-md rounded-2xl p-1 border border-white/30 flex items-center justify-center shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/Profile.png"
                alt="Profile Avatar"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>
          </div>
        </Link>

        {/* 2. Row 1: Wide Card (~63%) + Narrow Card (~37%) */}
        <div className="grid grid-cols-12 gap-2.5">
          {/* Card A (Pink/Berry Gradient - Like "Афиша" in screenshot) */}
          <div
            onClick={() => router.push('/tugas')}
            className="col-span-7 relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#eb5c84] via-[#e24e77] to-[#d64069] p-3.5 text-white flex flex-col justify-between shadow-md h-[126px] active:scale-[0.99] transition-transform group cursor-pointer"
          >
            <div>
              <h4 className="text-sm font-bold leading-tight">
                Tugas Harian
              </h4>
              <p className="text-[10px] text-white/85 leading-tight mt-0.5 line-clamp-1">
                {tasks.length} Catatan Kegiatan
              </p>
            </div>

            {/* Signature Yellow Pill Badge */}
            <div className="relative z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/tugas?new=1');
                }}
                className="inline-flex items-center gap-1 bg-[#ffd231] hover:bg-[#ffc814] active:scale-95 text-black font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-xs transition-transform cursor-pointer"
              >
                <Plus size={11} strokeWidth={3} />
                <span>+ Tambah</span>
              </button>
            </div>

            {/* 3D Keyboard Watermark Graphic */}
            <div className="absolute -bottom-2 -right-2 w-20 h-16 pointer-events-none opacity-90 transition-transform group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/task-3d.png"
                alt="Task 3D"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>
          </div>

          {/* Card B (Periwinkle Blue - Like "Топливо" in screenshot) */}
          <div className="col-span-5 relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#688cf6] via-[#5b7ef0] to-[#5072e6] p-3.5 text-white flex flex-col justify-between shadow-md h-[126px]">
            <div>
              <h4 className="text-sm font-bold leading-tight">
                Jam PKL
              </h4>
              <p className="text-base font-black font-mono tracking-tight mt-0.5 text-white">
                {hours}:{minutes}
                <span className="text-xs text-white/70 font-normal">:{seconds}</span>
              </p>
            </div>

            {/* Signature Yellow Pill Badge */}
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 bg-[#ffd231] text-black font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                {hariIni}, {dayNumber}
              </span>
            </div>

            {/* Rotating Dial Watermark Graphic */}
            <div className="absolute -bottom-2 -right-2 w-14 h-14 pointer-events-none opacity-40">
              <div
                className="w-full h-full rounded-full border-2 border-white/60 flex items-center justify-center transition-transform duration-500 ease-out"
                style={{ transform: `rotate(${dialAngle}deg)` }}
              >
                <div className="w-0.5 h-6 bg-white rounded-full -mt-2" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Row 2: 3 Square Cards (Violet, Sunny Amber, Emerald Green - Like Row 2 in screenshot) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Card C (Violet/Purple) -> GOOGLE SYNC */}
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-[#6366f1] to-[#7c3aed] p-3 text-white flex flex-col justify-between shadow-md h-[106px] text-left active:scale-[0.98] transition-transform group cursor-pointer"
          >
            <div>
              <h4 className="text-xs font-bold leading-tight">
                Google Sync
              </h4>
              <p className="text-[9px] text-white/80 leading-tight mt-0.5">
                Spreadsheet
              </p>
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-0.5 bg-[#ffd231] text-black font-extrabold text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                {isSyncing ? 'Syncing...' : unsyncedCount > 0 ? `${unsyncedCount} Antri` : 'Sinkron'}
              </span>
            </div>
            <RefreshCw className={`w-9 h-9 text-white/20 absolute -bottom-1 -right-1 pointer-events-none ${isSyncing ? 'animate-spin text-white/40' : ''}`} />
          </button>

          {/* Card D (Gold / Amber) -> LAPORAN PDF */}
          <button
            onClick={onOpenReport}
            className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-[#f59e0b] to-[#eab308] p-3 text-white flex flex-col justify-between shadow-md h-[106px] text-left active:scale-[0.98] transition-transform group cursor-pointer"
          >
            <div>
              <h4 className="text-xs font-bold leading-tight">
                Laporan
              </h4>
              <p className="text-[9px] text-white/80 leading-tight mt-0.5">
                Format Nilai
              </p>
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-0.5 bg-[#ffd231] text-black font-extrabold text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                Export PDF
              </span>
            </div>
            <FileText className="w-9 h-9 text-white/20 absolute -bottom-1 -right-1 pointer-events-none" />
          </button>

          {/* Card E (Mint / Emerald Green) -> REKAP PRESENSI */}
          <Link
            href="/print-absensi"
            className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-[#10b981] to-[#059669] p-3 text-white flex flex-col justify-between shadow-md h-[106px] text-left active:scale-[0.98] transition-transform group cursor-pointer"
          >
            <div>
              <h4 className="text-xs font-bold leading-tight">
                Rekap Hadir
              </h4>
              <p className="text-[9px] text-white/80 leading-tight mt-0.5">
                Daftar Bulan
              </p>
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-0.5 bg-[#ffd231] text-black font-extrabold text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                {attendanceList.length} Hari
              </span>
            </div>
            <Calendar className="w-9 h-9 text-white/20 absolute -bottom-1 -right-1 pointer-events-none" />
          </Link>
        </div>

        {/* 4. Row 3: Narrow Card (~37%) + Wide Card (~63%) */}
        <div className="grid grid-cols-12 gap-2.5">
          {/* Card F (Left - Dark Graphite Carbon, col-span-5 - Like "5 букв" in screenshot) */}
          <div className="col-span-5 relative overflow-hidden rounded-[1.5rem] bg-[#1c1e24] border border-white/10 p-3.5 text-white flex flex-col justify-between shadow-md h-[126px]">
            <div>
              <h4 className="text-xs font-bold text-slate-300 leading-tight">
                Hari PKL
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Sejak 3 Ags
              </p>
            </div>

            <div className="my-auto">
              <span className="text-3xl font-black font-zen-dots text-amber-400 leading-none">
                {totalDaysElapsed}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">Hari</span>
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-0.5 bg-white/10 text-slate-300 font-semibold text-[9px] px-2 py-0.5 rounded-full">
                2026-2027
              </span>
            </div>
          </div>

          {/* Card G (Right - Sky Blue / Cyan, col-span-7 - Like "Путешествия" in screenshot) */}
          <div
            onClick={() => router.push('/absensi')}
            className="col-span-7 relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] p-3.5 text-white flex flex-col justify-between shadow-md h-[126px] active:scale-[0.99] transition-transform group cursor-pointer"
          >
            <div>
              <h4 className="text-sm font-bold leading-tight">
                Absensi Harian
              </h4>
              <p className="text-[10px] text-white/90 leading-tight mt-0.5">
                SmartPKL &amp; Pulang
              </p>
            </div>

            {/* Signature Yellow Pill Badge (Interactive Spotlight!) */}
            <div className="relative z-10">
              {!isAttendanceLoaded ? (
                <span className="inline-flex items-center gap-1 bg-[#ffd231] text-black font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-xs">
                  Memeriksa...
                </span>
              ) : !isAfterWork ? (
                !hasCheckedIn ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsSmartPKLModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 bg-[#ffd231] hover:bg-[#ffc814] active:scale-95 text-black font-black text-[10px] px-2.5 py-1 rounded-full shadow-xs animate-pulse cursor-pointer"
                  >
                    <AlertCircle size={11} strokeWidth={3} />
                    <span>Clock In</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-[#ffd231] text-black font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-xs">
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                    <span>Sudah Clock In ({todayAttendance?.jamMasuk || '07:44'})</span>
                  </span>
                )
              ) : !hasCheckedOut ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOpenClockOut(e);
                  }}
                  className="inline-flex items-center gap-1 bg-[#ffd231] hover:bg-[#ffc814] active:scale-95 text-black font-black text-[10px] px-2.5 py-1 rounded-full shadow-xs animate-pulse cursor-pointer"
                >
                  <Camera size={11} strokeWidth={2.5} />
                  <span>Clock Out</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 bg-[#ffd231] text-black font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-xs">
                  <CheckCircle2 size={11} strokeWidth={2.5} />
                  <span>Sudah Clock Out ({todayAttendance?.jamPulang}) ✓</span>
                </span>
              )}
            </div>

            {/* 3D Smart Gadget Watermark Graphic in Bottom Right */}
            <div className="absolute -bottom-1 -right-1 w-16 h-16 pointer-events-none opacity-90 transition-transform group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/att-3d.png"
                alt="Attendance 3D"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>
          </div>
        </div>

        {/* 5. Row 4: 3 Square Cards (Slate, Indigo, Bronze - Like Row 4 in screenshot) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Card H: Settings */}
          <button
            onClick={onOpenSettings}
            className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-[#475569] to-[#334155] p-3 text-white flex flex-col justify-between shadow-md h-[106px] text-left active:scale-[0.98] transition-transform group cursor-pointer"
          >
            <div>
              <h4 className="text-xs font-bold leading-tight">
                Pengaturan
              </h4>
              <p className="text-[9px] text-white/70 leading-tight mt-0.5">
                Konfigurasi
              </p>
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-0.5 bg-[#ffd231] text-black font-extrabold text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                Buka Setting
              </span>
            </div>
            <Settings className="w-9 h-9 text-white/15 absolute -bottom-1 -right-1 pointer-events-none" />
          </button>

          {/* Card I: SmartPKL (Menyesuaikan waktu: Pagi = Clock In, Pulang = Clock Out) */}
          <button
            onClick={() => {
              if (isAfterWork) {
                handleOpenClockOut();
              } else {
                setIsSmartPKLModalOpen(true);
              }
            }}
            className={`relative overflow-hidden rounded-[1.4rem] p-3 text-white flex flex-col justify-between shadow-md h-[106px] text-left active:scale-[0.98] transition-transform group cursor-pointer ${
              isAfterWork
                ? hasCheckedOut
                  ? 'bg-gradient-to-br from-[#059669] to-[#047857]'
                  : 'bg-gradient-to-br from-[#ea580c] to-[#c2410c]'
                : hasCheckedIn
                ? 'bg-gradient-to-br from-[#059669] to-[#047857]'
                : 'bg-gradient-to-br from-[#6366f1] to-[#4f46e5]'
            }`}
          >
            <div>
              <h4 className="text-xs font-bold leading-tight">
                {isAfterWork ? 'Absen Pulang' : 'SmartPKL'}
              </h4>
              <p className="text-[9px] text-white/80 leading-tight mt-0.5">
                {isAfterWork
                  ? hasCheckedOut
                    ? `Pulang (${todayAttendance?.jamPulang || '16:00'})`
                    : 'Selfie Pulang'
                  : hasCheckedIn
                  ? `Hadir (${todayAttendance?.jamMasuk || '07:44'})`
                  : 'Foto Selfie'}
              </p>
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 bg-[#ffd231] text-black font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-xs">
                {isAfterWork ? (
                  hasCheckedOut ? (
                    <>
                      <CheckCircle2 size={10} strokeWidth={2.5} />
                      <span>Sudah Clock Out</span>
                    </>
                  ) : (
                    <>
                      <LogOut size={10} strokeWidth={2.5} />
                      <span className="font-black animate-pulse">Clock Out</span>
                    </>
                  )
                ) : hasCheckedIn ? (
                  <>
                    <CheckCircle2 size={10} strokeWidth={2.5} />
                    <span>Sudah Clock In</span>
                  </>
                ) : (
                  <>
                    <Camera size={10} strokeWidth={2.5} />
                    <span className="font-black animate-pulse">Clock In</span>
                  </>
                )}
              </span>
            </div>
            {isAfterWork ? (
              <LogOut className="w-9 h-9 text-white/15 absolute -bottom-1 -right-1 pointer-events-none" />
            ) : (
              <Camera className="w-9 h-9 text-white/15 absolute -bottom-1 -right-1 pointer-events-none" />
            )}
          </button>

          {/* Card J: Profile Siswa */}
          <Link
            href="/profile"
            className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-[#b4835a] to-[#9a683e] p-3 text-white flex flex-col justify-between shadow-md h-[106px] text-left active:scale-[0.98] transition-transform group cursor-pointer"
          >
            <div>
              <h4 className="text-xs font-bold leading-tight">
                Profil Siswa
              </h4>
              <p className="text-[9px] text-white/70 leading-tight mt-0.5">
                Data Lengkap
              </p>
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-0.5 bg-[#ffd231] text-black font-extrabold text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                NIS 2324009
              </span>
            </div>
            <GraduationCap className="w-9 h-9 text-white/15 absolute -bottom-1 -right-1 pointer-events-none" />
          </Link>
        </div>

      </div>

      {/* =========================================================================
          DESKTOP VIEW (>= sm): ORIGINAL BENTO DASHBOARD (100% PRESERVED)
          ========================================================================= */}
      <div className="hidden sm:block space-y-5">
        {/* ROW 1 BENTO: CARD 1 (col-span-4) + CARD 2 (col-span-8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

          {/* ===== CARD 1: APPLE WATCH ULTRA SMARTWATCH TIMEPIECE ===== */}
          <div className="lg:col-span-4 bento-card p-4 sm:p-10 flex flex-col justify-between bg-[#e5e6de] relative overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.2rem] border border-black/[0.06] select-none">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top Row: Date Tile & Analog Compass Dial */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2 items-center">
              {/* Top Left: Date Box */}
              <div className="bg-[#1b1c20] text-white rounded-2xl sm:rounded-[1.4rem] p-3.5 sm:p-4 flex flex-col justify-center items-start shadow-md aspect-square transition-transform duration-300 group-hover:scale-[1.02]">
                <span className="text-xs sm:text-lg font-normal text-slate-300 tracking-widest leading-none font-zen-dots uppercase">
                  {hariIni}
                </span>
                <span className="text-3xl sm:text-5xl xl:text-6xl font-normal text-white tracking-wider leading-none mt-1.5 sm:mt-2 font-zen-dots">
                  {dayNumber}
                </span>
              </div>

              {/* Top Right: Analog Compass Dial Complication */}
              <div className="flex items-center justify-center">
                <div className="bg-[#1b1c20] rounded-full aspect-square w-full max-w-[125px] relative flex items-center justify-center shadow-md p-1 border border-white/5 transition-transform duration-300 group-hover:scale-[1.02]">
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const angle = i * 15;
                      const isMajor = i % 2 === 0;
                      return (
                        <line
                          key={i}
                          x1="50"
                          y1="7"
                          x2="50"
                          y2={isMajor ? "16" : "12"}
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth={isMajor ? "2" : "1.2"}
                          transform={`rotate(${angle} 50 50)`}
                        />
                      );
                    })}
                  </svg>
                  <div
                    className="relative z-10 w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center transition-transform duration-500 ease-out"
                    style={{ transform: `rotate(${dialAngle}deg)` }}
                  >
                    <div className="w-1.5 h-7 sm:h-8 bg-white rounded-full flex flex-col items-center justify-start shadow-xs">
                      <div className="w-3.5 sm:w-4 h-3.5 sm:h-4 border-t-2 border-r-2 border-white -rotate-45 -mt-1" />
                    </div>
                    <div className="w-3 h-3 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Orange Digital Time Capsule */}
            <div className="bg-[#ea580c] sm:bg-[#f05033] rounded-2xl sm:rounded-[1.4rem] py-3.5 sm:py-4 px-3 sm:px-4 flex items-center justify-center shadow-md mt-3 transition-transform duration-300 group-hover:scale-[1.01]">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 font-zen-dots select-none text-neutral-950">
                <span className="text-2xl sm:text-3xl xl:text-4xl font-normal leading-none tabular-nums tracking-wider">
                  {hours}
                </span>
                <span className="text-xl sm:text-2xl xl:text-3xl font-normal leading-none text-neutral-950/70 -translate-y-0.5 animate-second-dot">
                  :
                </span>
                <span className="text-2xl sm:text-3xl xl:text-4xl font-normal leading-none tabular-nums tracking-wider">
                  {minutes}
                </span>
                <span className="text-xl sm:text-2xl xl:text-3xl font-normal leading-none text-neutral-950/70 -translate-y-0.5 animate-second-dot">
                  :
                </span>
                <div className="relative inline-flex items-center justify-center bg-black/10 rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-0.5 border border-black/5 shadow-inner">
                  <span
                    key={seconds}
                    className="animate-second-flip text-2xl sm:text-3xl xl:text-4xl font-normal leading-none text-neutral-950 tabular-nums tracking-wider"
                  >
                    {seconds}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CARD 2: PROFIL SISWA & LOKASI PENUGASAN ===== */}
          <Link
            href="/profile"
            className="lg:col-span-8 bento-card p-6 sm:p-8 flex flex-col justify-between bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.2rem] border border-black/[0.04] cursor-pointer"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl group-hover:bg-yellow-400/20 transition-all duration-700 pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1 space-y-4 text-left">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] uppercase">
                  {studentNameChunks.map((chunk, idx) => (
                    <React.Fragment key={idx}>
                      {chunk}
                      {idx < studentNameChunks.length - 1 ? <br /> : '.'}
                    </React.Fragment>
                  ))}
                </h2>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[15px] font-semibold border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {placeName}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[15px] font-medium">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {defaultPlace}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  Pembimbing: <strong className="text-slate-700 font-semibold">{mentorName}</strong>
                </p>
              </div>

              <div className="relative shrink-0 w-36 sm:w-50 h-36 sm:h-50 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/Profile.png"
                  alt="Profile Image"
                  className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-2"
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium group-hover:text-slate-600 transition-colors">
                Buka Halaman Profile
              </span>
              <span className="text-xs font-bold text-amber-500 hover:text-amber-600 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                Go to page <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>

        {/* ROW 2 BENTO: CARD 3 (Tugas) + CARD 4 (Absensi) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* ===== CARD 3: TUGAS HARIAN ===== */}
          <div
            onClick={() => router.push('/tugas')}
            className="bento-card p-6 sm:p-8 flex flex-col justify-between bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.2rem] border border-black/[0.04] cursor-pointer"
          >
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700 pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1 space-y-2 text-left">
                <h2 className="text-2xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[0.8] uppercase">
                  TUGAS<br />
                  HARIAN.
                </h2>
                <div className="pt-3">
                  <TactileButton
                    size="sm"
                    variant="amber"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/tugas?new=1');
                    }}
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>Tambah Tugas</span>
                  </TactileButton>
                </div>
              </div>

              <div className="relative shrink-0 w-44 sm:w-56 h-40 sm:h-48 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/task-3d.png"
                  alt="3D Mechanical Keyboard"
                  className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:-rotate-2"
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Buka Halaman Catatan Tugas Harian
              </span>
              <span className="text-xs font-bold text-amber-500 hover:text-amber-600 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                Go to page <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>

          {/* ===== CARD 4: ABSENSI HARIAN ===== */}
          <div
            onClick={() => router.push('/absensi')}
            className="bento-card p-6 sm:p-8 flex flex-col justify-between bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.2rem] border border-black/[0.04] cursor-pointer"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-700 pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1 space-y-2 text-left">
                <h2 className="text-2xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[0.8] uppercase">
                  ABSENSI<br />
                  HARIAN.
                </h2>

                <div className="pt-2">
                  {!isAttendanceLoaded ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-400 text-xs font-semibold animate-pulse">
                      <span>Memeriksa presensi...</span>
                    </div>
                  ) : !isAfterWork ? (
                    !hasCheckedIn ? (
                      <div className="relative inline-flex items-center">
                        <span className="absolute -inset-1 rounded-full bg-rose-500/35 blur-sm animate-pulse" />
                        <TactileButton
                          size="md"
                          variant="rose"
                          className="relative ring-4 ring-rose-400/40 shadow-rose-500/30 animate-pulse hover:animate-none cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsSmartPKLModalOpen(true);
                          }}
                        >
                          <AlertCircle size={15} strokeWidth={2.5} className="animate-bounce" />
                          <span>Kamu Belum Absen! (Absen Sekarang)</span>
                        </TactileButton>
                      </div>
                    ) : (
                      <TactileButton
                        size="md"
                        variant="emerald"
                        className="ring-2 ring-emerald-400/30 cursor-pointer shadow-sm hover:scale-[1.02] transition-transform"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push('/absensi');
                        }}
                        title="Klik untuk membuka riwayat presensi"
                      >
                        <CheckCircle2 size={15} strokeWidth={2.5} />
                        <span>Kamu sudah absen ({todayAttendance?.jamMasuk || '07:44'})</span>
                      </TactileButton>
                    )
                  ) : !hasCheckedOut ? (
                    <div className="relative inline-flex items-center">
                      <span className="absolute -inset-1 rounded-full bg-amber-500/35 blur-sm animate-pulse" />
                      <TactileButton
                        size="md"
                        variant="amber"
                        className="relative ring-4 ring-amber-400/40 shadow-amber-500/30 animate-pulse hover:animate-none cursor-pointer"
                        onClick={handleOpenClockOut}
                      >
                        <Camera size={15} strokeWidth={2.5} />
                        <span>Selfie Absen Pulang</span>
                      </TactileButton>
                    </div>
                  ) : (
                    <TactileButton
                      size="md"
                      variant="emerald"
                      className="ring-2 ring-emerald-400/30 cursor-pointer shadow-sm hover:scale-[1.02] transition-transform"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push('/absensi');
                      }}
                      title="Klik untuk membuka riwayat presensi"
                    >
                      <CheckCircle2 size={15} strokeWidth={2.5} />
                      <span>Sudah absen pulang ({todayAttendance?.jamPulang}) ✓</span>
                    </TactileButton>
                  )}
                </div>
              </div>

              <div className="relative shrink-0 w-36 sm:w-44 h-36 sm:h-44 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/att-3d.png"
                  alt="3D Orange Smart Gadget"
                  className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-2"
                />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Kelola Absensi &amp; Rekap Kehadiran
              </span>
              <span className="text-xs font-bold text-amber-500 hover:text-amber-600 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                Go to page <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SmartPKL Absen Modal */}
      <SmartPKLAbsenModal
        isOpen={isSmartPKLModalOpen}
        onClose={() => setIsSmartPKLModalOpen(false)}
        todayAttendance={todayAttendance}
        onSuccess={() => {
          alarmManager.stopAlarm('morning');
          fetchAttendance();
          onTaskUpdated?.();
        }}
      />

      {/* Clock-Out Selfie Modal */}
      <ClockOutSelfieModal
        isOpen={isClockOutModalOpen}
        onClose={() => setIsClockOutModalOpen(false)}
        onSuccess={handleClockOutSuccess}
        todayDate={currentDateStr}
        jamMasuk={todayAttendance?.jamMasuk || '08:00'}
        status={todayAttendance?.status || 'Hadir'}
        keterangan={todayAttendance?.keterangan || 'Presensi PKL Hari Ini'}
      />
    </div>
  );
}
