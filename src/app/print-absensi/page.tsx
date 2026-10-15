'use client';

import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AttendanceRecord, AppSettings } from '@/types';
import {
  formatDateSlash,
  getHariFromDate,
  calculateTotalHariPKL,
  getCurrentDateString
} from '@/lib/dateUtils';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface TableRowItem {
  no: number;
  tanggalFormatted: string;
  hari: string;
  jamMasuk: string;
  jamPulang: string;
  status: string;
  isFiller?: boolean;
}

function PrintAbsensiContent() {
  const searchParams = useSearchParams();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Params from URL
  const mode = searchParams.get('mode') || 'month';
  const monthParam = searchParams.get('month') || '2026-10';
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const workdaysOnly = searchParams.get('workdays') !== '0';
  const fillBlankRows = searchParams.get('fill31') !== '0';
  const bulanLabel = searchParams.get('bulanLabel') || 'Oktober';
  const pembimbing = searchParams.get('pembimbing') || '';
  const managerIt = searchParams.get('managerIt') || 'Bagus Dwi Laksono';
  const mentorUser = searchParams.get('mentorUser') || '';
  const startDatePkl = searchParams.get('startDatePkl') || '2026-08-03';
  const namaPeserta = searchParams.get('namaPeserta') || 'Fakhri Zainul Arifin';
  const asalSekolah = searchParams.get('asalSekolah') || 'SMK TI BAZMA';
  const unitPenempatan = searchParams.get('unitPenempatan') || 'Yayasan Kesehatan Pertamina';
  const periodePkl = searchParams.get('periodePkl') || '2026-2027';
  const catatan = searchParams.get('catatan') || '';
  const defaultJamPulang = searchParams.get('defaultPulang') || '16:00';

  useEffect(() => {
    async function loadData() {
      try {
        const [attRes, setRes] = await Promise.all([
          fetch('/api/attendance').then(r => r.json()),
          fetch('/api/settings').then(r => r.json()),
        ]);
        if (attRes.success) setAttendanceRecords(attRes.data);
        if (setRes.success) setSettings(setRes.data);
      } catch (err) {
        console.error('Failed to load data for print-absensi:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && searchParams.get('autoPrint') === '1') {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [loading, searchParams]);

  // Effective date range
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    if (mode === 'month') {
      const [yStr, mStr] = monthParam.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      return {
        effectiveStart: `${monthParam}-01`,
        effectiveEnd: `${monthParam}-${String(lastDay).padStart(2, '0')}`
      };
    }
    return { effectiveStart: fromParam, effectiveEnd: toParam };
  }, [mode, monthParam, fromParam, toParam]);

  // Attendance lookup map
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(r => { if (r.tanggal) map.set(r.tanggal, r); });
    return map;
  }, [attendanceRecords]);

  // Build table rows
  const tableRows = useMemo((): TableRowItem[] => {
    if (!effectiveStart || !effectiveEnd) return [];
    const start = new Date(effectiveStart);
    const end = new Date(effectiveEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];

    const rows: TableRowItem[] = [];
    let counter = 1;
    const today = getCurrentDateString();
    const curr = new Date(start);

    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayOfWeek = curr.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!workdaysOnly || !isWeekend) {
        const record = recordMap.get(dateStr);
        let jm = record?.jamMasuk || '';
        let jp = record?.jamPulang || '';
        const st = record?.status || '';
        if (jm === '-') jm = '';
        if (jp === '-') jp = '';
        if (record?.status === 'Hadir' && !jp && dateStr < today) jp = defaultJamPulang;

        rows.push({
          no: counter++,
          tanggalFormatted: formatDateSlash(dateStr),
          hari: getHariFromDate(dateStr),
          jamMasuk: jm,
          jamPulang: jp,
          status: st
        });
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (fillBlankRows) {
      const currentLen = rows.length;
      for (let i = currentLen + 1; i <= 31; i++) {
        rows.push({ no: i, tanggalFormatted: '', hari: '', jamMasuk: '', jamPulang: '', status: '', isFiller: true });
      }
    }
    return rows;
  }, [effectiveStart, effectiveEnd, workdaysOnly, fillBlankRows, recordMap]);

  // Recap
  const recap = useMemo(() => {
    let hadir = 0, izin = 0, sakit = 0, alpha = 0;
    tableRows.forEach(row => {
      if (row.isFiller) return;
      const s = (row.status || '').toLowerCase().trim();
      if (s === 'hadir') hadir++;
      else if (s === 'izin') izin++;
      else if (s === 'sakit') sakit++;
      else if (s === 'alpha') alpha++;
    });
    const totalHariPkl = calculateTotalHariPKL(effectiveEnd, startDatePkl);
    return { hadir, izin, sakit, alpha, totalHariPkl };
  }, [tableRows, effectiveEnd, startDatePkl]);

  const finalNamaPeserta = namaPeserta || settings?.profile.namaSiswa || 'Fakhri Zainul Arifin';
  const finalAsalSekolah = asalSekolah || settings?.profile.sekolah || 'SMK TI BAZMA';
  const finalUnitPenempatan = unitPenempatan || settings?.profile.tempatPkl || 'Yayasan Kesehatan Pertamina';
  const finalPembimbing = pembimbing || settings?.profile.pembimbingPkl || '';
  const finalManagerIt = managerIt || settings?.profile.managerIt || 'Bagus Dwi Laksono';
  const finalMentorUser = mentorUser || settings?.profile.userDuDi || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Memuat data absensi...
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:bg-white print:p-0">
      {/* Floating Toolbar */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 px-4 flex items-center justify-between">
        <Link
          href="/absensi"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Absensi</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>

      {/* A4 Sheet */}
      <div
        className="print-page print-page-absensi bg-white max-w-[210mm] mx-auto shadow-lg border border-slate-200 print:shadow-none print:border-none"
        style={{
          minHeight: '297mm',
          paddingTop: '2.5cm',
          paddingBottom: '2cm',
          paddingLeft: '2.5cm',
          paddingRight: '2cm',
          boxSizing: 'border-box',
          fontFamily: '"Cambria", "Times New Roman", serif',
          color: '#000',
          lineHeight: 1.15
        }}
      >
        {/* Title */}
        <h1
          className="text-center font-bold uppercase tracking-wide mb-4"
          style={{ fontFamily: 'Calibri, sans-serif', fontSize: '14pt' }}
        >
          DAFTAR HADIR PESERTA PRAKTIK KERJA LAPANGAN (PKL)
        </h1>

        {/* Identity */}
        <div className="text-xs mb-4 space-y-1.5">
          {[
            { label: 'Nama Peserta', value: finalNamaPeserta },
            { label: 'Asal Sekolah', value: finalAsalSekolah },
            { label: 'Unit Penempatan', value: finalUnitPenempatan },
            { label: 'Periode PKL', value: periodePkl },
          ].map(({ label, value }) => (
            <div key={label} className="flex">
              <span className="w-44 font-bold shrink-0">{label}</span>
              <span className="w-4 shrink-0">:</span>
              <span className="font-bold underline underline-offset-2">{value}</span>
            </div>
          ))}
          <div className="flex items-baseline flex-wrap gap-x-8">
            <div className="flex">
              <span className="w-44 font-bold shrink-0">Pembimbing</span>
              <span className="w-4 shrink-0">:</span>
              <span className="font-bold underline underline-offset-2">{finalPembimbing}</span>
            </div>
            <div className="flex items-baseline ml-auto">
              <span className="font-bold mr-2">Bulan:</span>
              <span className="font-bold underline underline-offset-2 min-w-[60px]">{bulanLabel}</span>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <table className="w-full border-collapse border border-black text-[10px] mb-3">
          <thead>
            <tr className="font-bold text-center">
              {['No', 'Hari/Tanggal', 'Hari', 'Jam Masuk', 'Jam Pulang', 'Status', 'Paraf Peserta'].map(h => (
                <th key={h} className="border border-black px-1.5 py-1.5 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map(row => (
              <tr key={row.no} className={`h-5 ${row.isFiller ? 'opacity-30' : ''}`}>
                <td className="border border-black px-1 py-0.5 text-center">{row.no}</td>
                <td className="border border-black px-1.5 py-0.5 whitespace-nowrap">{row.tanggalFormatted}</td>
                <td className="border border-black px-1.5 py-0.5">{row.hari}</td>
                <td className="border border-black px-1.5 py-0.5 text-center font-mono">{row.jamMasuk}</td>
                <td className="border border-black px-1.5 py-0.5 text-center font-mono">{row.jamPulang}</td>
                <td className="border border-black px-1.5 py-0.5 text-center">{row.status}</td>
                <td className="border border-black px-1.5 py-0.5">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Rekap Kehadiran */}
        <h2 className="font-bold mb-1.5" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '13pt' }}>
          Rekap Kehadiran
        </h2>
        <table className="border-collapse border border-black text-xs w-72 mb-3">
          <tbody>
            {[
              { label: 'Hadir', value: recap.hadir },
              { label: 'Izin', value: recap.izin },
              { label: 'Sakit', value: recap.sakit },
              { label: 'Alpha', value: recap.alpha },
              { label: 'Total Hari PKL', value: `${recap.totalHariPkl} Hari`, bold: true },
            ].map(({ label, value, bold }) => (
              <tr key={label}>
                <td className={`border border-black px-3 py-1 w-1/2 ${bold ? 'font-bold' : ''}`}>{label}</td>
                <td className={`border border-black px-3 py-1 w-1/2 ${bold ? 'font-bold' : 'font-semibold'}`}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Catatan */}
        <div className="text-xs mb-6">
          <p>Catatan Pembimbing:</p>
          <p className="mt-1.5 min-h-[22px]">{catatan || '________________________________________'}</p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 text-xs break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <div className="flex flex-col min-h-[120px]">
            <div>
              <p>Mengetahui,</p>
              <p>Manager IT,</p>
            </div>
            <div className="mt-auto pt-10">
              <p>( <span className="underline underline-offset-2 font-medium">{finalManagerIt}</span> )</p>
            </div>
          </div>
          <div className="flex flex-col min-h-[120px]">
            <div>
              <p>Mengetahui,</p>
              <p>Mentor/User,</p>
            </div>
            <div className="mt-auto pt-10">
              <p>( <span className="underline underline-offset-2 font-medium">{finalMentorUser}</span> )</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintAbsensiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Memuat halaman cetak...</div>}>
      <PrintAbsensiContent />
    </Suspense>
  );
}
