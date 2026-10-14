import { NextResponse } from 'next/server';
import { getAttendance, saveAttendance, getTasks, saveTasks, getSettings } from '@/lib/storage';
import { appendTaskToSpreadsheet } from '@/lib/googleSheets';
import { getHariFromDate } from '@/lib/dateUtils';
import { AttendanceRecord, Task } from '@/types';

export async function GET() {
  try {
    const records = getAttendance();
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
    const newRecord: AttendanceRecord = {
      tanggal,
      status,
      jamMasuk,
      jamPulang,
      keterangan,
      createdAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }
    saveAttendance(records);



    return NextResponse.json({
      success: true,
      message: `Presensi tanggal ${tanggal} berhasil dicatat!`,
      data: newRecord
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
