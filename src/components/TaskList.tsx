'use client';

import React, { useState } from 'react';
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
  Sheet
} from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { formatDateToIndonesian } from '@/lib/dateUtils';

interface TaskListProps {
  tasks: Task[];
  selectedTaskIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (all: boolean) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onExportSelected: () => void;
  onSyncSelected: () => void;
  isSyncing: boolean;
}

export default function TaskList({
  tasks,
  selectedTaskIds,
  onToggleSelect,
  onSelectAll,
  onEditTask,
  onDeleteTask,
  onExportSelected,
  onSyncSelected,
  isSyncing
}: TaskListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.tugas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.tempat && t.tempat.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.catatan && t.catatan.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchDate = !dateFilter || t.tanggal === dateFilter;

    return matchSearch && matchStatus && matchDate;
  });

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

  return (
    <div className="bento-card overflow-hidden">
      {/* Search and Filters Bar */}
      <div className="p-6 border-b border-black/[0.04] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari tugas, PIC, tempat, atau catatan..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-full bg-[#f2f3f7] hover:bg-[#eaebee] focus:bg-white focus:ring-2 focus:ring-[#14151a]/15 focus:outline-hidden transition-all text-[#14151a] placeholder:text-[#a1a1aa]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-4 py-2.5 rounded-full bg-[#f2f3f7] hover:bg-[#eaebee] focus:ring-2 focus:ring-[#14151a]/15 focus:outline-hidden text-[#52525b] border-none font-medium cursor-pointer transition-all"
          >
            <option value="all">Semua Status</option>
            <option value="Selesai">Selesai</option>
            <option value="Sedang Berjalan">Sedang Berjalan</option>
            <option value="Pending">Pending</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs px-4 py-2.5 rounded-full bg-[#f2f3f7] hover:bg-[#eaebee] focus:ring-2 focus:ring-[#14151a]/15 focus:outline-hidden text-[#52525b] border-none font-medium cursor-pointer transition-all"
          />

          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-[#71717a] hover:text-[#14151a] px-2 py-1 rounded-full hover:bg-[#f2f3f7] transition-colors"
            >
              Reset
            </button>
          )}
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
                    className={`hover:bg-[#f8f9fb] transition-colors ${
                      isSelected ? 'bg-emerald-50/40' : ''
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
