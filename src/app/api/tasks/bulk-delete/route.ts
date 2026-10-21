import { NextResponse } from 'next/server';
import { getTasks, saveTasks, getSettings, addDeletedTaskSignature } from '@/lib/storage';
import { syncAllTasksToSpreadsheet } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada tugas yang dipilih untuk dihapus.' }, { status: 400 });
    }

    let tasks = getTasks();
    const settings = getSettings();
    const idSet = new Set(ids);

    const deletedTasks = tasks.filter(t => idSet.has(t.id));
    if (deletedTasks.length === 0) {
      return NextResponse.json({ success: false, message: 'Tugas yang dipilih tidak ditemukan.' }, { status: 404 });
    }

    // 1. Add deleted signatures so pull won't resurrect them
    const deletedSignatures: string[] = [];
    deletedTasks.forEach(t => {
      deletedSignatures.push(t.id);
      const d = (t.tanggal || '').trim();
      const w = (t.waktu || '').trim();
      const tg = (t.tugas || '').trim().toLowerCase();
      const u = (t.user || '').trim().toLowerCase();
      deletedSignatures.push(`${d}__${w}__${tg}__${u}`);
    });
    addDeletedTaskSignature(deletedSignatures);

    // 2. Remove locally and renumber
    tasks = tasks.filter(t => !idSet.has(t.id));
    tasks = tasks.map((t, idx) => ({ ...t, no: idx + 1 }));
    saveTasks(tasks);

    // 3. Trigger spreadsheet syncAll in background to cleanly remove them from sheet
    if (settings.google.isConfigured || settings.google.webAppUrl) {
      syncAllTasksToSpreadsheet(tasks, settings.google).catch(err => {
        console.warn('Background syncAll after bulk delete error:', err.message);
      });
    }

    return NextResponse.json({
      success: true,
      message: `${deletedTasks.length} tugas berhasil dihapus!`,
      data: tasks,
      deletedCount: deletedTasks.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
