'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  UserCheck, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Save, 
  X,
  FileText,
  Building2,
  ShieldAlert,
  Info
} from 'lucide-react';
import FloatingActionMenu from '@/components/FloatingActionMenu';
import SettingsModal from '@/components/SettingsModal';
import GoogleGuideModal from '@/components/GoogleGuideModal';
import ReportModal from '@/components/ReportModal';
import { AttendanceRecord, AppSettings, Task } from '@/types';
import { formatDateToIndonesian, getHariFromDate, getCurrentDateString, getCurrentTimeString, getBulanFromDate } from '@/lib/dateUtils';

export default function AbsensiPage() {
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>('Oktober');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal presensi
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Form state
  const [tanggal, setTanggal] = useState(getCurrentDateString());
  const [status, setStatus] = useState<'Hadir' | 'Izin' | 'Sakit' | 'Libur'>('Hadir');
  const [jamMasuk, setJamMasuk] = useState('07:45');
  const [jamPulang, setJamPulang] = useState('16:30');
  const [keterangan, setKeterangan] = useState('Hadir di Yayasan Kesehatan Pertamina');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const [attRes, setRes, tasksRes] = await Promise.all([
        fetch('/api/attendance').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/tasks').then((r) => r.json())
      ]);
      if (attRes.success && Array.isArray(attRes.data)) {
        setAttendanceList(attRes.data);
      }
      if (setRes.success) setSettings(setRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
    } catch (err: any) {
      console.error('Failed to fetch attendance:', err);
      showNotification('Gagal memuat riwayat presensi.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const todayStr = getCurrentDateString();
  const todayRecord = attendanceList.find((r) => r.tanggal === todayStr);

  const openFormForToday = () => {
    if (todayRecord) {
      setTanggal(todayRecord.tanggal);
      setStatus(todayRecord.status);
      setJamMasuk(todayRecord.jamMasuk || '07:45');
      setJamPulang(todayRecord.jamPulang || '16:30');
      setKeterangan(todayRecord.keterangan || '');
    } else {
      setTanggal(todayStr);
      setStatus('Hadir');
      setJamMasuk(getCurrentTimeString());
      setJamPulang('16:30');
      setKeterangan(`Hadir di ${settings?.profile.tempatPkl || 'Yayasan Kesehatan Pertamina'}`);
    }
    setIsModalOpen(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          status,
          jamMasuk,
          jamPulang,
          keterangan: keterangan.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Presensi berhasil disimpan!', 'success');
        setIsModalOpen(false);
        fetchAttendance();
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan presensi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalHadir = attendanceList.filter((a) => a.status === 'Hadir').length;
  const totalIzin = attendanceList.filter((a) => a.status === 'Izin').length;
  const totalSakit = attendanceList.filter((a) => a.status === 'Sakit').length;
  const totalLibur = attendanceList.filter((a) => a.status === 'Libur').length;

  return (
    <div className="min-h-screen bg-[#f2f3f7] pb-24 pt-6 sm:pt-8">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Header */}
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Absensi Harian
                </h1>
                <span className="text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-0.5 rounded-full">
                  {attendanceList.length} Hari Tercatat
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan jam kehadiran dan kepulangan PKL di {settings?.profile.tempatPkl || 'Yayasan Kesehatan Pertamina'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Cetak Rekap</span>
            </button>

            <button
              onClick={openFormForToday}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{todayRecord ? 'Ubah Presensi Hari Ini' : 'Catat Presensi Hari Ini'}</span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="p-4 rounded-2xl bg-white text-xs font-medium flex items-center justify-between bento-card border border-black/[0.04]">
            <div className="flex items-center gap-2.5 text-[#14151a]">
              {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              {notification.type === 'info' && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
              <span>{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)} 
              className="text-[#a1a1aa] hover:text-[#14151a] ml-4 text-lg leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Status Card & Overview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Card Hari Ini */}
          <div className="md:col-span-12 lg:col-span-6 bento-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Presensi Hari Ini
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {formatDateToIndonesian(todayStr)}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm shrink-0 ${
                  todayRecord 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {todayRecord ? `Status: ${todayRecord.status}` : 'Belum Ada Catatan Presensi'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {todayRecord 
                      ? `Tercatat masuk pukul ${todayRecord.jamMasuk} · Pulang ${todayRecord.jamPulang || '16:30'}` 
                      : 'Silakan klik tombol Catat Presensi untuk merekam kehadiran hari ini'}
                  </p>
                </div>
              </div>

              {todayRecord?.keterangan && (
                <div className="mt-4 p-3 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-100">
                  <span className="font-semibold text-slate-700">Keterangan:</span> {todayRecord.keterangan}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Jam Kerja Resmi: <strong>08:00 - 16:30 WIB</strong>
              </span>
              <button
                onClick={openFormForToday}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
              >
                {todayRecord ? 'Edit Presensi →' : '+ Isi Presensi Sekarang →'}
              </button>
            </div>
          </div>

          {/* Card Statistik Kehadiran */}
          <div className="md:col-span-12 lg:col-span-6 bento-card p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Ringkasan Kehadiran
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{totalHadir}</p>
                  <p className="text-xs font-medium text-emerald-800 mt-0.5">Hadir</p>
                </div>
                <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 text-center">
                  <p className="text-2xl font-bold text-sky-700">{totalIzin}</p>
                  <p className="text-xs font-medium text-sky-800 mt-0.5">Izin</p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
                  <p className="text-2xl font-bold text-amber-700">{totalSakit}</p>
                  <p className="text-xs font-medium text-amber-800 mt-0.5">Sakit</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-2xl font-bold text-slate-700">{totalLibur}</p>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">Libur</p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Lokasi Penugasan: <strong>{settings?.profile.tempatPkl || 'Yayasan Kesehatan Pertamina'}</strong></span>
              <span className="font-semibold text-slate-700">SMK TI BAZMA</span>
            </div>
          </div>
        </div>

        {/* Tabel Riwayat Kehadiran */}
        <div className="bento-card overflow-hidden">
          {/* Month Sheet Tabs Bar */}
          <div className="px-6 pt-3 pb-2 border-b border-black/[0.04] bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Bulan:
              </span>
              {(['Agustus', 'September', 'Oktober', 'all'] as const).map((m) => {
                const count = m === 'all' ? attendanceList.length : attendanceList.filter(a => getBulanFromDate(a.tanggal) === m).length;
                const isActive = monthFilter === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonthFilter(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-sky-800 shadow-xs border border-sky-200/90 ring-1 ring-sky-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <span>{m === 'all' ? 'Semua Bulan' : m}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-sky-100 text-sky-800 font-bold' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {attendanceList.filter(a => monthFilter === 'all' || getBulanFromDate(a.tanggal) === monthFilter).length} Entri
            </span>
          </div>

          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Presensi PKL {monthFilter !== 'all' ? `(${monthFilter})` : ''}
              </h3>
              <p className="text-xs text-slate-500">Log kehadiran harian peserta praktik kerja lapangan</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Tanggal & Hari</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Jam Pulang</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceList.filter(a => monthFilter === 'all' || getBulanFromDate(a.tanggal) === monthFilter).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Belum ada data presensi yang tercatat untuk bulan {monthFilter}.
                    </td>
                  </tr>
                ) : (
                  attendanceList
                    .filter(a => monthFilter === 'all' || getBulanFromDate(a.tanggal) === monthFilter)
                    .reverse()
                    .map((rec, idx, arr) => (
                    <tr key={rec.tanggal} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                        {arr.length - idx}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {formatDateToIndonesian(rec.tanggal)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {getHariFromDate(rec.tanggal)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          rec.status === 'Hadir'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : rec.status === 'Izin'
                            ? 'bg-sky-50 text-sky-700 border border-sky-100'
                            : rec.status === 'Sakit'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {rec.jamMasuk ? `${rec.jamMasuk} WIB` : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {rec.jamPulang ? `${rec.jamPulang} WIB` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {rec.keterangan || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Floating Action Menu */}
      <FloatingActionMenu
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenReport={() => setIsReportModalOpen(true)}
      />

      {/* Modal Form Presensi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Catat Presensi Harian</h3>
                <p className="text-xs text-slate-500">Pencatatan kehadiran kerja PKL BAZMA</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Presensi
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Kehadiran
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Hadir', 'Izin', 'Sakit', 'Libur'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        status === st
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Jam Masuk
                    </label>
                    <button
                      type="button"
                      onClick={() => setJamMasuk(getCurrentTimeString())}
                      className="text-[10px] text-sky-600 hover:underline cursor-pointer"
                    >
                      Sekarang
                    </button>
                  </div>
                  <input
                    type="time"
                    value={jamMasuk}
                    onChange={(e) => setJamMasuk(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-mono cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Jam Pulang
                    </label>
                    <button
                      type="button"
                      onClick={() => setJamPulang(getCurrentTimeString())}
                      className="text-[10px] text-sky-600 hover:underline cursor-pointer"
                    >
                      Sekarang
                    </button>
                  </div>
                  <input
                    type="time"
                    value={jamPulang}
                    onChange={(e) => setJamPulang(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-mono cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Tempat
                </label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Hadir tepat waktu di Ruang IT"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Presensi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings & Guide Modals */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={async (data) => {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          fetchAttendance();
          showNotification('Pengaturan diperbarui!', 'success');
        }}
        onOpenGuide={() => {
          setIsSettingsModalOpen(false);
          setIsGuideModalOpen(true);
        }}
      />

      <GoogleGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        serviceAccountEmail={settings?.google.serviceAccountEmail}
        spreadsheetId={settings?.google.spreadsheetId}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        tasks={tasks}
        settings={settings}
      />
    </div>
  );
}
