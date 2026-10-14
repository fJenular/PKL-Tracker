'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock, MapPin, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Task, TaskStatus, AppSettings } from '@/types';
import { getHariFromDate, getCurrentDateString, getCurrentTimeString } from '@/lib/dateUtils';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  initialTask?: Task | null;
  settings: AppSettings | null;
}

export default function TaskFormModal({
  isOpen,
  onClose,
  onSave,
  initialTask,
  settings
}: TaskFormModalProps) {
  const [tanggal, setTanggal] = useState('');
  const [hari, setHari] = useState('');
  const [jamMulai, setJamMulai] = useState('');
  const [jamSelesai, setJamSelesai] = useState('');
  const [isRange, setIsRange] = useState(false);
  const [tugas, setTugas] = useState('');
  const [user, setUser] = useState('Staf IT');
  const [tempat, setTempat] = useState(settings?.profile.defaultTempat || 'Ruang IT / Server');
  const [kendala, setKendala] = useState('-');
  const [tindakan, setTindakan] = useState('-');
  const [status, setStatus] = useState<TaskStatus>('Selesai');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTanggal(initialTask.tanggal);
      setHari(initialTask.hari);
      const w = initialTask.waktu || '';
      if (w.includes(' - ')) {
        const [start, end] = w.split(' - ');
        setJamMulai(start.trim().slice(0, 5));
        setJamSelesai(end.trim().slice(0, 5));
        setIsRange(true);
      } else {
        setJamMulai(w.length >= 5 ? w.slice(0, 5) : w || getCurrentTimeString());
        setJamSelesai('');
        setIsRange(false);
      }
      setTugas(initialTask.tugas);
      setUser(initialTask.user);
      setTempat(initialTask.tempat || settings?.profile.defaultTempat || 'Ruang IT / Server');
      setKendala(initialTask.kendala || '-');
      setTindakan(initialTask.tindakan || '-');
      setStatus(initialTask.status);
      setCatatan(initialTask.catatan || '');
    } else {
      const today = getCurrentDateString();
      setTanggal(today);
      setHari(getHariFromDate(today));
      setJamMulai(getCurrentTimeString());
      setJamSelesai('');
      setIsRange(false);
      setTugas('');
      setUser('Staf IT');
      setTempat(settings?.profile.defaultTempat || 'Ruang IT / Server');
      setKendala('-');
      setTindakan('-');
      setStatus('Selesai');
      setCatatan('');
    }
    setErrorMsg('');
  }, [initialTask, isOpen, settings]);

  if (!isOpen) return null;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTanggal(val);
    setHari(getHariFromDate(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tugas.trim()) {
      setErrorMsg('Deskripsi tugas / kegiatan wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const finalWaktu = isRange && jamSelesai ? `${jamMulai} - ${jamSelesai}` : (jamMulai || getCurrentTimeString());
      await onSave({
        tanggal,
        hari,
        waktu: finalWaktu,
        tugas: tugas.trim(),
        user: user.trim() || 'Staf IT',
        tempat: tempat.trim() || 'Ruang IT / Server',
        kendala: kendala.trim() || '-',
        tindakan: tindakan.trim() || '-',
        status,
        catatan: catatan.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan tugas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonLocations = [
    'Ruang IT / Server',
    'Ruang Rapat',
    'Gedung Utama',
    'Poliklinik / Ruang Pelayanan',
    'Meja Kerja Staf'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialTask ? 'Edit Tugas PKL' : 'Tambah Tugas Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              Data akan dicatat ke Task Tracker dan otomatis ditambahkan ke Google Spreadsheet
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Tanggal, Hari, Waktu */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={tanggal}
                  onChange={handleDateChange}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hari
              </label>
              <input
                type="text"
                value={hari}
                onChange={(e) => setHari(e.target.value)}
                placeholder="Senin, Selasa..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Jam Pelaksanaan
                </label>
                <button
                  type="button"
                  onClick={() => setIsRange(!isRange)}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer hover:underline"
                >
                  {isRange ? 'Jam Tunggal' : '+ Rentang'}
                </button>
              </div>

              {!isRange ? (
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="time"
                      value={jamMulai}
                      onChange={(e) => setJamMulai(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white font-mono cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setJamMulai(getCurrentTimeString())}
                    title="Gunakan jam sekarang secara otomatis"
                    className="px-2.5 py-2 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  >
                    <span>Otomatis</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    required
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white font-mono cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 font-semibold">-</span>
                  <input
                    type="time"
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    required
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white font-mono cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setJamMulai(getCurrentTimeString())}
                    title="Set jam mulai ke waktu sekarang"
                    className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Tugas / Kegiatan (Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kegiatan / Tugas yang Dilakukan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={tugas}
              onChange={(e) => setTugas(e.target.value)}
              placeholder="Jelaskan pekerjaan atau kegiatan yang Anda lakukan hari ini..."
              required
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Row 3: Tempat & User/PIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat Pelaksanaan
              </label>
              <input
                type="text"
                value={tempat}
                onChange={(e) => setTempat(e.target.value)}
                placeholder="Ruang IT / Server"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {commonLocations.slice(0, 3).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setTempat(loc)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    + {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                User / PIC Terkait
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Nama staf / Divisi yang meminta bantuan"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 4: Status & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Tugas
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="Selesai">Selesai</option>
                <option value="Sedang Berjalan">Sedang Berjalan</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan hasil atau hal penting lainnya"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 5: Kendala & Tindakan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kendala (Jika ada)
              </label>
              <input
                type="text"
                value={kendala}
                onChange={(e) => setKendala(e.target.value)}
                placeholder="Isi '-' jika tidak ada kendala"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tindakan / Solusi
              </label>
              <input
                type="text"
                value={tindakan}
                onChange={(e) => setTindakan(e.target.value)}
                placeholder="Solusi atau tindakan yang diambil"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Otomatis terhubung ke Spreadsheet & format Docs BAZMA
            </span>
            <div className="flex items-center gap-2">
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
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Tugas'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
