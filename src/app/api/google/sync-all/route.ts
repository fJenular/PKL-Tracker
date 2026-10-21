import { NextResponse } from 'next/server';
import { getTasks, saveTasks, getSettings } from '@/lib/storage';
import { syncAllTasksToSpreadsheet } from '@/lib/googleSheets';

export async function POST() {
  try {
    const settings = getSettings();

    if (!settings.google.isConfigured && !settings.google.webAppUrl) {
      return NextResponse.json({
        success: false,
        message: 'Google Sheets belum dikonfigurasi. Periksa Pengaturan terlebih dahulu.'
      }, { status: 400 });
    }

    const tasks = getTasks();
    if (tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada tugas untuk disinkronkan.',
        syncedCount: 0
      });
    }

    // Ensure sequential numbers
    tasks.forEach((t, idx) => {
      t.no = idx + 1;
      t.isSyncedToSheet = true;
    });

    await syncAllTasksToSpreadsheet(tasks, settings.google);
    saveTasks(tasks);

    return NextResponse.json({
      success: true,
      message: `Seluruh ${tasks.length} data tugas berhasil disinkronkan rapi ke Google Spreadsheet!`,
      syncedCount: tasks.length,
      data: tasks
    });
  } catch (error: any) {
    console.error('Error syncing all to Google Sheets:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Gagal menyinkronkan seluruh data ke Google Spreadsheet.'
    }, { status: 500 });
  }
}
