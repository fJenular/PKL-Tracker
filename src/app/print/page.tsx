'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Task, AppSettings } from '@/types';
import { formatDateToIndonesian } from '@/lib/dateUtils';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

function PrintContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const idsParam = searchParams.get('ids');
  const groupedParam = searchParams.get('grouped') !== 'false';
  const bulanParam = searchParams.get('bulan');

  useEffect(() => {
    async function loadData() {
      try {
        const [tasksRes, settingsRes] = await Promise.all([
          fetch('/api/tasks').then(r => r.json()),
          fetch('/api/settings').then(r => r.json())
        ]);
        if (tasksRes.success) setTasks(tasksRes.data);
        if (settingsRes.success) setSettings(settingsRes.data);
      } catch (err) {
        console.error('Error fetching data for print:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Memuat dokumen laporan PKL...
      </div>
    );
  }

  const selectedIds = idsParam ? idsParam.split(',') : tasks.map(t => t.id);
  const selectedTasks = tasks
    .filter(t => selectedIds.includes(t.id))
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  interface GroupedRow {
    tanggal: string;
    kegiatan: string[];
    tempat: string;
  }

  const groupedRows: GroupedRow[] = [];
  if (groupedParam) {
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

  const [isExportingWord, setIsExportingWord] = useState(false);

  const profile = settings?.profile || {
    namaSiswa: 'Fakhri Zainul Arifin',
    nis: '2324009',
    sekolah: 'SMK TI BAZMA',
    tempatPkl: 'Yayasan Kesehatan Pertamina',
    bulanPelaksanaan: 'Oktober 2026',
    pembimbingPkl: 'Muhamad Dzikri Fauzan, S.Kom, Gr.',
    userDuDi: 'Achmad Fauzy',
    pesertaPkl: 'Fakhri Zainul Arifin',
    defaultTempat: 'Ruang IT / Server'
  };

  const handleDownloadWord = async () => {
    try {
      setIsExportingWord(true);
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: selectedTasks,
          profile,
          bulanPelaksanaan: bulanParam || profile.bulanPelaksanaan,
          groupByDate: groupedParam
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeMonth = (bulanParam || profile.bulanPelaksanaan || 'Oktober_2026').replace(/\s+/g, '_');
        const safeName = (profile.namaSiswa || 'Siswa').split(' ')[0];
        a.download = `Laporan_Hasil_PKL_${safeMonth}_${safeName}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading docx:', err);
    } finally {
      setIsExportingWord(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:bg-white print:p-0">
      {/* Floating Toolbar (Hidden on print) */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 px-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadWord}
            disabled={isExportingWord}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Download Word dengan Header & Footer di Section 1"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingWord ? 'Menyiapkan...' : 'Download Word'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF Sekarang</span>
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div 
        className="print-page print-page-tugas bg-white max-w-[210mm] mx-auto shadow-lg border border-slate-200 print:shadow-none print:border-none"
        style={{
          minHeight: '297mm',
          paddingTop: '2cm',
          paddingBottom: '2cm',
          paddingLeft: '2.5cm',
          paddingRight: '2cm',
          boxSizing: 'border-box',
          fontFamily: 'Calibri, sans-serif'
        }}
      >
        {/* Kop Surat Header */}
        <div className="mb-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/kop-header.png"
            alt="Kop Surat SMK TI BAZMA"
            className="w-full max-h-28 object-contain mx-auto"
          />
        </div>

        {/* Title */}
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

        {/* Identity Details */}
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
            <span className="font-semibold">{bulanParam || profile.bulanPelaksanaan}</span>
          </div>
        </div>

        {/* Table of Tasks */}
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
              {groupedParam ? (
                groupedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border border-black py-8 text-center text-slate-400">
                      Tidak ada data kegiatan.
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
                      Tidak ada data kegiatan.
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

        {/* Signatures (Sesuai Gambar 1) */}
        <div className="mt-12 text-xs sm:text-sm text-black break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <p className="text-center mb-6 font-normal">Mengetahui,</p>
          
          <table className="w-full border-none text-center" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '33%', verticalAlign: 'top', border: 'none', padding: '0 4px' }}>
                  <p className="font-semibold text-black mb-16 sm:mb-20">Pembimbing DU/DI</p>
                  <p className="font-normal text-black whitespace-nowrap overflow-visible">
                    {profile.userDuDi || 'Achmad Fauzy'}
                  </p>
                </td>
                <td style={{ width: '34%', verticalAlign: 'top', border: 'none', padding: '0 4px' }}>
                  <p className="font-semibold text-black mb-16 sm:mb-20">Pembimbing PKL</p>
                  <p className="font-normal text-black whitespace-nowrap overflow-visible">
                    {profile.pembimbingPkl || 'Muhamad Dzikri Fauzan, S.Kom, Gr.'}
                  </p>
                </td>
                <td style={{ width: '33%', verticalAlign: 'top', border: 'none', padding: '0 4px' }}>
                  <p className="font-semibold text-black mb-16 sm:mb-20">Peserta PKL</p>
                  <p className="font-normal text-black whitespace-nowrap overflow-visible">
                    {profile.pesertaPkl || profile.namaSiswa || 'Fakhri Zainul Arifin'}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Image (Sesuai Gambar 2) */}
        <div className="mt-14 pt-2 text-center break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/kop-footer.png"
            alt="Footer SMK TI BAZMA"
            className="w-full object-contain mx-auto"
          />
        </div>
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Memuat halaman cetak...</div>}>
      <PrintContent />
    </Suspense>
  );
}
