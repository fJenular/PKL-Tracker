import fs from 'fs';
import path from 'path';
import { Task, AppSettings, AttendanceRecord } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

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
  }
};

const DEFAULT_TASKS: Task[] = [
  {
    id: '1',
    no: 1,
    tanggal: '2026-10-01',
    hari: 'Kamis',
    waktu: '08:00 - 08:30',
    tugas: 'Absensi dan briefing pagi divisi IT',
    user: 'Staf IT',
    tempat: 'Ruang IT / Server',
    kendala: '-',
    tindakan: 'Mengikuti absensi tepat waktu',
    status: 'Selesai',
    catatan: 'Hadir tepat waktu',
    isSyncedToSheet: false,
    createdAt: new Date('2026-10-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-01T08:30:00Z').toISOString()
  },
  {
    id: '2',
    no: 2,
    tanggal: '2026-10-01',
    hari: 'Kamis',
    waktu: '09:00 - 12:00',
    tugas: 'Membuat tabel, query SQL, input/update data, atau maintenance database',
    user: 'Tim Database',
    tempat: 'Ruang IT / Server',
    kendala: 'Koneksi database lokal lambat',
    tindakan: 'Optimasi query dan indexing tabel',
    status: 'Selesai',
    catatan: 'Selesai tepat waktu',
    isSyncedToSheet: false,
    createdAt: new Date('2026-10-01T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-01T12:00:00Z').toISOString()
  },
  {
    id: '3',
    no: 3,
    tanggal: '2026-10-01',
    hari: 'Kamis',
    waktu: '13:30 - 15:30',
    tugas: 'Membantu Troubleshooting jaringan dan printer user',
    user: 'Divisi Pelayanan',
    tempat: 'Ruang IT / Server',
    kendala: 'Kabel LAN longgar pada PC staf',
    tindakan: 'Crimping ulang konektor RJ45 dan pengujian koneksi',
    status: 'Selesai',
    catatan: 'Printer dan PC kembali normal',
    isSyncedToSheet: false,
    createdAt: new Date('2026-10-01T13:30:00Z').toISOString(),
    updatedAt: new Date('2026-10-01T15:30:00Z').toISOString()
  },
  {
    id: '4',
    no: 4,
    tanggal: '2026-10-12',
    hari: 'Senin',
    waktu: '11:00:00',
    tugas: 'Monitoring server dan pengecekan log error sistem',
    user: 'Kepala IT',
    tempat: 'Ruang IT / Server',
    kendala: '-',
    tindakan: 'Backup log sistem harian',
    status: 'Selesai',
    catatan: 'Server berjalan stabil',
    isSyncedToSheet: false,
    createdAt: new Date('2026-10-12T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-10-12T11:30:00Z').toISOString()
  }
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getTasks(): Task[] {
  ensureDir();
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(DEFAULT_TASKS, null, 2), 'utf-8');
    return DEFAULT_TASKS;
  }
  try {
    const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading tasks file:', err);
    return DEFAULT_TASKS;
  }
}

export function saveTasks(tasks: Task[]): void {
  ensureDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

export function getSettings(): AppSettings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    // If environment variables exist, pre-fill them
    const envEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const envKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const envSheetId = process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SETTINGS.google.spreadsheetId;
    const settings = {
      ...DEFAULT_SETTINGS,
      google: {
        ...DEFAULT_SETTINGS.google,
        spreadsheetId: envSheetId,
        serviceAccountEmail: envEmail,
        privateKey: envKey,
        isConfigured: !!(envEmail && envKey && envSheetId)
      }
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return settings;
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      profile: { ...DEFAULT_SETTINGS.profile, ...(parsed.profile || {}) },
      google: { ...DEFAULT_SETTINGS.google, ...(parsed.google || {}) }
    };
  } catch (err) {
    console.error('Error reading settings file:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  ensureDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');

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
  ensureDir();
  if (!fs.existsSync(ATTENDANCE_FILE)) {
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(DEFAULT_ATTENDANCE, null, 2), 'utf-8');
    return DEFAULT_ATTENDANCE;
  }
  try {
    const raw = fs.readFileSync(ATTENDANCE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading attendance file:', err);
    return DEFAULT_ATTENDANCE;
  }
}

export function saveAttendance(records: AttendanceRecord[]): void {
  ensureDir();
  fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

