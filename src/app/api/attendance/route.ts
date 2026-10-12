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

    // If user marked as Hadir, ensure there is an 'Absensi' task for today
    if (status === 'Hadir') {
      const tasks = getTasks();
      const hasAbsenTask = tasks.some(
        t => t.tanggal === tanggal && t.tugas.toLowerCase().includes('absensi')
      );

      if (!hasAbsenTask) {
        const settings = getSettings();
        const nextNo = tasks.length > 0 ? Math.max(...tasks.map(t => t.no || 0)) + 1 : 1;
        const absenTask: Task = {
          id: Date.now().toString(),
          no: nextNo,
          tanggal,
          hari: getHariFromDate(tanggal),
          waktu: `${jamMasuk} - 08:00`,
          tugas: `Absensi kehadiran harian dan briefing pagi PKL`,
          user: 'Staf IT',
          tempat: settings.profile.defaultTempat || 'Ruang IT / Server',
          kendala: '-',
          tindakan: 'Absensi tepat waktu',
          status: 'Selesai',
          catatan: `Hadir pukul ${jamMasuk}`,
          isSyncedToSheet: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (settings.google.isConfigured) {
          try {
            await appendTaskToSpreadsheet(absenTask, settings.google);
            absenTask.isSyncedToSheet = true;
          } catch (e) {
            console.error('Failed to sync attendance task to sheet:', e);
          }
        }

        tasks.push(absenTask);
        saveTasks(tasks);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Presensi tanggal ${tanggal} berhasil dicatat!`,
      data: newRecord
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
