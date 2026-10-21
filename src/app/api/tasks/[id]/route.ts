import { NextResponse } from 'next/server';
import { getTasks, saveTasks, getSettings, addDeletedTaskSignature } from '@/lib/storage';
import { getHariFromDate } from '@/lib/dateUtils';
import { updateTaskInSpreadsheet, deleteTaskFromSpreadsheet } from '@/lib/googleSheets';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const tasks = getTasks();
    const settings = getSettings();

    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return NextResponse.json({ success: false, message: 'Tugas tidak ditemukan' }, { status: 404 });
    }

    const current = tasks[taskIndex];
    const tanggal = body.tanggal || current.tanggal;
    const hari = body.hari || getHariFromDate(tanggal);

    const updatedTask = {
      ...current,
      ...body,
      id: current.id,
      no: current.no,
      tanggal,
      hari,
      updatedAt: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;
    saveTasks(tasks);

    // Sync update to Google Sheets in background
    if (settings.google.isConfigured || settings.google.webAppUrl) {
      updateTaskInSpreadsheet(updatedTask, settings.google).catch(syncErr => {
        console.warn('Failed to update task in spreadsheet:', syncErr.message);
      });
    }

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let tasks = getTasks();
    const settings = getSettings();

    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) {
      return NextResponse.json({ success: false, message: 'Tugas tidak ditemukan' }, { status: 404 });
    }

    // 1. Remove from local list & renumber immediately
    tasks = tasks.filter(t => t.id !== id);
    tasks = tasks.map((t, idx) => ({ ...t, no: idx + 1 }));
    saveTasks(tasks);

    // 2. Add signature to deleted tasks blacklist so pull won't re-import it
    const d = (targetTask.tanggal || '').trim();
    const w = (targetTask.waktu || '').trim();
    const tg = (targetTask.tugas || '').trim().toLowerCase();
    const u = (targetTask.user || '').trim().toLowerCase();
    const sig = `${d}__${w}__${tg}__${u}`;
    addDeletedTaskSignature([id, sig]);

    // 3. Fire delete to Google Sheets in background
    if (settings.google.isConfigured || settings.google.webAppUrl) {
      deleteTaskFromSpreadsheet(id, targetTask, settings.google).catch(syncErr => {
        console.warn('Failed to delete task from spreadsheet in background:', syncErr.message);
      });
    }

    return NextResponse.json({ success: true, message: 'Tugas berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
