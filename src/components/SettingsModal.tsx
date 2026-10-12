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
  const [activeTab, setActiveTab] = useState<'profile' | 'google'>('google');

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

  // Google fields
  const [syncMethod, setSyncMethod] = useState<'apps_script' | 'service_account'>('apps_script');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [rawJson, setRawJson] = useState('');

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

      setSyncMethod(settings.google.syncMethod || 'apps_script');
      setWebAppUrl(settings.google.webAppUrl || '');
      setSpreadsheetId(settings.google.spreadsheetId || '15tFaxo-AJQNFBLAhUZEwjvEQYiY3twCzwl0vEFlIWnw');
      setSheetName(settings.google.sheetName || 'Sheet1');
      setServiceAccountEmail(settings.google.serviceAccountEmail || '');
      setPrivateKey(settings.google.privateKey || '');
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
          defaultTempat
        },
        google: {
          syncMethod,
          webAppUrl,
          spreadsheetId,
          sheetName,
          serviceAccountEmail,
          privateKey: privateKey.includes('••••') ? undefined : privateKey
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
                </div>
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
