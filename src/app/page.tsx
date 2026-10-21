'use client';

import React, { useState, useEffect, useCallback } from 'react';
import BentoDashboard from '@/components/BentoDashboard';
import TextLoop from '@/components/TextLoop';
import FloatingActionMenu from '@/components/FloatingActionMenu';
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

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

  // Sync to Google Sheets
  const handleSyncToGoogle = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/google/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Pull latest from Google Sheets
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
    <div className="min-h-screen bg-[#0c0d12] sm:bg-[#edf0f5] relative overflow-x-hidden p-2 sm:px-6 sm:py-6 sm:pb-24">
      {/* Background Ambient Mesh Orbs (Matching Image 1 Aesthetic) */}
      <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-[#d4f2a7]/50 via-[#c4f7b5]/30 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] -right-[15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-bl from-[#b9dcfe]/50 via-[#c3d1ff]/35 to-transparent blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-[10%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-[#fed7aa]/25 via-[#ffedd5]/20 to-transparent blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <main className="w-full flex flex-col justify-center max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 absolute inset-0">
        {/* Notification Toast */}
        {notification && (
          <div className="mb-5 p-4 rounded-2xl bg-white text-xs font-medium flex items-center justify-between bento-card border border-black/[0.04]">
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

        {/* ===== BENTO DASHBOARD ===== */}
        <BentoDashboard
          tasks={tasks}
          settings={settings}
          onTaskUpdated={fetchData}
          onOpenReport={() => setIsReportModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onSyncAll={handleSyncToGoogle}
          isSyncing={isSyncing}
          unsyncedCount={unsyncedCount}
        />
      </main>

      {/* ===== FLOATING ACTION BURGER MENU (Bottom Right) ===== */}
      <FloatingActionMenu
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenReport={() => setIsReportModalOpen(true)}
        onSyncAll={handleSyncToGoogle}
        onPullFromGoogle={handlePullFromGoogle}
        isSyncing={isSyncing}
        isPulling={isPulling}
        unsyncedCount={unsyncedCount}
      />

      {/* ===== MODALS ===== */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        tasks={tasks}
        settings={settings}
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

      {/* <div className="w-full absolute inset-x-0 bottom-0">
        <TextLoop
          text="Task Tracker"
          shape="line"
          speed={40}
          direction="forward"
          separator="✦"
          curviness={90}
          fontSize={15}
          fontWeight={600}
          letterSpacing={2}
          uppercase
          color="#ffffff"
          ribbon
          ribbonColor="#5227FF"
          ribbonWidth={35}
          pauseOnHover
          className="w-full"
        />
      </div> */}

    </div>
  );
}
