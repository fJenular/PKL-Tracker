'use client';

import React from 'react';
import { 
  FileText, 
  Plus, 
  Settings, 
  HelpCircle, 
  RefreshCw, 
  Sheet, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { AppSettings } from '@/types';

interface NavbarProps {
  settings: AppSettings | null;
  unsyncedCount: number;
  onOpenNewTask: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onSyncAll: () => void;
  isSyncing: boolean;
}

export default function Navbar({
  settings,
  unsyncedCount,
  onOpenNewTask,
  onOpenReport,
  onOpenSettings,
  onOpenGuide,
  onSyncAll,
  isSyncing
}: NavbarProps) {
  const isGoogleConnected = settings?.google.isConfigured;

  return (
    <header className="sticky top-0 z-30 bg-[#f2f3f7]/85 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between h-14 bg-white px-5 rounded-full border border-black/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#14151a] flex items-center justify-center text-white shadow-xs">
              <Sheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-[#14151a] text-sm tracking-tight">
                  PKL Task Tracker
                </h1>
                <span className="text-[10px] font-medium bg-[#f2f3f7] text-[#52525b] px-2 py-0.5 rounded-full">
                  SMK TI BAZMA
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Google Sheets Status Pill */}
            <button
              onClick={onOpenSettings}
              title={isGoogleConnected ? "Google Sheets Terhubung" : "Google Sheets Belum Terhubung"}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#f2f3f7] text-[#3f3f46] hover:bg-[#e6e7ec] transition-colors"
            >
              {isGoogleConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sheet Aktif</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Setup Sheet</span>
                </>
              )}
            </button>

            {/* Sync Button (if any unsynced) */}
            {unsyncedCount > 0 && isGoogleConnected && (
              <button
                onClick={onSyncAll}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                title="Sinkronkan data yang belum terkirim ke Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync ({unsyncedCount})</span>
              </button>
            )}

            {/* Export PDF Button */}
            <button
              onClick={onOpenReport}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#f2f3f7] text-[#14151a] hover:bg-[#e6e7ec] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            {/* New Task Button */}
            <button
              onClick={onOpenNewTask}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#14151a] text-white hover:bg-black transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tugas</span>
            </button>

            {/* Help / Guide */}
            <button
              onClick={onOpenGuide}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717a] hover:text-[#14151a] hover:bg-[#f2f3f7] transition-colors"
              title="Panduan Integrasi Google Cloud"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717a] hover:text-[#14151a] hover:bg-[#f2f3f7] transition-colors"
              title="Pengaturan Profil & Google API"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
