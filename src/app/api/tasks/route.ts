import { NextResponse } from 'next/server';
import { getTasks, saveTasks, getSettings } from '@/lib/storage';
import { appendTaskToSpreadsheet } from '@/lib/googleSheets';
import { getHariFromDate, getCurrentTimeString } from '@/lib/dateUtils';
import { Task } from '@/types';

export async function GET() {
  try {
    const tasks = getTasks();
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tasks = getTasks();
    const settings = getSettings();

    const nextNo = tasks.length > 0 ? Math.max(...tasks.map(t => t.no || 0)) + 1 : 1;
    const tanggal = body.tanggal || new Date().toISOString().split('T')[0];
    const hari = body.hari || getHariFromDate(tanggal);

    const newTask: Task = {
      id: Date.now().toString(),
      no: nextNo,
      tanggal,
      hari,
      waktu: body.waktu || getCurrentTimeString(),
      tugas: body.tugas || '',
      user: body.user || 'Staf IT',
      tempat: body.tempat || settings.profile.defaultTempat || 'Ruang IT / Server',
      kendala: body.kendala || '-',
      tindakan: body.tindakan || '-',
      status: body.status || 'Selesai',
      catatan: body.catatan || '',
      isSyncedToSheet: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let syncMessage = '';
    // Auto-sync to Google Sheets if configured
    if (settings.google.isConfigured) {
      try {
        await appendTaskToSpreadsheet(newTask, settings.google);
        newTask.isSyncedToSheet = true;
        syncMessage = 'Tugas berhasil disimpan dan otomatis disinkronkan ke Google Spreadsheet!';
      } catch (syncError: any) {
        console.error('Auto sync to Google Sheets failed:', syncError);
        syncMessage = `Tugas disimpan di aplikasi, namun sinkronisasi Google Sheets gagal: ${syncError.message}`;
      }
    } else {
      syncMessage = 'Tugas berhasil disimpan lokal (Google Sheets belum dikonfigurasi).';
    }

    tasks.push(newTask);
    saveTasks(tasks);

    return NextResponse.json({
      success: true,
      data: newTask,
      message: syncMessage,
      isSyncedToSheet: newTask.isSyncedToSheet,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
