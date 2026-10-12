import { NextResponse } from 'next/server';
import { getTasks, saveTasks, getSettings } from '@/lib/storage';
import { appendMultipleTasks } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = getSettings();

    if (!settings.google.isConfigured) {
      return NextResponse.json({
        success: false,
        message: 'Google Sheets belum dikonfigurasi. Silakan lengkapi pengaturan Service Account terlebih dahulu.'
      }, { status: 400 });
    }

    const tasks = getTasks();
    let tasksToSync = [];

    if (body.taskIds && Array.isArray(body.taskIds) && body.taskIds.length > 0) {
      tasksToSync = tasks.filter(t => body.taskIds.includes(t.id));
    } else {
      // Sync all unsynced
      tasksToSync = tasks.filter(t => !t.isSyncedToSheet);
    }

    if (tasksToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Semua tugas sudah tersinkronkan ke Spreadsheet!',
        syncedCount: 0,
      });
    }

    await appendMultipleTasks(tasksToSync, settings.google);

    // Update tasks status
    const syncedIds = new Set(tasksToSync.map(t => t.id));
    const updatedTasks = tasks.map(t => {
      if (syncedIds.has(t.id)) {
        return { ...t, isSyncedToSheet: true };
      }
      return t;
    });

    saveTasks(updatedTasks);

    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan ${tasksToSync.length} baris tugas ke Google Spreadsheet!`,
      syncedCount: tasksToSync.length,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
