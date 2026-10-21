import fs from 'fs';
import path from 'path';
import os from 'os';
import { Task, AppSettings, AttendanceRecord } from '@/types';

// Bundled repo data folder (read-only in Vercel: /var/task/data)
const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');

// Detect if running on Vercel / AWS Lambda / Serverless
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

// Determine writable directory (/tmp on serverless, otherwise check bundled dir)
function getWritableDirectory(): string {
  if (isServerless) {
    return path.join(os.tmpdir(), 'pkl-data');
  }
  // For local development, check if BUNDLED_DATA_DIR is writable
  try {
    if (!fs.existsSync(BUNDLED_DATA_DIR)) {
      fs.mkdirSync(BUNDLED_DATA_DIR, { recursive: true });
    }
    const testFile = path.join(BUNDLED_DATA_DIR, '.write_test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return BUNDLED_DATA_DIR;
  } catch {
    return path.join(os.tmpdir(), 'pkl-data');
  }
}

const WRITABLE_DATA_DIR = getWritableDirectory();

function ensureWritableDir() {
  try {
    if (!fs.existsSync(WRITABLE_DATA_DIR)) {
      fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn(`[storage] Could not create directory ${WRITABLE_DATA_DIR}:`, err);
  }
}

function readDataFile<T>(filename: string, fallback: T): T {
  const writablePath = path.join(/* turbopackIgnore: true */ WRITABLE_DATA_DIR, filename);
  const bundledPath = path.join(BUNDLED_DATA_DIR, filename);

  // 1. Try reading from writable location first (has latest user edits)
  if (fs.existsSync(/* turbopackIgnore: true */ writablePath)) {
    try {
      const raw = fs.readFileSync(/* turbopackIgnore: true */ writablePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[storage] Error reading ${writablePath}:`, err);
    }
  }

  // 2. Try reading from bundled repo location (initial template data)
  if (fs.existsSync(bundledPath)) {
    try {
      const raw = fs.readFileSync(bundledPath, 'utf-8');
      const data = JSON.parse(raw);
      // Initialize writable store so subsequent writes don't lose initial data
      writeDataFile(filename, data);
      return data;
    } catch (err) {
      console.error(`[storage] Error reading bundled ${bundledPath}:`, err);
    }
  }

  // 3. Fallback to hardcoded default and persist to writable dir
  writeDataFile(filename, fallback);
  return fallback;
}

function writeDataFile<T>(filename: string, data: T): void {
  ensureWritableDir();
  const writablePath = path.join(/* turbopackIgnore: true */ WRITABLE_DATA_DIR, filename);
  try {
    fs.writeFileSync(writablePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[storage] Error writing to ${writablePath}:`, err);
  }

  // Also write to bundled data dir if local development and not serverless
  if (!isServerless && WRITABLE_DATA_DIR !== BUNDLED_DATA_DIR) {
    try {
      const bundledPath = path.join(BUNDLED_DATA_DIR, filename);
      fs.writeFileSync(bundledPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignored if bundled dir is read-only
    }
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    namaSiswa: 'Fakhri Zainul Arifin',
    nis: '2324009',
    sekolah: 'SMK TI BAZMA',
    tempatPkl: 'Yayasan Kesehatan Pertamina',
    bulanPelaksanaan: 'Oktober 2026',
    pembimbingPkl: 'Ristina Eka Salsabila',
    userDuDi: '(..................................)',
    pesertaPkl: 'Fakhri Zainul Arifin',
    defaultTempat: 'Ruang IT / Server'
  },
  google: {
    syncMethod: 'apps_script',
    webAppUrl: '',
    spreadsheetId: '15tFaxo-AJQNFBLAhUZEwjvEQYiY3twCzwl0vEFlIWnw',
    sheetName: 'Sheet1',
    serviceAccountEmail: '',
    privateKey: '',
    isConfigured: false
  },
  smartpkl: {
    username: '2324009',
    password: '123456',
    officeLatitude: -6.2254,
    officeLongitude: 106.7977,
    isConfigured: true
  }
};

const DEFAULT_TASKS: Task[] = [
  {
    id: '1791793499415',
    no: 1,
    tanggal: '2026-10-12',
    hari: 'Senin',
    waktu: '15:24',
    tugas: 'Instalasi SAP',
    user: 'Mas Angga',
    tempat: 'Kepesertaan',
    kendala: 'User ingin menginstall SAP',
    tindakan: 'Instalasi SAP',
    status: 'Selesai',
    catatan: '',
    isSyncedToSheet: true,
    createdAt: '2026-10-12T08:24:59.415Z',
    updatedAt: '2026-10-12T08:24:59.415Z'
  },
  {
    id: '1791851472740',
    no: 2,
    tanggal: '2026-10-13',
    hari: 'Selasa',
    waktu: '07:25',
    tugas: 'Serah Terima Laptop untuk magang keuangan',
    user: 'Magang Fayza',
    tempat: 'Keuangan',
    kendala: 'Anak magang keuangan butuh laptop',
    tindakan: 'Laptop untuk anak magang keuangan',
    status: 'Selesai',
    catatan: '',
    isSyncedToSheet: true,
    createdAt: '2026-10-13T00:31:12.740Z',
    updatedAt: '2026-10-13T00:31:12.740Z'
  },
  {
    id: '1791851583768',
    no: 3,
    tanggal: '2026-10-13',
    hari: 'Selasa',
    waktu: '07:30',
    tugas: 'Pembuatan user forti untuk akses internet',
    user: 'Magang Fayza',
    tempat: 'Keuangan',
    kendala: 'Belum bisa login internet',
    tindakan: 'Buat user forti untuk akses internet dan firewall',
    status: 'Selesai',
    catatan: '',
    isSyncedToSheet: true,
    createdAt: '2026-10-13T00:33:03.768Z',
    updatedAt: '2026-10-13T00:33:03.769Z'
  }
];

export function getTasks(): Task[] {
  return readDataFile<Task[]>('tasks.json', DEFAULT_TASKS);
}

export function saveTasks(tasks: Task[]): void {
  writeDataFile<Task[]>('tasks.json', tasks);
}

export function getSettings(): AppSettings {
  const settings = readDataFile<AppSettings>('settings.json', DEFAULT_SETTINGS);

  // If environment variables exist, override/supplement
  const envEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const envKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const envSheetId = process.env.GOOGLE_SPREADSHEET_ID || settings.google.spreadsheetId || DEFAULT_SETTINGS.google.spreadsheetId;

  return {
    profile: { ...DEFAULT_SETTINGS.profile, ...(settings.profile || {}) },
    google: {
      ...DEFAULT_SETTINGS.google,
      ...(settings.google || {}),
      spreadsheetId: envSheetId,
      serviceAccountEmail: envEmail || settings.google.serviceAccountEmail,
      privateKey: envKey || settings.google.privateKey,
      isConfigured: settings.google.isConfigured || !!(envEmail && envKey && envSheetId)
    },
    smartpkl: { ...DEFAULT_SETTINGS.smartpkl, ...(settings.smartpkl || {}) }
  };
}

export function saveSettings(settings: AppSettings): void {
  writeDataFile<AppSettings>('settings.json', settings);
}

const DEFAULT_ATTENDANCE: AttendanceRecord[] = [
  {
    tanggal: '2026-10-01',
    status: 'Hadir',
    jamMasuk: '07:45',
    jamPulang: '16:30',
    keterangan: 'Tepat waktu di Ruang IT'
  },
  {
    tanggal: '2026-10-12',
    status: 'Hadir',
    jamMasuk: '07:50',
    jamPulang: '16:30',
    keterangan: 'Hadir di Ruang IT / Server'
  }
];

export function getAttendance(): AttendanceRecord[] {
  return readDataFile<AttendanceRecord[]>('attendance.json', DEFAULT_ATTENDANCE);
}

export function saveAttendance(records: AttendanceRecord[]): void {
  writeDataFile<AttendanceRecord[]>('attendance.json', records);
}

export function getDeletedTaskSignatures(): string[] {
  return readDataFile<string[]>('deleted_tasks.json', []);
}

export function addDeletedTaskSignature(sigOrId: string | string[]): void {
  const current = getDeletedTaskSignatures();
  const set = new Set(current);
  if (Array.isArray(sigOrId)) {
    sigOrId.forEach(s => {
      if (s) set.add(s);
    });
  } else if (sigOrId) {
    set.add(sigOrId);
  }
  writeDataFile<string[]>('deleted_tasks.json', Array.from(set));
}

export function clearDeletedTaskSignatures(): void {
  writeDataFile<string[]>('deleted_tasks.json', []);
}

