export type TaskStatus = 'Selesai' | 'Sedang Berjalan' | 'Pending';

export interface Task {
  id: string;
  no?: number;
  tanggal: string; // YYYY-MM-DD
  hari: string;    // e.g. "Senin", "Selasa"
  waktu: string;   // e.g. "08:00 - 16:30" or "11:00:00"
  tugas: string;   // Activity / Task description
  user: string;    // PIC / Requester / Department
  tempat: string;  // e.g. "Ruang IT / Server"
  kendala?: string; // Issues faced
  tindakan?: string; // Action taken / Resolution
  status: TaskStatus;
  catatan?: string;
  isSyncedToSheet?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSettings {
  namaSiswa: string;
  nis: string;
  sekolah: string;
  tempatPkl: string;
  bulanPelaksanaan: string; // e.g. "Oktober 2026"
  pembimbingPkl: string;   // e.g. "Ristina Eka Salsabila"
  userDuDi: string;        // e.g. "(..................................)" or PIC name
  pesertaPkl: string;      // e.g. "Fakhri Zainul Arifin"
  defaultTempat: string;   // e.g. "Ruang IT / Server"
  managerIt?: string;      // e.g. "Bagus Dwi Laksono"
  periodePkl?: string;     // e.g. "2026-2027"
  tanggalMulaiPkl?: string;// e.g. "2026-08-03"
}

export interface GoogleSettings {
  syncMethod: 'apps_script' | 'service_account';
  webAppUrl?: string; // Google Apps Script Web App URL (no organization policy restrictions!)
  spreadsheetId: string;
  sheetName: string;
  serviceAccountEmail: string;
  privateKey: string;
  isConfigured: boolean;
}

export interface SmartPKLSettings {
  username: string;
  password: string;
  // Office/DU-DI GPS coordinates (center point)
  officeLatitude: number;
  officeLongitude: number;
  isConfigured: boolean;
}

export interface AttendanceRecord {
  tanggal: string; // YYYY-MM-DD
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Libur';
  jamMasuk?: string;
  jamPulang?: string;
  keterangan?: string;
  fotoUrl?: string;
  selfieClockOut?: boolean; // true jika absen pulang pakai selfie
  createdAt?: string;
  updatedAt?: string;
}

export interface AppSettings {
  profile: ProfileSettings;
  google: GoogleSettings;
  smartpkl: SmartPKLSettings;
}
