'use client';

import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  Calendar, 
  ListTodo, 
  ExternalLink,
  Sheet
} from 'lucide-react';
import { Task, AppSettings } from '@/types';

interface DashboardStatsProps {
  tasks: Task[];
  settings: AppSettings | null;
}

export default function DashboardStats({ tasks, settings }: DashboardStatsProps) {
  const totalTasks = tasks.length;
  const selesaiTasks = tasks.filter(t => t.status === 'Selesai').length;
  const inProgressTasks = tasks.filter(t => t.status === 'Sedang Berjalan' || t.status === 'Pending').length;

  // Count unique dates
  const uniqueDates = new Set(tasks.map(t => t.tanggal)).size;

  const spreadsheetUrl = settings?.google.spreadsheetId 
    ? `https://docs.google.com/spreadsheets/d/${settings.google.spreadsheetId}/edit`
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {/* Total Tasks */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Total Tugas</span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <ListTodo className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{totalTasks}</span>
          <span className="text-xs text-slate-400">aktivitas</span>
        </div>
      </div>

      {/* Selesai */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Tugas Selesai</span>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-600">{selesaiTasks}</span>
          <span className="text-xs text-emerald-600/75">
            {totalTasks > 0 ? `${Math.round((selesaiTasks / totalTasks) * 100)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* In Progress / Pending */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Berjalan / Pending</span>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-600">{inProgressTasks}</span>
          <span className="text-xs text-slate-400">tugas</span>
        </div>
      </div>

      {/* Hari Aktif */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Hari Aktif PKL</span>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-purple-700">{uniqueDates}</span>
          <span className="text-xs text-slate-400">hari terlapor</span>
        </div>
      </div>

      {/* Google Spreadsheet Card */}
      <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4 rounded-xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-900">Google Spreadsheet</span>
          <Sheet className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="mt-1">
          <p className="text-[11px] text-emerald-700/80 line-clamp-1">
            {settings?.google.isConfigured ? 'Sinkronisasi Otomatis Aktif' : 'Belum Terhubung'}
          </p>
          {spreadsheetUrl && (
            <a 
              href={spreadsheetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline mt-1"
            >
              <span>Buka Spreadsheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
