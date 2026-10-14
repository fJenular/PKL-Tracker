import { google } from 'googleapis';
import { Task, GoogleSettings } from '@/types';
import { formatDateToSpreadsheet, getBulanFromDate } from '@/lib/dateUtils';

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

  return [no, tanggal, hari, waktu, tugas, user, kendala, tindakan, status, catatan];
}

export async function appendTaskToSpreadsheet(task: Task, settings: GoogleSettings) {
  const targetSheet = getBulanFromDate(task.tanggal) || settings.sheetName || 'Oktober';

  // If Apps Script Web App is used (Bypass GCP Org Policy)
  if (settings.syncMethod === 'apps_script' || (settings.webAppUrl && !settings.serviceAccountEmail)) {
    if (!settings.webAppUrl) {
      throw new Error('URL Google Apps Script Web App belum diisi di Pengaturan.');
    }

    const payload = {
      sheetName: targetSheet,
      bulan: targetSheet,
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

    const resJson = await res.json().catch(() => ({ success: true }));
    return resJson;
  }

  // Otherwise, use GCP Service Account
  const sheets = getSheetsClient(settings);
  const rowData = formatTaskForSheetRow(task);
  const range = `'${targetSheet}'!A:J`;

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

export async function appendMultipleTasks(tasks: Task[], settings: GoogleSettings) {
  if (tasks.length === 0) return { updatedRows: 0 };

  // If Apps Script Web App is used
  if (settings.syncMethod === 'apps_script' || (settings.webAppUrl && !settings.serviceAccountEmail)) {
    if (!settings.webAppUrl) {
      throw new Error('URL Google Apps Script Web App belum diisi di Pengaturan.');
    }

    const payload = tasks.map(t => ({
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

  // Otherwise, use GCP Service Account: group by month sheet
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
    const range = `'${monthName}'!A:J`;

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
  // If testing Apps Script Web App
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

  // Otherwise, test GCP Service Account
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
