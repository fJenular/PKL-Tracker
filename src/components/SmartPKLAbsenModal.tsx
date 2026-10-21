'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Shield,
  Wifi,
  Clock,
  UserCheck,
} from 'lucide-react';
import { AttendanceRecord } from '@/types';

interface SmartPKLAbsenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  todayAttendance?: AttendanceRecord | null;
}

type AbsenStatus = '1' | '2' | '4'; // 1=Hadir, 2=Izin, 4=Sakit
type StepState = 'form' | 'camera' | 'preview' | 'submitting' | 'done' | 'error';

const STATUS_OPTIONS: { value: AbsenStatus; label: string; color: string; bg: string }[] = [
  { value: '1', label: 'Hadir', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100' },
  { value: '2', label: 'Izin', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300 hover:bg-amber-100' },
  { value: '4', label: 'Sakit', color: 'text-red-700', bg: 'bg-red-50 border-red-300 hover:bg-red-100' },
];

export default function SmartPKLAbsenModal({ isOpen, onClose, onSuccess, todayAttendance }: SmartPKLAbsenModalProps) {
  const [internalAttendance, setInternalAttendance] = useState<AttendanceRecord | null>(null);
  const [step, setStep] = useState<StepState>('form');
  const [selectedStatus, setSelectedStatus] = useState<AbsenStatus>('1');
  const [alasan, setAlasan] = useState('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [resultMessage, setResultMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  // Cek apakah hari ini sudah pernah absen pagi
  useEffect(() => {
    if (isOpen) {
      if (todayAttendance !== undefined) {
        setInternalAttendance(todayAttendance);
      } else {
        fetch('/api/attendance')
          .then((r) => r.json())
          .then((res) => {
            if (res.success && Array.isArray(res.data)) {
              const todayStr = new Date().toISOString().split('T')[0];
              const rec = res.data.find((r: AttendanceRecord) => r.tanggal === todayStr);
              setInternalAttendance(rec || null);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, todayAttendance]);

  const activeRecord = todayAttendance !== undefined ? todayAttendance : internalAttendance;
  const hasCheckedIn = Boolean(
    activeRecord &&
    activeRecord.jamMasuk &&
    activeRecord.jamMasuk !== '-' &&
    activeRecord.jamMasuk.trim() !== ''
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep('form');
      setSelectedStatus('1');
      setAlasan('');
      setCapturedBlob(null);
      setPreviewUrl('');
      setResultMessage('');
      setCameraError('');
      setIsCameraLoading(false);
    }
  }, [isOpen]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraLoading(false);
  }, []);

  // Callback ref to attach stream IMMEDIATELY when the <video> element is mounted in DOM
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch((err) => {
        console.warn('Auto-play error on mount:', err);
      });
    }
  }, []);

  // Secondary effect to ensure stream is attached whenever entering camera step
  useEffect(() => {
    if (step === 'camera' && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.play().catch((err) => console.warn('Video play error in effect:', err));
    }
  }, [step]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setIsCameraLoading(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('Detailed camera constraint failed, using generic video fallback:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setStep('camera');

      // Attach immediately if ref is already available
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('Immediate video play error:', err));
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let errMsg = 'Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan di browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Harap izinkan akses kamera pada ikon gembok di address bar browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Tidak ada perangkat kamera / webcam yang ditemukan pada perangkat ini.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Kamera sedang dipakai oleh aplikasi lain (seperti Zoom, Teams, atau Meet). Tutup aplikasi tersebut terlebih dahulu.';
      }
      setCameraError(errMsg);
      setIsCameraLoading(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally so the captured photo matches the mirror preview
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopCamera();
        setStep('preview');
      },
      'image/jpeg',
      0.92
    );
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedBlob(null);
    setPreviewUrl('');
    startCamera();
  }, [previewUrl, startCamera]);

  const handleSubmit = useCallback(async () => {
    if (!capturedBlob) return;

    setStep('submitting');

    try {
      const fd = new FormData();
      fd.append('action', 'absen');
      fd.append('status', selectedStatus);
      if (selectedStatus === '2' && alasan) fd.append('alasan', alasan);
      fd.append('foto', capturedBlob, 'selfie.jpg');

      const res = await fetch('/api/smartpkl', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      setIsSuccess(data.success);
      setResultMessage(data.message);
      setStep('done');

      if (data.success) {
        // Also sync to local attendance database
        const statusMap: Record<string, 'Hadir' | 'Izin' | 'Sakit'> = {
          '1': 'Hadir',
          '2': 'Izin',
          '4': 'Sakit',
        };
        const now = new Date();
        const jamStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tanggal: dStr,
            status: statusMap[selectedStatus] || 'Hadir',
            jamMasuk: jamStr,
            jamPulang: '',
            keterangan: selectedStatus === '2' ? `Izin: ${alasan}` : 'Presensi via SmartPKL BAZMA',
          }),
        }).catch(console.error);

        onSuccess?.();
      }
    } catch (err: any) {
      setIsSuccess(false);
      setResultMessage('Terjadi kesalahan saat menghubungi server.');
      setStep('done');
    }
  }, [capturedBlob, selectedStatus, alasan, onSuccess]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          {/* Glow accent */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-0.5 rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, #818cf8, transparent)' }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base tracking-tight">Absen SmartPKL</h2>
                <p className="text-indigo-300 text-xs font-medium">Sistem Presensi PKL Terintegrasi</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-indigo-300">
              <MapPin className="w-3 h-3" />
              <span>Lokasi auto-spoof</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-indigo-500/50" />
            <div className="flex items-center gap-1.5 text-xs text-indigo-300">
              <Shield className="w-3 h-3" />
              <span>Aman & Terenkripsi</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-indigo-500/50" />
            <div className="flex items-center gap-1.5 text-xs text-indigo-300">
              <Wifi className="w-3 h-3" />
              <span>Real-time</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-6" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Body */}
        <div className="px-6 py-5">
          {/* ── VALIDASI: SUDAH ABSEN PAGI INI ── */}
          {hasCheckedIn ? (
            <div className="py-2 text-center space-y-4">
              <div
                className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  boxShadow: '0 0 25px rgba(16, 185, 129, 0.2)'
                }}
              >
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 size={13} />
                  Presensi Masuk Tercatat
                </span>
                <h3 className="text-white font-bold text-lg mt-2.5">
                  Kamu Sudah Absen Pagi Ini!
                </h3>
                <p className="text-slate-300 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                  Presensi masuk kamu sudah berhasil tersimpan di sistem. Kamu tidak dapat melakukan absen masuk lagi hari ini.
                </p>
              </div>

              {/* Detail Info Card */}
              <div
                className="rounded-2xl p-4 text-left space-y-2.5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Jam Masuk (Clock In)</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {activeRecord?.jamMasuk || '07:44'} WIB
                  </span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Status Kehadiran</span>
                  <span className="font-semibold text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-500/20">
                    {activeRecord?.status || 'Hadir'}
                  </span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Tanggal</span>
                  <span className="font-medium text-slate-300">
                    {activeRecord?.tanggal || new Date().toISOString().split('T')[0]}
                  </span>
                </div>
                {activeRecord?.keterangan && (
                  <>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Keterangan</span>
                      <span className="font-medium text-slate-300 truncate max-w-[190px]">
                        {activeRecord.keterangan}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white transition border border-white/10 shadow-lg cursor-pointer hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                  }}
                >
                  Tutup Keterangan
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── STEP: FORM ── */}
              {step === 'form' && (
            <div className="space-y-5">
              {/* Current time */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-indigo-300">
                  Absen pada:{' '}
                  <span className="text-white font-semibold">
                    {new Date().toLocaleString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </div>

              {/* Status selection */}
              <div>
                <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2.5">
                  Status Kehadiran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedStatus(opt.value)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        selectedStatus === opt.value
                          ? `${opt.bg} ${opt.color} scale-[1.03] shadow-sm`
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alasan (for Izin only) */}
              {selectedStatus === '2' && (
                <div>
                  <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                    Alasan Izin
                  </label>
                  <input
                    type="text"
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    placeholder="Masukkan alasan izin..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              )}

              {/* Camera error */}
              {cameraError && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Next button */}
              <button
                onClick={startCamera}
                disabled={selectedStatus === '2' && !alasan.trim()}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <Camera className="w-4 h-4" />
                Ambil Selfie Absensi
              </button>
            </div>
          )}

          {/* ── STEP: CAMERA ── */}
          {step === 'camera' && (
            <div className="space-y-4">
              <p className="text-white/60 text-xs text-center">Posisikan wajah di dalam frame, lalu tekan tombol kamera</p>
              <div
                className="relative rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[260px]"
                style={{ border: '2px solid rgba(99,102,241,0.4)' }}
              >
                {/* Camera Connecting Loading Overlay */}
                {isCameraLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs gap-2">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <span className="text-xs text-indigo-200 font-medium">Menghubungkan kamera...</span>
                  </div>
                )}

                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    v.play().catch(console.warn);
                    setIsCameraLoading(false);
                  }}
                  onPlaying={() => setIsCameraLoading(false)}
                  className="w-full h-full object-cover"
                  style={{ maxHeight: '280px', minHeight: '260px', transform: 'scaleX(-1)' }}
                />

                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div
                    className="w-44 h-52 rounded-full"
                    style={{ border: '2px dashed rgba(99,102,241,0.5)', boxShadow: '0 0 15px rgba(99,102,241,0.2)' }}
                  />
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="flex gap-3">
                <button
                  onClick={() => { stopCamera(); setStep('form'); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                >
                  Batal
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  <Camera className="w-4 h-4" />
                  Ambil Foto
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-white/60 text-xs text-center">Periksa foto selfie Anda sebelum submit</p>
              {previewUrl && (
                <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(99,102,241,0.3)' }}>
                  <img
                    src={previewUrl}
                    alt="Selfie preview"
                    className="w-full object-cover"
                    style={{ maxHeight: '280px', transform: 'scaleX(-1)' }}
                  />
                </div>
              )}

              {/* Summary */}
              <div
                className="px-4 py-3 rounded-xl text-xs space-y-1.5"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <div className="flex justify-between text-white/60">
                  <span>Status</span>
                  <span className="text-white font-semibold">
                    {STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.label}
                  </span>
                </div>
                {selectedStatus === '2' && alasan && (
                  <div className="flex justify-between text-white/60">
                    <span>Alasan</span>
                    <span className="text-white font-semibold">{alasan}</span>
                  </div>
                )}
                <div className="flex justify-between text-white/60">
                  <span>Lokasi</span>
                  <span className="text-emerald-400 font-semibold">Auto (Area Kantor)</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ulang
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Kirim Absensi
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: SUBMITTING ── */}
          {step === 'submitting' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.3)' }}
                >
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-sm">Mengirim absensi...</p>
                <p className="text-white/40 text-xs mt-1">Login → Spoof Lokasi → Submit Foto</p>
              </div>
              {/* Animated steps */}
              <div className="w-full space-y-2">
                {[
                  { label: 'Login ke SmartPKL', done: true },
                  { label: 'Mengatur koordinat lokasi', done: true },
                  { label: 'Mengirim foto & status', done: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        s.done ? 'bg-emerald-500/20' : 'bg-indigo-500/20'
                      }`}
                    >
                      {s.done ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                      )}
                    </div>
                    <span className={s.done ? 'text-white/40 line-through' : 'text-white/70'}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: isSuccess
                    ? 'linear-gradient(135deg, rgba(5,150,105,0.2), rgba(16,185,129,0.2))'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.2))',
                  border: `2px solid ${isSuccess ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                }}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-red-400" />
                )}
              </div>
              <div>
                <p className="text-white font-bold text-base">
                  {isSuccess ? 'Absensi Berhasil! 🎉' : 'Absensi Gagal'}
                </p>
                <p className={`text-sm mt-1.5 ${isSuccess ? 'text-emerald-300' : 'text-red-300'}`}>
                  {resultMessage}
                </p>
              </div>

              {isSuccess && (
                <div
                  className="w-full px-4 py-3 rounded-xl text-xs text-center text-emerald-300"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
                >
                  Data absensi telah tercatat di SmartPKL ✅
                </div>
              )}

              <div className="flex gap-3 w-full">
                {!isSuccess && (
                  <button
                    onClick={() => setStep('form')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                  >
                    Coba Lagi
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`py-2.5 rounded-xl text-sm font-bold text-white transition-all ${isSuccess ? 'w-full' : 'flex-1'}`}
                  style={{
                    background: isSuccess
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {isSuccess ? 'Selesai' : 'Tutup'}
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
