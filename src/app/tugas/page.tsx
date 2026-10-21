'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  ClipboardList,
  TrendingUp,
  CalendarDays,
  Award,
  Clock
} from 'lucide-react';
import TaskList from '@/components/TaskList';
import TaskFormModal from '@/components/TaskFormModal';
import ReportModal from '@/components/ReportModal';
import SettingsModal from '@/components/SettingsModal';
import GoogleGuideModal from '@/components/GoogleGuideModal';
import FloatingActionMenu from '@/components/FloatingActionMenu';
import { Task, AppSettings } from '@/types';

function TugasContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Export parameters from active filters
  const [reportExportParams, setReportExportParams] = useState<{
    selectedIds?: string[];
    month?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  // Selected task for editing
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Multi-select for tasks
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Synchronization status
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, settingsRes] = await Promise.all([
        fetch('/api/tasks').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json())
      ]);
      if (tasksRes.success) setTasks(tasksRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      showNotification('Gagal memuat data dari server.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-open task form when navigated with ?new=1
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsTaskModalOpen(true);
      // Remove the query param so a refresh doesn't re-open
      router.replace('/tugas', { scroll: false });
    }
  }, [searchParams, router]);

  // Save new or edited task
  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        const data = await res.json();
        if (data.success) {
          setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? data.data : t)));
          showNotification('Tugas berhasil diperbarui!', 'success');
        } else {
          throw new Error(data.message);
        }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        const data = await res.json();
        if (data.success) {
          setTasks((prev) => [...prev, data.data]);
          showNotification(data.message || 'Tugas berhasil ditambahkan!', 'success');
        } else {
          throw new Error(data.message);
        }
      }
      setEditingTask(null);
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan tugas', 'error');
      throw err;
    }
  };

  // Delete single task
  const handleDeleteTask = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setSelectedTaskIds((prev) => prev.filter((tid) => tid !== id));
        showNotification('Tugas berhasil dihapus.', 'info');
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      showNotification(err.message || 'Gagal menghapus tugas', 'error');
    }
  };

  // Delete multiple selected tasks
  const handleDeleteSelected = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedTaskIds.length} tugas yang dipilih?`)) return;
    let deletedCount = 0;
    let failedCount = 0;
    const idsToDelete = [...selectedTaskIds];
    for (const id of idsToDelete) {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          deletedCount++;
          setTasks((prev) => prev.filter((t) => t.id !== id));
          setSelectedTaskIds((prev) => prev.filter((tid) => tid !== id));
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }
    if (failedCount === 0) {
      showNotification(`${deletedCount} tugas berhasil dihapus.`, 'info');
    } else {
      showNotification(`${deletedCount} dihapus, ${failedCount} gagal.`, 'error');
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter((i) => i !== id));
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const handleSelectAll = (all: boolean) => {
    setSelectedTaskIds(all ? tasks.map((t) => t.id) : []);
  };

  const handleSyncToGoogle = async (taskIds?: string[]) => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, 'success');
        const refreshRes = await fetch('/api/tasks').then((r) => r.json());
        if (refreshRes.success) setTasks(refreshRes.data);
      } else {
        showNotification(data.message, 'error');
      }
    } catch (err: any) {
      showNotification(err.message || 'Sinkronisasi gagal', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull latest tasks from Google Spreadsheet & merge with local database
  const handlePullFromGoogle = async () => {
    try {
      setIsPulling(true);
      const res = await fetch('/api/google/pull', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, 'success');
        if (data.data) setTasks(data.data);
      } else {
        showNotification(data.message || 'Gagal menarik data dari Google Spreadsheet', 'error');
      }
    } catch (err: any) {
      showNotification(err.message || 'Gagal menarik data dari Google Spreadsheet', 'error');
    } finally {
      setIsPulling(false);
    }
  };

  // Clean full sync all local tasks into Google Spreadsheet
  const handleSyncAllToGoogle = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/google/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, 'success');
        if (data.data) setTasks(data.data);
      } else {
        showNotification(data.message || 'Sinkronisasi gagal', 'error');
      }
    } catch (err: any) {
      showNotification(err.message || 'Sinkronisasi gagal', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = async (newSettingsData: any) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettingsData)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        showNotification('Pengaturan berhasil diperbarui!', 'success');
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan pengaturan', 'error');
      throw err;
    }
  };

  const unsyncedCount = tasks.filter((t) => !t.isSyncedToSheet).length;

  // ===== STATISTIK PKL =====
  const pklStartDate = new Date('2026-08-03T00:00:00');
  const today = new Date();
  const diffTime = Math.max(0, today.getTime() - pklStartDate.getTime());
  const totalDaysPkl = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Target PKL ~90 hari (3 bulan: Agt, Sep, Okt)
  const targetDays = 90;
  const pklProgressPercent = Math.min(100, Math.round((totalDaysPkl / targetDays) * 100));

  const totalTugas = tasks.length;
  const selesai = tasks.filter((t) => t.status === 'Selesai').length;
  const berjalan = tasks.filter((t) => t.status === 'Sedang Berjalan').length;
  const pending = tasks.filter((t) => t.status === 'Pending').length;
  const synced = tasks.filter((t) => t.isSyncedToSheet).length;
  const selesaiPercent = totalTugas > 0 ? Math.round((selesai / totalTugas) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f2f3f7] pb-24 pt-6 sm:pt-8">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">

        {/* ===== Header ===== */}
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
                  Tugas Harian
                </h1>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                  {totalTugas} Total Tugas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Jurnal harian penugasan dan aktivitas kerja di {settings?.profile.tempatPkl || 'Yayasan Kesehatan Pertamina'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePullFromGoogle}
              disabled={isPulling}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Tarik data tugas terbaru dari Google Spreadsheet ke aplikasi"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isPulling ? 'animate-spin' : ''}`} />
              <span>{isPulling ? 'Menarik...' : 'Tarik dari Sheet'}</span>
            </button>

            <button
              onClick={handleSyncAllToGoogle}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Rapikan & sinkronkan seluruh tugas ke Google Spreadsheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Semua'}</span>
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Ekspor Dokumen</span>
            </button>

            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tugas</span>
            </button>
          </div>
        </div>

        {/* ===== REKAP & STATISTIK PKL ===== */}
        <div className="bento-card p-5 sm:p-6 bg-gradient-to-br from-white via-white to-emerald-50/40">
          
          {/* Top row: 4 stat pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            
            {/* Total Tugas */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{totalTugas}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Total Tugas</p>
              </div>
            </div>

            {/* Selesai */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 leading-none">{selesai}</p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Selesai</p>
              </div>
            </div>

            {/* Berjalan / Pending */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-sky-50 border border-sky-100">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-sky-700 leading-none">{berjalan + pending}</p>
                <p className="text-[10px] text-sky-600 font-medium mt-0.5">Berjalan / Pending</p>
              </div>
            </div>

            {/* Hari PKL */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-violet-50 border border-violet-100">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-700 leading-none">{totalDaysPkl}</p>
                <p className="text-[10px] text-violet-600 font-medium mt-0.5">Hari PKL</p>
              </div>
            </div>
          </div>

          {/* Bottom row: 2 progress bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Progress tugas selesai */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Progres Penyelesaian Tugas
                </span>
                <span className="text-xs font-bold text-emerald-700">{selesaiPercent}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                  style={{ width: `${selesaiPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {selesai} dari {totalTugas} tugas telah diselesaikan
              </p>
            </div>

            {/* Progress durasi PKL */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-violet-600" />
                  Durasi PKL Berjalan
                </span>
                <span className="text-xs font-bold text-violet-700">{pklProgressPercent}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-700"
                  style={{ width: `${pklProgressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Hari ke-{totalDaysPkl} dari ±{targetDays} hari PKL · Mulai 3 Agustus 2026
              </p>
            </div>
          </div>

          {/* Footer info */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Tersinkronkan ke Sheet: <strong className="text-emerald-600">{synced}</strong> tugas
              {unsyncedCount > 0 && (
                <span className="ml-2 text-amber-500 font-semibold">· {unsyncedCount} belum sinkron</span>
              )}
            </span>
            <span className="font-semibold text-slate-500">
              {settings?.profile.namaSiswa || 'Fakhri Zainul Arifin'} · SMK TI BAZMA
            </span>
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

        {/* Task Table — semua tugas dengan filter lengkap */}
        <TaskList
          tasks={tasks}
          selectedMonth="all"
          selectedTaskIds={selectedTaskIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          onExportSelected={() => {
            setReportExportParams({ selectedIds: selectedTaskIds });
            setIsReportModalOpen(true);
          }}
          onExportFiltered={(filtered, info) => {
            setReportExportParams({
              selectedIds: filtered.map((t) => t.id),
              month: info.month,
              dateFrom: info.dateFrom,
              dateTo: info.dateTo
            });
            setIsReportModalOpen(true);
          }}
          onSyncSelected={() => handleSyncToGoogle(selectedTaskIds)}
          isSyncing={isSyncing}
          onPullFromSheet={handlePullFromGoogle}
          isPulling={isPulling}
          onSyncAllToSheet={handleSyncAllToGoogle}
          onDeleteSelected={handleDeleteSelected}
        />
      </main>

      <FloatingActionMenu
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenReport={() => {
          setReportExportParams({});
          setIsReportModalOpen(true);
        }}
        onSyncAll={handleSyncAllToGoogle}
        onPullFromGoogle={handlePullFromGoogle}
        isSyncing={isSyncing}
        isPulling={isPulling}
        unsyncedCount={unsyncedCount}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        settings={settings}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportExportParams({});
        }}
        tasks={tasks}
        settings={settings}
        initialSelectedIds={reportExportParams.selectedIds || selectedTaskIds}
        initialMonth={reportExportParams.month || 'all'}
        initialDateFrom={reportExportParams.dateFrom || ''}
        initialDateTo={reportExportParams.dateTo || ''}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
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
    </div>
  );
}

export default function TugasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f2f3f7] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      }
    >
      <TugasContent />
    </Suspense>
  );
}
