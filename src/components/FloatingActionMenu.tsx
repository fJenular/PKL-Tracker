'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  X, 
  Settings, 
  HelpCircle, 
  FileText, 
  RefreshCw, 
  Layers, 
  Home, 
  ClipboardList, 
  UserCheck,
  User 
} from 'lucide-react';
import Link from 'next/link';

interface FloatingActionMenuProps {
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenReport?: () => void;
  onSyncAll?: () => void;
  onPullFromGoogle?: () => void;
  isSyncing?: boolean;
  isPulling?: boolean;
  unsyncedCount?: number;
}

export default function FloatingActionMenu({
  onOpenSettings,
  onOpenGuide,
  onOpenReport,
  onSyncAll,
  onPullFromGoogle,
  isSyncing = false,
  isPulling = false,
  unsyncedCount = 0
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-50">
      {/* Backdrop overlay when open */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs transition-opacity duration-200 z-40" 
        />
      )}

      {/* Popover Menu with smooth animation */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-2.5 z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200 origin-bottom-right">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Quick Menu</p>
              <p className="text-[10px] text-slate-400">Settings & Guide</p>
            </div>
            {unsyncedCount > 0 && (
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                {unsyncedCount} belum sync
              </span>
            )}
          </div>

          <div className="py-1.5 space-y-1">
            {/* Opsi 1: Panduan */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenGuide();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold leading-tight">Panduan Integrasi</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Setup Google Sheets & format dokumen</p>
              </div>
            </button>

            {/* Opsi 2: Settings */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold leading-tight">Pengaturan & Profil</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Profil siswa, tempat PKL & koneksi</p>
              </div>
            </button>

            {/* Opsi 3: Ekspor Laporan (Optional if available) */}
            {onOpenReport && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenReport();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-sky-50 text-slate-700 hover:text-sky-800 transition-colors group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold leading-tight">Cetak & Ekspor Jurnal</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Format dokumen BAZMA & PDF</p>
                </div>
              </button>
            )}

            {/* Opsi 4: Tarik dari Google Sheets */}
            {onPullFromGoogle && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onPullFromGoogle();
                }}
                disabled={isPulling}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-colors group cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold leading-tight">
                    {isPulling ? 'Menarik data...' : 'Tarik dari Spreadsheet'}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Ambil data tugas terbaru dari Google Sheets
                  </p>
                </div>
              </button>
            )}

            {/* Opsi 5: Sinkronkan Google Sheets */}
            {onSyncAll && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSyncAll();
                }}
                disabled={isSyncing}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors group cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold leading-tight">
                    {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Sheet'}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Kirim data tugas ke Google Spreadsheet
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Quick Page Links */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1">
            <Link
              href="/tugas"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[10px] font-medium text-slate-600 transition-colors text-center"
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <span>Tugas</span>
            </Link>
            <Link
              href="/absensi"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[10px] font-medium text-slate-600 transition-colors text-center"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Presensi</span>
            </Link>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-[10px] font-bold text-amber-800 transition-colors text-center border border-amber-200/50"
            >
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>Profil</span>
            </Link>
          </div>
        </div>
      )}

      {/* Floating Circular Burger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu Pengaturan dan Panduan"
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer relative z-50 ${
          isOpen 
            ? 'bg-slate-800 text-white rotate-90 scale-95 shadow-2xl' 
            : 'bg-[#14151a] hover:bg-black text-white hover:scale-105 active:scale-95 hover:shadow-2xl'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-200" />
        ) : (
          <Menu className="w-6 h-6 transition-transform duration-200" />
        )}

        {/* Small unsynced badge indicator */}
        {!isOpen && unsyncedCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white">
            {unsyncedCount}
          </span>
        )}
      </button>
    </div>
  );
}
