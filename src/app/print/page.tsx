'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Task, AppSettings } from '@/types';
import { formatDateToIndonesian } from '@/lib/dateUtils';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function PrintContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const idsParam = searchParams.get('ids');
  const groupedParam = searchParams.get('grouped') !== 'false';

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
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak / Simpan PDF Sekarang</span>
        </button>
      </div>

      {/* A4 Sheet Container */}
      <div 
        className="print-page bg-white max-w-[210mm] mx-auto p-12 shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0"
        style={{ minHeight: '297mm', fontFamily: 'Calibri, sans-serif' }}
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
            <span className="font-semibold">{profile.bulanPelaksanaan}</span>
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

        {/* Signatures */}
        <div className="mt-12 text-xs sm:text-sm text-black">
          <p className="text-center mb-4 font-normal">Mengetahui,</p>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col justify-between min-h-[120px]">
              <p className="font-semibold">User DU/DI</p>
              <p className="font-normal">{profile.userDuDi || '(..................................)'}</p>
            </div>

            <div className="flex flex-col justify-between min-h-[120px]">
              <p className="font-semibold">Pembimbing PKL</p>
              <p className="font-normal underline underline-offset-2 font-medium">
                {profile.pembimbingPkl || 'Ristina Eka Salsabila'}
              </p>
            </div>

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
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Memuat halaman cetak...</div>}>
      <PrintContent />
    </Suspense>
  );
}
