import { NextResponse } from 'next/server';
import { getAttendance, saveAttendance } from '@/lib/storage';
import { AttendanceRecord } from '@/types';
import { syncSmartPKLAttendance } from '@/lib/smartpkl';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceSync = url.searchParams.get('sync') === '1';

    let records: AttendanceRecord[] = [];
    try {
      records = getAttendance();
    } catch (e) {
      console.warn('[attendance] getAttendance failed, using empty:', e);
      records = [];
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const hasTodayRecord = records.some((r) => r.tanggal === todayStr);

    // Hanya auto-sync jika diminta ATAU data masih sedikit — tapi jangan gagalkan request jika sync error
    if (forceSync || !hasTodayRecord || records.length < 10) {
      try {
        const syncResult = await syncSmartPKLAttendance();
        if (syncResult.success && syncResult.data) {
          records = syncResult.data;
        }
      } catch (syncErr) {
        console.warn('[attendance] SmartPKL sync failed (non-fatal):', syncErr);
        // Tetap lanjutkan dengan data lokal
      }
    }

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('[attendance GET] Error:', error);
    // Jangan gagalkan total — kembalikan array kosong
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tanggal = body.tanggal || new Date().toISOString().split('T')[0];
    const status = body.status || 'Hadir';
    const jamMasuk = body.jamMasuk || '';
    const jamPulang = body.jamPulang || '';
    const keterangan = body.keterangan || 'Presensi PKL Hari Ini';
    const selfieClockOut = body.selfieClockOut || false;

    let records: AttendanceRecord[] = [];
    try {
      records = getAttendance();
    } catch (e) {
      console.warn('[attendance] getAttendance failed on POST, starting fresh:', e);
      records = [];
    }

    const existingIndex = records.findIndex((r) => r.tanggal === tanggal);

    let targetRecord: AttendanceRecord;
    if (existingIndex >= 0) {
      // Update: hanya ubah field yang dikirim
      targetRecord = {
        ...records[existingIndex],
        status: body.status !== undefined ? body.status : records[existingIndex].status,
        jamMasuk: body.jamMasuk !== undefined ? body.jamMasuk : records[existingIndex].jamMasuk,
        jamPulang: body.jamPulang !== undefined ? body.jamPulang : (records[existingIndex].jamPulang || ''),
        keterangan: body.keterangan !== undefined ? body.keterangan : records[existingIndex].keterangan,
        ...(selfieClockOut ? { selfieClockOut: true } : {}),
        updatedAt: new Date().toISOString(),
      };
      records[existingIndex] = targetRecord;
    } else {
      targetRecord = {
        tanggal,
        status,
        jamMasuk,
        jamPulang,
        keterangan,
        ...(selfieClockOut ? { selfieClockOut: true } : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      records.push(targetRecord);
    }

    // Simpan — jika gagal (misal Vercel read-only mount), tetap return success
    try {
      saveAttendance(records);
    } catch (saveErr) {
      console.error('[attendance] saveAttendance failed:', saveErr);
      // Return success tetap karena data sudah ada di memory
      // Client juga menyimpan ke localStorage sebagai backup
      return NextResponse.json({
        success: true,
        message: `Presensi ${tanggal} dicatat (storage terbatas).`,
        data: targetRecord,
        warning: 'Penyimpanan server terbatas, data tersimpan lokal di browser.'
      });
    }

    return NextResponse.json({
      success: true,
      message: `Presensi tanggal ${tanggal} berhasil disimpan!`,
      data: targetRecord
    });
  } catch (error: any) {
    console.error('[attendance POST] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan presensi.' },
      { status: 500 }
    );
  }
}

