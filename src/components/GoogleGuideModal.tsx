'use client';

import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle2, Copy, BookOpen, Key, Zap, ShieldCheck } from 'lucide-react';

interface GoogleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceAccountEmail?: string;
  spreadsheetId?: string;
}

export default function GoogleGuideModal({
  isOpen,
  onClose,
  spreadsheetId = '15tFaxo-AJQNFBLAhUZEwjvEQYiY3twCzwl0vEFlIWnw'
}: GoogleGuideModalProps) {
  const [copied, setCopied] = useState(false);
  const [guideTab, setGuideTab] = useState<'appscript' | 'serviceaccount'>('appscript');

  if (!isOpen) return null;

  const appsScriptCode = `function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var tasks = Array.isArray(data) ? data : [data];
    
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var catatan = t.catatan || "";
      if (t.tempat) {
        catatan = catatan ? "[Tempat: " + t.tempat + "] " + catatan : "[Tempat: " + t.tempat + "]";
      }
      sheet.appendRow([
        t.no || sheet.getLastRow(),
        t.tanggalFormatted || t.tanggal,
        t.hari || "",
        t.waktu || "",
        t.tugas || "",
        t.user || "",
        t.kendala || "-",
        t.tindakan || "-",
        t.status || "Selesai",
        catatan
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data berhasil ditambahkan ke Spreadsheet"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Google Apps Script Web App PKL Tracker aktif!"
  })).setMimeType(ContentService.MimeType.JSON);
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-200" />
            <div>
              <h2 className="text-base font-bold">
                Panduan Integrasi Google Spreadsheet
              </h2>
              <p className="text-xs text-emerald-100">
                Pilih metode integrasi yang sesuai dengan akun Google Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50">
          <button
            onClick={() => setGuideTab('appscript')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              guideTab === 'appscript'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>Metode 1: Google Apps Script (Bebas Batasan Organisasi)</span>
            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-normal">
              Solusi Terbaik
            </span>
          </button>
          <button
            onClick={() => setGuideTab('serviceaccount')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              guideTab === 'serviceaccount'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Metode 2: Google Cloud Service Account</span>
          </button>
        </div>

        {/* Guide Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* TAB 1: Google Apps Script */}
          {guideTab === 'appscript' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed space-y-1">
                  <p className="font-bold">
                    Mengapa Menggunakan Google Apps Script?
                  </p>
                  <p>
                    Jika akun Google Anda terkena error <strong>"Service account key creation is disabled by Organization Policy"</strong>, metode ini adalah solusi 100% resmi yang berjalan langsung di dalam Spreadsheet Anda tanpa butuh Google Cloud Console atau pembuatan file key.
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Buka Spreadsheet & Menu Apps Script
                  </h4>
                  <p className="text-slate-600">
                    Buka Spreadsheet Anda di browser:
                  </p>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold hover:underline"
                  >
                    <span>Buka Spreadsheet PKL Anda</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-slate-600">
                    Di menu atas Spreadsheet, klik <strong>Extensions (Ekstensi)</strong> &gt; pilih <strong>Apps Script</strong>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Hapus Kode Bawaan & Tempelkan Kode Ini
                    </h4>
                    <button
                      onClick={copyScript}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin!' : 'Salin Script'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                    {appsScriptCode}
                  </pre>
                  <p className="text-slate-500 text-[11px]">
                    Setelah ditempel, klik ikon <strong>Save (Disket)</strong> di toolbar Apps Script.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Deploy sebagai Web App
                  </h4>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-600 leading-relaxed">
                    <li>
                      Di pojok kanan atas Apps Script, klik tombol biru <strong>Deploy</strong> &gt; pilih <strong>New deployment</strong>.
                    </li>
                    <li>
                      Klik ikon gerigi ⚙️ di samping <em>Select type</em> &gt; pilih <strong>Web app</strong>.
                    </li>
                    <li>
                      Beri deskripsi (misal: <code className="bg-slate-100 px-1 py-0.5 rounded">PKL Tracker API</code>).
                    </li>
                    <li>
                      Pada <strong>Execute as</strong>: pilih <strong>Me (email Anda)</strong>.
                    </li>
                    <li>
                      Pada <strong>Who has access</strong>: pilih <strong>Anyone (Siapa saja)</strong> agar aplikasi kita dapat mengirim data tugas.
                    </li>
                    <li>
                      Klik <strong>Deploy</strong>. Jika diminta izin otorisasi (*Authorize Access*), klik <em>Review Permissions</em> &gt; pilih akun Anda &gt; klik <em>Advanced</em> &gt; klik <em>Go to Untitled project (unsafe)</em> &gt; klik <strong>Allow</strong>.
                    </li>
                  </ol>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Salin URL Web App & Masukkan ke Aplikasi
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Setelah berhasil di-deploy, salin <strong>Web app URL</strong> yang berakhiran <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">/exec</code>.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Buka menu <strong>Pengaturan</strong> di aplikasi ini, pilih metode <strong>Google Apps Script</strong>, tempelkan URL tersebut, lalu klik <strong>Tes Koneksi</strong> &amp; <strong>Simpan Perubahan</strong>. Selesai!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Service Account */}
          {guideTab === 'serviceaccount' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200">
                <p>
                  <strong>Catatan:</strong> Jika akun Google Anda adalah akun sekolah/perusahaan dengan organisasi terkunci, Anda akan mendapati pesan <em>"Service account key creation is disabled"</em>. Sebaiknya gunakan <strong>Metode 1 (Google Apps Script)</strong> di atas yang tidak memiliki batasan ini.
                </p>
              </div>

              <div className="space-y-3 text-slate-600 leading-relaxed">
                <p>
                  Jika Anda menggunakan akun Google pribadi (Gmail biasa), Service Account dapat dibuat melalui:
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Buka <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">console.cloud.google.com</a> dengan akun Gmail pribadi.</li>
                  <li>Buat Project baru &gt; Aktifkan <strong>Google Sheets API</strong>.</li>
                  <li>Di menu <strong>IAM &amp; Admin &gt; Service Accounts</strong>, buat Service Account baru.</li>
                  <li>Di tab <strong>Keys</strong>, klik <strong>Add Key &gt; JSON</strong>. File JSON akan terdownload.</li>
                  <li>Bagikan Spreadsheet PKL Anda ke email bot tersebut sebagai <strong>Editor</strong>.</li>
                  <li>Upload file JSON di menu Pengaturan aplikasi.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Metode Google Apps Script langsung aktif dan bekerja di semua jenis akun Google.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
