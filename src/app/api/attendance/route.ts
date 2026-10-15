import { NextResponse } from 'next/server';
import { getAttendance, saveAttendance } from '@/lib/storage';
import { AttendanceRecord } from '@/types';
import { syncSmartPKLAttendance } from '@/lib/smartpkl';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceSync = url.searchParams.get('sync') === '1';

    let records = getAttendance();

    // Auto-sync from SmartPKL if requested or if we have sparse/old data
    const todayStr = new Date().toISOString().split('T')[0];
    const hasTodayRecord = records.some((r) => r.tanggal === todayStr);
    if (forceSync || !hasTodayRecord || records.length < 10) {
      const syncResult = await syncSmartPKLAttendance();
      if (syncResult.success) {
        records = syncResult.data;
      }
    }

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const records = getAttendance();
    const tanggal = body.tanggal || new Date().toISOString().split('T')[0];
    const status = body.status || 'Hadir';
    const jamMasuk = body.jamMasuk || '07:45';
    const jamPulang = body.jamPulang || '16:30';
    const keterangan = body.keterangan || 'Hadir di tempat PKL';

    // Find if already exists
    const existingIndex = records.findIndex(r => r.tanggal === tanggal);
    
    let targetRecord: AttendanceRecord;
    if (existingIndex >= 0) {
      targetRecord = {
        ...records[existingIndex],
        status: body.status !== undefined ? body.status : records[existingIndex].status,
        jamMasuk: body.jamMasuk !== undefined ? body.jamMasuk : records[existingIndex].jamMasuk,
        jamPulang: body.jamPulang !== undefined ? body.jamPulang : (records[existingIndex].jamPulang || ''),
        keterangan: body.keterangan !== undefined ? body.keterangan : records[existingIndex].keterangan,
      };
      records[existingIndex] = targetRecord;
    } else {
      targetRecord = {
        tanggal,
        status: body.status || 'Hadir',
        jamMasuk: body.jamMasuk || '07:45',
        jamPulang: body.jamPulang || '',
        keterangan: body.keterangan || 'Presensi PKL Hari Ini',
        createdAt: new Date().toISOString()
      };
      records.push(targetRecord);
    }
    saveAttendance(records);

    return NextResponse.json({
      success: true,
      message: `Presensi tanggal ${tanggal} berhasil disimpan!`,
      data: targetRecord
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
