'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  User, 
  Sheet, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  ExternalLink,
  HelpCircle,
  RefreshCw,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { AppSettings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onSaveSettings: (settings: any) => Promise<void>;
  onOpenGuide: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onOpenGuide
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'google' | 'smartpkl'>('google');

  // Profile fields
  const [namaSiswa, setNamaSiswa] = useState('');
  const [nis, setNis] = useState('');
  const [sekolah, setSekolah] = useState('');
  const [tempatPkl, setTempatPkl] = useState('');
  const [bulanPelaksanaan, setBulanPelaksanaan] = useState('');
  const [pembimbingPkl, setPembimbingPkl] = useState('');
  const [userDuDi, setUserDuDi] = useState('');
  const [pesertaPkl, setPesertaPkl] = useState('');
  const [defaultTempat, setDefaultTempat] = useState('');
  const [managerIt, setManagerIt] = useState('');
  const [periodePkl, setPeriodePkl] = useState('');
  const [tanggalMulaiPkl, setTanggalMulaiPkl] = useState('');

  // Google fields
  const [syncMethod, setSyncMethod] = useState<'apps_script' | 'service_account'>('apps_script');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [rawJson, setRawJson] = useState('');

  // SmartPKL fields
  const [smartpklUsername, setSmartpklUsername] = useState('');
  const [smartpklPassword, setSmartpklPassword] = useState('');
  const [officeLatitude, setOfficeLatitude] = useState('-6.2254');
  const [officeLongitude, setOfficeLongitude] = useState('106.7977');
  const [testingSmartPKL, setTestingSmartPKL] = useState(false);
  const [smartpklTestResult, setSmartpklTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (settings) {
      setNamaSiswa(settings.profile.namaSiswa || 'Fakhri Zainul Arifin');
      setNis(settings.profile.nis || '2324009');
      setSekolah(settings.profile.sekolah || 'SMK TI BAZMA');
      setTempatPkl(settings.profile.tempatPkl || 'Yayasan Kesehatan Pertamina');
      setBulanPelaksanaan(settings.profile.bulanPelaksanaan || 'Oktober 2026');
      setPembimbingPkl(settings.profile.pembimbingPkl || 'Ristina Eka Salsabila');
      setUserDuDi(settings.profile.userDuDi || '(..................................)');
      setPesertaPkl(settings.profile.pesertaPkl || 'Fakhri Zainul Arifin');
      setDefaultTempat(settings.profile.defaultTempat || 'Ruang IT / Server');
      setManagerIt(settings.profile.managerIt || 'Bagus Dwi Laksono');
      setPeriodePkl(settings.profile.periodePkl || '2026-2027');
      setTanggalMulaiPkl(settings.profile.tanggalMulaiPkl || '2026-08-03');

      setSyncMethod(settings.google.syncMethod || 'apps_script');
      setWebAppUrl(settings.google.webAppUrl || '');
      setSpreadsheetId(settings.google.spreadsheetId || '15tFaxo-AJQNFBLAhUZEwjvEQYiY3twCzwl0vEFlIWnw');
      setSheetName(settings.google.sheetName || 'Sheet1');
      setServiceAccountEmail(settings.google.serviceAccountEmail || '');
      setPrivateKey(settings.google.privateKey || '');

      // SmartPKL
      const sp = (settings as any).smartpkl;
      setSmartpklUsername(sp?.username || '2324009');
      setSmartpklPassword(sp?.password || '');
      setOfficeLatitude(String(sp?.officeLatitude ?? '-6.2254'));
      setOfficeLongitude(String(sp?.officeLongitude ?? '106.7977'));
    }
    setTestResult(null);
    setSaveStatus('');
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.client_email && parsed.private_key) {
          setServiceAccountEmail(parsed.client_email);
          setPrivateKey(parsed.private_key);
          setRawJson('');
          setTestResult({
            success: true,
            message: `File key berhasil dibaca! Email: ${parsed.client_email}`
          });
        } else {
          setTestResult({
            success: false,
            message: 'File JSON tidak memiliki atribut client_email atau private_key yang valid.'
          });
        }
      } catch {
        setTestResult({
          success: false,
          message: 'Gagal membaca format JSON file.'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);

      const res = await fetch('/api/google/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncMethod,
          webAppUrl,
          spreadsheetId,
          sheetName,
          serviceAccountEmail,
          privateKey
        })
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Koneksi gagal.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setSaveStatus('');
      await onSaveSettings({
        profile: {
          namaSiswa,
          nis,
          sekolah,
          tempatPkl,
          bulanPelaksanaan,
          pembimbingPkl,
          userDuDi,
          pesertaPkl,
          defaultTempat,
          managerIt,
          periodePkl,
          tanggalMulaiPkl
        },
        google: {
          syncMethod,
          webAppUrl,
          spreadsheetId,
          sheetName,
          serviceAccountEmail,
          privateKey: privateKey.includes('••••') ? undefined : privateKey
        },
        smartpkl: {
          username: smartpklUsername,
          password: smartpklPassword.includes('••••') ? undefined : smartpklPassword,
          officeLatitude: parseFloat(officeLatitude) || -6.2254,
          officeLongitude: parseFloat(officeLongitude) || 106.7977,
        }
      });
      setSaveStatus('Pengaturan berhasil disimpan!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Gagal menyimpan pengaturan.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Pengaturan Aplikasi
            </h2>
            <p className="text-xs text-slate-500">
              Kelola data laporan PKL SMK TI BAZMA dan integrasi Google Sheets
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/30">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'google'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sheet className="w-4 h-4" />
            <span>Integrasi Google Sheets</span>
            {settings?.google.isConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil Siswa & PKL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('smartpkl')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'smartpkl'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>SmartPKL Absensi</span>
            {(settings as any)?.smartpkl?.isConfigured && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {saveStatus && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveStatus}</span>
            </div>
          )}

          {/* TAB 1: Google Sheets */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              {/* Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Pilih Cara Menghubungkan ke Google Spreadsheet:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Method A: Apps Script */}
                  <div
                    onClick={() => setSyncMethod('apps_script')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      syncMethod === 'apps_script'
                        ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-xs">Google Apps Script</span>
                      <span className="text-[10px] bg-emerald-600 text-white font-semibold px-1.5 py-0.2 rounded">
                        Rekomendasi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      <strong>Bebas Batasan Organisasi!</strong> Cukup tempel script kecil di Spreadsheet Anda. Tidak perlu Google Cloud atau Service Account Key.
                    </p>
                  </div>

                  {/* Method B: Service Account */}
                  <div
                    onClick={() => setSyncMethod('service_account')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      syncMethod === 'service_account'
                        ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="font-bold text-xs">Service Account JSON</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Menggunakan Google Cloud Platform. Membutuhkan izin pembuatan Service Account Key (biasanya diblokir di akun sekolah/organisasi).
                    </p>
                  </div>
                </div>
              </div>

              {/* METHOD A CONTENT: Apps Script */}
              {syncMethod === 'apps_script' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      URL Web App Google Apps Script
                    </span>
                    <button
                      type="button"
                      onClick={onOpenGuide}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Panduan Setup 1 Menit</span>
                    </button>
                  </div>

                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono bg-white"
                  />

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-lg text-[11px] text-emerald-900 space-y-1">
                    <p className="font-semibold">💡 Langkah Kilat Membuat URL Web App:</p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-700">
                      <li>Buka Spreadsheet Anda &gt; menu <strong>Extensions (Ekstensi)</strong> &gt; <strong>Apps Script</strong>.</li>
                      <li>Hapus kode bawaan, lalu tempel kode dari <strong>Panduan</strong> (atau klik tombol panduan di atas).</li>
                      <li>Klik <strong>Deploy</strong> &gt; <strong>New Deployment</strong> &gt; Tipe: <strong>Web App</strong>.</li>
                      <li>Set <em>Execute as</em>: <strong>Me</strong> dan <em>Who has access</em>: <strong>Anyone</strong>.</li>
                      <li>Salin URL Web App yang muncul, lalu tempel di kolom atas ini!</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* METHOD B CONTENT: Service Account */}
              {syncMethod === 'service_account' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      Jika Anda melihat pesan <em>"Service account key creation is disabled"</em>, akun Google Anda memiliki kebijakan pembatasan organisasi. Gunakan opsi <strong>Google Apps Script</strong> di atas untuk langsung melewatinya.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Spreadsheet ID
                      </label>
                      <input
                        type="text"
                        value={spreadsheetId}
                        onChange={(e) => setSpreadsheetId(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Sheet
                      </label>
                      <input
                        type="text"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Upload File JSON Key
                    </label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleJsonUpload}
                      className="text-xs text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Client Email
                    </label>
                    <input
                      type="email"
                      value={serviceAccountEmail}
                      onChange={(e) => setServiceAccountEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Private Key
                    </label>
                    <textarea
                      rows={2}
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Test Connection Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || (syncMethod === 'apps_script' ? !webAppUrl : !serviceAccountEmail)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? 'Sedang Menguji...' : 'Tes Koneksi ke Spreadsheet'}</span>
                </button>

                {testResult && (
                  <div
                    className={`mt-2.5 p-3 rounded-lg text-xs flex items-start gap-2 border ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Profil */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Siswa
                  </label>
                  <input
                    type="text"
                    value={namaSiswa}
                    onChange={(e) => setNamaSiswa(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIS
                  </label>
                  <input
                    type="text"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sekolah
                  </label>
                  <input
                    type="text"
                    value={sekolah}
                    onChange={(e) => setSekolah(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat / Instansi PKL
                  </label>
                  <input
                    type="text"
                    value={tempatPkl}
                    onChange={(e) => setTempatPkl(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bulan Pelaksanaan
                  </label>
                  <input
                    type="text"
                    value={bulanPelaksanaan}
                    onChange={(e) => setBulanPelaksanaan(e.target.value)}
                    placeholder="Contoh: Oktober 2026"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Tempat / Ruangan
                  </label>
                  <input
                    type="text"
                    value={defaultTempat}
                    onChange={(e) => setDefaultTempat(e.target.value)}
                    placeholder="Ruang IT / Server"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Pengesahan & Tanda Tangan Laporan
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      User DU/DI (Instansi)
                    </label>
                    <input
                      type="text"
                      value={userDuDi}
                      onChange={(e) => setUserDuDi(e.target.value)}
                      placeholder="(..................................)"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Pembimbing PKL
                    </label>
                    <input
                      type="text"
                      value={pembimbingPkl}
                      onChange={(e) => setPembimbingPkl(e.target.value)}
                      placeholder="Ristina Eka Salsabila"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Peserta PKL
                    </label>
                    <input
                      type="text"
                      value={pesertaPkl}
                      onChange={(e) => setPesertaPkl(e.target.value)}
                      placeholder="Fakhri Zainul Arifin"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* New fields for absensi report template */}
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Khusus Template Laporan Absensi
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Manager IT (Penandatangan Kiri)
                        </label>
                        <input
                          type="text"
                          value={managerIt}
                          onChange={(e) => setManagerIt(e.target.value)}
                          placeholder="Bagus Dwi Laksono"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Periode PKL (e.g. 2026-2027)
                        </label>
                        <input
                          type="text"
                          value={periodePkl}
                          onChange={(e) => setPeriodePkl(e.target.value)}
                          placeholder="2026-2027"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Tanggal Masuk Pertama PKL (acuan Total Hari PKL)
                        </label>
                        <input
                          type="date"
                          value={tanggalMulaiPkl}
                          onChange={(e) => setTanggalMulaiPkl(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Default: 3 Agustus 2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SmartPKL */}
          {activeTab === 'smartpkl' && (
            <div className="space-y-5">
              {/* Header info */}
              <div
                className="p-4 rounded-xl text-xs"
                style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', border: '1px solid #c7d2fe' }}
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-indigo-900">Integrasi SmartPKL Otomatis</p>
                    <p className="text-indigo-700 mt-0.5">
                      Masukkan kredensial login ke{' '}
                      <a href="https://smartpkl.smktibazma.sch.id" target="_blank" rel="noopener noreferrer" className="underline">
                        smartpkl.smktibazma.sch.id
                      </a>{' '}
                      agar Task Tracker bisa absen otomatis ke web tersebut.
                    </p>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Kredensial Login</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Username SmartPKL</label>
                    <input
                      type="text"
                      value={smartpklUsername}
                      onChange={(e) => setSmartpklUsername(e.target.value)}
                      placeholder="Contoh: 2324009"
                      className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Password SmartPKL</label>
                    <input
                      type="password"
                      value={smartpklPassword}
                      onChange={(e) => setSmartpklPassword(e.target.value)}
                      placeholder="Masukkan password SmartPKL"
                      className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Office Location */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Koordinat Kantor (DU/DI)</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Titik tengah area kantor. Absensi akan menggunakan koordinat acak dalam radius ±55m dari titik ini.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={officeLatitude}
                      onChange={(e) => setOfficeLatitude(e.target.value)}
                      placeholder="-6.2254"
                      className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={officeLongitude}
                      onChange={(e) => setOfficeLongitude(e.target.value)}
                      placeholder="106.7977"
                      className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  💡 Yayasan Kesehatan Pertamina Simprug: -6.2254, 106.7977
                </p>
              </div>

              {/* Test Login Button */}
              <div>
                <button
                  type="button"
                  disabled={testingSmartPKL || !smartpklUsername}
                  onClick={async () => {
                    setTestingSmartPKL(true);
                    setSmartpklTestResult(null);
                    try {
                      const fd = new FormData();
                      fd.append('action', 'login');
                      fd.append('username', smartpklUsername);
                      fd.append('password', smartpklPassword.includes('••••') ? '' : smartpklPassword);
                      const res = await fetch('/api/smartpkl', { method: 'POST', body: fd });
                      const data = await res.json();
                      setSmartpklTestResult({ success: data.success, message: data.message });
                    } catch (err: any) {
                      setSmartpklTestResult({ success: false, message: err.message });
                    } finally {
                      setTestingSmartPKL(false);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {testingSmartPKL ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {testingSmartPKL ? 'Menguji Login...' : 'Test Login SmartPKL'}
                </button>

                {smartpklTestResult && (
                  <div className={`mt-2 p-3 rounded-lg text-xs flex items-start gap-2 ${
                    smartpklTestResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {smartpklTestResult.success
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      : <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                    }
                    <span>{smartpklTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
