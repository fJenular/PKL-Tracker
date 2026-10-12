'use client';

import React, { useState } from 'react';
import { X, Printer, Download, ExternalLink, Calendar, CheckSquare, Square, FileText } from 'lucide-react';
import { Task, AppSettings } from '@/types';
import { formatDateToIndonesian } from '@/lib/dateUtils';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  settings: AppSettings | null;
  initialSelectedIds?: string[];
}

export default function ReportModal({
  isOpen,
  onClose,
  tasks,
  settings,
  initialSelectedIds
}: ReportModalProps) {
  const [groupByDate, setGroupByDate] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedIds && initialSelectedIds.length > 0
      ? initialSelectedIds
      : tasks.map(t => t.id)
  );

  if (!isOpen) return null;

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
              <span className="font-medium">Gabungkan kegiatan per hari (Rekomendasi)</span>
            </label>

            {/* Print in dedicated tab */}
            <button
              onClick={handleOpenPrintPage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              title="Buka halaman cetak di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Cetak</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Task Selection Bar (Hidden on print) */}
        <div className="no-print px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Tugas yang disertakan:</span>
            <span>{selectedTasks.length} dari {tasks.length} tugas terpilih</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="text-emerald-700 hover:underline font-medium"
            >
              Pilih Semua
            </button>
            <span>•</span>
            <button
              onClick={() => handleSelectAll(false)}
              className="text-slate-500 hover:underline"
            >
              Batal Semua
            </button>
          </div>
        </div>

        {/* Document Scroll Area / Printable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/40">
          <div 
            id="printable-document" 
            className="print-page bg-white max-w-[210mm] mx-auto p-8 sm:p-12 shadow-md rounded-lg border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0"
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
                <span className="font-semibold">{profile.bulanPelaksanaan}</span>
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
