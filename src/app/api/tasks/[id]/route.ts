import { NextResponse } from 'next/server';
import { getTasks, saveTasks } from '@/lib/storage';
import { getHariFromDate } from '@/lib/dateUtils';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const tasks = getTasks();

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

    const exists = tasks.some(t => t.id === id);
    if (!exists) {
      return NextResponse.json({ success: false, message: 'Tugas tidak ditemukan' }, { status: 404 });
    }

    tasks = tasks.filter(t => t.id !== id);
    // Renumber remaining tasks to keep sequence tidy
    tasks = tasks.map((t, idx) => ({ ...t, no: idx + 1 }));
    saveTasks(tasks);

    return NextResponse.json({ success: true, message: 'Tugas berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
