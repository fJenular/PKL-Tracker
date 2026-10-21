import { google } from 'googleapis';
import { Task, GoogleSettings } from '@/types';
import { formatDateToSpreadsheet, getBulanFromDate, getHariFromDate } from '@/lib/dateUtils';
import { getDeletedTaskSignatures } from '@/lib/storage';

function getSheetsClient(settings: GoogleSettings) {
  if (!settings.serviceAccountEmail || !settings.privateKey) {
    throw new Error('Kredensial Service Account belum lengkap (Email atau Private Key kosong).');
  }

  const formattedKey = settings.privateKey
    .replace(/\\n/g, '\n')
    .replace(/^["']|["']$/g, '');

  const auth = new google.auth.JWT({
    email: settings.serviceAccountEmail,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export function formatTaskForSheetRow(task: Task, rowNumber?: number): (string | number)[] {
  const no = task.no || rowNumber || 1;
  const tanggal = formatDateToSpreadsheet(task.tanggal);
  const hari = task.hari || '';
  const waktu = task.waktu || '';
  const tugas = task.tugas || '';
  const user = task.user || '';
  const kendala = task.kendala || '-';
  const tindakan = task.tindakan || '-';
  const status = task.status || 'Selesai';
  
  let catatan = task.catatan || '';
  if (task.tempat) {
    catatan = catatan ? `[Tempat: ${task.tempat}] ${catatan}` : `[Tempat: ${task.tempat}]`;
  }

  return [no, tanggal, hari, waktu, tugas, user, kendala, tindakan, status, catatan, task.id || ''];
}

export function parseGVizResponse(txt: string): Task[] {
  const match = txt.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
  if (!match) throw new Error('Format respon Google Spreadsheet tidak valid.');
  const data = JSON.parse(match[1]);
  if (data.status !== 'ok') {
    throw new Error('Google Spreadsheet mengembalikan status: ' + data.status);
  }

  const rows = data.table?.rows || [];
  const tasks: Task[] = [];

  rows.forEach((r: any, idx: number) => {
    if (!r.c) return;
    const vals = r.c.map((cell: any) => cell ? (cell.f || cell.v || '') : '');
    
    const rawTanggal = String(vals[1] || '').trim();
    const rawTugas = String(vals[4] || '').trim();
    if (!rawTanggal && !rawTugas) return;

    let tanggal = rawTanggal;
    if (tanggal.includes('/')) {
      const parts = tanggal.split('/');
      if (parts.length === 3) {
        tanggal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else if (tanggal.startsWith('Date(')) {
      const m = tanggal.match(/Date\((\d+),(\d+),(\d+)\)/);
      if (m) {
        const y = m[1];
        const month = String(Number(m[2]) + 1).padStart(2, '0');
        const d = String(m[3]).padStart(2, '0');
        tanggal = `${y}-${month}-${d}`;
      }
    }

    let waktu = String(vals[3] || '').trim();
    if (waktu.includes(':') && waktu.split(':').length === 3) {
      const wParts = waktu.split(':');
      waktu = `${wParts[0].padStart(2, '0')}:${wParts[1].padStart(2, '0')}`;
    }

    let catatan = String(vals[9] || '').trim();
    let tempat = 'Ruang IT / Server';
    const tempatMatch = catatan.match(/\[Tempat:\s*([^\]]+)\]/);
    if (tempatMatch) {
      tempat = tempatMatch[1].trim();
      catatan = catatan.replace(/\[Tempat:\s*[^\]]+\]\s*/, '').trim();
    }

    const id = String(vals[10] || '').trim();

    tasks.push({
      id: id || `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      no: idx + 1,
      tanggal,
      hari: String(vals[2] || '').trim() || getHariFromDate(tanggal),
      waktu,
      tugas: rawTugas,
      user: String(vals[5] || 'Staf IT').trim(),
      tempat,
      kendala: String(vals[6] || '-').trim(),
      tindakan: String(vals[7] || '-').trim(),
      status: (String(vals[8] || 'Selesai').trim()) as any || 'Selesai',
      catatan,
      isSyncedToSheet: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  return tasks;
}

export async function pullTasksFromSpreadsheet(settings: GoogleSettings): Promise<Task[]> {
  // Method 1: If Apps Script Web App returns tasks via GET
  if (settings.syncMethod === 'apps_script' && settings.webAppUrl) {
    try {
      const res = await fetch(settings.webAppUrl, {
        method: 'GET',
        redirect: 'follow',
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.tasks) && data.tasks.length > 0) {
          return data.tasks.map((t: any, idx: number) => ({
            ...t,
            no: t.no || idx + 1,
            isSyncedToSheet: true,
          }));
        }
      }
    } catch (e) {
      console.warn('Apps Script GET fallback to GViz endpoint:', e);
    }
  }

  // Method 2: GViz endpoint (reliable direct query from Google Sheets)
  if (settings.spreadsheetId) {
    const sheetParam = settings.sheetName ? `&sheet=${encodeURIComponent(settings.sheetName)}` : '';
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/gviz/tq?tqx=out:json${sheetParam}`;
    const res = await fetch(gvizUrl, { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(`Gagal membaca Google Spreadsheet via GViz (${res.status}). Pastikan Spreadsheet dapat diakses.`);
    }
    const txt = await res.text();
    return parseGVizResponse(txt);
  }

  // Method 3: GCP Service Account
  if (settings.serviceAccountEmail && settings.privateKey) {
    const sheets = getSheetsClient(settings);
    const range = `${settings.sheetName || 'Sheet1'}!A2:K`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: settings.spreadsheetId,
      range,
    });
    const rows = res.data.values || [];
    return rows.map((r, idx) => {
      let catatan = String(r[9] || '');
      let tempat = 'Ruang IT / Server';
      const tempatMatch = catatan.match(/\[Tempat:\s*([^\]]+)\]/);
      if (tempatMatch) {
        tempat = tempatMatch[1].trim();
        catatan = catatan.replace(/\[Tempat:\s*[^\]]+\]\s*/, '').trim();
      }
      return {
        id: String(r[10] || `${Date.now()}-${idx}`),
        no: Number(r[0]) || idx + 1,
        tanggal: String(r[1] || ''),
        hari: String(r[2] || ''),
        waktu: String(r[3] || ''),
        tugas: String(r[4] || ''),
        user: String(r[5] || 'Staf IT'),
        tempat,
        kendala: String(r[6] || '-'),
        tindakan: String(r[7] || '-'),
        status: (String(r[8] || 'Selesai') as any),
        catatan,
        isSyncedToSheet: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  throw new Error('Konfigurasi Google Spreadsheet belum lengkap.');
}

export function mergeTasksWithSheet(localTasks: Task[], sheetTasks: Task[]): {
  merged: Task[];
  addedCount: number;
  updatedCount: number;
} {
  const getSignature = (t: Task) => {
    const d = (t.tanggal || '').trim();
    const w = (t.waktu || '').trim();
    const tg = (t.tugas || '').trim().toLowerCase();
    const u = (t.user || '').trim().toLowerCase();
    return `${d}__${w}__${tg}__${u}`;
  };

  const localById = new Map<string, Task>();
  const localBySig = new Map<string, Task>();

  for (const lt of localTasks) {
    if (lt.id) localById.set(lt.id, lt);
    localBySig.set(getSignature(lt), lt);
  }

  let addedCount = 0;
  let updatedCount = 0;
  const mergedList: Task[] = [];
  const processedLocalIds = new Set<string>();
  const deletedSigs = new Set(getDeletedTaskSignatures());

  for (const st of sheetTasks) {
    const sig = getSignature(st);
    // If user has explicitly deleted this task, skip and do not re-import
    if ((st.id && deletedSigs.has(st.id)) || deletedSigs.has(sig)) {
      continue;
    }

    let match: Task | undefined;
    if (st.id && localById.has(st.id)) {
      match = localById.get(st.id);
    } else {
      if (localBySig.has(sig)) {
        match = localBySig.get(sig);
      }
    }

    if (match) {
      processedLocalIds.add(match.id);
      mergedList.push({
        ...match,
        ...st,
        id: match.id,
        isSyncedToSheet: true,
        updatedAt: new Date().toISOString(),
      });
      updatedCount++;
    } else {
      const newId = st.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      mergedList.push({
        ...st,
        id: newId,
        isSyncedToSheet: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      addedCount++;
    }
  }

  for (const lt of localTasks) {
    if (!processedLocalIds.has(lt.id)) {
      const alreadyInMerged = mergedList.some(
        m => m.id === lt.id || getSignature(m) === getSignature(lt)
      );
      if (!alreadyInMerged) {
        mergedList.push(lt);
      }
    }
  }

  // Deduplicate exact duplicate signatures if present
  const seenSigs = new Set<string>();
  const deduplicatedList: Task[] = [];
  for (const t of mergedList) {
    const sig = getSignature(t);
    if (!seenSigs.has(sig)) {
      seenSigs.add(sig);
      deduplicatedList.push(t);
    }
  }

  // Sort chronologically ascending
  deduplicatedList.sort((a, b) => {
    const cmp = (a.tanggal || '').localeCompare(b.tanggal || '');
    if (cmp !== 0) return cmp;
    return (a.waktu || '').localeCompare(b.waktu || '');
  });

  // Assign neat sequential numbering 1..N
  deduplicatedList.forEach((t, idx) => {
    t.no = idx + 1;
  });

  return {
    merged: deduplicatedList,
    addedCount,
    updatedCount,
  };
}

export async function syncAllTasksToSpreadsheet(tasks: Task[], settings: GoogleSettings) {
  // If Apps Script Web App is used
  if (settings.syncMethod === 'apps_script' || (settings.webAppUrl && !settings.serviceAccountEmail)) {
    if (!settings.webAppUrl) {
      throw new Error('URL Google Apps Script Web App belum diisi di Pengaturan.');
    }

    const payload = {
      action: 'syncAll',
      tasks: tasks.map((t, idx) => ({
        id: t.id,
        no: idx + 1,
        tanggal: t.tanggal,
        tanggalFormatted: formatDateToSpreadsheet(t.tanggal),
        hari: t.hari,
        waktu: t.waktu,
        tugas: t.tugas,
        user: t.user,
        tempat: t.tempat,
        kendala: t.kendala,
        tindakan: t.tindakan,
        status: t.status,
        catatan: t.catatan,
      })),
    };

    const res = await fetch(settings.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google Apps Script gagal merespons (${res.status}): ${errText}`);
    }

    return await res.json().catch(() => ({ success: true, count: tasks.length }));
  }

  // Otherwise GCP Service Account
  const sheets = getSheetsClient(settings);
  const targetSheet = settings.sheetName || 'Sheet1';
  const rows = tasks.map((t, idx) => formatTaskForSheetRow(t, idx + 1));

  // Clear existing rows
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: settings.spreadsheetId,
      range: `'${targetSheet}'!A2:K`,
    });
  } catch (clearErr) {
    console.warn('Clear range warning:', clearErr);
  }

  // Write all rows
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: settings.spreadsheetId,
    range: `'${targetSheet}'!A2:K`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  return res.data;
}

export async function appendTaskToSpreadsheet(task: Task, settings: GoogleSettings) {
  const targetSheet = getBulanFromDate(task.tanggal) || settings.sheetName || 'Oktober';

  // If Apps Script Web App is used
  if (settings.syncMethod === 'apps_script' || (settings.webAppUrl && !settings.serviceAccountEmail)) {
    if (!settings.webAppUrl) {
      throw new Error('URL Google Apps Script Web App belum diisi di Pengaturan.');
    }

    const payload = {
      action: 'append',
      sheetName: targetSheet,
      bulan: targetSheet,
      id: task.id,
      no: task.no,
      tanggal: task.tanggal,
      tanggalFormatted: formatDateToSpreadsheet(task.tanggal),
      hari: task.hari,
      waktu: task.waktu,
      tugas: task.tugas,
      user: task.user,
      tempat: task.tempat,
      kendala: task.kendala,
      tindakan: task.tindakan,
      status: task.status,
      catatan: task.catatan,
    };

    const res = await fetch(settings.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google Apps Script gagal merespons (${res.status}): ${errText}`);
    }

    return await res.json().catch(() => ({ success: true }));
  }

  // GCP Service Account
  const sheets = getSheetsClient(settings);
  const rowData = formatTaskForSheetRow(task);
  const range = `'${targetSheet}'!A:K`;

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: settings.spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [rowData],
    },
  });

  return response.data;
}

export async function updateTaskInSpreadsheet(task: Task, settings: GoogleSettings) {
  if (settings.syncMethod === 'apps_script' || (settings.webAppUrl && !settings.serviceAccountEmail)) {
    if (!settings.webAppUrl) return;

    const payload = {
      action: 'update',
      task: {
        id: task.id,
        no: task.no,
        tanggal: task.tanggal,
        tanggalFormatted: formatDateToSpreadsheet(task.tanggal),
        hari: task.hari,
        waktu: task.waktu,
        tugas: task.tugas,
        user: task.user,
        tempat: task.tempat,
        kendala: task.kendala,
        tindakan: task.tindakan,
        status: task.status,
        catatan: task.catatan,
      },
    };

    const res = await fetch(settings.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Update ke Google Apps Script gagal (${res.status}): ${errText}`);
    }

    return await res.json().catch(() => ({ success: true }));
  }
}

export async function deleteTaskFromSpreadsheet(taskId: string, taskInfo: Partial<Task>, settings: GoogleSettings) {
  if (settings.syncMethod === 'apps_script' || (settings.webAppUrl && !settings.serviceAccountEmail)) {
    if (!settings.webAppUrl) return;

    const payload = {
      action: 'delete',
      taskId,
      tanggal: taskInfo.tanggal,
      tanggalFormatted: taskInfo.tanggal ? formatDateToSpreadsheet(taskInfo.tanggal) : undefined,
      tugas: taskInfo.tugas,
    };

    const res = await fetch(settings.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Delete dari Google Apps Script gagal (${res.status}): ${errText}`);
    }

    return await res.json().catch(() => ({ success: true }));
  }
}

export async function appendMultipleTasks(tasks: Task[], settings: GoogleSettings) {
  if (tasks.length === 0) return { updatedRows: 0 };

  if (settings.syncMethod === 'apps_script' || (settings.webAppUrl && !settings.serviceAccountEmail)) {
    if (!settings.webAppUrl) {
      throw new Error('URL Google Apps Script Web App belum diisi di Pengaturan.');
    }

    const payload = tasks.map(t => ({
      id: t.id,
      sheetName: getBulanFromDate(t.tanggal) || 'Oktober',
      bulan: getBulanFromDate(t.tanggal) || 'Oktober',
      no: t.no,
      tanggal: t.tanggal,
      tanggalFormatted: formatDateToSpreadsheet(t.tanggal),
      hari: t.hari,
      waktu: t.waktu,
      tugas: t.tugas,
      user: t.user,
      tempat: t.tempat,
      kendala: t.kendala,
      tindakan: t.tindakan,
      status: t.status,
      catatan: t.catatan,
    }));

    const res = await fetch(settings.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google Apps Script gagal merespons (${res.status}): ${errText}`);
    }

    return await res.json().catch(() => ({ success: true, count: tasks.length }));
  }

  // GCP Service Account
  const sheets = getSheetsClient(settings);
  const tasksByMonth = new Map<string, Task[]>();
  for (const t of tasks) {
    const m = getBulanFromDate(t.tanggal) || 'Oktober';
    if (!tasksByMonth.has(m)) tasksByMonth.set(m, []);
    tasksByMonth.get(m)!.push(t);
  }

  let totalUpdated = 0;
  for (const [monthName, monthTasks] of tasksByMonth.entries()) {
    const rows = monthTasks.map((t, idx) => formatTaskForSheetRow(t, t.no || idx + 1));
    const range = `'${monthName}'!A:K`;

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: settings.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });
    totalUpdated += res.data.updates?.updatedRows || monthTasks.length;
  }

  return { updatedRows: totalUpdated };
}

export async function testGoogleSheetsConnection(settings: GoogleSettings) {
  if (settings.syncMethod === 'apps_script' || (settings.webAppUrl && !settings.serviceAccountEmail)) {
    if (!settings.webAppUrl) {
      throw new Error('URL Google Apps Script Web App belum diisi.');
    }

    const res = await fetch(settings.webAppUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Gagal menghubungi Web App (${res.status}). Pastikan opsi 'Who has access' diset ke 'Anyone'.`);
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      title: 'Google Spreadsheet via Apps Script Web App',
      availableSheets: ['Sheet1'],
      message: data.message || 'Web App aktif dan terhubung!',
    };
  }

  const sheets = getSheetsClient(settings);
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: settings.spreadsheetId,
  });

  const sheetTitle = metadata.data.properties?.title || 'Spreadsheet';
  const sheetNames = metadata.data.sheets?.map(s => s.properties?.title || '') || [];

  return {
    success: true,
    title: sheetTitle,
    availableSheets: sheetNames,
  };
}
