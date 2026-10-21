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

  const appsScriptCode = [
    'function doGet(e) {',
    '  try {',
    '    var ss = SpreadsheetApp.getActiveSpreadsheet();',
    '    var sheet = ss.getActiveSheet();',
    '    var data = sheet.getDataRange().getValues();',
    '    if (data.length <= 1) {',
    '      return ContentService.createTextOutput(JSON.stringify({ success: true, tasks: [] }))',
    '        .setMimeType(ContentService.MimeType.JSON);',
    '    }',
    '    var tasks = [];',
    '    for (var i = 1; i < data.length; i++) {',
    '      var r = data[i];',
    '      if (!r[1] && !r[4]) continue;',
    '      var tglStr = (r[1] instanceof Date)',
    '        ? r[1].getFullYear()+"-"+("0"+(r[1].getMonth()+1)).slice(-2)+"-"+("0"+r[1].getDate()).slice(-2)',
    '        : String(r[1]||"");',
    '      var waktuStr = (r[3] instanceof Date)',
    '        ? ("0"+r[3].getHours()).slice(-2)+":"+("0"+r[3].getMinutes()).slice(-2)',
    '        : String(r[3]||"");',
    '      var catatan = String(r[9]||"");',
    '      var tempat = "Ruang IT / Server";',
    '      var tm = catatan.match(/\\[Tempat:\\s*([^\\]]+)\\]/);',
    '      if (tm) { tempat = tm[1].trim(); catatan = catatan.replace(/\\[Tempat:\\s*[^\\]]+\\]\\s*/,"").trim(); }',
    '      tasks.push({ id:String(r[10]||""), no:Number(r[0])||(i), tanggal:tglStr, hari:String(r[2]||""),',
    '        waktu:waktuStr, tugas:String(r[4]||""), user:String(r[5]||"Staf IT"), tempat:tempat,',
    '        kendala:String(r[6]||"-"), tindakan:String(r[7]||"-"), status:String(r[8]||"Selesai"),',
    '        catatan:catatan, isSyncedToSheet:true });',
    '    }',
    '    return ContentService.createTextOutput(JSON.stringify({ success:true, tasks:tasks, count:tasks.length }))',
    '      .setMimeType(ContentService.MimeType.JSON);',
    '  } catch(err) {',
    '    return ContentService.createTextOutput(JSON.stringify({ success:false, error:err.toString() }))',
    '      .setMimeType(ContentService.MimeType.JSON);',
    '  }',
    '}',
    '',
    'function doPost(e) {',
    '  var lock = LockService.getScriptLock();',
    '  lock.tryLock(10000);',
    '  try {',
    '    var ss = SpreadsheetApp.getActiveSpreadsheet();',
    '    var sheet = ss.getActiveSheet();',
    '    var payload = JSON.parse(e.postData.contents);',
    '    var action = payload.action;',
    '    function fmtDate(cell) {',
    '      if (cell instanceof Date) {',
    '        return ("0"+cell.getDate()).slice(-2)+"/"+("0"+(cell.getMonth()+1)).slice(-2)+"/"+cell.getFullYear();',
    '      }',
    '      return String(cell||"");',
    '    }',
    '    function buildRow(t, idx) {',
    '      var c = t.catatan||"";',
    '      if (t.tempat) c = c ? "[Tempat: "+t.tempat+"] "+c : "[Tempat: "+t.tempat+"]";',
    '      return [idx, t.tanggalFormatted||t.tanggal, t.hari||"", t.waktu||"",',
    '              t.tugas||"", t.user||"", t.kendala||"-", t.tindakan||"-",',
    '              t.status||"Selesai", c, t.id||""];',
    '    }',
    '    // SYNC ALL',
    '    if (action==="syncAll" || action==="replaceAll") {',
    '      var tasks = payload.tasks||[];',
    '      var lr = sheet.getLastRow();',
    '      if (lr > 1) sheet.getRange(2,1,lr-1,11).clearContent();',
    '      if (lr<1||sheet.getRange(1,1).getValue()==="") {',
    '        sheet.getRange(1,1,1,11).setValues([["NO","Tanggal","Hari","Waktu","Tugas","User","Kendala","Tindakan","Status","Catatan","ID Tugas"]]);',
    '        sheet.getRange(1,1,1,11).setFontWeight("bold");',
    '      }',
    '      if (tasks.length>0) {',
    '        var rows=[];',
    '        for (var i=0;i<tasks.length;i++) rows.push(buildRow(tasks[i],i+1));',
    '        sheet.getRange(2,1,rows.length,11).setValues(rows);',
    '        sheet.getRange(2,1,rows.length,1).setNumberFormat("@");',
    '      }',
    '      return ContentService.createTextOutput(JSON.stringify({',
    '        success:true, message:"Sinkronisasi penuh berhasil. "+tasks.length+" tugas diperbarui.", count:tasks.length',
    '      })).setMimeType(ContentService.MimeType.JSON);',
    '    }',
    '    // UPDATE',
    '    if (action==="update") {',
    '      var task=payload.task; var data=sheet.getDataRange().getValues(); var fr=-1;',
    '      for (var i=1;i<data.length;i++) {',
    '        var rid=String(data[i][10]||""), rtgl=fmtDate(data[i][1]), rtgs=String(data[i][4]||"");',
    '        if ((task.id&&rid===String(task.id))||(rtgl===(task.tanggalFormatted||task.tanggal)&&rtgs===task.tugas)){fr=i+1;break;}',
    '      }',
    '      if (fr>0) { sheet.getRange(fr,1,1,11).setValues([buildRow(task,task.no||(fr-1))]);',
    '        return ContentService.createTextOutput(JSON.stringify({success:true,message:"Tugas baris "+fr+" diperbarui."})).setMimeType(ContentService.MimeType.JSON);',
    '      } else { sheet.appendRow(buildRow(task,task.no||sheet.getLastRow()));',
    '        return ContentService.createTextOutput(JSON.stringify({success:true,message:"Tugas ditambahkan."})).setMimeType(ContentService.MimeType.JSON);',
    '      }',
    '    }',
    '    // DELETE',
    '    if (action==="delete") {',
    '      var tid=payload.taskId, tgl=payload.tanggalFormatted||payload.tanggal, tgs=payload.tugas;',
    '      var data=sheet.getDataRange().getValues(); var del=false;',
    '      for (var i=1;i<data.length;i++) {',
    '        var rid=String(data[i][10]||""), rtgl=fmtDate(data[i][1]), rtgs=String(data[i][4]||"");',
    '        if ((tid&&rid&&rid===String(tid))||(tgl&&rtgl===tgl&&tgs&&rtgs===String(tgs))) {',
    '          sheet.deleteRow(i+1); del=true; break;',
    '        }',
    '      }',
    '      var nl=sheet.getLastRow();',
    '      if (nl>1) { var nv=[]; for (var j=1;j<nl;j++) nv.push([j]);',
    '        sheet.getRange(2,1,nv.length,1).setValues(nv); sheet.getRange(2,1,nv.length,1).setNumberFormat("@"); }',
    '      return ContentService.createTextOutput(JSON.stringify({',
    '        success:true, message:del?"Tugas berhasil dihapus.":"Tugas tidak ditemukan di Spreadsheet."',
    '      })).setMimeType(ContentService.MimeType.JSON);',
    '    }',
    '    // APPEND (default)',
    '    var arr=Array.isArray(payload)?payload:(payload.tasks||[payload]);',
    '    for (var k=0;k<arr.length;k++) sheet.appendRow(buildRow(arr[k],arr[k].no||sheet.getLastRow()));',
    '    return ContentService.createTextOutput(JSON.stringify({success:true,message:"Data ditambahkan ke Spreadsheet"}))',
    '      .setMimeType(ContentService.MimeType.JSON);',
    '  } catch(err) {',
    '    return ContentService.createTextOutput(JSON.stringify({success:false,error:err.toString()}))',
    '      .setMimeType(ContentService.MimeType.JSON);',
    '  }',
    '}',
  ].join('\n');

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
              <h2 className="text-base font-bold">Panduan Integrasi Google Spreadsheet</h2>
              <p className="text-xs text-emerald-100">Pilih metode integrasi yang sesuai dengan akun Google Anda</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50">
          <button
            onClick={() => setGuideTab('appscript')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${guideTab==='appscript' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>Metode 1: Google Apps Script (Bebas Batasan Organisasi)</span>
            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-normal">Solusi Terbaik</span>
          </button>
          <button
            onClick={() => setGuideTab('serviceaccount')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${guideTab==='serviceaccount' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Key className="w-4 h-4" />
            <span>Metode 2: Google Cloud Service Account</span>
          </button>
        </div>

        {/* Guide Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {guideTab === 'appscript' && (
            <div className="space-y-5">
              <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed space-y-1">
                  <p className="font-bold">Mengapa Menggunakan Google Apps Script?</p>
                  <p>
                    Jika akun Google Anda terkena error <strong>&quot;Service account key creation is disabled by Organization Policy&quot;</strong>,
                    metode ini adalah solusi 100% resmi yang berjalan langsung di dalam Spreadsheet Anda tanpa butuh Google Cloud Console.
                  </p>
                </div>
              </div>

              {/* Tips SyncAll */}
              <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 flex items-start gap-2">
                <span className="text-base shrink-0">??</span>
                <p className="leading-relaxed">
                  <strong>Tips penting:</strong> Setelah pertama kali menarik data dari Spreadsheet, klik <strong>Sinkronkan Semua</strong>
                  agar setiap baris mendapat <em>ID Tugas</em> unik di kolom K. Ini memastikan fitur hapus &amp; edit berfungsi akurat dari kedua arah.
                </p>
              </div>

              {/* Step 1 */}
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm">Buka Spreadsheet &amp; Menu Apps Script</h4>
                  <p className="text-slate-600">Buka Spreadsheet Anda di browser:</p>
                  <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold hover:underline">
                    <span>Buka Spreadsheet PKL Anda</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-slate-600">Di menu atas Spreadsheet, klik <strong>Extensions (Ekstensi)</strong> &gt; pilih <strong>Apps Script</strong>.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">Hapus Kode Bawaan &amp; Tempelkan Kode Ini</h4>
                    <button onClick={copyScript} className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs">
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin!' : 'Salin Script'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">{appsScriptCode}</pre>
                  <p className="text-slate-500 text-[11px]">Setelah ditempel, klik ikon <strong>Save (Disket)</strong> di toolbar Apps Script.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm">Deploy sebagai Web App</h4>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-600 leading-relaxed">
                    <li>Di pojok kanan atas Apps Script, klik tombol biru <strong>Deploy</strong> &gt; pilih <strong>New deployment</strong>.</li>
                    <li>Klik ikon gerigi ?? di samping <em>Select type</em> &gt; pilih <strong>Web app</strong>.</li>
                    <li>Beri deskripsi (misal: <code className="bg-slate-100 px-1 py-0.5 rounded">PKL Tracker API</code>).</li>
                    <li>Pada <strong>Execute as</strong>: pilih <strong>Me (email Anda)</strong>.</li>
                    <li>Pada <strong>Who has access</strong>: pilih <strong>Anyone (Siapa saja)</strong>.</li>
                    <li>Klik <strong>Deploy</strong>. Jika diminta izin, klik <em>Review Permissions</em> &gt; pilih akun &gt; <em>Advanced</em> &gt; <em>Go to project (unsafe)</em> &gt; <strong>Allow</strong>.</li>
                  </ol>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm">Salin URL Web App &amp; Masukkan ke Aplikasi</h4>
                  <p className="text-slate-600 leading-relaxed">Salin <strong>Web app URL</strong> yang berakhiran <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">/exec</code>.</p>
                  <p className="text-slate-600 leading-relaxed">Buka <strong>Pengaturan</strong>, pilih metode <strong>Google Apps Script</strong>, tempelkan URL, lalu klik <strong>Tes Koneksi</strong> &amp; <strong>Simpan Perubahan</strong>.</p>
                </div>
              </div>
            </div>
          )}

          {guideTab === 'serviceaccount' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200">
                <p><strong>Catatan:</strong> Jika akun Google Anda adalah akun sekolah/perusahaan dengan organisasi terkunci, gunakan <strong>Metode 1 (Google Apps Script)</strong> di atas.</p>
              </div>
              <div className="space-y-3 text-slate-600 leading-relaxed">
                <p>Jika Anda menggunakan akun Google pribadi (Gmail biasa), Service Account dapat dibuat melalui:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Buka <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">console.cloud.google.com</a>.</li>
                  <li>Buat Project baru &gt; Aktifkan <strong>Google Sheets API</strong>.</li>
                  <li>Di <strong>IAM &amp; Admin &gt; Service Accounts</strong>, buat Service Account baru.</li>
                  <li>Di tab <strong>Keys</strong>, klik <strong>Add Key &gt; JSON</strong>. File JSON akan terdownload.</li>
                  <li>Bagikan Spreadsheet ke email bot tersebut sebagai <strong>Editor</strong>.</li>
                  <li>Upload file JSON di menu Pengaturan aplikasi.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Metode Google Apps Script langsung aktif di semua jenis akun Google.</span>
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
