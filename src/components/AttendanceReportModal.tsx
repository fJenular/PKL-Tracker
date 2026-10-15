'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ExternalLink, 
  Calendar, 
  CalendarRange, 
  FileText, 
  Settings2, 
  CheckCircle2, 
  Info
} from 'lucide-react';
import { AttendanceRecord, AppSettings } from '@/types';
import { 
  formatDateSlash, 
  getHariFromDate, 
  calculateTotalHariPKL, 
  INDONESIAN_MONTHS, 
  getCurrentDateString 
} from '@/lib/dateUtils';

interface AttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceRecords: AttendanceRecord[];
  settings: AppSettings | null;
}

interface TableRowItem {
  no: number;
  tanggalRaw: string;
  tanggalFormatted: string;
  hari: string;
  jamMasuk: string;
  jamPulang: string;
  status: string;
  isFiller?: boolean;
}

export default function AttendanceReportModal({
  isOpen,
  onClose,
  attendanceRecords,
  settings,
}: AttendanceReportModalProps) {
  // Filter states
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('2026-10');
  const [dateFrom, setDateFrom] = useState<string>('2026-10-01');
  const [dateTo, setDateTo] = useState<string>('2026-10-31');
  
  const [workdaysOnly, setWorkdaysOnly] = useState<boolean>(true);
  const [fillBlankRows, setFillBlankRows] = useState<boolean>(true);
  const [autoFillPulang, setAutoFillPulang] = useState<boolean>(true);
  const [defaultJamPulang, setDefaultJamPulang] = useState<string>('16:00');
  
  const [showMetadataEditor, setShowMetadataEditor] = useState<boolean>(false);

  // Template identity fields (matching Google Doc)
  const [namaPeserta, setNamaPeserta] = useState<string>('Fakhri Zainul Arifin');
  const [asalSekolah, setAsalSekolah] = useState<string>('SMK TI BAZMA');
  const [unitPenempatan, setUnitPenempatan] = useState<string>('Yayasan Kesehatan Pertamina');
  const [periodePkl, setPeriodePkl] = useState<string>('2026-2027');
  const [pembimbing, setPembimbing] = useState<string>('Muhammad Dzikri Fauzan');
  const [bulanLabel, setBulanLabel] = useState<string>('Oktober');
  const [managerIt, setManagerIt] = useState<string>('Bagus Dwi Laksono');
  const [mentorUser, setMentorUser] = useState<string>('Achmad Fauzy');
  const [catatanPembimbing, setCatatanPembimbing] = useState<string>('');
  const [startDatePkl, setStartDatePkl] = useState<string>('2026-08-03');

  // Initialize from settings
  useEffect(() => {
    if (isOpen && settings) {
      setNamaPeserta(settings.profile.namaSiswa || 'Fakhri Zainul Arifin');
      setAsalSekolah(settings.profile.sekolah || 'SMK TI BAZMA');
      setUnitPenempatan(settings.profile.tempatPkl || 'Yayasan Kesehatan Pertamina');
      setPeriodePkl(settings.profile.periodePkl || '2026-2027');
      setPembimbing(settings.profile.pembimbingPkl || 'Muhammad Dzikri Fauzan');
      setManagerIt(settings.profile.managerIt || 'Bagus Dwi Laksono');
      setMentorUser(settings.profile.userDuDi || 'Achmad Fauzy');
      setStartDatePkl(settings.profile.tanggalMulaiPkl || '2026-08-03');
    }
  }, [isOpen, settings]);

  // Available months
  const availableMonths = useMemo(() => [
    { key: '2026-08', label: 'Agustus 2026', monthName: 'Agustus' },
    { key: '2026-09', label: 'September 2026', monthName: 'September' },
    { key: '2026-10', label: 'Oktober 2026', monthName: 'Oktober' },
    { key: '2026-11', label: 'November 2026', monthName: 'November' },
    { key: '2026-12', label: 'Desember 2026', monthName: 'Desember' },
    { key: '2027-01', label: 'Januari 2027', monthName: 'Januari' },
  ], []);

  // Auto-update bulan label when filter changes
  useEffect(() => {
    if (filterMode === 'month') {
      const found = availableMonths.find(m => m.key === selectedYearMonth);
      if (found) setBulanLabel(found.monthName);
    } else {
      if (dateFrom) {
        const parts = dateFrom.split('-');
        const m1 = INDONESIAN_MONTHS[parseInt(parts[1], 10) - 1] || '';
        if (dateTo) {
          const toParts = dateTo.split('-');
          const m2 = INDONESIAN_MONTHS[parseInt(toParts[1], 10) - 1] || '';
          setBulanLabel(m1 === m2 ? m1 : `${m1} - ${m2}`);
        } else {
          setBulanLabel(m1);
        }
      }
    }
  }, [filterMode, selectedYearMonth, dateFrom, dateTo, availableMonths]);

  // Compute effective date range
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    if (filterMode === 'month') {
      const [yStr, mStr] = selectedYearMonth.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      return {
        effectiveStart: `${selectedYearMonth}-01`,
        effectiveEnd: `${selectedYearMonth}-${String(lastDay).padStart(2, '0')}`
      };
    }
    return {
      effectiveStart: dateFrom || '2026-10-01',
      effectiveEnd: dateTo || '2026-10-31'
    };
  }, [filterMode, selectedYearMonth, dateFrom, dateTo]);

  // Build attendance lookup map
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(r => {
      if (r.tanggal) map.set(r.tanggal, r);
    });
    return map;
  }, [attendanceRecords]);

  // Generate table rows for the selected period
  const tableRows = useMemo(() => {
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

        // Auto-fill jam pulang for past hadir records with no pulang
        if (record?.status === 'Hadir' && !jp && autoFillPulang && dateStr < today) {
          jp = defaultJamPulang;
        }

        rows.push({
          no: counter++,
          tanggalRaw: dateStr,
          tanggalFormatted: formatDateSlash(dateStr),
          hari: getHariFromDate(dateStr),
          jamMasuk: jm,
          jamPulang: jp,
          status: st
        });
      }

      curr.setDate(curr.getDate() + 1);
    }

    // Fill blank rows up to 31 if requested (matching template format)
    if (fillBlankRows) {
      const currentLen = rows.length;
      for (let i = currentLen + 1; i <= 31; i++) {
        rows.push({
          no: i,
          tanggalRaw: '',
          tanggalFormatted: '',
          hari: '',
          jamMasuk: '',
          jamPulang: '',
          status: '',
          isFiller: true
        });
      }
    }

    return rows;
  }, [effectiveStart, effectiveEnd, workdaysOnly, fillBlankRows, recordMap, autoFillPulang, defaultJamPulang]);

  // Rekap Kehadiran calculation
  const recap = useMemo(() => {
    let hadir = 0; let izin = 0; let sakit = 0; let alpha = 0;
    tableRows.forEach(row => {
      if (row.isFiller) return;
      const s = (row.status || '').toLowerCase().trim();
      if (s === 'hadir') hadir++;
      else if (s === 'izin') izin++;
      else if (s === 'sakit') sakit++;
      else if (s === 'alpha') alpha++;
    });
    // Total Hari PKL: dari hari pertama masuk PKL (3 Agustus) s/d tanggal terakhir export
    const totalHariPkl = calculateTotalHariPKL(effectiveEnd, startDatePkl);
    return { hadir, izin, sakit, alpha, totalHariPkl };
  }, [tableRows, effectiveEnd, startDatePkl]);

  if (!isOpen) return null;

  const getQueryParams = (autoPrint: boolean = false) => {
    return new URLSearchParams({
      ...(autoPrint ? { autoPrint: '1' } : {}),
      mode: filterMode,
      ...(filterMode === 'month' ? { month: selectedYearMonth } : { from: dateFrom, to: dateTo }),
      workdays: workdaysOnly ? '1' : '0',
      fill31: fillBlankRows ? '1' : '0',
      bulanLabel,
      pembimbing,
      managerIt,
      mentorUser,
      startDatePkl,
      namaPeserta,
      asalSekolah,
      unitPenempatan,
      periodePkl,
      defaultPulang: defaultJamPulang,
      ...(catatanPembimbing ? { catatan: catatanPembimbing } : {})
    }).toString();
  };

  const handlePrint = () => {
    window.open(`/print-absensi?${getQueryParams(true)}`, '_blank');
  };

  const handleOpenPrintPage = () => {
    window.open(`/print-absensi?${getQueryParams(false)}`, '_blank');
  };

  const handleDownloadWord = () => {
    const rowsHtml = tableRows.map(r => `
      <tr>
        <td style="text-align:center;border:1px solid #000;padding:3px 4px;">${r.no}</td>
        <td style="border:1px solid #000;padding:3px 4px;">${r.tanggalFormatted}</td>
        <td style="border:1px solid #000;padding:3px 4px;">${r.hari}</td>
        <td style="text-align:center;border:1px solid #000;padding:3px 4px;">${r.jamMasuk}</td>
        <td style="text-align:center;border:1px solid #000;padding:3px 4px;">${r.jamPulang}</td>
        <td style="text-align:center;border:1px solid #000;padding:3px 4px;">${r.status}</td>
        <td style="border:1px solid #000;padding:3px 4px;">&nbsp;</td>
      </tr>`).join('');

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset='utf-8'><title>Daftar Hadir PKL</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
@page{size:A4 portrait;margin:2.5cm 2cm 2cm 2.5cm;}
body{font-family:Cambria,serif;font-size:11pt;color:#000;}
h1{text-align:center;font-family:Calibri,sans-serif;font-size:14pt;font-weight:bold;margin-bottom:18pt;}
.meta td{padding:2pt 0;font-size:11pt;}
.main-t{width:100%;border-collapse:collapse;margin:8pt 0 16pt;}
.main-t th{border:1px solid #000;padding:4pt;text-align:center;font-weight:bold;font-size:10pt;background:#f2f2f2;}
.main-t td{border:1px solid #000;padding:3pt 4pt;font-size:10pt;}
.recap{border-collapse:collapse;width:350pt;margin-bottom:14pt;}
.recap td{border:1px solid #000;padding:4pt 8pt;font-size:11pt;}
.sigs{width:100%;border-collapse:collapse;margin-top:30pt;}
.sigs td{width:50%;vertical-align:top;font-size:11pt;padding-right:20pt;}
</style>
</head>
<body>
<h1>DAFTAR HADIR PESERTA PRAKTIK KERJA LAPANGAN (PKL)</h1>
<table class="meta" width="100%">
<tr><td width="130pt"><b>Nama Peserta</b></td><td width="12pt">:</td><td><u><b>${namaPeserta}</b></u></td></tr>
<tr><td><b>Asal Sekolah</b></td><td>:</td><td><u><b>${asalSekolah}</b></u></td></tr>
<tr><td><b>Unit Penempatan</b></td><td>:</td><td><u><b>${unitPenempatan}</b></u></td></tr>
<tr><td><b>Periode PKL</b></td><td>:</td><td><u><b>${periodePkl}</b></u></td></tr>
<tr><td><b>Pembimbing</b></td><td>:</td><td><u><b>${pembimbing}</b></u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Bulan:</b>&nbsp;&nbsp;<u><b>${bulanLabel}</b></u></td></tr>
</table>
<table class="main-t">
<thead><tr>
<th>No</th><th>Hari/Tanggal</th><th>Hari</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Status</th><th>Paraf Peserta</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
<h2 style="font-family:Calibri,sans-serif;font-size:13pt;font-weight:bold;margin-top:12pt;margin-bottom:6pt;">Rekap Kehadiran</h2>
<table class="recap">
<tr><td width="60%">Hadir</td><td width="40%"><b>${recap.hadir}</b></td></tr>
<tr><td>Izin</td><td><b>${recap.izin}</b></td></tr>
<tr><td>Sakit</td><td><b>${recap.sakit}</b></td></tr>
<tr><td>Alpha</td><td><b>${recap.alpha}</b></td></tr>
<tr><td><b>Total Hari PKL</b></td><td><b>${recap.totalHariPkl} Hari</b></td></tr>
</table>
<p style="margin-top:14pt;margin-bottom:24pt;font-size:11pt;">
<b>Catatan Pembimbing:</b><br><br>
${catatanPembimbing || '________________________________________'}
</p>
<table class="sigs">
<tr>
<td>Mengetahui,<br>Manager IT,<br><br><br><br><br>( <u>${managerIt}</u> )</td>
<td>Mengetahui,<br>Mentor/User,<br><br><br><br><br>( <u>${mentorUser}</u> )</td>
</tr>
</table>
</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Absensi_PKL_${bulanLabel.replace(/\s+/g, '_')}_${namaPeserta.split(' ')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">

        {/* ── Top Control Bar ── */}
        <div className="no-print px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Export Laporan Absensi Harian PKL</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesuai template Google Docs resmi · Rekap &amp; Total Hari PKL otomatis
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowMetadataEditor(!showMetadataEditor)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${showMetadataEditor ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Edit Identitas</span>
            </button>
            <button
              onClick={handleDownloadWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .doc</span>
            </button>
            <button
              onClick={handleOpenPrintPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Buka Halaman Cetak</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Filters Toolbar ── */}
        <div className="no-print px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Mode toggle */}
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
              <button
                onClick={() => setFilterMode('month')}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${filterMode === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Pilih Bulan
              </button>
              <button
                onClick={() => setFilterMode('range')}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${filterMode === 'range' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Rentang Tanggal
              </button>
            </div>

            {filterMode === 'month' ? (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedYearMonth}
                  onChange={e => setSelectedYearMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {availableMonths.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-slate-400" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs" />
                <span className="text-slate-400 text-xs">s/d</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs" />
              </div>
            )}

            <label className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={workdaysOnly} onChange={e => setWorkdaysOnly(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <span>Hari Kerja Saja (Senin-Jumat)</span>
            </label>

            <label className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={fillBlankRows} onChange={e => setFillBlankRows(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <span>Isi baris s/d 31</span>
            </label>
          </div>

          {/* Quick badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Hadir: {recap.hadir}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Info className="w-3.5 h-3.5" />
              Total PKL: {recap.totalHariPkl} Hari
            </span>
          </div>
        </div>

        {/* ── Metadata Editor (collapsible) ── */}
        {showMetadataEditor && (
          <div className="no-print p-4 bg-slate-100 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs animate-in fade-in shrink-0">
            {[
              { label: 'Nama Peserta', value: namaPeserta, set: setNamaPeserta },
              { label: 'Asal Sekolah', value: asalSekolah, set: setAsalSekolah },
              { label: 'Unit Penempatan', value: unitPenempatan, set: setUnitPenempatan },
              { label: 'Periode PKL', value: periodePkl, set: setPeriodePkl },
              { label: 'Pembimbing PKL', value: pembimbing, set: setPembimbing },
              { label: 'Teks Bulan (Header)', value: bulanLabel, set: setBulanLabel },
              { label: 'Manager IT (TTD kiri)', value: managerIt, set: setManagerIt },
              { label: 'Mentor/User (TTD kanan)', value: mentorUser, set: setMentorUser },
              { label: 'Default Jam Pulang', value: defaultJamPulang, set: setDefaultJamPulang, placeholder: '16:00' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal Masuk Pertama PKL</label>
              <input
                type="date"
                value={startDatePkl}
                onChange={e => setStartDatePkl(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">Acuan hitung Total Hari PKL (default: 3 Agustus)</span>
            </div>
            <div className="col-span-2 sm:col-span-3 md:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Catatan Pembimbing</label>
              <input
                type="text"
                value={catatanPembimbing}
                onChange={e => setCatatanPembimbing(e.target.value)}
                placeholder="Isi catatan pembimbing jika ada..."
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ── Scrollable Document Preview ── */}
        <div className="flex-1 overflow-y-auto bg-slate-200/80 p-4 sm:p-8 print:p-0 print:bg-white flex justify-center">
          {/* A4 Preview Page */}
          <div
            className="print-page print-page-absensi bg-white w-full max-w-[210mm] shadow-xl border border-slate-300 text-black print:shadow-none print:border-none"
            style={{
              minHeight: '297mm',
              paddingTop: '2.5cm',
              paddingBottom: '2cm',
              paddingLeft: '2.5cm',
              paddingRight: '2cm',
              boxSizing: 'border-box',
              fontFamily: '"Cambria", "Times New Roman", serif',
              color: '#000000',
              lineHeight: 1.15
            }}
          >
            {/* Title */}
            <h1
              className="text-center font-bold text-base mb-4 uppercase tracking-wide"
              style={{ fontFamily: 'Calibri, sans-serif', fontSize: '14pt' }}
            >
              DAFTAR HADIR PESERTA PRAKTIK KERJA LAPANGAN (PKL)
            </h1>

            {/* Identity section matching Google Doc */}
            <div className="text-xs mb-4 space-y-1.5">
              <div className="flex">
                <span className="w-44 font-bold shrink-0">Nama Peserta</span>
                <span className="w-4 shrink-0">:</span>
                <span className="font-bold underline underline-offset-2">{namaPeserta}</span>
              </div>
              <div className="flex">
                <span className="w-44 font-bold shrink-0">Asal Sekolah</span>
                <span className="w-4 shrink-0">:</span>
                <span className="font-bold underline underline-offset-2">{asalSekolah}</span>
              </div>
              <div className="flex">
                <span className="w-44 font-bold shrink-0">Unit Penempatan</span>
                <span className="w-4 shrink-0">:</span>
                <span className="font-bold underline underline-offset-2">{unitPenempatan}</span>
              </div>
              <div className="flex">
                <span className="w-44 font-bold shrink-0">Periode PKL</span>
                <span className="w-4 shrink-0">:</span>
                <span className="font-bold underline underline-offset-2">{periodePkl}</span>
              </div>
              <div className="flex items-baseline flex-wrap gap-x-8">
                <div className="flex">
                  <span className="w-44 font-bold shrink-0">Pembimbing</span>
                  <span className="w-4 shrink-0">:</span>
                  <span className="font-bold underline underline-offset-2">{pembimbing}</span>
                </div>
                <div className="flex items-baseline ml-auto">
                  <span className="font-bold mr-2">Bulan:</span>
                  <span className="font-bold underline underline-offset-2 min-w-[60px]">{bulanLabel}</span>
                </div>
              </div>
            </div>

            {/* Main Attendance Table */}
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
                  <tr key={row.no} className={`h-5 ${row.isFiller ? 'opacity-40' : ''}`}>
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
            <h2
              className="font-bold mb-1.5"
              style={{ fontFamily: 'Calibri, sans-serif', fontSize: '13pt' }}
            >
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
            <div className="text-xs mb-6 space-y-1.5">
              <p>Catatan Pembimbing:</p>
              <p className="min-h-[22px]">{catatanPembimbing || '________________________________________'}</p>
            </div>

            {/* Signatures (matching Google Doc drawings) */}
            <div className="grid grid-cols-2 gap-8 text-xs mt-3 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              {/* Left: Manager IT */}
              <div className="flex flex-col min-h-[120px]">
                <div>
                  <p>Mengetahui,</p>
                  <p>Manager IT,</p>
                </div>
                <div className="mt-auto pt-10">
                  <p>( <span className="underline underline-offset-2 font-medium">{managerIt}</span> )</p>
                </div>
              </div>
              {/* Right: Mentor/User */}
              <div className="flex flex-col min-h-[120px]">
                <div>
                  <p>Mengetahui,</p>
                  <p>Mentor/User,</p>
                </div>
                <div className="mt-auto pt-10">
                  <p>( <span className="underline underline-offset-2 font-medium">{mentorUser}</span> )</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
