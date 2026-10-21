'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Clock,
} from 'lucide-react';

interface ClockOutSelfieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (jamPulang: string) => void;
  todayDate: string;         // format: YYYY-MM-DD
  jamMasuk?: string;         // misal '07:45'
  status?: string;           // misal 'Hadir'
  keterangan?: string;
}

type StepState = 'confirm' | 'camera' | 'preview' | 'submitting' | 'done' | 'error';

export default function ClockOutSelfieModal({
  isOpen,
  onClose,
  onSuccess,
  todayDate,
  jamMasuk = '08:00',
  status = 'Hadir',
  keterangan = 'Presensi PKL Hari Ini',
}: ClockOutSelfieModalProps) {
  const [step, setStep] = useState<StepState>('confirm');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [resultMessage, setResultMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [jamPulang, setJamPulang] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Set jam pulang saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setJamPulang(`${h}:${m}`);
    }
  }, [isOpen]);

  // Reset state saat modal tutup
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep('confirm');
      setCapturedBlob(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
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
    setIsCameraLoading(false);
  }, []);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch((err) => console.warn('Auto-play error:', err));
    }
  }, []);

  useEffect(() => {
    if (step === 'camera' && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.play().catch((err) => console.warn('Video play error:', err));
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
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setStep('camera');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('Immediate play error:', err));
      }
    } catch (err: any) {
      let errMsg = 'Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.';
      } else if (err.name === 'NotFoundError') {
        errMsg = 'Tidak ada kamera yang ditemukan pada perangkat ini.';
      } else if (err.name === 'NotReadableError') {
        errMsg = 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut terlebih dahulu.';
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

    // Flip horizontal agar cocok dengan preview mirror
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
      0.85
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
      // Update jam pulang sesuai waktu sekarang saat tombol kirim ditekan
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const finalJamPulang = `${h}:${m}`;
      setJamPulang(finalJamPulang);

      // Simpan selfie ke IndexedDB / localStorage (base64) — opsional, tidak wajib
      // Utama: simpan record absensi pulang ke local API
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: todayDate,
          status: status,
          jamMasuk: jamMasuk,
          jamPulang: finalJamPulang,
          keterangan: keterangan,
          selfieClockOut: true, // flag bahwa clock-out pakai selfie
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Juga simpan ke localStorage sebagai backup (antisipasi Vercel /tmp reset)
        try {
          const stored = JSON.parse(localStorage.getItem('attendance_clockout') || '{}');
          stored[todayDate] = {
            jamPulang: finalJamPulang,
            status,
            jamMasuk,
            keterangan,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem('attendance_clockout', JSON.stringify(stored));
        } catch {
          // localStorage mungkin tidak tersedia
        }

        setIsSuccess(true);
        setResultMessage(`Absen pulang pukul ${finalJamPulang} WIB berhasil dicatat! Selamat istirahat 🎉`);
        setStep('done');
        onSuccess?.(finalJamPulang);
      } else {
        // Jika server gagal, coba simpan ke localStorage saja
        try {
          const stored = JSON.parse(localStorage.getItem('attendance_clockout') || '{}');
          stored[todayDate] = {
            jamPulang: finalJamPulang,
            status,
            jamMasuk,
            keterangan,
            savedAt: new Date().toISOString(),
            offlineOnly: true,
          };
          localStorage.setItem('attendance_clockout', JSON.stringify(stored));
          setIsSuccess(true);
          setResultMessage(`Absen pulang pukul ${finalJamPulang} WIB tersimpan secara lokal. (Server: ${data.message || 'tidak merespons'})`);
          setStep('done');
          onSuccess?.(finalJamPulang);
        } catch {
          throw new Error(data.message || 'Gagal menyimpan data absensi.');
        }
      }
    } catch (err: any) {
      setIsSuccess(false);
      setResultMessage(err.message || 'Terjadi kesalahan. Coba lagi.');
      setStep('done');
    }
  }, [capturedBlob, todayDate, status, jamMasuk, keterangan, onSuccess]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1c0a00 0%, #431407 40%, #1c0a00 100%)',
          border: '1px solid rgba(251,146,60,0.25)',
        }}
      >
        {/* Glow top accent */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-0.5 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #f97316, transparent)' }}
        />

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
              >
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base tracking-tight">Absen Pulang</h2>
                <p className="text-orange-300 text-xs font-medium">Selfie konfirmasi jam pulang PKL</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Jam pulang info */}
          <div
            className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)' }}
          >
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-orange-200">
              Jam Pulang:{' '}
              <span className="text-white font-bold">{jamPulang} WIB</span>
              {jamMasuk && (
                <span className="text-orange-400 ml-2">· Masuk: {jamMasuk} WIB</span>
              )}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-6" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Body */}
        <div className="px-6 py-5">

          {/* ── STEP: CONFIRM ── */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <p className="text-white/70 text-sm text-center leading-relaxed">
                Ambil selfie untuk mengkonfirmasi absen pulang hari ini.
                <br />
                <span className="text-orange-300 text-xs">Data disimpan secara lokal di aplikasi.</span>
              </p>

              {/* Camera error from previous attempt */}
              {cameraError && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-xs text-red-300"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                >
                  Batal
                </button>
                <button
                  onClick={startCamera}
                  className="flex-[2] py-3 rounded-2xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
                >
                  <Camera className="w-4 h-4" />
                  Ambil Selfie Pulang
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: CAMERA ── */}
          {step === 'camera' && (
            <div className="space-y-4">
              <p className="text-white/60 text-xs text-center">
                Posisikan wajah di dalam frame, lalu tekan tombol kamera
              </p>
              <div
                className="relative rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[260px]"
                style={{ border: '2px solid rgba(249,115,22,0.4)' }}
              >
                {isCameraLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs gap-2">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                    <span className="text-xs text-orange-200 font-medium">Menghubungkan kamera...</span>
                  </div>
                )}
                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    e.currentTarget.play().catch(console.warn);
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
                    style={{ border: '2px dashed rgba(249,115,22,0.5)', boxShadow: '0 0 15px rgba(249,115,22,0.2)' }}
                  />
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="flex gap-3">
                <button
                  onClick={() => { stopCamera(); setStep('confirm'); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                >
                  Batal
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
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
              <p className="text-white/60 text-xs text-center">Periksa selfie Anda sebelum dikonfirmasi</p>
              {previewUrl && (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '2px solid rgba(249,115,22,0.3)' }}
                >
                  <img
                    src={previewUrl}
                    alt="Selfie pulang"
                    className="w-full object-cover"
                    style={{ maxHeight: '280px', transform: 'scaleX(-1)' }}
                  />
                </div>
              )}

              {/* Summary */}
              <div
                className="px-4 py-3 rounded-xl text-xs space-y-1.5"
                style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}
              >
                <div className="flex justify-between text-white/60">
                  <span>Jam Pulang</span>
                  <span className="text-white font-semibold">{jamPulang} WIB</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Jam Masuk</span>
                  <span className="text-white font-semibold">{jamMasuk} WIB</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Status</span>
                  <span className="text-emerald-400 font-semibold">{status}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Penyimpanan</span>
                  <span className="text-orange-400 font-semibold">Lokal saja ✓</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ulang Foto
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Konfirmasi Pulang
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: SUBMITTING ── */}
          {step === 'submitting' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.15)', border: '2px solid rgba(249,115,22,0.3)' }}
              >
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-sm">Menyimpan absensi pulang...</p>
                <p className="text-white/40 text-xs mt-1">Data disimpan ke penyimpanan lokal aplikasi</p>
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
                {isSuccess
                  ? <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  : <AlertCircle className="w-10 h-10 text-red-400" />
                }
              </div>
              <div>
                <p className="text-white font-bold text-base">
                  {isSuccess ? 'Absen Pulang Berhasil! 🎉' : 'Gagal Menyimpan'}
                </p>
                <p className={`text-sm mt-1.5 leading-relaxed ${isSuccess ? 'text-emerald-300' : 'text-red-300'}`}>
                  {resultMessage}
                </p>
              </div>

              {isSuccess && (
                <div
                  className="w-full px-4 py-3 rounded-xl text-xs text-center text-orange-300"
                  style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}
                >
                  Data jam pulang tersimpan lokal di aplikasi ✅
                  <br />
                  <span className="text-white/40 text-[10px]">Tidak dikirim ke Spreadsheet</span>
                </div>
              )}

              <div className="flex gap-3 w-full">
                {!isSuccess && (
                  <button
                    onClick={() => setStep('confirm')}
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
                      ? 'linear-gradient(135deg, #ea580c, #f97316)'
                      : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {isSuccess ? 'Selesai' : 'Tutup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
