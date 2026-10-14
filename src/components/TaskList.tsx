'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  MapPin,
  Calendar,
  CheckSquare,
  Square,
  Sheet,
  X,
  ChevronDown,
  CalendarRange
} from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { formatDateToIndonesian, getBulanFromDate, getBulanTahunFromDate } from '@/lib/dateUtils';

interface TaskListProps {
  tasks: Task[];
  selectedMonth?: string;
  selectedTaskIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (all: boolean) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onExportSelected: () => void;
  onExportFiltered?: (filteredTasks: Task[], filterInfo: { month: string; dateFrom: string; dateTo: string; label: string }) => void;
  onSyncSelected: () => void;
  isSyncing: boolean;
}

export default function TaskList({
  tasks,
  selectedMonth: initialMonth = 'all',
  selectedTaskIds,
  onToggleSelect,
  onSelectAll,
  onEditTask,
  onDeleteTask,
  onExportSelected,
  onExportFiltered,
  onSyncSelected,
  isSyncing
}: TaskListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // Extract unique months (YYYY-MM) from tasks and default PKL months
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    // Default PKL standard months
    ['2026-10', '2026-09', '2026-08'].forEach((ym) => {
      map.set(ym, getBulanTahunFromDate(`${ym}-01`));
    });
    // Add any other months present in tasks
    tasks.forEach((t) => {
      if (t.tanggal && t.tanggal.length >= 7) {
        const ym = t.tanggal.slice(0, 7);
        if (!map.has(ym)) {
          map.set(ym, getBulanTahunFromDate(`${ym}-01`));
        }
      }
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Search term
      const matchSearch =
        !searchTerm ||
        t.tugas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.tempat && t.tempat.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.catatan && t.catatan.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Month filter (matches YYYY-MM prefix or month name)
      const matchMonth =
        monthFilter === 'all' ||
        t.tanggal.startsWith(monthFilter) ||
        getBulanFromDate(t.tanggal).toLowerCase() === monthFilter.toLowerCase();

      // 3. Status filter
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;

      // 4. Date range (from - to)
      const matchDateFrom = !dateFrom || t.tanggal >= dateFrom;
      const matchDateTo = !dateTo || t.tanggal <= dateTo;

      return matchSearch && matchMonth && matchStatus && matchDateFrom && matchDateTo;
    });
  }, [tasks, searchTerm, monthFilter, statusFilter, dateFrom, dateTo]);

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'all' ||
    monthFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMonthFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const isAllSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((t) => selectedTaskIds.includes(t.id));

  const handleSelectAllToggle = () => {
    onSelectAll(!isAllSelected);
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/80">
            <CheckCircle2 className="w-3 h-3" />
            Selesai
          </span>
        );
      case 'Sedang Berjalan':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100/80">
            <Clock className="w-3 h-3" />
            Berjalan
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100/80">
            <AlertCircle className="w-3 h-3" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const handleExportFilteredClick = () => {
    if (onExportFiltered) {
      const selectedMonthObj = availableMonths.find((m) => m.key === monthFilter);
      let label = 'Semua Bulan';
      if (selectedMonthObj) {
        label = selectedMonthObj.label;
      } else if (dateFrom || dateTo) {
        label = 'Rentang Tanggal Khusus';
      }
      onExportFiltered(filteredTasks, {
        month: monthFilter,
        dateFrom,
        dateTo,
        label
      });
    } else {
      onExportSelected();
    }
  };

  return (
    <div className="bento-card overflow-hidden">
      {/* Comprehensive Search & Filters Bar */}
      <div className="p-5 sm:p-6 border-b border-black/[0.04] space-y-3.5 bg-white">
        {/* Row 1: Search & Primary Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tugas, kegiatan, PIC, tempat, atau catatan..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 hover:bg-slate-100/80 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 border border-slate-200/80 transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Primary Filters: Month & Status */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Bulan */}
            <div className="relative">
              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  // If picking a specific month, reset custom date range to avoid conflict
                  if (e.target.value !== 'all') {
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
                className="text-xs pl-3 pr-8 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 border border-slate-200/80 font-medium text-slate-700 cursor-pointer appearance-none"
              >
                <option value="all">📅 Semua Bulan</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    📅 {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs pl-3 pr-8 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 border border-slate-200/80 font-medium text-slate-700 cursor-pointer appearance-none"
              >
                <option value="all">⚡ Semua Status</option>
                <option value="Selesai">✅ Selesai</option>
                <option value="Sedang Berjalan">⏳ Sedang Berjalan</option>
                <option value="Pending">⚠️ Pending</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Toggle Rentang Tanggal Khusus */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                showAdvancedFilter || dateFrom || dateTo
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/80'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rentang Tanggal</span>
              {(dateFrom || dateTo) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                title="Reset Semua Filter"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Custom Date Range (Rentang Tanggal Dari - Sampai) */}
        {(showAdvancedFilter || dateFrom || dateTo) && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/60 p-3 rounded-xl border">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                Rentang Tanggal:
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                  <span className="text-[11px] text-slate-400">Dari:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      if (monthFilter !== 'all') setMonthFilter('all');
                    }}
                    className="text-xs bg-transparent focus:outline-hidden text-slate-700 cursor-pointer"
                  />
                </div>
                <span className="text-slate-400 text-xs">—</span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                  <span className="text-[11px] text-slate-400">Sampai:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      if (monthFilter !== 'all') setMonthFilter('all');
                    }}
                    className="text-xs bg-transparent focus:outline-hidden text-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  Hapus rentang
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500">
              {dateFrom && dateTo ? (
                <span>
                  Periode: <strong>{formatDateToIndonesian(dateFrom)}</strong> s/d{' '}
                  <strong>{formatDateToIndonesian(dateTo)}</strong>
                </span>
              ) : dateFrom ? (
                <span>
                  Mulai dari: <strong>{formatDateToIndonesian(dateFrom)}</strong>
                </span>
              ) : dateTo ? (
                <span>
                  Hingga: <strong>{formatDateToIndonesian(dateTo)}</strong>
                </span>
              ) : (
                <span>Pilih tanggal awal dan akhir untuk menyaring tugas</span>
              )}
            </div>
          </div>
        )}

        {/* Filter Summary & Quick Export Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan <strong className="text-slate-800 font-semibold">{filteredTasks.length}</strong>{' '}
              dari <strong className="text-slate-800 font-semibold">{tasks.length}</strong> tugas
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Filter Aktif
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFilteredClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
              title="Ekspor laporan berdasarkan data yang sedang terfilter"
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Ekspor Hasil Filter ({filteredTasks.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Action Bar (Active when items are selected) */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-emerald-50/90 border-b border-emerald-100/60 px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-950">
            {selectedTaskIds.length} tugas dipilih
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onSyncSelected}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/70 shadow-2xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sinkronkan ke Sheet</span>
            </button>

            <button
              onClick={onExportSelected}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#14151a] text-white hover:bg-black shadow-2xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export PDF Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#52525b]">
          <thead className="bg-[#f8f9fa] text-[#71717a] uppercase tracking-wider font-semibold border-b border-black/[0.04]">
            <tr>
              <th className="py-3.5 px-5 w-10">
                <button
                  onClick={handleSelectAllToggle}
                  className="text-[#a1a1aa] hover:text-[#14151a] transition-colors"
                  title="Pilih Semua"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3.5 px-2 w-12 text-center">No</th>
              <th className="py-3.5 px-4 w-40">Tanggal & Waktu</th>
              <th className="py-3.5 px-4 min-w-[240px]">Tugas / Kegiatan</th>
              <th className="py-3.5 px-4 w-28">User / PIC</th>
              <th className="py-3.5 px-4 min-w-[160px]">Kendala & Tindakan</th>
              <th className="py-3.5 px-3 w-28 text-center">Status</th>
              <th className="py-3.5 px-3 w-20 text-center">Sheet</th>
              <th className="py-3.5 px-5 w-20 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Calendar className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-500">Tidak ada tugas yang ditemukan</p>
                    <p className="text-[11px] text-slate-400">
                      Coba ganti kata kunci pencarian atau tambahkan tugas baru.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const isSelected = selectedTaskIds.includes(task.id);
                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-[#f8f9fb] transition-colors ${isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                  >
                    {/* Checkbox */}
                    <td className="py-4 px-5">
                      <button
                        onClick={() => onToggleSelect(task.id)}
                        className="text-[#a1a1aa] hover:text-[#14151a] transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* No */}
                    <td className="py-4 px-2 text-center font-medium text-[#71717a]">
                      {task.no || '-'}
                    </td>

                    {/* Tanggal & Waktu */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#14151a]">
                        {formatDateToIndonesian(task.tanggal)}
                      </div>
                      <div className="text-[11px] text-[#8e8e99] flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {task.hari}
                        </span>
                        <span>{task.waktu}</span>
                      </div>
                    </td>

                    {/* Tugas & Tempat */}
                    <td className="py-4 px-4">
                      <p className="font-semibold text-[#14151a] leading-relaxed whitespace-pre-wrap">
                        {task.tugas}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#52525b] bg-[#f2f3f7] px-2.5 py-0.5 rounded-full">
                          <MapPin className="w-3 h-3 text-[#71717a]" />
                          {task.tempat || 'Ruang IT / Server'}
                        </span>
                        {task.catatan && (
                          <span className="text-[11px] text-[#8e8e99] italic">
                            Catatan: {task.catatan}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* User / PIC */}
                    <td className="py-4 px-4">
                      <span className="font-medium text-[#52525b] bg-[#f2f3f7] px-2.5 py-1 rounded-full text-xs">
                        {task.user || '-'}
                      </span>
                    </td>

                    {/* Kendala & Tindakan */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div>
                          <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider">Kendala: </span>
                          <span className="text-[#52525b]">{task.kendala || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Tindakan: </span>
                          <span className="text-[#52525b]">{task.tindakan || '-'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-3 text-center">
                      {getStatusBadge(task.status)}
                    </td>

                    {/* Sheet Synced Indicator */}
                    <td className="py-4 px-3 text-center">
                      {task.isSyncedToSheet ? (
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600"
                          title="Tersinkronkan ke Google Spreadsheet"
                        >
                          <Sheet className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#f2f3f7] text-[#a1a1aa]"
                          title="Belum tersinkronkan ke Google Spreadsheet"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditTask(task)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#a1a1aa] hover:text-[#14151a] hover:bg-[#f2f3f7] transition-colors"
                          title="Edit Tugas"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#a1a1aa] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
