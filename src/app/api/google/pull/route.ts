import { NextResponse } from 'next/server';
import { getTasks, saveTasks, getSettings } from '@/lib/storage';
import { pullTasksFromSpreadsheet, mergeTasksWithSheet } from '@/lib/googleSheets';

export async function POST() {
  try {
    const settings = getSettings();

    if (!settings.google.spreadsheetId && !settings.google.webAppUrl) {
      return NextResponse.json({
        success: false,
        message: 'Google Spreadsheet belum dikonfigurasi. Periksa Pengaturan.'
      }, { status: 400 });
    }

    const localTasks = getTasks();
    const sheetTasks = await pullTasksFromSpreadsheet(settings.google);

    if (sheetTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada baris tugas yang ditemukan di Spreadsheet.',
        data: localTasks,
        addedCount: 0,
        updatedCount: 0,
        totalCount: localTasks.length
      });
    }

    const { merged, addedCount, updatedCount } = mergeTasksWithSheet(localTasks, sheetTasks);
    saveTasks(merged);

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi berhasil! ${addedCount} tugas baru diimpor, ${updatedCount} tugas diperbarui. Total: ${merged.length} tugas.`,
      data: merged,
      addedCount,
      updatedCount,
      totalCount: merged.length
    });
  } catch (error: any) {
    console.error('Error pulling from Google Sheets:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Gagal menarik data dari Google Spreadsheet.'
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
