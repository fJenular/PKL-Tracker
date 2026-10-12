'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import BentoDashboard from '@/components/BentoDashboard';
import TaskList from '@/components/TaskList';
import TaskFormModal from '@/components/TaskFormModal';
import ReportModal from '@/components/ReportModal';
import SettingsModal from '@/components/SettingsModal';
import GoogleGuideModal from '@/components/GoogleGuideModal';
import { Task, AppSettings } from '@/types';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Selected task for editing
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Multi-select for tasks
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Synchronization status
  const [isSyncing, setIsSyncing] = useState(false);
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

  // Delete task
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

  // Toggle selection
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

  // Sync to Google Sheets
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

  // Save Settings
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

  return (
    <div className="min-h-screen bg-[#f2f3f7] pb-24">
      {/* Navbar */}
      <Navbar
        settings={settings}
        unsyncedCount={unsyncedCount}
        onOpenNewTask={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onSyncAll={() => handleSyncToGoogle()}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Notification Toast */}
        {notification && (
          <div className="mb-5 p-4 rounded-2xl bg-white text-xs font-medium flex items-center justify-between bento-card border border-black/[0.04]">
            <div className="flex items-center gap-2.5 text-[#14151a]">
              {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              {notification.type === 'info' && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-[#a1a1aa] hover:text-[#14151a] ml-4 text-lg leading-none">×</button>
          </div>
        )}

        {/* ===== BENTO DASHBOARD ===== */}
        <BentoDashboard
          tasks={tasks}
          settings={settings}
          onOpenNewTask={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          onOpenReport={() => setIsReportModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onTaskUpdated={fetchData}
        />

        {/* ===== SECTION LABEL ===== */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-[#14151a] tracking-tight">
              Semua Catatan Tugas
            </h3>
            <span className="text-[11px] font-semibold bg-white text-[#71717a] px-2.5 py-0.5 rounded-full border border-black/[0.04] shadow-2xs">
              {tasks.length} Total
            </span>
          </div>
        </div>

        {/* ===== TASK LIST TABLE ===== */}
        <TaskList
          tasks={tasks}
          selectedTaskIds={selectedTaskIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          onExportSelected={() => setIsReportModalOpen(true)}
          onSyncSelected={() => handleSyncToGoogle(selectedTaskIds)}
          isSyncing={isSyncing}
        />
      </main>

      {/* ===== MODALS ===== */}
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
        onClose={() => setIsReportModalOpen(false)}
        tasks={tasks}
        settings={settings}
        initialSelectedIds={selectedTaskIds}
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
