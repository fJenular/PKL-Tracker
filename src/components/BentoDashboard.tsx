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
  VolumeX
} from 'lucide-react';
import { Task, AppSettings, AttendanceRecord } from '@/types';
import { formatDateToIndonesian, getHariFromDate, getCurrentDateString } from '@/lib/dateUtils';
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { TactileButton } from "@/components/TactileButton";
import SmartPKLAbsenModal from "@/components/SmartPKLAbsenModal";
import { alarmManager } from "@/lib/alarmAudio";

interface BentoDashboardProps {
  tasks: Task[];
  settings: AppSettings | null;
  onOpenNewTask?: () => void;
  onTaskUpdated?: () => void;
}

export default function BentoDashboard({
  tasks,
  settings,
  onOpenNewTask,
  onTaskUpdated
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
  const [isSubmittingPulang, setIsSubmittingPulang] = useState(false);
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
        setAttendanceList(data.data);
        const todayKey = currentDateStr || getCurrentDateString();
        const todayRec = data.data.find((r: AttendanceRecord) => r.tanggal === todayKey);
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

  // 1-Click Absen Pulang (Tanpa Akses Kamera)
  const handleAbsenPulang = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSubmittingPulang) return;

    try {
      setIsSubmittingPulang(true);
      const now = new Date();
      const jamStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

      // 1. Notify smartpkl proxy
      fetch('/api/smartpkl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pulang', jamPulang: jamStr }),
      }).catch(console.error);

      // 2. Save/update local attendance record
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: currentDateStr,
          status: todayAttendance?.status || 'Hadir',
          jamMasuk: todayAttendance?.jamMasuk || '08:00',
          jamPulang: jamStr,
          keterangan: todayAttendance?.keterangan || 'Presensi PKL Hari Ini',
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchAttendance();
        onTaskUpdated?.();
        setPulangSuccessMsg(`Berhasil Absen Pulang pukul ${jamStr} WIB! Selamat beristirahat 🎉`);
        setTimeout(() => setPulangSuccessMsg(null), 6000);
      } else {
        alert(data.message || 'Gagal menyimpan absensi pulang.');
      }
    } catch (err: any) {
      console.error('Error saat absen pulang:', err);
      alert('Terjadi kesalahan saat memproses absen pulang.');
    } finally {
      setIsSubmittingPulang(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ===== SUCCESS TOAST ===== */}
      {pulangSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-rose-500/15 via-orange-500/15 to-amber-500/15 border-2 border-rose-400/80 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md animate-bounce ring-4 ring-rose-400/30">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white uppercase tracking-wider shadow-xs animate-pulse">
                  🚨 ALARM 07:30 WIB
                </span>
                <span className="text-xs font-semibold text-rose-800">
                  Wajib Presensi Masuk
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                Kamu Belum Absen Hari Ini!
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Jam telah melewati batas alarm <strong>07:30 WIB</strong>. Segera lakukan Absen Masuk selfie terintegrasi SmartPKL BAZMA.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <button
              onClick={() => {
                const nextMuted = !isAlarmMuted;
                setIsAlarmMuted(nextMuted);
                if (!nextMuted) alarmManager.playAlarm('morning');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={isAlarmMuted ? 'Bunyikan Alarm' : 'Matikan Suara Alarm'}
            >
              {isAlarmMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
              <span>{isAlarmMuted ? 'Suara Mati' : 'Tes Bunyi'}</span>
            </button>
            <TactileButton
              size="sm"
              variant="rose"
              className="ring-2 ring-rose-400/50"
              onClick={() => setIsSmartPKLModalOpen(true)}
            >
              <Camera size={13} strokeWidth={2.5} />
              <span>Absen Masuk Sekarang</span>
            </TactileButton>
            <button
              onClick={() => setIsMorningAlarmDismissed(true)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
              title="Tutup Peringatan"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ===== ALARM BANNER PULANG (Jam >= 16:00 & Belum Absen Pulang) ===== */}
      {isAfternoonAlarmActive && !isAfternoonAlarmDismissed && (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-emerald-500/15 border-2 border-orange-400/80 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md animate-bounce ring-4 ring-orange-400/30">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-600 text-white uppercase tracking-wider shadow-xs animate-pulse">
                  🔔 ALARM 16:00 WIB
                </span>
                <span className="text-xs font-semibold text-orange-800">
                  Waktunya Pulang PKL
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                Waktunya Absen Pulang!
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Jam kerja PKL hari ini telah selesai (pukul 16:00 WIB). Cukup 1 klik tanpa kamera untuk konfirmasi absen pulang di Task Tracker.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <button
              onClick={() => {
                const nextMuted = !isAlarmMuted;
                setIsAlarmMuted(nextMuted);
                if (!nextMuted) alarmManager.playAlarm('afternoon');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={isAlarmMuted ? 'Bunyikan Alarm' : 'Matikan Suara Alarm'}
            >
              {isAlarmMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
              <span>{isAlarmMuted ? 'Suara Mati' : 'Tes Bunyi'}</span>
            </button>
            <TactileButton
              size="sm"
              variant="amber"
              className="ring-2 ring-amber-400/50"
              onClick={handleAbsenPulang}
              disabled={isSubmittingPulang}
            >
              <CheckCircle2 size={13} strokeWidth={2.5} />
              <span>{isSubmittingPulang ? 'Menyimpan...' : 'Absen Pulang (1 Klik)'}</span>
            </TactileButton>
            <button
              onClick={() => setIsAfternoonAlarmDismissed(true)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
              title="Tutup Peringatan"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROW 1 BENTO:
          - CARD 1: APPLE WATCH ULTRA SMARTWATCH TIMEPIECE (Exact Image 2)
          - CARD 2: PROFILE & PLACEMENT CARD (Teenage Engineering Playdate Aesthetic)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* ===== CARD 1 (col-span-4): WATCH FACE MODULAR WIDGET (HANYA JAM, HARI, TANGGAL) ===== */}
        <div className="lg:col-span-4 bento-card p-4 sm:p-10 flex flex-col justify-between bg-[#e5e6de] relative overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.2rem] border border-black/[0.06] select-none">
          {/* Subtle Accent Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Date Tile & Analog Compass Dial */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2 items-center">

            {/* Top Left: Date Box (Hari & Tanggal) - Zen Dots Font */}
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
                {/* 24 Tick Marks around perimeter */}
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

                {/* Compass/Analog Pointer arrow (rotates smoothly with seconds) */}
                <div
                  className="relative z-10 w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center transition-transform duration-500 ease-out"
                  style={{ transform: `rotate(${dialAngle}deg)` }}
                >
                  <div className="w-1.5 h-7 sm:h-8 bg-white rounded-full flex flex-col items-center justify-start shadow-xs">
                    {/* Arrow head */}
                    <div className="w-3.5 sm:w-4 h-3.5 sm:h-4 border-t-2 border-r-2 border-white -rotate-45 -mt-1" />
                  </div>
                  {/* Center hub */}
                  <div className="w-3 h-3 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-xs" />
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row: Vibrant Coral/Orange Digital Time Capsule with Seconds & Zen Dots */}
          <div className="bg-[#ea580c] sm:bg-[#f05033] rounded-2xl sm:rounded-[1.4rem] py-3.5 sm:py-4 px-3 sm:px-4 flex items-center justify-center shadow-md mt-3 transition-transform duration-300 group-hover:scale-[1.01]">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 font-zen-dots select-none text-neutral-950">
              {/* Jam (Hours) */}
              <span className="text-2xl sm:text-3xl xl:text-4xl font-normal leading-none tabular-nums tracking-wider">
                {hours}
              </span>

              {/* Separator Titik Dua dengan pulse halus */}
              <span className="text-xl sm:text-2xl xl:text-3xl font-normal leading-none text-neutral-950/70 -translate-y-0.5 animate-second-dot">
                :
              </span>

              {/* Menit (Minutes) */}
              <span className="text-2xl sm:text-3xl xl:text-4xl font-normal leading-none tabular-nums tracking-wider">
                {minutes}
              </span>

              {/* Separator Titik Dua dengan pulse halus */}
              <span className="text-xl sm:text-2xl xl:text-3xl font-normal leading-none text-neutral-950/70 -translate-y-0.5 animate-second-dot">
                :
              </span>

              {/* Detik (Seconds) dengan Animasi 3D Flip Setiap Pergantian Detik */}
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

        {/* ===== CARD 2 (col-span-8): PROFIL SISWA & LOKASI PENUGASAN (Image 1 Style) ===== */}
        <div className="lg:col-span-8 bento-card p-6 sm:p-8 flex flex-col justify-between bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.2rem] border border-black/[0.04]">
          {/* Subtle Ambient Background Glow on Hover */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl group-hover:bg-yellow-400/20 transition-all duration-700 pointer-events-none" />

          {/* Content Flex Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left Column: Typography & Badges */}
            <div className="flex-1 space-y-4 text-left">
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] uppercase">
                {studentNameChunks.map((chunk, idx) => (
                  <React.Fragment key={idx}>
                    {chunk}
                    {idx < studentNameChunks.length - 1 ? <br /> : '.'}
                  </React.Fragment>
                ))}
              </h2>
              {/* <p className="text-xs text-slate-500 leading-relaxed font-normal pt-1 max-w-[320px]">
                {schoolName} · Penugasan di {placeName} ({defaultPlace}).
              </p> */}

              {/* Badges */}
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

            {/* Right Column: 3D Yellow Pocket Console (Playdate Style) */}
            <div className="relative shrink-0 w-36 sm:w-50 h-36 sm:h-50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/Profile.png"
                alt="Profile Image"
                className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-2"
              />
            </div>
          </div>

          {/* Bottom Action Link */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              Buka Halaman Profile
            </span>
            <span className="text-xs font-bold text-amber-500 hover:text-amber-600 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all cursor-pointer">
              Go to page <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          ROW 2 BENTO:
          - CARD 3: TUGAS HARIAN (Green Mechanical Keyboard Asset from Image 1)
          - CARD 4: ABSENSI HARIAN (Orange Rabbit R1 Asset from Image 1)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

        {/* ===== CARD 3: TUGAS HARIAN (Image 1 Keyboard Card Style) ===== */}
        <Link
          href="/tugas"
          className="bento-card p-6 sm:p-8 flex flex-col justify-between bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.2rem] border border-black/[0.04] cursor-pointer"
        >
          {/* Subtle Ambient Background Glow on Hover */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700 pointer-events-none" />

          {/* Content Flex Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left Column: Bold Typography & Details */}
            <div className="flex-1 space-y-2 text-left">
              <h2 className="text-2xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[0.8] uppercase">
                TUGAS<br />
                HARIAN.
              </h2>

              {/* Tactile CTA — shortcut ke tambah tugas */}
              <div className="pt-3">
                <TactileButton
                  size="sm"
                  variant="amber"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push('/tugas?new=1');
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Tambah Tugas</span>
                </TactileButton>
              </div>
            </div>

            {/* Right Column: 3D Forest Green Mechanical Keyboard (Image 1 Style) */}
            <div className="relative shrink-0 w-44 sm:w-56 h-40 sm:h-48 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/task-3d.png"
                alt="3D Mechanical Keyboard"
                className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:-rotate-2"
              />
            </div>
          </div>

          {/* Bottom Action Link */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              Buka Halaman Catatan Tugas Harian
            </span>
            <span className="text-xs font-bold text-amber-500 hover:text-amber-600 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
              Go to page <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* ===== CARD 4: ABSENSI HARIAN (Image 1 Rabbit R1 Style) ===== */}
        <div
          onClick={() => router.push('/absensi')}
          className="bento-card p-6 sm:p-8 flex flex-col justify-between bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.2rem] border border-black/[0.04] cursor-pointer"
        >
          {/* Subtle Ambient Background Glow on Hover */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-700 pointer-events-none" />

          {/* Content Flex Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left Column: Bold Typography & Details */}
            <div className="flex-1 space-y-2 text-left">
              <h2 className="text-2xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[0.8] uppercase">
                ABSENSI<br />
                HARIAN.
              </h2>

              {/* 1 Single Dynamic Spotlight Button */}
              <div className="pt-2">
                {!isAttendanceLoaded ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-400 text-xs font-semibold animate-pulse">
                    <span>Memeriksa presensi...</span>
                  </div>
                ) : !isAfterWork ? (
                  !hasCheckedIn ? (
                    // KONDISI 1: Belum Absen Masuk -> SPOTLIGHT bahwa kamu belum absen
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
                    // KONDISI 2: Sudah Absen Masuk -> Tulisannya kamu sudah absen di jam sekian
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
                  // KONDISI 3: Jam Pulang (>= 16:00) & Belum Absen Pulang -> SPOTLIGHT berubah jadi absen pulang
                  <div className="relative inline-flex items-center">
                    <span className="absolute -inset-1 rounded-full bg-amber-500/35 blur-sm animate-pulse" />
                    <TactileButton
                      size="md"
                      variant="amber"
                      disabled={isSubmittingPulang}
                      className="relative ring-4 ring-amber-400/40 shadow-amber-500/30 animate-pulse hover:animate-none cursor-pointer"
                      onClick={handleAbsenPulang}
                    >
                      <LogOut size={15} strokeWidth={2.5} />
                      <span>{isSubmittingPulang ? 'Menyimpan...' : 'Absen Pulang (1 Klik)'}</span>
                    </TactileButton>
                  </div>
                ) : (
                  // KONDISI 4: Jam Pulang & Sudah Pulang
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

            {/* Right Column: 3D Orange Rabbit R1 Device (Exact Image 1 Style) */}
            <div className="relative shrink-0 w-36 sm:w-44 h-36 sm:h-44 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/att-3d.png"
                alt="3D Orange Smart Gadget"
                className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-2"
              />
            </div>
          </div>

          {/* Bottom Action Link */}
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

      {/* SmartPKL Absen Modal */}
      <SmartPKLAbsenModal
        isOpen={isSmartPKLModalOpen}
        onClose={() => setIsSmartPKLModalOpen(false)}
        onSuccess={() => {
          fetchAttendance();
          onTaskUpdated?.();
        }}
      />
    </div>
  );
}
