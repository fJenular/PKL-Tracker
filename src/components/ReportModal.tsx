'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ExternalLink, 
  Calendar, 
  CheckSquare, 
  Square, 
  FileText, 
  Filter, 
  CalendarRange, 
  ChevronDown,
  Edit3
} from 'lucide-react';
import { Task, AppSettings } from '@/types';
import { 
  formatDateToIndonesian, 
  getBulanFromDate, 
  getBulanTahunFromDate, 
  formatMonthRange 
} from '@/lib/dateUtils';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  settings: AppSettings | null;
  initialSelectedIds?: string[];
  initialMonth?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  tasks,
  settings,
  initialSelectedIds,
  initialMonth = 'all',
  initialDateFrom = '',
  initialDateTo = ''
}: ReportModalProps) {
  const [groupByDate, setGroupByDate] = useState(true);
  const [filterMode, setFilterMode] = useState<'month' | 'range' | 'selected'>(
    initialDateFrom || initialDateTo
      ? 'range'
      : initialMonth !== 'all'
      ? 'month'
      : initialSelectedIds && initialSelectedIds.length > 0 && initialSelectedIds.length < tasks.length
      ? 'selected'
      : 'month'
  );
  
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || 'all');
  const [dateFrom, setDateFrom] = useState<string>(initialDateFrom || '');
  const [dateTo, setDateTo] = useState<string>(initialDateTo || '');
  const [customBulanPelaksanaan, setCustomBulanPelaksanaan] = useState<string>('');
  const [isEditingBulan, setIsEditingBulan] = useState(false);

  // Available months (YYYY-MM)
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    ['2026-10', '2026-09', '2026-08'].forEach((ym) => {
      map.set(ym, getBulanTahunFromDate(`${ym}-01`));
    });
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

  // Selected Task IDs state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Calculate automatically derived Bulan Pelaksanaan
  const autoBulanPelaksanaan = useMemo(() => {
    if (filterMode === 'month') {
      if (selectedMonth === 'all') {
        return settings?.profile.bulanPelaksanaan || 'Oktober 2026';
      }
      const found = availableMonths.find((m) => m.key === selectedMonth);
      return found ? found.label : getBulanTahunFromDate(`${selectedMonth}-01`);
    }

    if (filterMode === 'range') {
      if (dateFrom || dateTo) {
        return formatMonthRange(dateFrom, dateTo);
      }
      return settings?.profile.bulanPelaksanaan || 'Oktober 2026';
    }

    // If 'selected' mode, detect from selected tasks dates
    if (selectedIds.length > 0) {
      const dates = tasks
        .filter((t) => selectedIds.includes(t.id))
        .map((t) => t.tanggal)
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        return formatMonthRange(dates[0], dates[dates.length - 1]);
      }
    }

    return settings?.profile.bulanPelaksanaan || 'Oktober 2026';
  }, [filterMode, selectedMonth, dateFrom, dateTo, selectedIds, availableMonths, settings, tasks]);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      if (initialDateFrom || initialDateTo) {
        setFilterMode('range');
        setDateFrom(initialDateFrom || '');
        setDateTo(initialDateTo || '');
      } else if (initialMonth && initialMonth !== 'all') {
        setFilterMode('month');
        setSelectedMonth(initialMonth);
      }
      setCustomBulanPelaksanaan('');
      setIsEditingBulan(false);
    }
  }, [isOpen, initialMonth, initialDateFrom, initialDateTo]);

  // Update selectedIds when filter changes
  useEffect(() => {
    if (!isOpen) return;

    if (filterMode === 'selected' && initialSelectedIds && initialSelectedIds.length > 0) {
      setSelectedIds(initialSelectedIds);
      return;
    }

    let matching = tasks;
    if (filterMode === 'month') {
      if (selectedMonth !== 'all') {
        matching = tasks.filter((t) => t.tanggal.startsWith(selectedMonth));
      }
    } else if (filterMode === 'range') {
      matching = tasks.filter((t) => {
        const matchFrom = !dateFrom || t.tanggal >= dateFrom;
        const matchTo = !dateTo || t.tanggal <= dateTo;
        return matchFrom && matchTo;
      });
    }

    setSelectedIds(matching.map((t) => t.id));
  }, [isOpen, filterMode, selectedMonth, dateFrom, dateTo, tasks]);

  if (!isOpen) return null;

  const currentBulanPelaksanaan = customBulanPelaksanaan.trim() || autoBulanPelaksanaan;

  // Selected tasks sorted by date ascending
  const selectedTasks = tasks
    .filter(t => selectedIds.includes(t.id))
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  // Group by date if enabled
  interface GroupedRow {
    tanggal: string;
    kegiatan: string[];
    tempat: string;
  }

  const groupedRows: GroupedRow[] = [];
  if (groupByDate) {
    const map = new Map<string, GroupedRow>();
    selectedTasks.forEach(task => {
      const existing = map.get(task.tanggal);
      if (existing) {
        existing.kegiatan.push(task.tugas);
        if (!existing.tempat && task.tempat) existing.tempat = task.tempat;
      } else {
        map.set(task.tanggal, {
          tanggal: task.tanggal,
          kegiatan: [task.tugas],
          tempat: task.tempat || settings?.profile.defaultTempat || 'Ruang IT / Server'
        });
      }
    });
    map.forEach(val => groupedRows.push(val));
  }

  const handlePrint = () => {
    window.print();
  };

  const handleOpenPrintPage = () => {
    const params = new URLSearchParams();
    params.set('ids', selectedIds.join(','));
    params.set('grouped', groupByDate ? 'true' : 'false');
    params.set('bulan', currentBulanPelaksanaan);
    window.open(`/print?${params.toString()}`, '_blank');
  };

  const toggleSelectTask = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(tasks.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const profile = settings?.profile || {
    namaSiswa: 'Fakhri Zainul Arifin',
    nis: '2324009',
    sekolah: 'SMK TI BAZMA',
    tempatPkl: 'Yayasan Kesehatan Pertamina',
    bulanPelaksanaan: 'Oktober 2026',
    pembimbingPkl: 'Ristina Eka Salsabila',
    userDuDi: '(..................................)',
    pesertaPkl: 'Fakhri Zainul Arifin'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="no-print px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Preview & Export Laporan PKL ke PDF
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Format baku sesuai template dokumen resmi SMK TI BAZMA
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Grouping Toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={groupByDate}
                onChange={(e) => setGroupByDate(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium">Gabungkan kegiatan per hari</span>
            </label>

            {/* Print in dedicated tab */}
            <button
              onClick={handleOpenPrintPage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Buka halaman cetak di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Cetak</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Ekspor & Penyesuaian Bulan Pelaksanaan Bar (Hidden on print) */}
        <div className="no-print px-6 py-3 bg-white border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                Pilih Periode:
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('month')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'month'
                      ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Per Bulan
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('range')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'range'
                      ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rentang Tanggal
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('selected')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    filterMode === 'selected'
                      ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Manual Checklist
                </button>
              </div>
            </div>

            {/* Input Controls based on Mode */}
            <div className="flex flex-wrap items-center gap-2">
              {filterMode === 'month' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Pilih Bulan:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 cursor-pointer focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="all">Semua Bulan PKL</option>
                    {availableMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filterMode === 'range' && (
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                    <span className="text-[11px] text-slate-400">Dari:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 focus:outline-hidden cursor-pointer"
                    />
                  </div>
                  <span className="text-slate-400">—</span>
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                    <span className="text-[11px] text-slate-400">Sampai:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 focus:outline-hidden cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Bulan Pelaksanaan Display / Edit */}
              <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-3 py-1 text-xs">
                <span className="text-emerald-900 font-semibold">Bulan Pelaksanaan:</span>
                {isEditingBulan ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={customBulanPelaksanaan || autoBulanPelaksanaan}
                      onChange={(e) => setCustomBulanPelaksanaan(e.target.value)}
                      placeholder="e.g. Oktober 2026"
                      className="text-xs px-2 py-0.5 rounded bg-white border border-emerald-300 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingBulan(false)}
                      className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-medium cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <strong className="text-emerald-800">{currentBulanPelaksanaan}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomBulanPelaksanaan(currentBulanPelaksanaan);
                        setIsEditingBulan(true);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
                      title="Edit teks Bulan Pelaksanaan"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    {customBulanPelaksanaan && (
                      <button
                        type="button"
                        onClick={() => setCustomBulanPelaksanaan('')}
                        className="text-[10px] text-slate-400 hover:text-slate-600 hover:underline cursor-pointer ml-1"
                        title="Kembalikan ke otomatis"
                      >
                        (reset auto)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Task Selection Bar (Hidden on print) */}
        <div className="no-print px-6 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Tugas yang disertakan:</span>
            <span>
              <strong className="text-emerald-700 font-bold">{selectedTasks.length}</strong> dari{' '}
              {tasks.length} total tugas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              Pilih Semua
            </button>
            <span>•</span>
            <button
              onClick={() => handleSelectAll(false)}
              className="text-slate-500 hover:underline cursor-pointer"
            >
              Batal Semua
            </button>
          </div>
        </div>

        {/* Document Scroll Area / Printable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/40">
          <div 
            id="printable-document" 
            className="print-page print-page-tugas bg-white max-w-[210mm] mx-auto p-8 sm:p-12 shadow-md rounded-lg border border-slate-200 print:shadow-none print:border-none"
            style={{ minHeight: '297mm', fontFamily: 'Calibri, sans-serif' }}
          >
            {/* Header / Kop Surat Image */}
            <div className="mb-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/kop-header.png"
                alt="Kop Surat SMK TI BAZMA"
                className="w-full max-h-28 object-contain mx-auto"
              />
            </div>

            {/* Document Title */}
            <div className="text-center my-6 space-y-1">
              <h1 className="text-base sm:text-lg font-bold text-black uppercase tracking-wide">
                LAPORAN HASIL PRAKTIK KERJA LAPANGAN
              </h1>
              <h2 className="text-sm sm:text-base font-bold text-black uppercase tracking-wide">
                SISWA PKL {profile.sekolah || 'SMK TI BAZMA'}
              </h2>
              <h3 className="text-sm sm:text-base font-bold text-black uppercase tracking-wide">
                {profile.tempatPkl || 'YAYASAN KESEHATAN PERTAMINA'}
              </h3>
            </div>

            {/* Student & PKL Metadata */}
            <div className="my-6 text-xs sm:text-sm text-black space-y-1.5 font-normal">
              <div className="flex">
                <span className="w-64">Nama / NIS</span>
                <span className="w-4">:</span>
                <span className="font-semibold">{profile.namaSiswa} / {profile.nis}</span>
              </div>
              <div className="flex">
                <span className="w-64">Tempat Praktik Kerja Lapangan</span>
                <span className="w-4">:</span>
                <span className="font-semibold">{profile.tempatPkl}</span>
              </div>
              <div className="flex">
                <span className="w-64">Bulan Pelaksanaan</span>
                <span className="w-4">:</span>
                <span className="font-semibold">{currentBulanPelaksanaan}</span>
              </div>
            </div>

            {/* Table of Activities */}
            <div className="my-6 overflow-hidden">
              <table className="w-full border-collapse border border-black text-xs sm:text-sm text-black">
                <thead>
                  <tr className="bg-slate-50 print:bg-transparent">
                    <th className="border border-black px-2 py-2 text-center w-12 font-bold">
                      No
                    </th>
                    <th className="border border-black px-3 py-2 text-center w-36 font-bold">
                      Tanggal
                    </th>
                    <th className="border border-black px-4 py-2 text-center font-bold">
                      Kegiatan yang dilakukan
                    </th>
                    <th className="border border-black px-3 py-2 text-center w-40 font-bold">
                      Tempat
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupByDate ? (
                    groupedRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="border border-black py-8 text-center text-slate-400">
                          Tidak ada kegiatan yang dipilih untuk diexport.
                        </td>
                      </tr>
                    ) : (
                      groupedRows.map((row, idx) => (
                        <tr key={row.tanggal} className="align-top">
                          <td className="border border-black px-2 py-2 text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="border border-black px-3 py-2 text-left whitespace-nowrap">
                            {formatDateToIndonesian(row.tanggal)}
                          </td>
                          <td className="border border-black px-4 py-2 text-left">
                            <ul className="list-disc pl-4 space-y-1">
                              {row.kegiatan.map((item, kIdx) => (
                                <li key={kIdx} className="leading-relaxed">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="border border-black px-3 py-2 text-left">
                            {row.tempat || 'Ruang IT / Server'}
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    selectedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="border border-black py-8 text-center text-slate-400">
                          Tidak ada tugas yang dipilih untuk diexport.
                        </td>
                      </tr>
                    ) : (
                      selectedTasks.map((task, idx) => (
                        <tr key={task.id} className="align-top">
                          <td className="border border-black px-2 py-2 text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="border border-black px-3 py-2 text-left whitespace-nowrap">
                            {formatDateToIndonesian(task.tanggal)}
                          </td>
                          <td className="border border-black px-4 py-2 text-left leading-relaxed">
                            {task.tugas}
                          </td>
                          <td className="border border-black px-3 py-2 text-left">
                            {task.tempat || 'Ruang IT / Server'}
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block (Lembar Pengesahan) */}
            <div className="mt-12 text-xs sm:text-sm text-black page-break-inside-avoid">
              <p className="text-center mb-4 font-normal">Mengetahui,</p>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Column 1: User DU/DI */}
                <div className="flex flex-col justify-between min-h-[120px]">
                  <p className="font-semibold">User DU/DI</p>
                  <p className="font-normal">{profile.userDuDi || '(..................................)'}</p>
                </div>

                {/* Column 2: Pembimbing PKL */}
                <div className="flex flex-col justify-between min-h-[120px]">
                  <p className="font-semibold">Pembimbing PKL</p>
                  <p className="font-normal underline underline-offset-2 font-medium">
                    {profile.pembimbingPkl || 'Ristina Eka Salsabila'}
                  </p>
                </div>

                {/* Column 3: Peserta PKL */}
                <div className="flex flex-col justify-between min-h-[120px]">
                  <p className="font-semibold">Peserta PKL</p>
                  <p className="font-normal underline underline-offset-2 font-medium">
                    {profile.pesertaPkl || profile.namaSiswa || 'Peserta PKL'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Image */}
            <div className="mt-14 pt-4 border-t border-slate-100 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/kop-footer.png"
                alt="Footer SMK TI BAZMA"
                className="w-full max-h-16 object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
